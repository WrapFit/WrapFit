import type { ExportFileType } from '@prisma/client';

/**
 * Emitted by the export worker (src/worker.ts) once a print file is stored and its job is COMPLETED, after the commit.
 * The notification row is already stored with the job; NotificationsCoreModule (registered in the worker) only pushes
 * it. It is an in-process event of the worker: the API process never receives it.
 */
export const EXPORT_COMPLETED = 'export.completed';

export interface ExportCompletedEvent {
  exportJobId: string;
  projectId: string;
  /** Owner of the project: the user who asked for the file. */
  userId: string;
  fileType: ExportFileType;
}
