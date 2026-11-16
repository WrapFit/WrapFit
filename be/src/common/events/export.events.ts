import type { ExportFileType } from '@prisma/client';

/**
 * Emitted by the export worker (src/worker.ts) once a print file is stored and its job is COMPLETED. It is an in-process
 * event of the worker: listeners must be registered in the worker (NotificationsCoreModule is). The API process never
 * receives it.
 */
export const EXPORT_COMPLETED = 'export.completed';

export interface ExportCompletedEvent {
  exportJobId: string;
  projectId: string;
  /** Owner of the project: the user who asked for the file. */
  userId: string;
  fileType: ExportFileType;
}
