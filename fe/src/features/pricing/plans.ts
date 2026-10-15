import type { SubscriptionTier } from "@/types/api";

// Plans of WrapFit: Báo cáo chốt 19.000đ/lần xuất và 99.000đ/tháng (lợi thế giá VNĐ so với Pacdora $29 - $99).
// Quotas: storage in be/src/storage/storage.rules.ts (STORAGE_QUOTA_BYTES), AI patterns in be/src/ai/ai-pattern.service.ts.

export interface PlanPrice {
  /** VNĐ per month when paid monthly (or per export for PAY_PER_EXPORT). */
  monthly: number;
  /** VNĐ per month when paid for a year at once. */
  yearlyPerMonth: number;
  /** Single export fee if pay-as-you-go. */
  perExport?: number;
}

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  price: PlanPrice;
  storageBytes: number;
  aiPatternsPerDay: number;
  badge?: string;
  isPerExport?: boolean;
}

const MB = 1024 * 1024;

export const SINGLE_EXPORT_PRICE = 19_000; // 19.000đ / lần xuất file vector chuẩn xưởng

export const PLANS: Record<SubscriptionTier, Plan> = {
  FREE: {
    tier: "FREE",
    name: "Miễn Phí",
    price: { monthly: 0, yearlyPerMonth: 0 },
    storageBytes: 100 * MB,
    aiPatternsPerDay: 10,
    badge: "Bắt đầu miễn phí",
  },
  PAY_PER_EXPORT: {
    tier: "PAY_PER_EXPORT",
    name: "Từng Lần Xuất",
    price: { monthly: 19_000, yearlyPerMonth: 19_000, perExport: 19_000 },
    storageBytes: 500 * MB,
    aiPatternsPerDay: 25,
    badge: "19.000đ / lần xuất",
    isPerExport: true,
  },
  STARTER: {
    tier: "STARTER",
    name: "Gói Tháng (Pro)",
    price: { monthly: 99_000, yearlyPerMonth: 79_000 },
    storageBytes: 1024 * MB,
    aiPatternsPerDay: 50,
    badge: "Phổ biến nhất",
  },
  PRO_BUSINESS: {
    tier: "PRO_BUSINESS",
    name: "Doanh Nghiệp",
    price: { monthly: 299_000, yearlyPerMonth: 239_000 },
    storageBytes: 10 * 1024 * MB,
    aiPatternsPerDay: 300,
    badge: "Cho xưởng & Studio",
  },
};

export const PLAN_ORDER: SubscriptionTier[] = ["FREE", "PAY_PER_EXPORT", "STARTER", "PRO_BUSINESS"];

/** `19.000đ`, `99.000đ`. */
export const formatVnd = (value: number) => {
  if (value === 0) return "0đ";
  return `${value.toLocaleString("vi-VN")}đ`;
};

/** Backward-compatibility alias for formatVnd */
export const formatUsd = (value: number) => {
  if (value === 0) return "0đ";
  if (value < 1000) {
    if (value === 19 || value === 29) return "19.000đ";
    if (value === 99) return "99.000đ";
  }
  return formatVnd(value);
};

/** `100 MB`, `1 GB`, `10 GB`. */
export function formatQuota(bytes: number): string {
  return bytes >= 1024 * MB ? `${bytes / (1024 * MB)} GB` : `${bytes / MB} MB`;
}
