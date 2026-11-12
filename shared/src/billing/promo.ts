/**
 * Promo codes of sample-print orders. The server computes the discount when the order is created (the cart shows the
 * same numbers), so a code typed in the browser can never lower the amount of a payment on its own.
 */
export interface SamplePromo {
  code: string;
  label: string;
  /** Discount in VND of one sample order whose fee is `subtotalVnd` (one project, first box 49.000đ). */
  discount: (subtotalVnd: number) => number;
}

const FIRST_BOX_VND = 49_000;

export const SAMPLE_PROMOS: Record<string, SamplePromo> = {
  WORKSHOPTET: {
    code: "WORKSHOPTET",
    label: "Workshop Tết 2027: hộp mẫu đầu tiên miễn phí",
    discount: (subtotal) => Math.min(subtotal, FIRST_BOX_VND),
  },
  WRAPFIT10: {
    code: "WRAPFIT10",
    label: "Giảm 10% đơn in mẫu",
    discount: (subtotal) => Math.round(subtotal * 0.1),
  },
};

/** The promo of `code` (any case, surrounding spaces ignored), or null for an unknown or empty code. */
export function findSamplePromo(code: string | null | undefined): SamplePromo | null {
  const key = (code ?? "").trim().toUpperCase();
  return key ? (SAMPLE_PROMOS[key] ?? null) : null;
}

/** Discount of one order, never more than its fee. */
export function samplePromoDiscount(code: string | null | undefined, subtotalVnd: number): number {
  const promo = findSamplePromo(code);
  return promo ? Math.max(0, Math.min(subtotalVnd, promo.discount(subtotalVnd))) : 0;
}
