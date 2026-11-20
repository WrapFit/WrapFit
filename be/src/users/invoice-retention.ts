import { Prisma } from '@prisma/client';
import { ANONYMIZED_NAME } from './user-removal';

/**
 * Accounting documents used to keep the books (payments, sample orders, the VAT invoice details) are kept at least 10
 * years from the end of the accounting year they belong to: Luật Kế toán 2015 art. 41, Nghị định 174/2016/NĐ-CP art. 13
 * (docs/18 Q4). WrapFit's accounting year is the calendar year.
 */
export const INVOICE_RETENTION_YEARS = 10;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Records last changed before this instant are past their retention: the start of the Vietnam calendar year
 * INVOICE_RETENTION_YEARS before the current one. A record of year Y is kept to 31/12/(Y + 10) inclusive, and becomes
 * scrubbable on 1/1/(Y + 11).
 */
export function invoiceRetentionCutoff(now = new Date()): Date {
  const year = new Date(now.getTime() + VIETNAM_OFFSET_MS).getUTCFullYear();
  return new Date(Date.UTC(year - INVOICE_RETENTION_YEARS, 0, 1) - VIETNAM_OFFSET_MS);
}

type Db = { $executeRaw: Prisma.TransactionClient['$executeRaw'] };

/**
 * Removes the personal data still on the accounting records of deleted (anonymized) accounts once their retention is
 * over: recipient name, phone, address and notes of orders, VAT invoice details of payments. Amounts, lines, dates and
 * statuses stay, now anonymous. Accounts still in use keep their history: their owner reads it.
 *
 * The date of a record is its `updated_at` (payment, delivery and refund all move it), so a record touched late keeps
 * its data longer, never shorter. Raw SQL leaves `updated_at` as it was. Running it twice is harmless.
 */
export async function scrubExpiredInvoiceData(db: Db, now = new Date()): Promise<{ orders: number; payments: number }> {
  const cutoff = invoiceRetentionCutoff(now).toISOString();
  const orders = await db.$executeRaw`
    UPDATE orders o
    SET recipient_name = ${ANONYMIZED_NAME}, recipient_phone = '', shipping_address = '', notes = NULL
    FROM users u
    WHERE o.user_id = u.id AND u.anonymized_at IS NOT NULL
      AND o.updated_at < ${cutoff}::timestamptz
      AND (o.recipient_name <> ${ANONYMIZED_NAME} OR o.recipient_phone <> '' OR o.shipping_address <> '' OR o.notes IS NOT NULL)`;
  const payments = await db.$executeRaw`
    UPDATE payments p
    SET metadata = p.metadata - 'billingDetails'
    FROM users u
    WHERE p.user_id = u.id AND u.anonymized_at IS NOT NULL
      AND p.updated_at < ${cutoff}::timestamptz
      AND p.metadata -> 'billingDetails' IS NOT NULL`;
  return { orders, payments };
}
