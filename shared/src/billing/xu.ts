/**
 * Xu Wrap (docs/19): the one currency of every AI task (images, AI patterns, image tools). A balance is a set of lots
 * with an expiry in `credit_lots` (kind XU): the monthly allowance of the plan, packs bought, lots granted by hand.
 * Export credits stay a separate kind (docs/16 §5).
 */
import type { SubscriptionTier } from "./plans";
import { PRO_MONTH } from "./prices";

/** List price of one xu in VND, VAT included. Reports value each lot at what was paid for it (`credit_lots.value_vnd`). */
export const XU_VALUE_VND = 100;

/** Xu every plan receives per period (docs/19 D8). Business: for the whole team. */
export const XU_ALLOWANCE: Record<SubscriptionTier, number> = {
  FREE: 50,
  PAY_PER_EXPORT: 100,
  STARTER: 1_000,
  PRO_BUSINESS: 3_500,
};

export type XuPackId = "XU_500" | "XU_1050" | "XU_2200";

export interface XuPack {
  id: XuPackId;
  xu: number;
  priceVnd: number;
}

/** Packs sold on their own, valid 12 months like export packs (PURCHASED_LOT_VALID_MONTHS). */
export const XU_PACKS: Record<XuPackId, XuPack> = {
  XU_500: { id: "XU_500", xu: 500, priceVnd: 50_000 },
  XU_1050: { id: "XU_1050", xu: 1_050, priceVnd: 100_000 },
  XU_2200: { id: "XU_2200", xu: 2_200, priceVnd: 200_000 },
};

export function isXuPackId(value: string): value is XuPackId {
  return Object.prototype.hasOwnProperty.call(XU_PACKS, value);
}

/**
 * Price of one AI pattern by quality. `premium` runs a model that costs up to ~2.500đ a call: 65 xu keeps the minimum
 * margin of the image models at that worst case.
 */
export const XU_PATTERN_COST = { procedural: 0, fast: 1, premium: 65 } as const;

export type AiImageTool = "upscale" | "remove-bg" | "vectorize";

/** Price of one image tool run on one image. */
export const XU_TOOL_COST: Record<AiImageTool, number> = { upscale: 20, "remove-bg": 5, vectorize: 10 };

export interface XuAllowancePeriod {
  /** Unique per user and lot source: `<tier>:<yyyy-mm>` (calendar month) or `sub:<subscriptionId>:<n>` (paid period). */
  periodKey: string;
  quantity: number;
  startsAt: Date;
  /** When the next allowance arrives: the "reset" date shown to the user. */
  endsAt: Date;
  /** End of the next period: unspent xu roll over one period, never more (docs/19 D2). */
  expiresAt: Date;
}

/** Vietnam is UTC+7 all year (no daylight saving time). */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** First instant of the calendar month `monthOffset` months after the one of `now`, in Vietnam time. */
function vietnamMonthStart(now: Date, monthOffset = 0): Date {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + monthOffset, 1) - VIETNAM_OFFSET_MS);
}

/**
 * The allowance period `now` falls in. A paid plan (Pro, Business) with its subscription counts 30-day periods from
 * the start of that subscription, so a renewal keeps the rhythm; any other plan (and a paid tier granted by hand,
 * without a subscription) uses the calendar month in Vietnam time. The tier is part of a calendar key, so a plan change
 * within a month grants the allowance of the new plan.
 */
export function xuAllowancePeriod(
  tier: SubscriptionTier,
  subscription: { id: string; currentPeriodStart: Date; currentPeriodEnd: Date } | null,
  now = new Date(),
): XuAllowancePeriod {
  const quantity = XU_ALLOWANCE[tier];
  const paid = tier === "STARTER" || tier === "PRO_BUSINESS";
  if (paid && subscription && subscription.currentPeriodStart <= now && now < subscription.currentPeriodEnd) {
    const periodMs = PRO_MONTH.periodDays * DAY_MS;
    const start = subscription.currentPeriodStart.getTime();
    const index = Math.floor((now.getTime() - start) / periodMs);
    return {
      periodKey: `sub:${subscription.id}:${index}`,
      quantity,
      startsAt: new Date(start + index * periodMs),
      endsAt: new Date(start + (index + 1) * periodMs),
      expiresAt: new Date(start + (index + 2) * periodMs),
    };
  }
  const startsAt = vietnamMonthStart(now);
  const local = new Date(startsAt.getTime() + VIETNAM_OFFSET_MS);
  const month = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    periodKey: `${tier}:${month}`,
    quantity,
    startsAt,
    endsAt: vietnamMonthStart(now, 1),
    expiresAt: vietnamMonthStart(now, 2),
  };
}
