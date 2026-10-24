import type { ExportStatus } from '@prisma/client';
import type { JobsOptions } from 'bullmq';

export const EXPORT_QUEUE = 'export';
export const RENDER_JOB = 'render';

/** Data of a BullMQ job; the job id is the ExportJob id. */
export interface ExportJobData {
  exportJobId: string;
  /** Id of the HTTP request that queued the job, so worker logs can be matched with it. */
  requestId?: string;
}

/** 3 attempts with exponential backoff (2 s, 4 s); finished jobs are trimmed from Redis, the DB keeps the history. */
export const EXPORT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Statuses an export can still leave: a COMPLETED or FAILED row is never overwritten. */
export const UNFINISHED_EXPORT = {
  in: ['PENDING', 'PROCESSING'] as ExportStatus[],
};

/** Exports still PENDING / PROCESSING after this long are checked against the queue by ExportReconcileTask. */
export const STUCK_EXPORT_AFTER_MS = 10 * 60 * 1000;

/** Error shown for an export whose worker died (out of memory, restart) and that BullMQ gave up on. */
export const WORKER_LOST_ERROR = 'The export worker stopped while rendering this file; please try again';

/**
 * Every export worker refreshes this Redis key (and a local file for its Docker health check) every 15 s; the API
 * health check reads it. It expires 45 s after the last beat of the last live worker.
 */
export const WORKER_HEARTBEAT_KEY = 'wrapfit:export-worker:heartbeat';
export const WORKER_HEARTBEAT_INTERVAL_MS = 15_000;
export const WORKER_HEARTBEAT_TTL_SECONDS = 45;

/** Lifetime of a download link (docs 07: 15 minutes). */
export const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

export const FILE_FORMATS = {
  PDF_CMYK: { extension: 'pdf', contentType: 'application/pdf' },
  PDF_A4_PRINT: { extension: 'pdf', contentType: 'application/pdf' },
  SVG: { extension: 'svg', contentType: 'image/svg+xml' },
  DXF: { extension: 'dxf', contentType: 'application/dxf' },
  PRINT_PACKAGE: { extension: 'zip', contentType: 'application/zip' },
} as const;

/** Turns a project title into a safe file name: "Hộp nến Tết" -> "hop-nen-tet". */
export function titleSlug(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'wrapfit'
  );
}
