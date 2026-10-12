/** Print-file exports on the BullMQ queue (`be/src/export`). Flow: docs/06, section 7. */

import { request } from "@/services/api";
import type { ExportFileType, ExportJob, ExportStarted } from "@/types/api";

/**
 * Queues an export (202). 422 with `fitCheck` (see `ApiError.fitCheck`) when FitCheck finds blocking errors.
 * At most 10 requests per minute.
 */
export function requestExport(projectId: string, fileType: ExportFileType): Promise<ExportStarted> {
  return request(`/projects/${projectId}/exports`, { method: "POST", json: { fileType } });
}

/** Poll every 2 seconds until COMPLETED or FAILED. `downloadUrl` expires: fetch the job again for a new one. */
export function getExportJob(jobId: string): Promise<ExportJob> {
  return request(`/exports/${jobId}`);
}

/** The 20 latest exports of a project. */
export function listProjectExports(projectId: string): Promise<ExportJob[]> {
  return request(`/projects/${projectId}/exports`);
}
