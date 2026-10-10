/** Display helpers for the signed-in user in the header and menus. */

import { ROUTES } from "@/constants";
import { loginUrl } from "@/features/auth";
import type { SafeUser } from "@/types/api";

export { ROLE_LABELS, TIER_LABELS } from "@/constants";

/** Full name, or the local part of the email for accounts without one (e.g. signed up without a name). */
export function displayName(user: Pick<SafeUser, "fullName" | "email">): string {
  return user.fullName?.trim() || user.email.split("@")[0];
}

/** Up to two letters for the avatar placeholder. */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => Array.from(part)[0] ?? "")
    .join("");
  return (letters.length > 2 ? Array.from(letters).slice(0, 2).join("") : letters).toUpperCase() || "W";
}

/** "Đăng nhập" target that comes back to this page; from the home page, the default after login (dashboard). */
export function loginHref(pathname: string | null): string {
  return !pathname || pathname === ROUTES.home ? ROUTES.login : loginUrl(pathname);
}
