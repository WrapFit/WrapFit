/** Labels, colours, dates and page filters of the admin account list. */

import { ROLE_LABELS } from "@/constants";
import type { Role, SafeUser } from "@/types/api";

export { ROLE_LABELS, TIER_LABELS } from "@/constants";

export const ROLES: readonly Role[] = ["MAKER", "PRO_ARTISAN", "PRINT_SHOP", "ADMIN"];

/** Badge, dot and avatar colours per role, taken from the Stitch screen's own palette. */
export const ROLE_TONES: Record<Role, { badge: string; dot: string; avatar: string }> = {
  ADMIN: {
    badge: "bg-primary-fixed/40 text-primary",
    dot: "bg-primary-container",
    avatar: "bg-primary-fixed text-primary",
  },
  PRINT_SHOP: {
    badge: "bg-tertiary-fixed/30 text-tertiary",
    dot: "bg-tertiary",
    avatar: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
  PRO_ARTISAN: {
    badge: "bg-secondary-container/50 text-secondary",
    dot: "bg-secondary",
    avatar: "bg-secondary-container text-on-secondary-container",
  },
  MAKER: {
    badge: "bg-surface-container-high text-on-surface-variant",
    dot: "bg-outline",
    avatar: "bg-surface-container text-on-surface-variant",
  },
};

/** Shown on the controls of the signed-in admin's own row; the API refuses these changes too (400). */
export const SELF_EDIT_HINT = "Không thể tự sửa tài khoản của mình";

export function displayName(user: SafeUser): string {
  return user.fullName?.trim() || user.email;
}

/** First letters of the first and last words of the name (or of the email's local part). */
export function initials(user: SafeUser): string {
  const source = user.fullName?.trim() || user.email.split("@")[0];
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const first = (word: string | undefined) => (word ? Array.from(word)[0] : "");
  const letters =
    words.length > 1 ? first(words[0]) + first(words[words.length - 1]) : Array.from(source).slice(0, 2).join("");
  return letters.toUpperCase() || "?";
}

const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const COUNT = new Intl.NumberFormat("vi-VN");

export const formatDate = (iso: string) => DATE.format(new Date(iso));
export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));
export const formatTime = (epochMs: number) => TIME.format(new Date(epochMs));
export const formatCount = (value: number) => COUNT.format(value);

// ---------------------------------------------------------------- page filters

/** `GET /users` cannot search or filter: these narrow the rows of the loaded page only. */
export type AccountFilter = "all" | Role | "unverified" | "locked";

export const ACCOUNT_FILTERS: readonly { id: AccountFilter; label: string; countTone: string }[] = [
  { id: "all", label: "Tất cả", countTone: "text-on-surface-variant" },
  { id: "MAKER", label: ROLE_LABELS.MAKER, countTone: "text-on-surface-variant" },
  { id: "PRO_ARTISAN", label: ROLE_LABELS.PRO_ARTISAN, countTone: "text-secondary" },
  { id: "PRINT_SHOP", label: ROLE_LABELS.PRINT_SHOP, countTone: "text-tertiary" },
  { id: "ADMIN", label: ROLE_LABELS.ADMIN, countTone: "text-primary" },
  { id: "unverified", label: "Chưa xác minh", countTone: "text-error" },
  { id: "locked", label: "Đã khoá", countTone: "text-error" },
];

export function matchesFilter(user: SafeUser, filter: AccountFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unverified":
      return !user.emailVerifiedAt;
    case "locked":
      return !user.isActive;
    default:
      return user.role === filter;
  }
}

/** Lower case without Vietnamese diacritics, so "nguyen" finds "Nguyễn". */
export function foldText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

/** `foldedQuery` comes from `foldText`; an empty query matches everyone. */
export function matchesSearch(user: SafeUser, foldedQuery: string): boolean {
  if (!foldedQuery) return true;
  return [user.fullName, user.email, user.shopName].some((field) => field && foldText(field).includes(foldedQuery));
}
