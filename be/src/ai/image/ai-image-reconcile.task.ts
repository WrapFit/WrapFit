import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from '../../shared/prisma';
import { AiImageRefunds } from './ai-image-refunds';
import {
  AI_IMAGE_QUEUE,
  AiImageJobData,
  STUCK_AI_IMAGE_AFTER_MS,
  UNFINISHED_AI_IMAGE,
  WORKER_LOST_ERROR,
} from './ai-image.constants';

const RECONCILE_BATCH = 100;

/**
 * Every 5 minutes (API process), fails and refunds the AI image jobs BullMQ will never finish: a worker that died in
 * the middle of a job (out of memory, restart) never reaches the refund of AiImageProcessor. Same rules as
 * ExportReconcileTask; running it on several instances is harmless (AiImageRefunds touches unfinished jobs only).
 */
@Injectable()
export class AiImageReconcileTask {
  private readonly logger = new Logger(AiImageReconcileTask.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(AI_IMAGE_QUEUE) private readonly queue: Queue<AiImageJobData>,
    private readonly refunds: AiImageRefunds,
  ) {}

  @Interval('ai-image-reconcile', 5 * 60 * 1000)
  async run(): Promise<void> {
    try {
      const count = await this.reconcile();
      if (count > 0) this.logger.warn(`Failed and refunded ${count} stuck AI image job(s)`);
    } catch (error) {
      this.logger.error('AI image reconcile failed', error instanceof Error ? error.stack : String(error));
    }
  }

  /** Returns how many jobs were failed. */
  async reconcile(now = new Date()): Promise<number> {
    const stuck = await this.prisma.aiImageJob.findMany({
      where: { status: UNFINISHED_AI_IMAGE, createdAt: { lt: new Date(now.getTime() - STUCK_AI_IMAGE_AFTER_MS) } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: RECONCILE_BATCH,
    });

    let failed = 0;
    for (const { id } of stuck) {
      // waiting / active / delayed: a worker still owns the job (or will once it is back up).
      const state = await this.queue.getJobState(id);
      if (state !== 'failed' && state !== 'unknown') continue;
      const refunded = await this.refunds
        .fail(id, WORKER_LOST_ERROR)
        .catch((error: Error) => {
          this.logger.error(`Could not refund AI image job ${id}: ${error.message}`);
          return 0;
        });
      if (refunded) failed += 1;
    }
    return failed;
  }
}
