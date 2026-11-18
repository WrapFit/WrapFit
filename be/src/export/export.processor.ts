import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PRINT_DPI, type BoxDimensions, type CanvasState } from '@wrapfit/shared';
import { Job } from 'bullmq';
import { ConfigService, EXPORT_COMPLETED, ExportCompletedEvent, runWithRequestId } from '../common';
import { NotificationsService } from '../notifications';
import { PrismaService } from '../shared/prisma';
import { pruneAutomaticSnapshots } from '../projects';
import { PRIVATE_KEY_PREFIX, StorageService, toClientCanvas } from '../storage';
import { failExport } from './export-failure';
import { EXPORT_QUEUE, ExportDesign, ExportJobData, FILE_FORMATS, titleSlug, UNFINISHED_EXPORT } from './export.constants';
import { libraryFile } from './rendering/library-files';
import { renderPrintPackage } from './rendering/print-package';
import { fontUrlsOf } from '@wrapfit/shared';
import { buildPrintLayout, PrintLayout } from './rendering/print-layout';
import { Artwork, imageResolutions, renderDxf, renderPdf, renderSvg, svgImages } from './rendering/print-renderers';

/**
 * Images embedded in one print file, in total. The SVG export holds them twice more as base64 text (about 1.33 x
 * each), on a 384 MB heap with EXPORT_CONCURRENCY jobs at once: 40 MB keeps two jobs well inside the worker's memory.
 */
export const MAX_ARTWORK_BYTES = 40 * 1024 * 1024;

/**
 * Renders print files in the worker process (src/worker.ts). BullMQ retries a failed job 3 times; the ExportJob
 * row is marked FAILED only after the last attempt. Concurrency is set by EXPORT_CONCURRENCY.
 * A worker that dies mid-job (out of memory) never reaches the catch below: ExportReconcileTask fails those rows.
 * BullMQ may hand a job out again (a render that blocks the event loop past the lock looks stalled), so both status
 * changes are conditional: a finished job is not rendered again, and only one run records the completion.
 */
