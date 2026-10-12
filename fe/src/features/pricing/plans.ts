import type { SubscriptionTier } from "@/types/api";

// Plans of WrapFit: the three subscription tiers of the API (prisma `SubscriptionTier`).
//
// The quotas are the ones the API enforces: storage in be/src/storage/storage.rules.ts (STORAGE_QUOTA_BYTES), AI
// patterns in be/src/ai/ai-pattern.service.ts (DAILY_AI_LIMIT, over the last 24 hours). Keep them in step.
// The API has no billing yet: the prices are the ones of the former /pricing screen, in USD.

export interface PlanPrice {
  /** USD per month when paid monthly. */
  monthly: number;
  /** USD per month when paid for a year at once. */
  yearlyPerMonth: number;
}

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  price: PlanPrice;
  storageBytes: number;
  aiPatternsPerDay: number;
}

const MB = 1024 * 1024;

export const PLANS: Record<SubscriptionTier, Plan> = {
  FREE: { tier: "FREE", name: "Free", price: { monthly: 0, yearlyPerMonth: 0 }, storageBytes: 100 * MB, aiPatternsPerDay: 10 },
  STARTER: { tier: "STARTER", name: "Starter", price: { monthly: 29, yearlyPerMonth: 24 }, storageBytes: 1024 * MB, aiPatternsPerDay: 50 },
  PRO_BUSINESS: {
    tier: "PRO_BUSINESS",
    name: "Pro Business",
    price: { monthly: 99, yearlyPerMonth: 79 },
    storageBytes: 10 * 1024 * MB,
    aiPatternsPerDay: 300,
  },
};

export const PLAN_ORDER: SubscriptionTier[] = ["FREE", "STARTER", "PRO_BUSINESS"];

/** `$29`. */
export const formatUsd = (value: number) => `$${value.toLocaleString("en-US")}`;

/** `100 MB`, `1 GB`, `10 GB`. */
export function formatQuota(bytes: number): string {
  return bytes >= 1024 * MB ? `${bytes / (1024 * MB)} GB` : `${bytes / MB} MB`;
}
