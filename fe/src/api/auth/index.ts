/** Accounts and sessions (`be/src/auth`). Flows and error codes: docs/06, sections 1 and 3. */

import { API_BASE_URL } from "@/config";
import { request } from "@/services/api";
import type { AuthSession, LoginRequest, RegisterRequest, RegisterResponse, SafeUser } from "@/types/api";

/** Always 201 with the same body, also for an address that already has an account. Opens no session. */
export function register(data: RegisterRequest): Promise<RegisterResponse> {
  return request("/auth/register", { method: "POST", json: data });
}

/** Sets the session cookies. 403 EMAIL_NOT_VERIFIED: send the user to /check-email. */
export function login(data: LoginRequest): Promise<AuthSession> {
  return request("/auth/login", { method: "POST", json: data });
}

/** 401 = not signed in. */
export function getCurrentUser(): Promise<SafeUser> {
  return request("/auth/me");
}

export function logout(): Promise<void> {
  return request("/auth/logout", { method: "POST" });
}

/** Signs out every device of the user. */
export function logoutAll(): Promise<void> {
  return request("/auth/logout-all", { method: "POST" });
}

/** Token of the `/verify-email?token=` link. Opening the same link again still answers 200. */
export function verifyEmail(token: string): Promise<{ verified: true }> {
  return request("/auth/verify-email", { method: "POST", json: { token } });
}

/** Always 202; the previous link stops working. */
export function resendVerificationEmail(email: string): Promise<Record<string, never>> {
  return request("/auth/verify-email/resend", { method: "POST", json: { email } });
}

/** Always 202; the link is valid 30 minutes. */
export function requestPasswordReset(email: string): Promise<Record<string, never>> {
  return request("/auth/password/forgot", { method: "POST", json: { email } });
}

/** For both `/reset-password` and `/complete-signup` links. Signs out every session. */
export function resetPassword(token: string, password: string): Promise<Record<string, never>> {
  return request("/auth/password/reset", { method: "POST", json: { token, password } });
}

/**
 * Address to navigate the browser to (not fetch) for "Sign in with Google". `redirect` is the internal path to open
 * after signing in.
 */
export function googleSignInUrl(redirect?: string): string {
  const query = redirect ? `?${new URLSearchParams({ redirect })}` : "";
  return `${API_BASE_URL}/auth/google${query}`;
}
