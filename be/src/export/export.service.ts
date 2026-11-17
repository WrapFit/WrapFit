import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExportFileType, Prisma } from '@prisma/client';
import type { BoxDimensions, CanvasElement } from '@wrapfit/shared';
import { Queue } from 'bullmq';
import { ProductEventsService } from '../analytics';
import { orderPaymentRequired } from '../billing';
import { currentRequestId, QUEUE_ADD_TIMEOUT_MS, withTimeout } from '../common';
import { PrismaService } from '../shared/prisma';
import { StorageService } from '../storage';
import {
  DOWNLOAD_URL_TTL_SECONDS,
  EXPORT_JOB_OPTIONS,
  EXPORT_QUEUE,
  ExportJobData,
  FILE_FORMATS,
  titleSlug,
  RENDER_JOB,
} from './export.constants';
import { checkProject } from '../projects';

const jobSelect = {
  id: true,
  projectId: true,
  fileType: true,
  status: true,
  errorLog: true,
  storageKey: true,
  createdAt: true,
  completedAt: true,
  watermarked: true,
  project: { select: { userId: true, title: true } },
} satisfies Prisma.ExportJobSelect;

type JobRow = Prisma.ExportJobGetPayload<{ select: typeof jobSelect }>;

/** What unlocked an export request: a paid print order (null), or an unlock bought before the print cart (its id). */
interface ExportGrant {
  unlockId: string | null;
}

/** Download name of an export: "Hộp nến Tết" + PDF_CMYK -> "hop-nen-tet-pdf-cmyk.pdf". */
export function fileNameFor(title: string, fileType: ExportFileType): string {
  return `${titleSlug(title)}-${fileType.toLowerCase().replace('_', '-')}.${FILE_FORMATS[fileType].extension}`;
}

/** An unlock counts for the version it was bought for, until it expires, unless it was refunded. */
const validUnlock = (projectId: string, version: number, now: Date): Prisma.ExportUnlockWhereInput => ({
  projectId,
  projectVersion: version,
  refundedAt: null,
  expiresAt: { gt: now },
});

