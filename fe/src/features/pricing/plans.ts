import {
  BUSINESS_MONTH_DISPLAY,
  ENTITLEMENTS,
  PLAN_LABELS,
  PLAN_ORDER as SHARED_PLAN_ORDER,
  PRO_MONTH,
  XU_ALLOWANCE,
} from "@wrapfit/shared";
import type { SubscriptionTier } from "@/types/api";

// Display layer over @wrapfit/shared/billing (docs/17 S6): names, prices and storage come from shared, the same numbers
// the backend charges and enforces, xu per period included (XU_ALLOWANCE, docs/19).

export interface PlanPrice {
  /** VNĐ per month (Pro, Business). 0 for Free and for PAY_PER_EXPORT (its packs are no longer sold). */
  monthly: number;
}

export interface Plan {
  tier: SubscriptionTier;
  /** Display name, the same on every screen: Miễn phí, Lượt xuất, Pro, Business. */
  name: string;
  price: PlanPrice;
  storageBytes: number;
  /** Xu Wrap granted each period (calendar month, or 30-day period of a paid plan); unspent xu roll over once. */
  xuPerPeriod: number;
  badge?: string;
  /** Not sold online yet: the pricing page shows a "Liên hệ" button (docs/17 M4). */
  contactOnly?: boolean;
}

const MB = 1024 * 1024;

export const PRO_PERIOD_DAYS = PRO_MONTH.periodDays;

export const PLANS: Record<SubscriptionTier, Plan> = {
  FREE: {
    tier: "FREE",
    name: PLAN_LABELS.FREE,
    price: { monthly: 0 },
    storageBytes: ENTITLEMENTS.FREE.storage.bytes,
    xuPerPeriod: XU_ALLOWANCE.FREE,
    badge: "Bắt đầu miễn phí",
  },
  // Export packs are no longer sold (docs/25 item 7): kept for the accounts that bought one, until it expires.
  PAY_PER_EXPORT: {
    tier: "PAY_PER_EXPORT",
    name: PLAN_LABELS.PAY_PER_EXPORT,
    price: { monthly: 0 },
    storageBytes: ENTITLEMENTS.PAY_PER_EXPORT.storage.bytes,
    xuPerPeriod: XU_ALLOWANCE.PAY_PER_EXPORT,
  },
  STARTER: {
    tier: "STARTER",
    name: PLAN_LABELS.STARTER,
    price: { monthly: PRO_MONTH.priceVnd },
    storageBytes: ENTITLEMENTS.STARTER.storage.bytes,
    xuPerPeriod: XU_ALLOWANCE.STARTER,
    badge: "Phổ biến nhất",
  },
  PRO_BUSINESS: {
    tier: "PRO_BUSINESS",
    name: PLAN_LABELS.PRO_BUSINESS,
    price: { monthly: BUSINESS_MONTH_DISPLAY.priceVnd },
    storageBytes: ENTITLEMENTS.PRO_BUSINESS.storage.bytes,
    xuPerPeriod: XU_ALLOWANCE.PRO_BUSINESS,
    badge: "Cho xưởng & studio",
    contactOnly: true,
  },
};

export const PLAN_ORDER: SubscriptionTier[] = [...SHARED_PLAN_ORDER];

/** Plans the pricing page and the checkout offer: every plan but PAY_PER_EXPORT, whose packs are no longer sold. */
export type SaleTier = Exclude<SubscriptionTier, "PAY_PER_EXPORT">;
export const PLANS_ON_SALE: readonly SaleTier[] = PLAN_ORDER.filter((tier): tier is SaleTier => tier !== "PAY_PER_EXPORT");

/** `19.000đ`, `99.000đ`. */
export const formatVnd = (value: number) => {
  if (value === 0) return "0đ";
  return `${value.toLocaleString("vi-VN")}đ`;
};

/** `19k`, `79k`, `199k`: short prices for buttons and chips. */
export const formatVndShort = (value: number) => (value % 1000 === 0 ? `${value / 1000}k` : formatVnd(value));

/** Backward-compatibility alias for formatVnd */
export const formatUsd = formatVnd;

/** `100 MB`, `1 GB`, `10 GB`. */
export function formatQuota(bytes: number): string {
  return bytes >= 1024 * MB ? `${bytes / (1024 * MB)} GB` : `${bytes / MB} MB`;
}
