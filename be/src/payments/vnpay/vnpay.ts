import { createHmac, timingSafeEqual } from 'crypto';

/**
 * VNPay PAY 2.1.0 (docs/21 §3.4), pure functions. Source: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * (checked 2026-11-10) and its official Node sample (vnpay_nodejs):
 *  - `vnp_Amount` = VND × 100, no separator; `vnp_CurrCode` = `VND` only.
 *  - `vnp_CreateDate` / `vnp_ExpireDate` = `yyyyMMddHHmmss` in GMT+7.
 *  - Signature: sort the parameter names ascending, join `name=value` with `&` where both are URL-encoded
 *    (`encodeURIComponent`, then `%20` → `+`), HMAC-SHA512 with the hash secret, hex, sent as `vnp_SecureHash`.
 *  - The return URL and the IPN carry the same parameters; to verify, drop `vnp_SecureHash` and `vnp_SecureHashType`,
 *    sign the rest the same way and compare.
 *  - Success = `vnp_ResponseCode` `00` and `vnp_TransactionStatus` `00` (the C# sample requires both).
 */

/** GMT+7, the only time zone the gateway reads. */
const VNPAY_OFFSET_MS = 7 * 60 * 60 * 1000;

/** `yyyyMMddHHmmss` in GMT+7, whatever the time zone of the server. */
export function vnpayDate(date: Date): string {
  const shifted = new Date(date.getTime() + VNPAY_OFFSET_MS);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return (
    pad(shifted.getUTCFullYear(), 4) +
    pad(shifted.getUTCMonth() + 1) +
    pad(shifted.getUTCDate()) +
    pad(shifted.getUTCHours()) +
    pad(shifted.getUTCMinutes()) +
    pad(shifted.getUTCSeconds())
  );
}

/** `vnp_Amount`: VND × 100. */
export const vnpayAmount = (amountVnd: number): number => amountVnd * 100;

const encode = (value: string): string => encodeURIComponent(value).replace(/%20/g, '+');

/**
 * The string that is signed, and the query string of the pay URL: sorted by name, URL-encoded name=value pairs.
 * Empty values stay (`name=`), as in the official Node sample's `qs.stringify(..., { encode: false })`.
 */
function signData(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&');
}

/** HMAC-SHA512 of the signed string, lower-case hex. */
export function signParams(params: Record<string, string>, hashSecret: string): string {
  return createHmac('sha512', hashSecret).update(Buffer.from(signData(params), 'utf8')).digest('hex');
}

export interface PayUrlInput {
  /** Pay page, e.g. `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`. */
  payUrl: string;
  tmnCode: string;
  hashSecret: string;
  returnUrl: string;
  /** The payment's WF reference; unique, so it is `vnp_TxnRef`. */
  reference: string;
  amountVnd: number;
  /** Customer IP, 7–45 characters. */
  ipAddr: string;
  createdAt: Date;
  /** The payment's own expiry: the gateway refuses to take money after it. */
  expiresAt: Date;
  /** Unaccented Latin text without special characters (`vnp_OrderInfo`). */
  orderInfo: string;
}

/** The signed URL to send the customer to. */
export function buildPayUrl(input: PayUrlInput): string {
  const params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: input.tmnCode,
    vnp_Amount: String(vnpayAmount(input.amountVnd)),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: input.reference,
    vnp_OrderInfo: input.orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: input.returnUrl,
    vnp_IpAddr: input.ipAddr,
    vnp_CreateDate: vnpayDate(input.createdAt),
    vnp_ExpireDate: vnpayDate(input.expiresAt),
  };
  return `${input.payUrl}?${signData(params)}&vnp_SecureHash=${signParams(params, input.hashSecret)}`;
}

export interface VerifiedQuery {
  /** The signature matches. When false, nothing in `params` can be trusted. */
  valid: boolean;
  /** The `vnp_*` parameters without the hash fields. */
  params: Record<string, string>;
}

/**
 * Checks the signature of a return-URL or IPN query. Only `vnp_*` parameters are signed; a repeated parameter (an
 * array) makes the query invalid. Compared in constant time.
 */
export function verifyQuery(query: Record<string, unknown>, hashSecret: string): VerifiedQuery {
  const params: Record<string, string> = {};
  let received = '';
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('vnp_')) continue;
    if (typeof value !== 'string') return { valid: false, params: {} };
    if (key === 'vnp_SecureHash') received = value.toLowerCase();
    else if (key !== 'vnp_SecureHashType') params[key] = value;
  }

  const expected = Buffer.from(signParams(params, hashSecret), 'utf8');
  const given = Buffer.from(received, 'utf8');
  const valid = given.length === expected.length && timingSafeEqual(given, expected);
  return { valid, params: valid ? params : {} };
}

/** The customer paid: `vnp_ResponseCode` and `vnp_TransactionStatus` are both `00`. */
export function isVnpaySuccess(params: Record<string, string>): boolean {
  return params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
}

/** `vnp_Amount` of a verified query, or null when it is not a whole number. */
export function vnpayAmountOf(params: Record<string, string>): number | null {
  const amount = params.vnp_Amount;
  return amount !== undefined && /^\d{1,12}$/.test(amount) ? Number(amount) : null;
}

/** An IP the gateway accepts (7–45 characters): IPv4-mapped IPv6 is unwrapped, `::1` and the like become loopback. */
export function vnpayIp(ip: string | undefined): string {
  const unwrapped = (ip ?? '').replace(/^::ffff:/i, '');
  return unwrapped.length >= 7 && unwrapped.length <= 45 ? unwrapped : '127.0.0.1';
}
