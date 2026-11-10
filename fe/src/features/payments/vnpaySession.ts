/**
 * What the checkout remembers across the redirect to VNPay (docs/21 §4.1): the payment and the page to come back to.
 * `sessionStorage` lives only in this tab, which is also where VNPay returns. Every access is wrapped: the storage can
 * throw (private window, blocked site data) and the return page then falls back to the wallet.
 */

const KEY = "wrapfit:vnpay-pending";
export const VNPAY_RETURN_PATH = "/payments/vnpay-return";
export const DEFAULT_RETURN_TO = "/dashboard/wallet";

export interface PendingVnpay {
  paymentId: string;
  /** Path and query of the page that opened the checkout. */
  returnTo: string;
}

/** A same-site path only: never a URL another site could put in the storage. */
export function safeReturnTo(value: unknown): string {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : DEFAULT_RETURN_TO;
}

export function savePendingVnpay(pending: PendingVnpay): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Private window: the return page offers the wallet instead.
  }
}

export function readPendingVnpay(): PendingVnpay | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingVnpay>;
    if (typeof parsed.paymentId !== "string") return null;
    return { paymentId: parsed.paymentId, returnTo: safeReturnTo(parsed.returnTo) };
  } catch {
    return null;
  }
}

export function clearPendingVnpay(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
