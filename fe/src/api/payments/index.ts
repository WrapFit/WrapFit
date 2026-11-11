/** Plan summary (`be/src/billing`) and VietQR payments (`be/src/payments`, docs/17 S5). */

import { request } from "@/services/api";
import type {
  BillingDetails,
  BillingSummary,
  Payment,
  PaymentHistoryPage,
  PaymentPurpose,
  VnpayReturnResult,
  XuHistoryPage,
  XuHistoryType,
  XuReport,
} from "@/types/api";

/** Plan in use, export credits, the Pro period and whether payments can be simulated. */
export function getBillingSummary(): Promise<BillingSummary> {
  return request("/billing/me");
}

/** A 15-minute VietQR payment. A sample order (`orderId`) already waiting for payment gets its QR again. */
export function createPayment(purpose: PaymentPurpose, orderId?: string): Promise<Payment> {
  return request("/payments", { method: "POST", json: orderId ? { purpose, orderId } : { purpose } });
}

/** Status of one of my payments: the checkout asks every 3 seconds. */
export function getPayment(id: string): Promise<Payment> {
  return request(`/payments/${id}`);
}

/** The page VNPay sends the browser back to: checks the signature of the `vnp_*` query (passed untouched) and settles the payment. Idempotent. */
export function getVnpayReturn(search: string): Promise<VnpayReturnResult> {
  return request(`/payments/vnpay/return${search.startsWith("?") ? search : `?${search}`}`);
}

/**
 * "Giả lập đã thanh toán" (PAYMENT_SIMULATION only). An error is passed on: the checkout must never show a payment as
 * paid unless the server confirmed it.
 */
export function simulatePayment(id: string): Promise<Payment> {
  return request(`/payments/${id}/simulate-confirm`, { method: "POST" });
}

/** My payments, newest first ("Lịch sử thanh toán"); pass `nextBefore` to continue. */
export function listMyPayments(params: { before?: string; limit?: number } = {}): Promise<PaymentHistoryPage> {
  const query = new URLSearchParams();
  if (params.before) query.set("before", params.before);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request(`/payments${qs ? `?${qs}` : ""}`);
}

/** VAT invoice details kept on the account (empty strings when never filled). */
export function getBillingDetails(): Promise<BillingDetails> {
  return request("/billing/details");
}

export function saveBillingDetails(details: BillingDetails): Promise<BillingDetails> {
  return request("/billing/details", { method: "PUT", json: details });
}

export type MockTransferScenario = "exact" | "underpaid" | "no_reference";

/**
 * PAYMENT_SIMULATION only: the bank "reports" a transfer through the real SePay webhook path, so it shows on the admin
 * reconciliation page (exact = auto-matched; underpaid / no_reference wait for an admin). Mock rows vanish after 30 min.
 */
export function simulateTransfer(id: string, scenario: MockTransferScenario = "exact"): Promise<Payment> {
  return request(`/payments/${id}/simulate-transfer`, { method: "POST", json: { scenario } });
}

/** "Lịch sử xu": xu granted and spent, newest first; pass `nextBefore` to continue. */
export function getXuHistory(params: { before?: string; limit?: number; type?: XuHistoryType; from?: string; to?: string } = {}): Promise<XuHistoryPage> {
  const query = new URLSearchParams();
  if (params.before) query.set("before", params.before);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.type) query.set("type", params.type);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const qs = query.toString();
  return request(`/billing/xu/history${qs ? `?${qs}` : ""}`);
}

/** Xu of one month for admins (`yyyy-mm`, Vietnam time): issued, spent, revenue, deferred revenue, provider cost. */
export function getXuReport(month: string): Promise<XuReport> {
  return request(`/admin/analytics/xu?month=${encodeURIComponent(month)}`);
}
