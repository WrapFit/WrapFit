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
  project: { select: { userId: true, title: true } },
} satisfies Prisma.ExportJobSelect;

type JobRow = Prisma.ExportJobGetPayload<{ select: typeof jobSelect }>;

/** Download name of an export: "Hộp nến Tết" + PDF_CMYK -> "hop-nen-tet-pdf-cmyk.pdf". */
export function fileNameFor(title: string, fileType: ExportFileType): string {
  return `${titleSlug(title)}-${fileType.toLowerCase().replace('_', '-')}.${FILE_FORMATS[fileType].extension}`;
}

/**
 * API side of the print export (docs 07, section 3.1): checks the design, records an ExportJob and queues it.
 * The heavy rendering runs in the separate worker process (ExportProcessor), never in an HTTP request.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(EXPORT_QUEUE) private readonly queue: Queue<ExportJobData>,
  ) {}

  async request(projectId: string, fileType: ExportFileType) {
    if (!this.storage.enabled) throw new ServiceUnavailableException('File storage is not configured');

    const project = await this.prisma.packagingProject.findUniqueOrThrow({
      where: { id: projectId },
      select: { status: true, templateId: true, formulaVersion: true, dimensions: true, canvasState: true },
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
      throw new UnprocessableEntityException({
        message: 'FitCheck found errors that would ruin the print; fix them before exporting',
        fitCheck,
      });
    }

    const job = await this.prisma.exportJob.create({ data: { projectId, fileType }, select: jobSelect });
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
      error: job.status === 'FAILED' ? job.errorLog : null,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      fileName: ready ? fileName : null,
      downloadUrl: ready ? await this.storage.presignDownload(job.storageKey!, fileName, DOWNLOAD_URL_TTL_SECONDS) : null,
      downloadExpiresIn: ready ? DOWNLOAD_URL_TTL_SECONDS : null,
    };
  }
}
