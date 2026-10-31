import {
  BUSINESS_MONTH_DISPLAY,
  ENTITLEMENTS,
  EXPORT_PACKS,
  PLAN_LABELS,
  PLAN_ORDER as SHARED_PLAN_ORDER,
  PRO_MONTH,
  PURCHASED_LOT_VALID_MONTHS,
  type ExportPack,
  XU_ALLOWANCE,
  type ExportPackId,
} from "@wrapfit/shared";
import type { SubscriptionTier } from "@/types/api";

// Display layer over @wrapfit/shared/billing (docs/17 S6): names, prices and storage come from shared, the same numbers
// the backend charges and enforces, xu per period included (XU_ALLOWANCE, docs/19).

export interface PlanPrice {
  /** VNĐ per month (Pro, Business), or the price of the cheapest pack for PAY_PER_EXPORT. 0 for Free. */
  monthly: number;
  /** Price of one export (the 1-export pack), PAY_PER_EXPORT only. */
  perExport?: number;
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
  isPerExport?: boolean;
  /** Not sold online yet: the pricing page shows a "Liên hệ" button (docs/17 M4). */
  contactOnly?: boolean;
}

const MB = 1024 * 1024;

/** Export packs, cheapest first: 1, 5 and 15 exports. */
export const EXPORT_PACK_LIST: readonly ExportPack[] = (Object.keys(EXPORT_PACKS) as ExportPackId[])
  .map((id) => EXPORT_PACKS[id])
  .sort((a, b) => a.credits - b.credits);

export const SINGLE_EXPORT_PRICE = EXPORT_PACKS.EXPORT_1.priceVnd;
export const EXPORT_PACK_VALID_MONTHS = PURCHASED_LOT_VALID_MONTHS;
export const PRO_PERIOD_DAYS = PRO_MONTH.periodDays;

/** Price of one export inside a pack, rounded to 100đ: 19.000đ, 15.800đ, 13.300đ. */
export const perExportOf = (pack: ExportPack) => Math.round(pack.priceVnd / pack.credits / 100) * 100;

export const PLANS: Record<SubscriptionTier, Plan> = {
  FREE: {
    tier: "FREE",
    name: PLAN_LABELS.FREE,
    price: { monthly: 0 },
    storageBytes: ENTITLEMENTS.FREE.storage.bytes,
    xuPerPeriod: XU_ALLOWANCE.FREE,
    badge: "Bắt đầu miễn phí",
  },
  PAY_PER_EXPORT: {
    tier: "PAY_PER_EXPORT",
    name: PLAN_LABELS.PAY_PER_EXPORT,
    price: { monthly: SINGLE_EXPORT_PRICE, perExport: SINGLE_EXPORT_PRICE },
    storageBytes: ENTITLEMENTS.PAY_PER_EXPORT.storage.bytes,
    xuPerPeriod: XU_ALLOWANCE.PAY_PER_EXPORT,
    badge: "Trả khi cần",
    isPerExport: true,
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
