/**
 * Reconciliation of bank transfers (`be/src/payments/admin`, docs/21 §3.5) and the demo flag of a user. Role ADMIN
 * only. Types are local: the shared API types belong to the checkout work.
 */

import { request } from "@/services/api";

/** Prefix of every query of the reconciliation page. */
export const BANK_TX_KEY = ["admin", "bank-transactions"] as const;

export type BankTxStatus = "MATCHED" | "UNMATCHED" | "RESOLVED" | "IGNORED";
export type BankTxUnmatchedReason = "NO_REFERENCE" | "NOT_FOUND" | "AMOUNT_MISMATCH" | "EXPIRED" | "ALREADY_PAID";

/** The payment a transfer is linked to, or the one an admin is about to assign it to. */
export interface BankTxPayment {
  id: string;
  reference: string;
  amountVnd: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  purpose: string;
  provider: "VIETQR" | "VNPAY";
  expiresAt: string;
  userEmail: string;
}

export interface BankTransaction {
  id: string;
  externalId: string;
  gateway: string;
  accountNo: string;
  amountVnd: number;
  /** Transfer content as the bank wrote it. */
  content: string;
  bankReference: string;
  /** The WF… reference found in the content, if any. */
  extractedReference: string | null;
  transactionAt: string;
  status: BankTxStatus;
  unmatchedReason: BankTxUnmatchedReason | null;
  resolvedBy: string | null;
  resolvedNote: string | null;
  createdAt: string;
  payment: BankTxPayment | null;
}

export interface BankTransactionPage {
  entries: BankTransaction[];
  /** Pass as `before` for the next page; null at the end. */
  nextBefore: string | null;
}

export type ResolveBankTransactionRequest = { action: "assign"; paymentReference: string; note?: string } | { action: "ignore"; note: string };

export function listBankTransactions(query: { status?: BankTxStatus; before?: string; limit?: number } = {}): Promise<BankTransactionPage> {
  return request("/admin/bank-transactions", { query });
}

/** The VietQR payment with this `WF…` reference; 404 when there is none. */
export function previewBankTxPayment(reference: string): Promise<BankTxPayment> {
  return request(`/admin/bank-transactions/payment-preview/${encodeURIComponent(reference)}`);
}

/** `assign` confirms the payment (even an expired one) and grants what it bought; `ignore` only closes the transfer. */
export function resolveBankTransaction(id: string, data: ResolveBankTransactionRequest): Promise<BankTransaction> {
  return request(`/admin/bank-transactions/${id}/resolve`, { method: "POST", json: data });
}

/** `true`: the user's next payments go through VNPay sandbox instead of a real bank transfer. */
export function setUserDemo(id: string, isDemo: boolean): Promise<{ id: string; isDemo: boolean }> {
  return request(`/users/${id}`, { method: "PATCH", json: { isDemo } });
}
