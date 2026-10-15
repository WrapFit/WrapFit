"use client";

import { Check, HardDrive, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { PLANS, formatQuota, formatUsd, type Plan } from "@/features/pricing";
import type { SubscriptionTier } from "@/types/api";
import { cn } from "@/utils/helpers";

// Checkout of a paid plan, in the pack.ly style: steps on top, the step on the left, the order summary on the right.
// The API has no billing yet (features/pricing/plans.ts): the screens are a preview and nothing is charged.

export type Billing = "monthly" | "yearly";
export type PaidTier = Exclude<SubscriptionTier, "FREE">;

const PAID: PaidTier[] = ["PAY_PER_EXPORT", "STARTER", "PRO_BUSINESS"];

/** Plan and billing cycle carried from step to step in the query string. */
export function useCheckoutParams(): { tier: PaidTier; billing: Billing; query: (next?: Partial<{ tier: PaidTier; billing: Billing }>) => string } {
  const params = useSearchParams();
  const rawPlan = params.get("plan");
  const tier = PAID.find((item) => item === rawPlan) ?? "STARTER";
  const billing: Billing = params.get("billing") === "yearly" ? "yearly" : "monthly";
  const query = (next: Partial<{ tier: PaidTier; billing: Billing }> = {}) => `?plan=${next.tier ?? tier}&billing=${next.billing ?? billing}`;
  return { tier, billing, query };
}

/** Amount billed now and per month. */
export function priceOf(plan: Plan, billing: Billing) {
  if (plan.tier === "PAY_PER_EXPORT") {
    return { perMonth: plan.price.monthly, total: plan.price.monthly };
  }
  const perMonth = billing === "yearly" ? plan.price.yearlyPerMonth : plan.price.monthly;
  return { perMonth, total: billing === "yearly" ? perMonth * 12 : perMonth };
}

/** Saving of the yearly cycle, in percent. */
export function yearlySaving(plan: Plan): number {
  if (plan.tier === "PAY_PER_EXPORT" || plan.price.monthly === 0) return 0;
  return Math.round((1 - plan.price.yearlyPerMonth / plan.price.monthly) * 100);
}

const STEPS = [
  { step: 1, label: "Chọn gói", path: "/checkout/step-1" },
  { step: 2, label: "Thanh toán", path: "/checkout/step-2" },
  { step: 3, label: "Hoàn tất", path: "/checkout/step-3" },
] as const;

interface CheckoutShellProps {
  step: 1 | 2 | 3;
  tier: PaidTier;
  billing: Billing;
  query: string;
  children: React.ReactNode;
}

export function CheckoutShell({ step, tier, billing, query, children }: CheckoutShellProps) {
  return (
    <div className={`${landingFontVariables} min-h-screen bg-mist-100 font-landing-body text-landing-ink antialiased`}>
      <header className="flex h-16 items-center justify-between px-5 lg:px-8">
        <LandingLogo />
        <Link href="/pricing" className="py-2 text-sm font-medium text-landing-muted hover:text-landing-ink">
          Thoát
        </Link>
      </header>

      {/* Bottom padding below md clears the floating mobile navigation bar. */}
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-4 md:pb-16 lg:px-8">
        <ol className="flex flex-wrap items-center gap-2" aria-label="Các bước thanh toán">
          {STEPS.map((item, index) => {
            const done = item.step < step;
            const active = item.step === step;
            const label = (
              <>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                    active ? "bg-fpt-orange text-white" : done ? "bg-fpt-orange text-white" : "bg-white text-landing-muted ring-1 ring-landing-line",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : item.step}
                </span>
                <span className={cn("text-sm", active ? "font-semibold text-landing-ink" : "text-landing-muted")}>{item.label}</span>
              </>
            );
            return (
              <li key={item.step} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden className="h-px w-6 bg-landing-line sm:w-10" />}
                {done ? (
                  <Link href={`${item.path}${query}`} className="flex items-center gap-2 rounded-full py-1 pr-2 hover:underline">
                    {label}
                  </Link>
                ) : (
                  <span aria-current={active ? "step" : undefined} className="flex items-center gap-2 py-1 pr-2">
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <p role="note" className="mt-5 flex items-start gap-2.5 rounded-xl border border-landing-line bg-white px-4 py-3 text-sm leading-6 text-landing-muted">
          <Info className="mt-1 size-4 shrink-0 text-fpt-orange-ink" aria-hidden />
          Bản xem trước: WrapFit chưa mở thanh toán trực tuyến. Không có khoản phí nào được trừ và gói của bạn chưa thay đổi.
        </p>

        {/* One card: the step on the left, the order on the right (below on phones), split by a hairline. */}
        <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-sheet bg-white ring-1 ring-line lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">{children}</div>
          <OrderSummary tier={tier} billing={billing} />
        </div>
      </main>
    </div>
  );
}

/** The plan, its quotas and the amount: the right column of the checkout card, beside every step. */
function OrderSummary({ tier, billing }: { tier: PaidTier; billing: Billing }) {
  const plan = PLANS[tier];
  const { perMonth, total } = priceOf(plan, billing);
  const isPerExport = tier === "PAY_PER_EXPORT";
  // Plan names already start with "Gói" for some tiers.
  const title = /^gói\b/i.test(plan.name) ? plan.name : `Gói ${plan.name}`;

  return (
    <aside aria-label="Tóm tắt đơn hàng" className="flex flex-col border-t border-line bg-surface-sunken/40 p-6 sm:p-8 lg:border-l lg:border-t-0">
      <p className="text-overline uppercase text-fg-muted">Đơn hàng của bạn</p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="font-landing-heading text-heading-sm font-bold text-fg">{title}</p>
        <span className="mt-0.5 shrink-0 rounded-full bg-fpt-orange-light px-2.5 py-0.5 text-label-sm text-fpt-orange-ink">
          {isPerExport ? "Theo lần" : billing === "yearly" ? "Theo năm" : "Theo tháng"}
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-3 text-body-sm text-fg">
        <li className="flex items-start gap-3">
          <HardDrive className="mt-0.5 size-4 shrink-0 text-fpt-orange-ink" aria-hidden />
          {formatQuota(plan.storageBytes)} lưu trữ cho ảnh, logo và file in
        </li>
        <li className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-fpt-orange-ink" aria-hidden />
          {plan.aiPatternsPerDay} lượt tạo hoa văn AI mỗi 24 giờ
        </li>
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 size-4 shrink-0 text-fpt-orange-ink" aria-hidden />
          {isPerExport ? "Xuất trọn bộ file vector CMYK, SVG, DXF & in A4/A3" : "Studio, FitCheck™, file in PDF/SVG/DXF và mã QR mở hộp"}
        </li>
      </ul>

      <dl className="mt-6 flex flex-col gap-2.5 border-t border-line pt-5 text-body-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">{isPerExport ? "Đơn giá xuất file" : "Giá mỗi tháng"}</dt>
          <dd className="tabular-nums text-fg">{formatUsd(perMonth)}{isPerExport ? " / lần" : ""}</dd>
        </div>
        {!isPerExport && billing === "yearly" && (
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Tiết kiệm so với theo tháng</dt>
            <dd className="tabular-nums font-medium text-success-fg">−{formatUsd((plan.price.monthly - plan.price.yearlyPerMonth) * 12)}</dd>
          </div>
        )}
        <div className="mt-2 flex items-end justify-between gap-3 border-t border-line pt-4">
          <dt className="font-semibold text-fg">{isPerExport ? "Tổng thanh toán" : billing === "yearly" ? "Tổng 12 tháng" : "Tổng thanh toán"}</dt>
          <dd className="font-landing-heading text-heading-md font-bold tabular-nums text-fg">{formatUsd(total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-caption text-fg-muted">Giá theo VNĐ, đã bao gồm thuế VAT.</p>
    </aside>
  );
}
