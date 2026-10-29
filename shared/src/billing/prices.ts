/**
 * Prices in VND, VAT included (B2C prices), docs/16 §3.2 trimmed to what Path 2 sells (docs/17 S1). The pricing page,
 * the checkout and the backend that creates payments all read these numbers.
 */

/** Export packs: N clean exports, valid 12 months from the purchase. */
export type ExportPackId = "EXPORT_1" | "EXPORT_5" | "EXPORT_15";
/** What a payment can buy. `SAMPLE_ORDER` is a print sample order: its amount comes from the order, not from here. */
export type PaymentPurpose = ExportPackId | "PRO_MONTH" | "SAMPLE_ORDER";

export interface ExportPack {
  id: ExportPackId;
  credits: number;
  priceVnd: number;
}

export const PURCHASED_LOT_VALID_MONTHS = 12;

export const EXPORT_PACKS: Record<ExportPackId, ExportPack> = {
  EXPORT_1: { id: "EXPORT_1", credits: 1, priceVnd: 19_000 },
  EXPORT_5: { id: "EXPORT_5", credits: 5, priceVnd: 79_000 },
  EXPORT_15: { id: "EXPORT_15", credits: 15, priceVnd: 199_000 },
};

/** Pro (`STARTER`): unlimited clean exports for 30 days (docs/17 M4). */
export const PRO_MONTH = { plan: "STARTER", priceVnd: 99_000, periodDays: 30 } as const;

/** Business (`PRO_BUSINESS`): price shown on the pricing page with a "Liên hệ" button, not sold online yet. */
export const BUSINESS_MONTH_DISPLAY = { plan: "PRO_BUSINESS", priceVnd: 299_000 } as const;

export function isExportPackId(value: string): value is ExportPackId {
  return Object.prototype.hasOwnProperty.call(EXPORT_PACKS, value);
}

/** Expiry of a purchased export lot: same day and time, 12 calendar months later (UTC). */
export function exportLotExpiresAt(purchasedAt: Date): Date {
  const expires = new Date(purchasedAt);
  expires.setUTCMonth(expires.getUTCMonth() + PURCHASED_LOT_VALID_MONTHS);
  return expires;
}

/** End of a Pro period bought at `from`. */
export function proPeriodEnd(from: Date): Date {
  return new Date(from.getTime() + PRO_MONTH.periodDays * 24 * 60 * 60 * 1000);
}
