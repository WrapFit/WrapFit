import { DEFAULT_AFTER_LOGIN, ROUTES } from "@/constants";

/**
 * The `?redirect=` target after signing in, or `fallback`. Only paths of this site are followed: "//host" and
 * "/\host" mean another origin to browsers, and the auth pages themselves would loop.
 */
export function safeRedirect(value: string | null | undefined, fallback: string = DEFAULT_AFTER_LOGIN): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value) || value.startsWith("/auth/")) return fallback;
  return value;
}

/** Login page that comes back to `path` (path + query of the current page) once signed in. */
export function loginUrl(path?: string): string {
  const redirect = safeRedirect(path, "");
  return redirect ? `${ROUTES.login}?redirect=${encodeURIComponent(redirect)}` : ROUTES.login;
}
