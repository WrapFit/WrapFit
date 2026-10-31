/**
 * HTTP client of the WrapFit NestJS API. The session lives in two HttpOnly cookies (`wf_access`, `wf_refresh`), so
 * every request sends credentials and no token is ever handled in JavaScript (docs/06, section 1).
 * Endpoint functions live in `src/api/<module>`.
 */

import { API_BASE_URL } from "@/config";
import type { ApiErrorBody, ApiErrorCode } from "@/types/api";

/** Dispatched on `window` when the session cannot be refreshed any more: the user must sign in again. */
export const SESSION_EXPIRED_EVENT = "wrapfit:session-expired";

/** Error of a failed API call. `status` 0 = the server could not be reached. */
export class ApiError extends Error {
  readonly code?: ApiErrorCode;
  /** One entry per invalid field for validation errors. */
  readonly messages: string[];
  readonly requestId?: string;
  /** Seconds to wait, from the `Retry-After` header of a 429. */
  readonly retryAfter?: number;

  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
    options: { requestId?: string | null; retryAfter?: number; cause?: unknown } = {},
  ) {
    const messages = body ? [body.message].flat().map(String) : [];
    super(messages[0] ?? (status === 0 ? "Network error" : `HTTP ${status}`), { cause: options.cause });
    this.name = "ApiError";
    this.code = body?.code;
    this.messages = messages;
    this.requestId = body?.requestId ?? options.requestId ?? undefined;
    this.retryAfter = options.retryAfter;
  }

  /** 409 PROJECT_VERSION_CONFLICT: version of the project on the server. */
  get currentVersion(): number | undefined {
    return this.body?.currentVersion;
  }

  /** 422 on export: FitCheck report with the blocking violations. */
  get fitCheck() {
    return this.body?.fitCheck;
  }
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  headers?: Record<string, string>;
  /** Sent as JSON. */
  json?: unknown;
  /** Raw body (FormData, Blob…), sent as is. */
  body?: BodyInit;
  /** Query string; undefined, null and "" values are left out. */
  query?: object;
}

// Their 401 means "wrong credentials" or "no session", never "access cookie expired": no refresh.
const NO_REFRESH_PATHS = /^\/auth\/(login|register|refresh|logout|verify-email|password\/)/;

/**
 * Result of `POST /auth/refresh`. Only a 401 ends the session; a rate limit, a server error or a lost connection says
 * nothing about it, so the caller keeps the user signed in and reports the error instead.
 */
type RefreshOutcome = { ok: true } | { ok: false; expired: true } | { ok: false; expired: false; error: ApiError };

/** Longest `Retry-After` the client waits for before trying a rate-limited refresh again. */
const REFRESH_RETRY_MAX_SECONDS = 10;

let refreshing: Promise<RefreshOutcome> | null = null;

const postRefresh = () => fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });

