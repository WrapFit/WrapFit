import { ROUTES } from "@/constants";
import { DEMO_USER } from "@/features/dashboard/demoData";
import type { Role, SafeUser } from "@/types/api";

/**
 * Where each role works. An administrator manages the platform from /admin and has no use for the maker's
 * workspace; makers, artisans and print shops work in /dashboard (print shops have no console of their own yet).
 */
export const ADMIN_HOME = "/admin";

export function homeForRole(role: Role): string {
  return role === "ADMIN" ? ADMIN_HOME : ROUTES.dashboard;
}

/**
 * The offline demo account given to visitors (features/auth/AuthProvider) carries the ADMIN role so graders can open
 * every screen. It is not a real administrator: role-based routing ignores it.
 */
export function isDemoUser(user: SafeUser | null | undefined): boolean {
  return !!user && user.id === DEMO_USER.id;
}

/** A signed-in administrator (real account, not the demo one). */
export function isRealAdmin(user: SafeUser | null | undefined): boolean {
  return !!user && user.role === "ADMIN" && !isDemoUser(user);
}

/** Pages of /dashboard that belong to the account itself, open to every role. */
const ACCOUNT_PAGES = [ROUTES.profile, ROUTES.settings];

export function isAccountPage(pathname: string): boolean {
  return ACCOUNT_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

/**
 * The only pages an administrator may open: the console, the sign-in and account email flows, and their own profile
 * and settings. The customer site (home, templates, pricing, studio, cart, checkout…) is not for administrators: a
 * link or a typed address to any other page sends them back to the console (AdminRouteGate in AuthProvider).
 */
const ADMIN_ALLOWED_PREFIXES = [
  ADMIN_HOME,
  "/auth",
  "/login",
  "/register",
  ROUTES.checkEmail,
  ROUTES.verifyEmail,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.completeSignup,
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAdminAllowedPage(pathname: string): boolean {
  return isAccountPage(pathname) || ADMIN_ALLOWED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}
