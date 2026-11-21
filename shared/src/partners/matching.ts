/**
 * Choosing a print shop for an order (docs/19 G.3): hard filters first (status, delivery area, quantity, sheet size,
 * probation), then a weighted score of price, delivery date, quality and distance. One function for the API and the
 * offline demo, so both recommend the same shop. Pure: the caller passes the shops, their current load and the clock.
 */
import { distanceKm, provinceOf } from "./provinces";

export type PrintShopStatus = "ACTIVE" | "REVIEW" | "PAUSED" | "SUSPENDED";

/** What the matching needs to know about a shop. */
export interface MatchableShop {
  id: string;
  provinceCode: string;
  lat: number;
  lng: number;
  status: PrintShopStatus;
  /** Paused on purpose until this time (holidays, a machine repair: docs/19 BR-G11); ISO string. */
  pausedUntil?: string | null;
  /** New shop on probation until this time (docs/19 G.2 step 8); ISO string. */
  probationUntil?: string | null;
  maxSheetMm: { width: number; height: number };
  minQuantity: number;
  maxQuantity: number;
  /** Working days to produce a production run, and a sample. */
  leadTimeDays: number;
  sampleLeadTimeDays: number;
  /** Orders the shop starts per working day. */
  dailyCapacity: number;
  /** Provinces it delivers to; empty = everywhere. */
  serviceProvinces: string[];
  rating: number;
  completedOrders: number;
}

export interface MatchItem {
  /** Flat size of the largest piece of the design, mm. */
  flatWidthMm: number;
  flatHeightMm: number;
  quantity: number;
}

export interface MatchRequest {
  kind: "sample" | "production";
  /** Province of the recipient; null when unknown (no distance, no delivery-area filter). */
  provinceCode: string | null;
  items: MatchItem[];
  now: Date;
  /** Price of the order at a shop (VND). Same for every shop when omitted (sample orders have one fixed fee). */
  priceOf?: (shop: MatchableShop) => number;
  /** Shops the customer ordered from before (docs/19 AF-G4). */
  returningShopIds?: readonly string[];
  weights?: Partial<MatchWeights>;
}

export interface MatchWeights {
  price: number;
  time: number;
  quality: number;
  distance: number;
}

/** docs/19 G.3, to be confirmed with the team (Q-G3). */
export const DEFAULT_MATCH_WEIGHTS: MatchWeights = { price: 0.4, time: 0.3, quality: 0.2, distance: 0.1 };
/** Shops within this share of each other's score take turns at the top (docs/19 BR-G14). */
export const MATCH_TIE_SHARE = 0.02;
export const RETURNING_SHOP_BONUS = 0.05;
/** Orders a shop on probation may have running at once. */
export const PROBATION_MAX_ACTIVE_ORDERS = 3;

export type MatchReason = "recommended" | "cheapest" | "fastest" | "nearest" | "top_rated" | "returning";
export type ExclusionReason = "not_active" | "paused" | "no_delivery" | "quantity" | "sheet_size" | "probation_full";

export const MATCH_REASON_LABELS: Record<MatchReason, string> = {
  recommended: "WrapFit đề xuất",
  cheapest: "Rẻ nhất",
  fastest: "Giao sớm nhất",
  nearest: "Gần bạn nhất",
  top_rated: "Đánh giá cao nhất",
  returning: "Bạn đã từng đặt",
};

export const EXCLUSION_REASON_LABELS: Record<ExclusionReason, string> = {
  not_active: "Xưởng chưa nhận đơn",
  paused: "Xưởng đang tạm nghỉ",
  no_delivery: "Không giao tới tỉnh của bạn",
  quantity: "Số lượng ngoài khả năng của xưởng",
  sheet_size: "Khuôn lớn hơn khổ máy của xưởng",
  probation_full: "Xưởng mới, đang giới hạn số đơn",
};

export interface ShopMatch {
  shopId: string;
  priceVnd: number;
  /** Working days of production, including the queue ahead of the order. */
  productionDays: number;
  shippingDays: number;
  /** Date the customer should receive the boxes, YYYY-MM-DD in Vietnam time. */
  estimatedDelivery: string;
  distanceKm: number | null;
  /** 0..1 (plus the returning bonus). */
  score: number;
  reasons: MatchReason[];
}

export interface ExcludedShop {
  shopId: string;
  reasons: ExclusionReason[];
}

export interface MatchResult {
  matches: ShopMatch[];
  excluded: ExcludedShop[];
  recommendedId: string | null;
}

const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** `days` working days after `now` (Vietnam time; shops and carriers work Monday to Saturday), as YYYY-MM-DD. */
export function addWorkingDays(now: Date, days: number): string {
  let t = Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS;
  let left = Math.max(0, Math.ceil(days));
  while (left > 0) {
    t += DAY_MS;
    if (new Date(t).getUTCDay() !== 0) left--;
  }
  return new Date(t).toISOString().slice(0, 10);
}

/** Working days a parcel takes, from the distance between the shop and the recipient. */
export function shippingDaysFor(sameProvince: boolean, km: number | null): number {
  if (sameProvince) return 1;
  if (km === null) return 3;
  if (km < 300) return 2;
  if (km < 800) return 3;
  return 4;
}

function fitsSheet(item: MatchItem, sheet: { width: number; height: number }): boolean {
  const [long, short] = [Math.max(sheet.width, sheet.height), Math.min(sheet.width, sheet.height)];
  return Math.max(item.flatWidthMm, item.flatHeightMm) <= long && Math.min(item.flatWidthMm, item.flatHeightMm) <= short;
}

