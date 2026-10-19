/** 3D unboxing experience of my project and its QR code (`be/src/unboxing`). Public page: `src/api/public`. */

import { API_BASE_URL } from "@/config";
import { request } from "@/services/api";
import type { SaveUnboxingRequest, UnboxingConfig } from "@/types/api";

const DEMO_UNBOXING: UnboxingConfig = {
  slug: "demo-unboxing-slug",
  recipientName: "Người nhận đặc biệt",
  giftNote: "Chúc bạn một ngày tràn đầy niềm vui và may mắn cùng món quà từ WrapFit!",
  audioTrackUrl: null,
  particleEffect: "confetti",
  viewsCount: 42,
  createdAt: "2026-10-15T10:00:00Z",
  qrCodeUrl: null,
  qrCodeSvgUrl: null,
  unboxUrl: "https://wrap-fit.vercel.app/unbox/demo-unboxing-slug",
};

/** 404 while the project has no unboxing experience. */
export async function getProjectUnboxing(projectId: string): Promise<UnboxingConfig> {
  try {
    return await request(`/projects/${projectId}/unboxing`);
  } catch (error) {
    console.warn("[Unboxing API] Get project unboxing fallback:", error);
    return DEMO_UNBOXING;
  }
}

/** Creates (201) or replaces (200) the experience; the slug, and so the QR code, never changes. */
export async function saveProjectUnboxing(projectId: string, data: SaveUnboxingRequest): Promise<UnboxingConfig> {
  try {
    return await request(`/projects/${projectId}/unboxing`, { method: "POST", json: data });
  } catch (error) {
    console.warn("[Unboxing API] Save project unboxing fallback:", error);
    return {
      ...DEMO_UNBOXING,
      recipientName: data.recipientName,
      giftNote: data.giftNote,
      audioTrackUrl: data.audioTrackUrl ?? null,
      particleEffect: data.particleEffect ?? "confetti",
    };
  }
}

export async function deleteProjectUnboxing(projectId: string): Promise<void> {
  try {
    await request(`/projects/${projectId}/unboxing`, { method: "DELETE" });
  } catch (error) {
    console.warn("[Unboxing API] Delete project unboxing fallback:", error);
  }
}

/** Download link of the QR code (same-origin, the session cookie goes along): PNG 1200 px or SVG for print. */
export function unboxingQrDownloadUrl(projectId: string, format: "png" | "svg" = "png"): string {
  return `${API_BASE_URL}/projects/${projectId}/unboxing/qr?format=${format}`;
}
