/**
 * Prices in VND, VAT included (B2C prices), docs/16 §3.2 trimmed to what Path 2 sells (docs/17 S1). The pricing page,
 * the checkout and the backend that creates payments all read these numbers.
 */
import type { XuPackId } from "./xu";

/**
 * Export packs (N export credits) are no longer sold (docs/25 item 7): no export spends a credit since the print file
 * is sold through the print cart. The ids stay because old payments carry them (payment history, admin reconciliation)
 * and the backend refuses a new payment for them. Prices paid are in each payment row, not here.
 */
export const EXPORT_PACK_IDS = ["EXPORT_1", "EXPORT_5", "EXPORT_15"] as const;
export type ExportPackId = (typeof EXPORT_PACK_IDS)[number];
/**
 * What a payment can buy. Xu packs are in ./xu (XU_PACKS). `SAMPLE_ORDER` is a print sample order: its amount comes
 * from the order, not from here. Export pack ids only appear on old payments.
 */
export type PaymentPurpose = ExportPackId | XuPackId | "PRO_MONTH" | "SAMPLE_ORDER";

/** Validity of a purchased lot (xu; export credits before they were converted to xu). */
export const PURCHASED_LOT_VALID_MONTHS = 12;

/** Pro (`STARTER`): unlimited clean exports for 30 days (docs/17 M4). */
export const PRO_MONTH = { plan: "STARTER", priceVnd: 99_000, periodDays: 30 } as const;

/** Business (`PRO_BUSINESS`): price shown on the pricing page with a "Liên hệ" button, not sold online yet. */
export const BUSINESS_MONTH_DISPLAY = { plan: "PRO_BUSINESS", priceVnd: 299_000 } as const;

/** An export pack id: a purpose that is no longer sold. */
export function isExportPackId(value: string): value is ExportPackId {
  return (EXPORT_PACK_IDS as readonly string[]).includes(value);
}

/** Expiry of a purchased lot (xu): same day and time, 12 calendar months later (UTC). */
export function exportLotExpiresAt(purchasedAt: Date): Date {
  const expires = new Date(purchasedAt);
  expires.setUTCMonth(expires.getUTCMonth() + PURCHASED_LOT_VALID_MONTHS);
  return expires;
}

/** End of a Pro period bought at `from`. */
export function proPeriodEnd(from: Date): Date {
  return new Date(from.getTime() + PRO_MONTH.periodDays * 24 * 60 * 60 * 1000);
}
