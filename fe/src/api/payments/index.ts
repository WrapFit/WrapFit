/** Plan summary (`be/src/billing`) and VietQR payments (`be/src/payments`, docs/17 S5). */

import { request } from "@/services/api";
import type { BillingSummary, Payment, PaymentPurpose, XuHistoryPage, XuReport } from "@/types/api";

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

/** "Giả lập đã thanh toán": gọi backend; nếu offline hoặc 404 (chưa bật simulation) thì fallback sang dữ liệu mô phỏng. */
export async function simulatePayment(id: string, fallback?: Partial<Payment>): Promise<Payment> {
  try {
    return await request(`/payments/${id}/simulate-confirm`, { method: "POST" });
  } catch (error) {
    console.warn("[Payments API] simulatePayment fallback:", error);
    const now = new Date().toISOString();
    return {
      id,
      status: "PAID",
      amountVnd: fallback?.amountVnd ?? 50000,
      purpose: fallback?.purpose ?? "XU_500",
      reference: fallback?.reference ?? "WF_DEMO",
      xu: fallback?.xu ?? (fallback?.purpose === "XU_1050" ? 1050 : fallback?.purpose === "XU_2200" ? 2200 : 500),
      credits: fallback?.credits ?? 0,
      orderId: fallback?.orderId ?? null,
      vietqr: null,
      paidAt: now,
      expiresAt: fallback?.expiresAt ?? now,
      createdAt: fallback?.createdAt ?? now,
    };
  }
}

/** "Lịch sử xu": xu granted and spent, newest first; pass `nextBefore` to continue. */
export function getXuHistory(params: { before?: string; limit?: number } = {}): Promise<XuHistoryPage> {
  const query = new URLSearchParams();
  if (params.before) query.set("before", params.before);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request(`/billing/xu/history${qs ? `?${qs}` : ""}`);
}

/** Xu of one month for admins (`yyyy-mm`, Vietnam time): issued, spent, revenue, deferred revenue, provider cost. */
export function getXuReport(month: string): Promise<XuReport> {
  return request(`/admin/analytics/xu?month=${encodeURIComponent(month)}`);
}
