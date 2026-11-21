/**
 * Rules of following a print order between the customer and the shop (docs/19 G.4, G.5): when the shop must answer,
 * which carriers it ships with, when an order counts as late, and which message text may take the deal off WrapFit.
 * One module for the API, the offline demo and the screens.
 */
import { addWorkingDays } from "./matching";

const HOUR_MS = 3_600_000;
const VN_OFFSET_MS = 7 * HOUR_MS;

/** Working hours a shop has to take or refuse a paid order (docs/19 BR-A8, Q-A4). */
export const ACCEPT_WITHIN_HOURS = 24;
/** A shipped order with no news counts as delivered after these days (docs/19 BR-G24). */
export const AUTO_DELIVER_AFTER_DAYS = 10;
/** Hours a side has to answer a message before WrapFit is told (docs/19 BR-G18). */
export const REPLY_WITHIN_HOURS = 4;
/** Longest message, characters. */
export const ORDER_MESSAGE_MAX_LENGTH = 2000;

/**
 * Deadline for the shop to take a paid order: ACCEPT_WITHIN_HOURS later, Sundays not counted (shops work Monday to
 * Saturday, Vietnam time).
 */
export function acceptDeadlineFrom(paidAt: Date): Date {
  let t = paidAt.getTime();
  let left = ACCEPT_WITHIN_HOURS;
  while (left > 0) {
    t += HOUR_MS;
    if (new Date(t + VN_OFFSET_MS).getUTCDay() !== 0) left--;
  }
  return new Date(t);
}

/** Today in Vietnam, YYYY-MM-DD. */
export const vnToday = (now: Date = new Date()): string => new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

/** Not delivered by its estimated date (YYYY-MM-DD, Vietnam time). */
export function isOrderLate(estimatedDelivery: string | null | undefined, status: string, now: Date = new Date()): boolean {
  if (!estimatedDelivery || status === "DELIVERED" || status === "CANCELLED") return false;
  return vnToday(now) > estimatedDelivery;
}

/** A new estimate when the order is moved to another shop or the shop reschedules: `days` working days from now. */
export const estimateFrom = (now: Date, days: number): string => addWorkingDays(now, days);

export type CarrierId = "GHN" | "GHTK" | "VIETTEL_POST" | "VNPOST" | "JT" | "SHOP_DELIVERY" | "PICKUP";

export interface Carrier {
  id: CarrierId;
  name: string;
  /** Whether the parcel has a carrier code the customer can look up. */
  needsCode: boolean;
  /**
   * Public tracking page of a code, where the address is known to take one. Check these links with the carriers before
   * going live (docs/19 Q-G2); a carrier without one shows the code to copy.
   */
  trackingUrl?: (code: string) => string;
}

export const CARRIERS: readonly Carrier[] = [
  { id: "GHN", name: "Giao Hàng Nhanh", needsCode: true, trackingUrl: (code) => `https://donhang.ghn.vn/?order_code=${encodeURIComponent(code)}` },
  { id: "GHTK", name: "Giao Hàng Tiết Kiệm", needsCode: true, trackingUrl: (code) => `https://i.ghtk.vn/${encodeURIComponent(code)}` },
  { id: "VIETTEL_POST", name: "Viettel Post", needsCode: true },
  { id: "VNPOST", name: "VNPost", needsCode: true },
  { id: "JT", name: "J&T Express", needsCode: true },
  { id: "SHOP_DELIVERY", name: "Xưởng tự giao", needsCode: false },
  { id: "PICKUP", name: "Khách nhận tại xưởng", needsCode: false },
];

export const CARRIER_IDS: readonly CarrierId[] = CARRIERS.map((c) => c.id);

export const carrierOf = (id: string | null | undefined): Carrier | null => CARRIERS.find((c) => c.id === id) ?? null;

/** Letters, digits and dashes, 6–30 long: what carriers print on their labels. */
export const TRACKING_CODE = /^[A-Za-z0-9-]{6,30}$/;

/** Why a SHIPPED step is refused, or null when the carrier and code are fine (docs/19 BR-G25). */
export function shipmentProblem(carrier: string | null | undefined, code: string | null | undefined): string | null {
  const found = carrierOf(carrier);
  if (!found) return "Chọn hãng vận chuyển.";
  if (found.needsCode && !TRACKING_CODE.test((code ?? "").trim())) return "Nhập mã vận đơn (6–30 chữ hoặc số).";
  return null;
}

export function trackingLinkOf(carrier: string | null | undefined, code: string | null | undefined): string | null {
  const found = carrierOf(carrier);
  return found?.trackingUrl && code ? found.trackingUrl(code.trim()) : null;
}

/**
 * Contact details in a message sent before the shop took the order: a phone number or a long run of digits (a bank
 * account). Shown as a warning and kept on the message, never blocked (docs/19 BR-G19, Q-G4).
 */
export function messageNeedsWarning(body: string): boolean {
  const digits = body.replace(/[\s.()-]/g, "");
  return /(\+?84|0)\d{9}/.test(digits) || /\d{10,19}/.test(digits);
}
