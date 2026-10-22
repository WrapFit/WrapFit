/** 3D unboxing experience of my project and its QR code (`be/src/unboxing`). Public page: `src/api/public`. */

import { API_BASE_URL } from "@/config";
import { request } from "@/services/api";
import type { SaveUnboxingRequest, UnboxingConfig } from "@/types/api";

/** 404 while the project has no unboxing experience. */
export function getProjectUnboxing(projectId: string): Promise<UnboxingConfig> {
  return request(`/projects/${projectId}/unboxing`);
}

/** Creates (201) or replaces (200) the experience; the slug, and so the QR code, never changes. */
export function saveProjectUnboxing(projectId: string, data: SaveUnboxingRequest): Promise<UnboxingConfig> {
  return request(`/projects/${projectId}/unboxing`, { method: "POST", json: data });
}

export async function deleteProjectUnboxing(projectId: string): Promise<void> {
  await request(`/projects/${projectId}/unboxing`, { method: "DELETE" });
}

/** Download link of the QR code (same-origin, the session cookie goes along): PNG 1200 px or SVG for print. */
export function unboxingQrDownloadUrl(projectId: string, format: "png" | "svg" = "png"): string {
  return `${API_BASE_URL}/projects/${projectId}/unboxing/qr?format=${format}`;
}
