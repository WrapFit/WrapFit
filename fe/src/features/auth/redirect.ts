import { DEFAULT_AFTER_LOGIN, ROUTES } from "@/constants";
import type { SafeUser } from "@/types/api";
import { ADMIN_HOME, isRealAdmin } from "./roles";

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

/** Set once the home tour has run: from then on a sign-in opens the workspace instead of the home page. */
export const ONBOARDING_TOUR_ID = "home-v1";

/**
 * Where to go after signing in (browser only). An explicit `?redirect=` wins; otherwise a first-time user lands on
 * the home page, where the guided tour walks through the product, and a returning one on the dashboard.
 */
export function afterSignInTarget(redirect: string | null | undefined, user?: SafeUser | null): string {
  const explicit = safeRedirect(redirect, "");
  // An administrator goes to the admin console: no maker onboarding, and a `?redirect=` only into /admin.
  if (user && isRealAdmin(user)) return explicit.startsWith(ADMIN_HOME) ? explicit : ADMIN_HOME;
  if (explicit) return explicit;
  let onboarded = true;
  try {
    onboarded = window.localStorage.getItem(`wrapfit.tour.${ONBOARDING_TOUR_ID}`) !== null;
  } catch {
    // Storage blocked: treat as returning, never loop through the home page.
  }
  return onboarded ? DEFAULT_AFTER_LOGIN : `${ROUTES.home}?welcome=1`;
}

/** Login page that comes back to `path` (path + query of the current page) once signed in. */
export function loginUrl(path?: string): string {
  const redirect = safeRedirect(path, "");
  return redirect ? `${ROUTES.login}?redirect=${encodeURIComponent(redirect)}` : ROUTES.login;
}