/**
 * API side of the print export (docs 07, section 3.1): checks the design and that this version is unlocked, records an
 * ExportJob and queues it. Every export is a clean file: the watermarked free A4 PDF and the export credits are gone
 * (docs/25 item 7). The heavy rendering runs in the separate worker
 * process (ExportProcessor), never in an HTTP request.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: ProductEventsService,
    @InjectQueue(EXPORT_QUEUE) private readonly queue: Queue<ExportJobData>,
  ) {}

  async request(projectId: string, fileType: ExportFileType) {
    if (!this.storage.enabled) throw new ServiceUnavailableException('File storage is not configured');

    const project = await this.prisma.packagingProject.findUniqueOrThrow({
      where: { id: projectId },
      select: { userId: true, status: true, templateId: true, formulaVersion: true, dimensions: true, canvasState: true },
    });
    if (project.status === 'DELETED') {
      throw new ConflictException('Restore the project from the trash before exporting it');
    }

    // FitCheck again on the server: the client's result is never trusted for production files.
    const fitCheck = checkProject(
      project.templateId,
      project.dimensions as unknown as BoxDimensions,
      (project.canvasState as { elements?: CanvasElement[] }).elements ?? [],
      project.formulaVersion,
    );
    await this.prisma.packagingProject.update({
      where: { id: projectId },
      data: { fitcheckState: fitCheck as unknown as Prisma.InputJsonObject, fitcheckScore: fitCheck.score },
    });
    if (!fitCheck.isValidForProduction) {
      // Analytics dashboard (decision M9): errors that would have reached the printer.
      await this.events.record('EXPORT_BLOCKED_FITCHECK', {
        userId: project.userId,
        projectId,
        payload: { errors: fitCheck.violations.filter((v) => v.severity === 'error').length, fileType },
      });
      throw new UnprocessableEntityException({
        message: 'FitCheck found errors that would ruin the print; fix them before exporting',
        fitCheck,
      });
    }

    // ProjectOwnerGuard already made sure the caller is the owner.
    const job = await this.prisma.$transaction(async (tx) => {
      const grant = await this.grant(tx, projectId);
      return tx.exportJob.create({ data: { projectId, fileType, unlockId: grant.unlockId }, select: jobSelect });
    });

    try {
      await withTimeout(
        this.queue.add(
          RENDER_JOB,
          { exportJobId: job.id, requestId: currentRequestId() },
          { ...EXPORT_JOB_OPTIONS, jobId: job.id },
        ),
        QUEUE_ADD_TIMEOUT_MS,
        'export queue',
      );
    } catch (error) {
      this.logger.error('Could not queue the export', error instanceof Error ? error.stack : String(error));
      await this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorLog: 'The export queue is unavailable' },
      });
      throw new ServiceUnavailableException('The export queue is unavailable, try again in a moment');
    }
    return { jobId: job.id, status: job.status, fitCheck };
  }

  /**
   * Whether the print file of this version may be exported. The print file is sold through the print cart: a paid order
   * (not cancelled) holding this exact version unlocks it; Pro does not skip the cart and no export credit is read. An
   * unlock bought with an export credit before this flow still counts until it expires. Runs in the transaction
   * that creates the job, with the project row locked, so an edit cannot slip in between the check and the job.
   */
  private async grant(tx: Prisma.TransactionClient, projectId: string): Promise<ExportGrant> {
    const [row] = await tx.$queryRaw<{ version: number }[]>`
      SELECT version FROM packaging_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
    if (await this.paidOrderHolds(tx, projectId, row.version)) return { unlockId: null };
    const unlock = await tx.exportUnlock.findFirst({
      where: validUnlock(projectId, row.version, new Date()),
      orderBy: { expiresAt: 'desc' },
      select: { id: true },
    });
    if (unlock) return { unlockId: unlock.id };
    throw orderPaymentRequired();
  }

  /** A paid print order (not cancelled) holds this version of the design. */
  private async paidOrderHolds(db: Prisma.TransactionClient, projectId: string, version: number): Promise<boolean> {
    const item = await db.orderItem.findFirst({
      where: { projectId, projectVersion: version, order: { paidAt: { not: null }, status: { not: 'CANCELLED' } } },
      select: { id: true },
    });
    return item !== null;
  }

  /**
   * What the studio shows before a request: whether this version is unlocked (a paid print order holds it, or an
   * older unlock is still valid).
   */
  async access(projectId: string): Promise<{ unlocked: boolean; unlockExpiresAt: Date | null }> {
    const project = await this.prisma.packagingProject.findUniqueOrThrow({
      where: { id: projectId },
      select: { version: true },
    });
    const [paid, unlock] = await Promise.all([
      this.paidOrderHolds(this.prisma, projectId, project.version),
      this.prisma.exportUnlock.findFirst({
        where: validUnlock(projectId, project.version, new Date()),
        orderBy: { expiresAt: 'desc' },
        select: { expiresAt: true },
      }),
    ]);
    return { unlocked: paid || unlock !== null, unlockExpiresAt: paid ? null : (unlock?.expiresAt ?? null) };
  }

  /** Job status; a COMPLETED job includes a download link valid for 15 minutes. */
  async status(jobId: string, userId: string) {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId }, select: jobSelect });
    // 404 for jobs of other users' projects, like ProjectOwnerGuard.
    if (job?.project.userId !== userId) throw new NotFoundException('Export not found');
    return this.view(job);
  }

  async list(projectId: string) {
    const jobs = await this.prisma.exportJob.findMany({
      where: { projectId },
      select: jobSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 20,
    });
    return Promise.all(jobs.map((job) => this.view(job)));
  }

  private async view(job: JobRow) {
    const fileName = fileNameFor(job.project.title, job.fileType);
    const ready = job.status === 'COMPLETED' && job.storageKey !== null;
    return {
      id: job.id,
      projectId: job.projectId,
      fileType: job.fileType,
      status: job.status,
      watermarked: job.watermarked,
      error: job.status === 'FAILED' ? job.errorLog : null,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      fileName: ready ? fileName : null,
      downloadUrl: ready ? await this.storage.presignDownload(job.storageKey!, fileName, DOWNLOAD_URL_TTL_SECONDS) : null,
      downloadExpiresIn: ready ? DOWNLOAD_URL_TTL_SECONDS : null,
    };
  }
}
