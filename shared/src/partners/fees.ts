/**
 * WrapFit's platform fee on a print order (CP2: 15 % of the partner's price, docs/19 BR-A3, BR-A4). Called "platform fee"
 * in the data so it is never confused with the affiliate commissions of docs/14 §6.2. The base is the price of the boxes
 * (subtotal minus discount), without shipping; the shop keeps the rest of the total, shipping included.
 */

/** Default rate, in basis points (1 500 = 15 %); each shop has its own contract rate. */
export const DEFAULT_PLATFORM_FEE_BPS = 1500;
export const MAX_PLATFORM_FEE_BPS = 5000;

const round100 = (vnd: number) => Math.round(vnd / 100) * 100;

export interface PlatformFeeSplit {
  platformFeeBps: number;
  platformFeeVnd: number;
  /** What the shop is owed: total − platform fee. */
  shopPayableVnd: number;
}

export function platformFeeSplit(
  amounts: { subtotalVnd: number; discountVnd?: number; totalVnd: number },
  bps: number = DEFAULT_PLATFORM_FEE_BPS
): PlatformFeeSplit {
  const rate = Math.min(MAX_PLATFORM_FEE_BPS, Math.max(0, Math.round(bps)));
  const base = Math.max(0, amounts.subtotalVnd - (amounts.discountVnd ?? 0));
  const platformFeeVnd = Math.min(amounts.totalVnd, round100((base * rate) / 10_000));
  return { platformFeeBps: rate, platformFeeVnd, shopPayableVnd: amounts.totalVnd - platformFeeVnd };
}
