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

/** Name of the home tour; its "seen" flag lives under `wrapfit.tour.<id>` (localStorage). */
export const ONBOARDING_TOUR_ID = "home-v1";

/** Home page opened after signing in: `?welcome=1` starts the guided tour there (views/home). */
export const WELCOME_HOME = `${ROUTES.home}?welcome=1`;

/**
 * Where to go after signing in. An explicit `?redirect=` wins; otherwise a maker lands on the home page with the
 * guided tour (skippable). The tour used to run once per browser, so any later sign-in, another account or one
 * after the demo, opened the dashboard with no guide.
 */
export function afterSignInTarget(redirect: string | null | undefined, user?: SafeUser | null): string {
  const explicit = safeRedirect(redirect, "");
  // An administrator goes to the admin console: no maker onboarding, and a `?redirect=` only into /admin.
  if (user && isRealAdmin(user)) return explicit.startsWith(ADMIN_HOME) ? explicit : ADMIN_HOME;
  return explicit || WELCOME_HOME;
}

/** Login page that comes back to `path` (path + query of the current page) once signed in. */
export function loginUrl(path?: string): string {
  const redirect = safeRedirect(path, "");
  return redirect ? `${ROUTES.login}?redirect=${encodeURIComponent(redirect)}` : ROUTES.login;
}
