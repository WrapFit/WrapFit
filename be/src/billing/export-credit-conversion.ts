import { XU_VALUE_VND } from '@wrapfit/shared';

/**
 * Export credits are no longer sold or spent (docs-old/25 item 7, Q4): money paid for them becomes xu at the price paid.
 * `credits` of a lot of `lotQuantity` credits bought for `paidVnd` are worth `credits × paidVnd / lotQuantity` đồng,
 * that is that many đồng of xu at the list price (XU_VALUE_VND), rounded up: the customer never loses part of a xu.
 * Integer arithmetic, so 3 credits of a 5-credit pack at 79.000đ give exactly 474 xu. `valueVnd` is what the new xu
 * lot is worth in reports (credit_lots.value_vnd), rounded to the đồng.
 */
export function xuForExportCredits(credits: number, lotQuantity: number, paidVnd: number): { xu: number; valueVnd: number } {
  if (!Number.isInteger(credits) || !Number.isInteger(lotQuantity) || !Number.isInteger(paidVnd)) {
    throw new RangeError('Export credit conversion takes whole numbers');
  }
  if (credits < 0 || lotQuantity < 1 || credits > lotQuantity || paidVnd < 0) {
    throw new RangeError(`Invalid export credit conversion: ${credits} of ${lotQuantity} for ${paidVnd}đ`);
  }
  const value = credits * paidVnd;
  const per = lotQuantity * XU_VALUE_VND;
  return { xu: Math.floor((value + per - 1) / per), valueVnd: Math.round(value / lotQuantity) };
}
