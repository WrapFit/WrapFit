/**
 * Plans of WrapFit (docs/16 §2, docs/17 S1). The enum values of `users.subscription_tier` stay as they are; only the
 * display names changed. `users.subscription_tier` is a cache of the effective plan: the backend recomputes it with
 * `resolvePlan` from the `subscriptions` and `credit_lots` tables (PlanService.sync).
 */
import type { SubscriptionTierType } from "../core/contracts";

export type SubscriptionTier = SubscriptionTierType;

/** Cheapest first: `requiredPlanFor` and the pricing page walk the plans in this order. */
export const PLAN_ORDER: readonly SubscriptionTier[] = ["FREE", "PAY_PER_EXPORT", "STARTER", "PRO_BUSINESS"];

export const PLAN_LABELS: Record<SubscriptionTier, string> = {
  FREE: "Miễn phí",
  PAY_PER_EXPORT: "Lượt xuất",
  STARTER: "Pro",
  PRO_BUSINESS: "Business",
};

/** Plans sold as a subscription. Business is shown on the pricing page only ("Liên hệ"), it cannot be bought yet. */
export type SubscriptionPlan = "STARTER" | "PRO_BUSINESS";
/** MVP lifecycle (docs/17 M4): a paid period is ACTIVE until `currentPeriodEnd`, then EXPIRED. No renewal, no grace. */
export type SubscriptionStatus = "ACTIVE" | "EXPIRED";

export interface ResolvePlanInput {
  subscription: { plan: SubscriptionPlan; status: SubscriptionStatus; currentPeriodEnd: Date } | null;
  /** At least one EXPORT lot bought with money (source PURCHASE) and not expired, even when every credit is used. */
  hasUnexpiredPurchasedExportLot: boolean;
  now?: Date;
}

/**
 * Effective plan. Priority: a live subscription > a purchased export pack still valid > FREE.
 * A subscription whose period has ended counts as expired even before a sync marks it EXPIRED.
 */
export function resolvePlan({ subscription, hasUnexpiredPurchasedExportLot, now = new Date() }: ResolvePlanInput): SubscriptionTier {
  if (subscription && subscription.status === "ACTIVE" && subscription.currentPeriodEnd > now) return subscription.plan;
  if (hasUnexpiredPurchasedExportLot) return "PAY_PER_EXPORT";
  return "FREE";
}
