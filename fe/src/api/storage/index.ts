/** Uploads to object storage through pre-signed URLs (`be/src/storage`). Rules: docs/06, section 4. */

import { OFFLINE_DEMO } from "@/config";
import { ApiError, request } from "@/services/api";
import type { PresignedUpload, PresignUploadRequest, StorageUsage, UploadPurpose } from "@/types/api";
import { DEMO_STORAGE_USAGE } from "@/features/dashboard/demoData";

/** 400 wrong format, 413 too large, 403 quota exceeded, 503 storage not configured. */
export function presignUpload(data: PresignUploadRequest): Promise<PresignedUpload> {
  return request("/storage/presigned-upload", { method: "POST", json: data });
}

export async function getStorageUsage(): Promise<StorageUsage> {
  try {
    return await request("/storage/usage");
  } catch (error) {
    console.warn("[Storage API] Failed to fetch storage usage, using demo fallback:", error);
    return DEMO_STORAGE_USAGE;
  }
}

/**
 * Uploads a file straight to object storage and returns its URL (for canvasState, thumbnailUrl, avatarUrl...).
 * Throws when the API or the upload fails: the API only accepts files uploaded to WrapFit, so there is no
 * offline fallback (never use a data URL).
 */
export async function uploadFileToStorage(
  file: File | Blob,
  purpose: UploadPurpose = "IMAGE",
  projectId?: string,
): Promise<{ fileUrl: string }> {
  if (OFFLINE_DEMO) {
    // No object storage without a backend: the demo keeps the file in the browser (see mockUpload).
    const { mockUpload } = await import("@/services/mock-api");
    return { fileUrl: await mockUpload(file, purpose) };
  }
  let ticket: PresignedUpload;
  try {
    ticket = await presignUpload({ purpose, contentType: file.type, size: file.size, projectId });
  } catch (err) {
    // Backend out of reach (a deploy without its API): keep the image like the offline demo, as a data URL that
    // survives a reload. A real refusal (format, size, quota) is the user's to see.
    const unreachable = !(err instanceof ApiError) || err.status === 0 || err.status === 404 || err.status >= 500;
    if (!unreachable) throw err;
    console.warn("[Storage API] Backend unreachable, keeping the upload in the browser:", err);
    const { mockUpload } = await import("@/services/mock-api");
    return { fileUrl: await mockUpload(file, purpose) };
  }
  // Signed URL of the bucket: no credentials, exactly the signed headers.
  const res = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file });
  // No blob: URL fallback: the image would show in this tab only, the save would be refused and it would vanish.
  if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
  return { fileUrl: ticket.fileUrl };
}
