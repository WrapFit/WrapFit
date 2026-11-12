import type { AiImageJobStatus } from '@prisma/client';
import type { JobsOptions } from 'bullmq';

export const AI_IMAGE_QUEUE = 'ai-image';
export const RUN_JOB = 'run';

/** Data of a BullMQ job; the job id is the AiImageJob id. */
export interface AiImageJobData {
  aiImageJobId: string;
  /** Id of the HTTP request that queued the job, so worker logs can be matched with it. */
  requestId?: string;
}

/**
 * 2 attempts: every call costs money at the provider, so a second try is enough for a passing outage. A refusal by the
 * provider (UnrecoverableError) is never retried. Finished jobs are trimmed from Redis, the database keeps the history.
 */
export const AI_IMAGE_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: { type: 'fixed', delay: 5000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Statuses a job can still leave: a COMPLETED or FAILED row is never overwritten. */
export const UNFINISHED_AI_IMAGE = {
  in: ['PENDING', 'PROCESSING'] as AiImageJobStatus[],
};

/** Jobs still unfinished after this long are checked against the queue by AiImageReconcileTask. */
export const STUCK_AI_IMAGE_AFTER_MS = 10 * 60 * 1000;

/** Jobs of one user waiting or running at once: more answers 429 until one finishes. */
export const MAX_ACTIVE_AI_IMAGE_JOBS = 3;

/** Largest file accepted from the provider. */
export const MAX_PROVIDER_IMAGE_BYTES = 30 * 1024 * 1024;

/** `error_log` of a job the provider refused to draw (its safety filter): the studio explains it differently. */
export const BLOCKED_PREFIX = '[blocked] ';

export const WORKER_LOST_ERROR = 'The AI image worker stopped while running this job';