function exclusionsOf(shop: MatchableShop, req: MatchRequest, activeOrders: number): ExclusionReason[] {
  const reasons: ExclusionReason[] = [];
  const now = req.now.getTime();
  if (shop.status !== "ACTIVE") reasons.push("not_active");
  else if (shop.pausedUntil && Date.parse(shop.pausedUntil) > now) reasons.push("paused");
  if (req.provinceCode && shop.serviceProvinces.length && !shop.serviceProvinces.includes(req.provinceCode)) reasons.push("no_delivery");
  if (req.items.some((item) => item.quantity < shop.minQuantity || item.quantity > shop.maxQuantity)) reasons.push("quantity");
  if (req.items.some((item) => !fitsSheet(item, shop.maxSheetMm))) reasons.push("sheet_size");
  if (shop.probationUntil && Date.parse(shop.probationUntil) > now && activeOrders >= PROBATION_MAX_ACTIVE_ORDERS) reasons.push("probation_full");
  return reasons;
}

/**
 * Ranks the shops that can take the order. `activeOrders` is the number of paid orders not yet shipped per shop: it
 * delays the start (a full day of capacity per `dailyCapacity` orders) and fills a probation quota.
 */
export function matchPrintShops(
  shops: readonly MatchableShop[],
  activeOrders: Readonly<Record<string, number>>,
  req: MatchRequest
): MatchResult {
  const weights = { ...DEFAULT_MATCH_WEIGHTS, ...req.weights };
  const recipient = provinceOf(req.provinceCode);
  const excluded: ExcludedShop[] = [];
  const candidates: Omit<ShopMatch, "score" | "reasons">[] = [];

  for (const shop of shops) {
    const active = activeOrders[shop.id] ?? 0;
    const reasons = exclusionsOf(shop, req, active);
    if (reasons.length) {
      excluded.push({ shopId: shop.id, reasons });
      continue;
    }
    const queueDays = Math.floor(active / Math.max(1, shop.dailyCapacity));
    const productionDays = (req.kind === "sample" ? shop.sampleLeadTimeDays : shop.leadTimeDays) + queueDays;
    const km = recipient ? Math.round(distanceKm(recipient, shop)) : null;
    const shippingDays = shippingDaysFor(!!recipient && recipient.code === shop.provinceCode, km);
    candidates.push({
      shopId: shop.id,
      priceVnd: req.priceOf ? req.priceOf(shop) : 0,
      productionDays,
      shippingDays,
      estimatedDelivery: addWorkingDays(req.now, productionDays + shippingDays),
      distanceKm: km,
    });
  }

  if (!candidates.length) return { matches: [], excluded, recommendedId: null };

  const byId = new Map(shops.map((shop) => [shop.id, shop]));
  const minPrice = Math.min(...candidates.map((c) => c.priceVnd));
  const minDays = Math.min(...candidates.map((c) => c.productionDays + c.shippingDays));
  const kms = candidates.map((c) => c.distanceKm).filter((km): km is number => km !== null);
  const quality = (shop: MatchableShop) =>
    0.8 * Math.min(1, Math.max(0, shop.rating) / 5) + 0.2 * Math.min(1, Math.log10(shop.completedOrders + 1) / 3);

  const scored: ShopMatch[] = candidates.map((c) => {
    const shop = byId.get(c.shopId)!;
    const price = c.priceVnd > 0 ? minPrice / c.priceVnd : 1;
    const time = minDays / Math.max(1, c.productionDays + c.shippingDays);
    // 50 km of slack: two shops in the same city score alike.
    const distance = c.distanceKm === null || !kms.length ? 0.5 : (Math.min(...kms) + 50) / (c.distanceKm + 50);
    const returning = req.returningShopIds?.includes(c.shopId) ? RETURNING_SHOP_BONUS : 0;
    const score = weights.price * price + weights.time * time + weights.quality * quality(shop) + weights.distance * distance + returning;
    return { ...c, score: Math.round(score * 10_000) / 10_000, reasons: returning ? ["returning"] : [] };
  });

  scored.sort((a, b) => b.score - a.score || a.shopId.localeCompare(b.shopId));
  const matches = rotateTies(scored, req.now);

  const best = <T>(pick: (m: ShopMatch) => T, better: (a: T, b: T) => boolean): ShopMatch | undefined =>
    matches.reduce<ShopMatch | undefined>((top, m) => (!top || better(pick(m), pick(top)) ? m : top), undefined);
  const tag = (match: ShopMatch | undefined, reason: MatchReason) => {
    if (match && !match.reasons.includes(reason)) match.reasons.push(reason);
  };
  if (matches.length > 1) {
    if (new Set(matches.map((m) => m.priceVnd)).size > 1) tag(best((m) => m.priceVnd, (a, b) => a < b), "cheapest");
    tag(best((m) => m.estimatedDelivery, (a, b) => a < b), "fastest");
    if (kms.length) tag(best((m) => m.distanceKm ?? Infinity, (a, b) => a < b), "nearest");
    tag(best((m) => byId.get(m.shopId)!.rating, (a, b) => a > b), "top_rated");
  }
  matches[0].reasons.unshift("recommended");
  return { matches, excluded, recommendedId: matches[0].shopId };
}

/** Shops whose scores are within MATCH_TIE_SHARE of the top of their run take turns, one step per day. */
function rotateTies(sorted: ShopMatch[], now: Date): ShopMatch[] {
  const day = Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS);
  const out: ShopMatch[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sorted[i].score - sorted[j].score <= sorted[i].score * MATCH_TIE_SHARE) j++;
    const run = sorted.slice(i, j);
    const shift = day % run.length;
    out.push(...run.slice(shift), ...run.slice(0, shift));
    i = j;
  }
  return out;
}
