/** Request and answer of the in-browser API of the offline demo, and the errors it answers with. */

import type { ApiErrorBody, ApiErrorCode } from "@/types/api";
import { db, getSessionUserId, type MockUser } from "./store";

export interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
  params: Record<string, string>;
}

export type Handler = (req: MockRequest) => unknown | Promise<unknown>;

/** Thrown by a handler: becomes an `ApiError` with this status and body, like an error of the real API. */
export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string | string[],
    /** `code` may be one the web types do not list yet (ORDER_PAYMENT_REQUIRED, INVALID_PROMO), as on the API. */
    readonly extra: Omit<Partial<ApiErrorBody>, "code"> & { code?: ApiErrorCode | (string & {}) } = {},
  ) {
    super([message].flat()[0]);
  }

  body(path: string): ApiErrorBody {
    return {
      statusCode: this.status,
      error: STATUS_TEXT[this.status] ?? "Error",
      message: [this.message],
      path: `/api${path}`,
      requestId: `demo-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      ...(this.extra as Partial<ApiErrorBody>),
    };
  }
}

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  503: "Service Unavailable",
};

export const badRequest = (message: string | string[]) => new MockHttpError(400, message);
export const notFound = (what = "Không tìm thấy dữ liệu.") => new MockHttpError(404, what);
export const conflict = (message: string, extra: Partial<ApiErrorBody> = {}) => new MockHttpError(409, message, extra);

/** The signed-in user; 401 when nobody is (the client then reports the session as expired). */
export function currentUser(): MockUser {
  const user = db().users.find((u) => u.id === getSessionUserId() && u.isActive);
  if (!user) throw new MockHttpError(401, "Bạn cần đăng nhập.");
  return user;
}

export function requireAdmin(): MockUser {
  const user = currentUser();
  if (user.role !== "ADMIN") throw new MockHttpError(403, "Chỉ quản trị viên được dùng chức năng này.");
  return user;
}

/** Answers like the real API's pages: `{ items, meta }`. */
export function paginate<T>(items: T[], query: URLSearchParams, defaultLimit = 20) {
  const page = Math.max(1, Number(query.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.get("limit")) || defaultLimit));
  const total = items.length;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** Cursor pages (`before` = createdAt of the last row shown), newest first. */
export function cursorPage<T extends { createdAt: string }>(rows: T[], query: URLSearchParams, defaultLimit = 20) {
  const before = query.get("before");
  const limit = Math.min(100, Math.max(1, Number(query.get("limit")) || defaultLimit));
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((row) => !before || row.createdAt < before);
  const entries = sorted.slice(0, limit);
  return { entries, nextBefore: sorted.length > limit ? entries[entries.length - 1].createdAt : null };
}
