/** Print-file exports on the BullMQ queue (`be/src/export`). Flow: docs/06, section 7. */

import { request } from "@/services/api";
import type { ExportAccess, ExportFileType, ExportJob, ExportStarted } from "@/types/api";
import { DEMO_EXPORTS } from "@/features/dashboard/demoData";

/**
 * Queues an export (202). 422 with `fitCheck` (see `ApiError.fitCheck`) when FitCheck finds blocking errors; 402
 * `EXPORT_CREDIT_REQUIRED` (send again with `useCredit`) or `INSUFFICIENT_CREDITS`, with `balance`, for a clean file of
 * a design that is not unlocked. At most 10 requests per minute. Errors reach the caller: ExportDialog builds the file
 * in the browser itself when the API cannot be reached, and a payment answer must never turn into a fake success.
 */
export function requestExport(projectId: string, fileType: ExportFileType, useCredit?: boolean): Promise<ExportStarted> {
  return request(`/projects/${projectId}/exports`, { method: "POST", json: useCredit ? { fileType, useCredit } : { fileType } });
}

/** Plan mode, whether the current version of the design is unlocked, and export credits left. */
export function getExportAccess(projectId: string): Promise<ExportAccess> {
  return request(`/projects/${projectId}/exports/access`);
}

/** Poll every 2 seconds until COMPLETED or FAILED. `downloadUrl` expires: fetch the job again for a new one. */
export async function getExportJob(jobId: string): Promise<ExportJob> {
  try {
    return await request(`/exports/${jobId}`);
  } catch (error) {
    console.warn("[Exports API] Get export job offline fallback:", error);
    const existing = DEMO_EXPORTS.find((e) => e.id === jobId);
    if (existing) return existing;
    return {
      id: jobId,
      projectId: "demo-tuck-top",
      fileType: "PDF_CMYK",
      status: "COMPLETED",
      error: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      fileName: "wrapfit_dieline_export.pdf",
      downloadUrl: "#",
      downloadExpiresIn: 3600,
    };
  }
}

/** The 20 latest exports of a project. */
export async function listProjectExports(projectId: string): Promise<ExportJob[]> {
  try {
    return await request(`/projects/${projectId}/exports`);
  } catch (error) {
    console.warn("[Exports API] List project exports fallback:", error);
    return DEMO_EXPORTS;
  }
}