/** One refresh at a time: parallel requests (and their retries) share it. */
function refreshSession(): Promise<RefreshOutcome> {
  refreshing ??= (async (): Promise<RefreshOutcome> => {
    try {
      let res = await postRefresh();
      if (res.status === 429) {
        // Refused before the token was looked at: the same cookie may try once more after the wait.
        const wait = retryAfterSeconds(res) ?? 1;
        if (wait <= REFRESH_RETRY_MAX_SECONDS) {
          await new Promise((resolve) => setTimeout(resolve, wait * 1000));
          res = await postRefresh();
        }
      }
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, expired: true };
      return { ok: false, expired: false, error: await errorFrom(res) };
    } catch (cause) {
      // No answer. Not retried: the server may have rotated the token already, and the user stays signed in.
      return { ok: false, expired: false, error: new ApiError(0, null, { cause }) };
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export function buildUrl(endpoint: string, query?: object): string {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as [string, QueryValue][]) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}${url.includes("?") ? "&" : "?"}${search}` : url;
}

function retryAfterSeconds(res: Response): number | undefined {
  const seconds = Number(res.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

async function errorFrom(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "statusCode" in data) body = data as ApiErrorBody;
  } catch {
    // Not JSON (e.g. the dev proxy answers "Internal Server Error" while the API is down).
  }
  return new ApiError(res.status, body, {
    requestId: res.headers.get("X-Request-Id"),
    retryAfter: retryAfterSeconds(res),
  });
}

/**
 * Calls the API and returns the parsed JSON (`undefined` for 204). Throws `ApiError`.
 * A 401 is answered by one `POST /auth/refresh` and one retry. A refresh answered 401 means the session is over:
 * `SESSION_EXPIRED_EVENT` fires. Any other refresh failure (429 after one wait, 5xx, offline) is thrown as that error,
 * and the user stays signed in.
 */
export async function request<T>(endpoint: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { json, body, query, headers, ...init } = options;
  let res: Response;
  try {
    res = await fetch(buildUrl(endpoint, query), {
      ...init,
      credentials: "include",
      headers: json === undefined ? headers : { "Content-Type": "application/json", ...headers },
      body: json === undefined ? body : JSON.stringify(json),
    });
  } catch (cause) {
    if (init.signal?.aborted) throw cause;
    throw new ApiError(0, null, { cause });
  }

  if (res.status === 401 && retry && !NO_REFRESH_PATHS.test(endpoint)) {
    const refreshed = await refreshSession();
    if (refreshed.ok) return request<T>(endpoint, options, false);
    if (!refreshed.expired) throw refreshed.error;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const CODE_MESSAGES: Record<ApiErrorCode, string> = {
  EMAIL_NOT_VERIFIED: "Email chưa được xác minh. Hãy mở thư xác nhận trong hộp thư của bạn.",
  AUTH_TOKEN_INVALID: "Link không còn hiệu lực. Hãy yêu cầu gửi email mới.",
  AUTH_TOKEN_EXPIRED: "Link đã hết hạn. Hãy yêu cầu gửi email mới.",
  AUTH_TOKEN_CONSUMED: "Link này đã được dùng. Hãy đăng nhập.",
  FILE_URL_NOT_ALLOWED: "Ảnh phải được tải lên WrapFit trước khi dùng.",
  FILE_NOT_OWNED: "Chỉ dùng được ảnh do bạn tải lên.",
  PROJECT_VERSION_CONFLICT: "Dự án vừa được lưu ở tab hoặc thiết bị khác.",
  ORIGIN_NOT_ALLOWED: "Yêu cầu phải được gửi từ trang WrapFit.",
  EXPORT_CREDIT_REQUIRED: "File sạch cần dùng 1 lượt xuất.",
  INSUFFICIENT_CREDITS: "Bạn đã hết lượt xuất file.",
  PROMPT_REJECTED: "Mô tả này có nội dung WrapFit không thể in. Hãy thử mô tả khác.",
  AI_IMAGE_UNAVAILABLE: "Tạo ảnh AI đang tạm dừng. Thử lại sau ít phút.",
  AI_IMAGE_BUSY: "Chờ các ảnh đang tạo xong rồi tạo tiếp.",
  STORAGE_QUOTA_EXCEEDED: "Bộ nhớ của gói đã đầy. Xoá bớt ảnh hoặc nâng cấp gói.",
};

/** Codes whose server message is written for the user (Vietnamese, with the details): shown as sent. */
const SERVER_WORDED_CODES: ReadonlySet<ApiErrorCode> = new Set(["PROMPT_REJECTED", "AI_IMAGE_UNAVAILABLE", "AI_IMAGE_BUSY"]);

/** Vietnamese message for a failed call (docs/06, section 2). Validation errors keep the server's field messages. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  if (error.code === "INSUFFICIENT_CREDITS" && error.body?.kind === "XU") {
    return `Cần ${error.body.cost ?? "thêm"} xu, bạn còn ${error.body.balance ?? 0} xu. Nạp thêm xu ở trang Thanh toán & gói.`;
  }
  if (error.code && SERVER_WORDED_CODES.has(error.code) && error.messages[0]) return error.messages[0];
  // Codes without their own text (e.g. 429 LOGIN_RATE_LIMITED) fall back to the message of their status.
  if (error.code && Object.prototype.hasOwnProperty.call(CODE_MESSAGES, error.code)) return CODE_MESSAGES[error.code];
  switch (error.status) {
    case 0:
      return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
    case 400:
      return error.messages.length ? error.messages.join("; ") : "Dữ liệu không hợp lệ.";
    case 401:
      return error.body?.path.endsWith("/auth/login")
        ? "Email hoặc mật khẩu không đúng, hoặc email này chưa được đăng ký."
        : "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
    case 403:
      // The only 403 of an upload request: the files already stored fill the quota of the subscription tier.
      return error.body?.path.endsWith("/storage/presigned-upload")
        ? "Đã hết dung lượng lưu trữ của gói. Xoá bớt dự án hoặc nâng cấp gói để tải thêm."
        : "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu.";
    case 409:
      return "Thao tác không thực hiện được ở trạng thái hiện tại. Tải lại trang rồi thử lại.";
    case 413:
      return "Tệp quá lớn so với giới hạn cho phép.";
    case 422:
      return "FitCheck còn lỗi. Hãy sửa trước khi xuất file in.";
    case 429:
      return error.retryAfter
        ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
        : "Bạn thao tác quá nhanh. Thử lại sau ít phút.";
    case 503:
      return "Dịch vụ tạm thời gián đoạn. Thử lại sau ít phút.";
    default:
      return error.status >= 500 ? "Máy chủ gặp lỗi. Thử lại sau ít phút." : error.message;
  }
}
