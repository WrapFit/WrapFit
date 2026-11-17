import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from '../shared/prisma';
import {
  EXPORT_QUEUE,
  ExportJobData,
  STUCK_EXPORT_AFTER_MS,
  UNFINISHED_EXPORT,
  WORKER_LOST_ERROR,
} from './export.constants';

/** Exports checked per run; the rest wait for the next run. */
const RECONCILE_BATCH = 100;

/**
 * Every 5 minutes (API process), marks FAILED the exports that BullMQ will never finish. When the worker dies in the
 * middle of a job (out of memory, container restart), BullMQ moves the job to "failed" as stalled without calling
 * ExportProcessor.process again, so the row would otherwise stay PROCESSING and the user would poll forever.
 * Running it on several instances at once is harmless: the update only touches unfinished rows.
 */
@Injectable()
export class ExportReconcileTask {
  private readonly logger = new Logger(ExportReconcileTask.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EXPORT_QUEUE) private readonly queue: Queue<ExportJobData>,
  ) {}

  @Interval('export-reconcile', 5 * 60 * 1000)
  async run(): Promise<void> {
    try {
      const count = await this.reconcile();
      if (count > 0) this.logger.warn(`Marked ${count} stuck export(s) as FAILED`);
    } catch (error) {
      // Redis or the database is down: the next run retries.
      this.logger.error('Export reconcile failed', error instanceof Error ? error.stack : String(error));
    }
  }

  /** Returns how many exports were marked FAILED. */
  async reconcile(now = new Date()): Promise<number> {
    const stuck = await this.prisma.exportJob.findMany({
      where: {
        status: UNFINISHED_EXPORT,
        createdAt: { lt: new Date(now.getTime() - STUCK_EXPORT_AFTER_MS) },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: RECONCILE_BATCH,
    });

    let failed = 0;
    for (const { id } of stuck) {
      // waiting / active / delayed: a worker still owns the job (or will once it is back up).
      const state = await this.queue.getJobState(id);
      if (state !== 'failed' && state !== 'unknown') continue;

      const reason = state === 'failed' ? (await this.queue.getJob(id))?.failedReason : 'job missing from the queue';
      const { count } = await this.prisma.exportJob.updateMany({
        where: { id, status: UNFINISHED_EXPORT },
        data: { status: 'FAILED', errorLog: WORKER_LOST_ERROR },
      });
      if (count) this.logger.warn(`Export ${id} was never finished by the worker (${reason ?? 'no reason'})`);
      failed += count;
    }
    return failed;
  }
}
