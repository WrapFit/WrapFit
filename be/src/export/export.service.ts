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
import type { BoxDimensions, CanvasElement, Entitlements, ExportMode } from '@wrapfit/shared';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { ProductEventsService } from '../analytics';
import { CreditsService, EntitlementsService, exportCreditRequired } from '../billing';
import { currentRequestId, QUEUE_ADD_TIMEOUT_MS, withTimeout } from '../common';
import { PrismaService } from '../shared/prisma';
import { StorageService } from '../storage';
import { ExportCreditRefunds } from './export-credits';
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** What an export request is allowed to produce, decided before the job is created (docs/16 §5.2 steps 4–5). */
interface ExportGrant {
  watermarked: boolean;
  /** One credit was spent by this request. */
  charged: boolean;
  unlockId: string | null;
  /** Balance after the debit, when one was made. */
  balance?: number;
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
 * API side of the print export (docs 07, section 3.1): checks the design, decides whether the file is clean or
 * watermarked (docs/16 §5), records an ExportJob and queues it. The heavy rendering runs in the separate worker
 * process (ExportProcessor), never in an HTTP request.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly events: ProductEventsService,
    private readonly credits: CreditsService,
    private readonly entitlements: EntitlementsService,
    private readonly refunds: ExportCreditRefunds,
    @InjectQueue(EXPORT_QUEUE) private readonly queue: Queue<ExportJobData>,
  ) {}

  async request(projectId: string, fileType: ExportFileType, useCredit = false) {
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

    // The owner's plan pays: ProjectOwnerGuard already made sure the caller is the owner.
    const { entitlements } = await this.entitlements.of(project.userId);
    const { job, grant } = await this.prisma.$transaction(async (tx) => {
      const grant = await this.grant(tx, projectId, project.userId, fileType, useCredit, entitlements);
      const job = await tx.exportJob.create({
        data: { projectId, fileType, watermarked: grant.watermarked, unlockId: grant.unlockId },
        select: jobSelect,
      });
      return { job, grant };
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
      // The credit just spent buys nothing: give it back.
      if (grant.charged) await this.refunds.refundFailed(job.id);
      throw new ServiceUnavailableException('The export queue is unavailable, try again in a moment');
    }
    const balance = grant.balance ?? (await this.credits.balance(project.userId));
    return {
      jobId: job.id,
      status: job.status,
      fitCheck,
      watermarked: grant.watermarked,
      charged: grant.charged,
      exportCredits: { balance },
    };
  }

  /**
   * Clean or watermarked, and who pays (docs/16 §5.2 steps 4–5). Runs in the transaction that creates the job, with
   * the project row locked: two requests for the same version wait for each other, so only the first one pays.
   */
  private async grant(
    tx: Prisma.TransactionClient,
    projectId: string,
    userId: string,
    fileType: ExportFileType,
    useCredit: boolean,
    entitlements: Entitlements,
  ): Promise<ExportGrant> {
    if (entitlements.export.mode === 'UNLIMITED') return { watermarked: false, charged: false, unlockId: null };

    const [row] = await tx.$queryRaw<{ version: number }[]>`
      SELECT version FROM packaging_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
    const now = new Date();
    const unlock = await tx.exportUnlock.findFirst({
      where: validUnlock(projectId, row.version, now),
      orderBy: { expiresAt: 'desc' },
      select: { id: true },
    });
    if (unlock) return { watermarked: false, charged: false, unlockId: unlock.id };
    // The free home-print PDF, on every plan: the WrapFit line goes on a glue flap.
    if (fileType === 'PDF_A4_PRINT' && !useCredit) return { watermarked: true, charged: false, unlockId: null };
    if (!useCredit) throw exportCreditRequired(await this.credits.balance(userId, tx));

    // The unlock records the operation id first; the debit (402 INSUFFICIENT_CREDITS when empty) rolls it back.
    const operationId = randomUUID();
    const created = await tx.exportUnlock.create({
      data: {
        projectId,
        projectVersion: row.version,
        userId,
        debitOperationId: operationId,
        expiresAt: new Date(now.getTime() + entitlements.export.unlockDays * DAY_MS),
      },
      select: { id: true },
    });
    const { balance } = await this.credits.debit(userId, { reason: 'EXPORT_UNLOCK', refId: created.id, operationId }, tx);
    return { watermarked: false, charged: true, unlockId: created.id, balance };
  }

  /** What the export dialog shows before a request: plan mode, whether this version is unlocked, credits left. */
  async access(projectId: string): Promise<{ mode: ExportMode; unlocked: boolean; unlockExpiresAt: Date | null; balance: number }> {
    const project = await this.prisma.packagingProject.findUniqueOrThrow({
      where: { id: projectId },
      select: { userId: true, version: true },
    });
    const { entitlements } = await this.entitlements.of(project.userId);
    const [unlock, balance] = await Promise.all([
      this.prisma.exportUnlock.findFirst({
        where: validUnlock(projectId, project.version, new Date()),
        orderBy: { expiresAt: 'desc' },
        select: { expiresAt: true },
      }),
      this.credits.balance(project.userId),
    ]);
    const mode = entitlements.export.mode;
    return {
      mode,
      unlocked: mode === 'UNLIMITED' || unlock !== null,
      unlockExpiresAt: unlock?.expiresAt ?? null,
      balance,
    };
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
