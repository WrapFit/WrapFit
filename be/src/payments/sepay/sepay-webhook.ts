import { createHash, timingSafeEqual } from 'crypto';
import { PAYMENT_REFERENCE_PATTERN } from '../payments.service';

/**
 * Body SePay posts for each bank transaction (https://docs.sepay.vn/tich-hop-webhooks.html). Field names confirmed
 * against the docs on 2026-11-10; the docs do not give types, those are read off the sample payload. Unknown extra
 * fields are tolerated and kept in `bank_transactions.raw`.
 */
export interface SepayWebhookPayload {
  /** SePay transaction id: the dedupe key (`bank_transactions.external_id`). */
  id: number;
  /** Bank brand name, e.g. "Vietcombank". */
  gateway: string;
  /** "yyyy-MM-dd HH:mm:ss", Vietnam time (GMT+7). */
  transactionDate: string;
  /** Receiving account number. */
  accountNumber: string;
  /** Payment code SePay recognised in the content (needs a code pattern set up on SePay), else null or empty. */
  code: string | null;
  /** Transfer content as the bank delivered it. */
  content: string;
  /** "in" = money received, "out" = money sent. */
  transferType: string;
  /** Amount in VND. */
  transferAmount: number;
  /** Account balance after the transaction. */
  accumulated: number;
  subAccount: string | null;
  /** Bank's own reference of the transaction (e.g. "FT24012345678"). */
  referenceCode: string;
  description: string;
}

/** Why a webhook body is unusable (reported as 400; SePay shows it in its webhook log). */
export class SepayPayloadError extends Error {}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Reads the fields the matching needs and rejects a body that cannot be stored. Lenient on everything else: a
 * missing description must not lose a payment.
 */
export function parseSepayPayload(body: unknown): SepayWebhookPayload {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new SepayPayloadError('Body must be a JSON object');
  }
  const raw = body as Record<string, unknown>;

  const id = typeof raw.id === 'string' && /^\d+$/.test(raw.id) ? Number(raw.id) : raw.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    throw new SepayPayloadError('id must be a positive integer');
  }
  const transferType = text(raw.transferType).toLowerCase();
  if (!transferType) throw new SepayPayloadError('transferType is required');
  const amount = typeof raw.transferAmount === 'string' ? Number(raw.transferAmount) : raw.transferAmount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    throw new SepayPayloadError('transferAmount must be a non-negative number');
  }
  const accumulated = typeof raw.accumulated === 'number' ? raw.accumulated : 0;

  return {
    id,
    gateway: text(raw.gateway),
    transactionDate: text(raw.transactionDate),
    accountNumber: text(raw.accountNumber),
    code: text(raw.code) || null,
    content: text(raw.content),
    transferType,
    transferAmount: amount,
    accumulated,
    subAccount: text(raw.subAccount) || null,
    referenceCode: text(raw.referenceCode),
    description: text(raw.description),
  };
}

/** SePay prints Vietnam time without a zone; an unreadable date falls back to `fallback`. */
export function parseSepayDate(value: string, fallback: Date): Date {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(value.trim());
  const date = match ? new Date(`${match[1]}T${match[2]}+07:00`) : new Date(Number.NaN);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

/**
 * Payment references found in a transfer, best candidate first. Banks upper-case the content, add prefixes
 * ("MBVCB.123.WF…") and sometimes split it with spaces, so after the content as given it looks at the content with
 * whitespace removed, then at SePay's own `code`.
 */
export function extractReferences(content: string, code?: string | null): string[] {
  const found: string[] = [];
  const sources = [content, content.replace(/\s+/g, ''), code ?? ''];
  for (const source of sources) {
    for (const match of source.toUpperCase().matchAll(new RegExp(PAYMENT_REFERENCE_PATTERN, 'g'))) {
      if (!found.includes(match[0])) found.push(match[0]);
    }
  }
  return found;
}

/**
 * Token of an `Authorization: Apikey <key>` (what SePay sends) or `Bearer <key>` header, null for anything else.
 * A bare key without a scheme is refused on purpose.
 */
export function tokenFromAuthorization(header: string | undefined): string | null {
  const match = /^(?:apikey|bearer)\s+(\S+)\s*$/i.exec(header ?? '');
  return match ? match[1] : null;
}

/**
 * Constant-time check of the presented header against the configured key. Both sides are hashed first so the
 * comparison time does not depend on where (or whether) the lengths differ. No key configured = nothing matches.
 */
export function authorizationMatches(header: string | undefined, expectedKey: string | null): boolean {
  const presented = tokenFromAuthorization(header);
  if (!expectedKey || presented === null) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(presented), digest(expectedKey));
}
