/** Plan summary (`be/src/billing`) and VietQR payments (`be/src/payments`, docs/17 S5). */

import { request } from "@/services/api";
import type { BillingSummary, Payment, PaymentPurpose } from "@/types/api";

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

/** "Giả lập đã thanh toán": 404 unless the server runs with PAYMENT_SIMULATION=true; a second call grants nothing. */
export function simulatePayment(id: string): Promise<Payment> {
  return request(`/payments/${id}/simulate-confirm`, { method: "POST" });
}