@Processor(EXPORT_QUEUE)
export class ExportProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    this.worker.concurrency = this.config.get('export.concurrency');
  }

  process(job: Job<ExportJobData>): Promise<{ storageKey: string | null }> {
    const { exportJobId, requestId } = job.data;
    return runWithRequestId(requestId ?? `job:${exportJobId}`, async () => {
      try {
        return await this.render(exportJobId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        this.logger.warn(`Export ${exportJobId} attempt ${job.attemptsMade + 1} failed: ${message}`);
        // Only an unfinished row: a job completed meanwhile (stalled, then re-run) is never turned into FAILED.
        if (lastAttempt) await failExport(this.prisma, exportJobId, message);
        throw error; // lets BullMQ schedule the next attempt
      }
    });
  }

  private async render(exportJobId: string): Promise<{ storageKey: string | null }> {
    const startedAt = Date.now();
    const { count } = await this.prisma.exportJob.updateMany({
      where: { id: exportJobId, status: UNFINISHED_EXPORT },
      data: { status: 'PROCESSING', errorLog: null },
    });
    if (!count) return this.alreadyFinished(exportJobId);

    const job = await this.prisma.exportJob.findUniqueOrThrow({
      where: { id: exportJobId },
      select: { fileType: true, watermarked: true, design: true, project: { select: { id: true, userId: true } } },
    });
    const { project } = job;
    // The design frozen by the request (docs/30 item 1), on every attempt: never the project as it is now.
    const design = (job.design as unknown as ExportDesign | null) ?? (await this.currentDesign(project.id, exportJobId));
    // Stored keys of uploads -> URLs: the layout and the artwork loader work on URLs.
    const canvasState = toClientCanvas(design.canvasState);
    const layout = buildPrintLayout({
      title: design.title,
      structure: design.templateId,
      formulaVersion: design.formulaVersion,
      dimensions: design.dimensions,
      elements: canvasState.elements ?? [],
    });

    const format = FILE_FORMATS[job.fileType];
    const artwork = job.fileType === 'DXF' ? new Map() : await this.loadArtwork(layout);
    const body =
      job.fileType === 'PDF_CMYK'
        ? await renderPdf(layout, artwork)
        : job.fileType === 'PDF_A4_PRINT'
          ? await renderPdf(layout, artwork, { withCropMarks: true, paperSize: 'A4' })
          : job.fileType === 'PRINT_PACKAGE'
            ? await renderPrintPackage(layout, artwork, titleSlug(design.title))
            : Buffer.from(job.fileType === 'SVG' ? renderSvg(layout, artwork, await svgImages(layout, artwork)) : renderDxf(layout));

    // Private bucket: the file is only handed out through the 15-minute links of ExportService.
    const storageKey = `${PRIVATE_KEY_PREFIX}projects/${project.id}/exports/${exportJobId}.${format.extension}`;
    const stored = await this.storage.putGeneratedFile({
      userId: project.userId,
      projectId: project.id,
      key: storageKey,
      purpose: 'EXPORT',
      contentType: format.contentType,
      body,
    });
    if (!stored) throw new Error('File storage is not configured');

    const completedAt = new Date();
    const completed: ExportCompletedEvent = { exportJobId, projectId: project.id, userId: project.userId, fileType: job.fileType };
    const recorded = await this.prisma.$transaction(async (tx) => {
      // Only the run that moves the job out of PROCESSING records it: a second run of the same job (handed out again
      // by BullMQ) writes the same file under the same key and nothing else.
      const { count: finished } = await tx.exportJob.updateMany({
        where: { id: exportJobId, status: 'PROCESSING' },
        data: { status: 'COMPLETED', storageKey, completedAt },
      });
      if (!finished) return false;
      // Analytics dashboard (docs/17 S7), in the transaction that completes the job: counted once.
      await tx.productEvent.create({
        data: {
          type: 'EXPORT_COMPLETED',
          userId: project.userId,
          projectId: project.id,
          payload: { exportJobId, fileType: job.fileType, watermarked: job.watermarked },
          createdAt: completedAt,
        },
      });
      // "Your print file is ready", with the job: never lost if the worker stops after the commit, never doubled.
      await this.notifications.recordExportCompleted(tx, completed);
      // UC-07: every print export leaves a version the user can come back to: the exported design (keys included).
      await tx.projectSnapshot.create({
        data: {
          projectId: project.id,
          name: `Bản xuất in ${job.fileType} ${completedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
          canvasState: design.canvasState as object,
          dimensions: design.dimensions as object,
          formulaVersion: design.formulaVersion,
          isAutomatic: true,
        },
      });
      // Also recomputes the file refs: the files of this job's design now count through the new snapshot only.
      await pruneAutomaticSnapshots(tx, project.id);
      return true;
    });
    if (!recorded) {
      this.logger.warn(`Export ${exportJobId} was finished by another run meanwhile: not recorded twice`);
      return { storageKey };
    }
    // After the commit: the listener of NotificationsCoreModule (registered in this worker) pushes the new notification
    // to the owner's open browsers. Losing this push loses nothing: the row is stored and the frontend also polls.
    this.events.emit(EXPORT_COMPLETED, completed);
    this.logger.log(
      `Export ${exportJobId} (${job.fileType}, ${body.length} bytes) completed in ${Date.now() - startedAt} ms`,
    );
    return { storageKey };
  }

  /** A job handed out again after it ended: a COMPLETED one keeps its file, a FAILED one (ExportReconcileTask) stays failed. */
  private async alreadyFinished(exportJobId: string): Promise<{ storageKey: string | null }> {
    const row = await this.prisma.exportJob.findUnique({ where: { id: exportJobId }, select: { status: true, storageKey: true } });
    if (row?.status === 'COMPLETED') {
      this.logger.log(`Export ${exportJobId} is already completed: not rendered again`);
      return { storageKey: row.storageKey };
    }
    this.logger.warn(`Export ${exportJobId} is ${row?.status ?? 'gone'}: not rendered`);
    return { storageKey: null };
  }

  /** Jobs queued before migration 20261118000200 have no frozen design: they render the project as it is now. */
  private async currentDesign(projectId: string, exportJobId: string): Promise<ExportDesign> {
    this.logger.warn(`Export ${exportJobId} has no frozen design (queued before docs/30 item 1): rendering the current project`);
    const project = await this.prisma.packagingProject.findUniqueOrThrow({
      where: { id: projectId },
      select: { title: true, templateId: true, formulaVersion: true, dimensions: true, canvasState: true },
    });
    return {
      ...project,
      dimensions: project.dimensions as unknown as BoxDimensions,
      canvasState: project.canvasState as unknown as CanvasState,
    };
  }

  /**
   * Downloads the images of the layout from storage. Only files uploaded to our bucket are used (never an arbitrary
   * URL: no requests to other hosts from the worker). A missing file fails the export rather than print without it.
   * Images under the print resolution at their real size are logged (FitCheck already warned the user).
   */
  private async loadArtwork(layout: PrintLayout): Promise<Artwork> {
    const artwork: Artwork = new Map();
    let total = 0;
    // The inside sheet (docs/23 S5) prints its own images too; uploaded fonts (S13) are loaded like images.
    const fonts = fontUrlsOf([...layout.texts, ...(layout.inside?.texts ?? [])].map((t) => ({ type: 'text' as const, style: t.style })));
    for (const url of [...[...layout.images, ...(layout.inside?.images ?? [])].map((image) => image.url), ...fonts]) {
      if (artwork.has(url)) continue;
      const builtIn = libraryFile(url);
      if (builtIn) {
        artwork.set(url, builtIn);
        continue;
      }
      const key = this.storage.uploadedKeyOf(url);
      if (!key) {
        this.logger.warn(`Export leaves out an image that is not an upload of this platform: ${url}`);
        continue;
      }
      const file = await this.storage.getObject(key).catch((error: Error) => {
        throw new Error(`Could not read the image ${url}: ${error.message}`);
      });
      total += file.body.length;
      if (total > MAX_ARTWORK_BYTES) {
        throw new Error(`The images of this design exceed ${MAX_ARTWORK_BYTES / 1024 / 1024} MB; use smaller files`);
      }
      artwork.set(url, file);
    }
    for (const { url, dpi } of await imageResolutions(layout, artwork)) {
      if (dpi !== null && dpi < PRINT_DPI) this.logger.warn(`Image ${url} prints at ${dpi} DPI (print standard ${PRINT_DPI})`);
    }
    return artwork;
  }
}
