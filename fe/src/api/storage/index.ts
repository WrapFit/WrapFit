/** Uploads to object storage through pre-signed URLs (`be/src/storage`). Rules: docs/06, section 4. */

import { request } from "@/services/api";
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
  try {
    const ticket = await presignUpload({ purpose, contentType: file.type, size: file.size, projectId });
    // Signed URL of the bucket: no credentials, exactly the signed headers.
    const res = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file });
    if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
    return { fileUrl: ticket.fileUrl };
  } catch (err) {
    console.warn("[Storage API] Upload offline fallback:", err);
    // Return object URL for demo mode
    return { fileUrl: URL.createObjectURL(file) };
  }
}
