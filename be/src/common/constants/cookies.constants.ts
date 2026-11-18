/**
 * Auth cookies, set by the auth module and read by every authenticated route (the Swagger docs of each controller name
 * ACCESS_COOKIE). Kept in common/ so feature modules do not depend on the auth module for a cookie name.
 */

/** Short-lived access token. Path `/api` so every API route (and the Socket.IO endpoint `/api/socket.io`) receives it. */
export const ACCESS_COOKIE = 'wf_access';

/** Long-lived refresh token. Path `/api/auth` so it is only sent to refresh / logout routes. */
export const REFRESH_COOKIE = 'wf_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

/**
 * Name prefix of every cookie the API sets while cookies are `Secure` (production, AuthCookieService). Browsers only
 * accept a `__Secure-` cookie with `Secure` from an https origin, so an http page or a sibling site that can write
 * plain cookies for the domain cannot plant one.
 */
export const SECURE_COOKIE_PREFIX = '__Secure-';

/**
 * A cookie of the API under its `__Secure-` name, else under its plain name (the only one outside production).
 * shortcut: in production the plain name is still read for one release after 2026-11-16, so sessions opened before
 * the prefix stay signed in; in the next release read only the name AuthCookieService sets for the environment.
 */
export function readCookie(cookies: Record<string, unknown> | undefined, name: string): string | undefined {
  for (const key of [SECURE_COOKIE_PREFIX + name, name]) {
    const value = cookies?.[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}
