/**
 * The API of the offline demo, run in the browser. `request()` of `@/services/api` sends every call here when the build
 * has no backend (`OFFLINE_DEMO`): sign-up and sign-in, projects, the studio's saves, uploads, the xu wallet, payments
 * (simulated), sample orders and the admin console all work against `./store`, kept in localStorage.
 *
 * An endpoint without a handler answers like an unreachable server (status 0), so the demo fallbacks of `src/api`
 * (templates, print shops…) take over as before.
 */

import type { UploadPurpose } from "@/types/api";
import { MockHttpError, type Handler, type MockRequest } from "./http";
import { accountRoutes, recordUpload } from "./handlers/account";
import { billingRoutes } from "./handlers/billing";
import { orderRoutes } from "./handlers/orders";
import { platformRoutes } from "./handlers/platform";
import { projectRoutes } from "./handlers/projects";

export { resetMockDb } from "./store";

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

// Order matters: fixed paths (`/users/me`) before parameters (`/users/:id`).
const ROUTES: Route[] = [...accountRoutes, ...projectRoutes, ...billingRoutes, ...orderRoutes, ...platformRoutes].map(([method, path, handler]) => {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:([A-Za-z]+)/g, (_, key: string) => {
      keys.push(key);
      return "([^/]+)";
    })}$`,
  );
  return { method, pattern, keys, handler };
});

export type MockAnswer = { handled: false } | { handled: true; status: number; body: unknown };

/** A short wait, so loaders and optimistic updates behave as with a real server. */
const latency = () => new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));

export async function mockRequest(method: string, url: string, json: unknown): Promise<MockAnswer> {
  const parsed = new URL(url, "http://demo.local");
  const path = parsed.pathname.replace(/^\/api(?=\/)/, "").replace(/\/+$/, "") || "/";
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(path);
    if (!match) continue;
    const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
    const req: MockRequest = {
      method,
      path,
      query: parsed.searchParams,
      body: json && typeof json === "object" ? (json as Record<string, unknown>) : {},
      params,
    };
    await latency();
    try {
      const body = await route.handler(req);
      return { handled: true, status: body === undefined ? 204 : method === "POST" ? 201 : 200, body };
    } catch (error) {
      if (error instanceof MockHttpError) return { handled: true, status: error.status, body: error.body(path) };
      console.error("[Demo API]", method, path, error);
      return { handled: true, status: 500, body: new MockHttpError(500, "Bản demo gặp lỗi khi xử lý yêu cầu.").body(path) };
    }
  }
  return { handled: false };
}

/** Longest side of an uploaded image kept in the browser: enough for print previews, small enough for localStorage. */
const MAX_SIDE = 1600;

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * "Uploads" a file of the demo: an image is scaled down and kept as a data URL (it survives a reload, unlike a blob URL),
 * and its size counts against the plan's storage like on the server.
 */
export async function mockUpload(file: Blob, purpose: UploadPurpose): Promise<string> {
  let blob = file;
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height), purpose === "AVATAR" ? 512 / Math.max(bitmap.width, bitmap.height) : 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      // WebP keeps transparency (logos, stickers) at a fraction of the PNG size.
      const scaled = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
      if (scaled && scaled.size < file.size) blob = scaled;
    } catch {
      // Not decodable here (HEIC…): keep the file as it is.
    }
  }
  try {
    recordUpload(blob.size, purpose);
  } catch {
    // Signed out: the upload is kept anyway (e.g. an avatar chosen before signing in).
  }
  return readAsDataUrl(blob);
}
