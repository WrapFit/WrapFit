"use client";

import Link from "next/link";
import React from "react";
import { Carousel, Tag, limeButton } from "@/components/landing";
import { ROUTES } from "@/constants";
import { loginUrl, useAuth } from "@/features/auth";
import { formatBytes, usagePercent, useAiUsage, useStorageUsage } from "@/features/dashboard";
import { PLANS, PLAN_ORDER } from "@/features/pricing";
import type { SubscriptionTier } from "@/types/api";
import { cn } from "@/utils/helpers";
import { PLAN_COPY, checkoutHref, type PlanCopy } from "./content";

/** The three plans side by side (a carousel on small screens), with the visitor's own plan marked. */
export function PlanCards() {
  const auth = useAuth();
  const currentTier = auth.user?.subscriptionTier ?? null;

  return (
    <section aria-label="Các gói dịch vụ" className="overflow-x-clip pt-8 lg:pt-10">
      <Carousel label="Các gói dịch vụ" bleed="full" slideClassName="w-4/5 md:w-3/5 lg:w-2/5 lg:pl-6 xl:w-1/3">
        {PLAN_COPY.map((plan) => (
          <PlanCard key={plan.tier} plan={plan} currentTier={currentTier} anonymous={auth.status === "anonymous"} />
        ))}
      </Carousel>
    </section>
  );
}

function PlanCard({
  plan,
  currentTier,
  anonymous,
}: {
  plan: PlanCopy;
  currentTier: SubscriptionTier | null;
  anonymous: boolean;
}) {
  const isCurrent = currentTier === plan.tier;
  const isIncluded = currentTier !== null && PLAN_ORDER.indexOf(plan.tier) < PLAN_ORDER.indexOf(currentTier);
  const titleId = `plan-${plan.tier}`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex h-full flex-col gap-3 rounded-2xl bg-white p-6 text-sm text-landing-ink",
        plan.popular ? "ring-2 ring-landing-ink" : "ring-1 ring-landing-ink/10"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="font-landing-heading text-3xl font-bold leading-10 lg:text-4xl">
          {PLANS[plan.tier].name}
        </h3>
        {isCurrent ? (
          <Tag className="border-landing-green/30 bg-landing-lime-mist text-landing-green-deep">Gói của bạn</Tag>
        ) : (
          plan.popular && <Tag className="border-landing-indigo/20 bg-landing-indigo/[0.04]">Phổ biến</Tag>
        )}
      </div>

      <p className="text-xl font-semibold">
        {plan.price.amount}
        {plan.price.unit && <span className="ml-1 font-normal text-landing-muted">{plan.price.unit}</span>}
      </p>
      <span className="inline-flex h-5 w-fit items-center rounded-full border border-landing-line bg-line/30 px-2 text-xs font-medium">
        {plan.badge}
      </span>
      <p className="min-h-20 text-sm leading-5 text-landing-muted lg:min-h-24">{plan.description}</p>

      <div className="flex flex-col gap-1.5">
        <PlanAction plan={plan} isCurrent={isCurrent} isIncluded={isIncluded} anonymous={anonymous} />
        <span className="text-center text-xs text-landing-muted">{plan.note}</span>
      </div>

      {isCurrent && <CurrentUsage />}

      <ul className="mt-2 flex flex-col gap-3">
        {plan.features.map(({ icon: Icon, label, note, badge }) => (
          <li key={label} className="flex gap-2.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-landing-muted" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0">
              <p className="text-base text-landing-ink">
                {label}
                {badge && (
                  <span className="ml-1.5 rounded-full border border-warning/30 bg-warning-bg px-1.5 text-caption font-medium text-warning-fg">
                    {badge}
                  </span>
                )}
              </p>
              {note && <p className="text-xs text-landing-muted">{note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

const DISABLED = "inline-flex h-9 w-full items-center justify-center rounded-full bg-landing-tile text-sm font-medium text-landing-muted";

function PlanAction({
  plan,
  isCurrent,
  isIncluded,
  anonymous,
}: {
  plan: PlanCopy;
  isCurrent: boolean;
  isIncluded: boolean;
  anonymous: boolean;
}) {
  if (isCurrent) return <span className={DISABLED}>Gói đang dùng</span>;
  if (isIncluded) return <span className={DISABLED}>Đã có trong gói của bạn</span>;

  const button = cn(limeButton("sm"), "w-full");
  if (plan.tier === "FREE") {
    return (
      <Link href={ROUTES.register} className={button}>
        {plan.cta}
      </Link>
    );
  }
  // Checkout needs an account: a visitor signs in first and comes back to it.
  return (
    <Link href={anonymous ? loginUrl(checkoutHref(plan.tier)) : checkoutHref(plan.tier)} className={button}>
      {plan.cta}
    </Link>
  );
}

/** What the signed-in user has used of the quotas of their plan (`GET /storage/usage`, `GET /ai/usage`). */
function CurrentUsage() {
  const storage = useStorageUsage();
  const ai = useAiUsage();
  if (!storage.data && !ai.data) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-landing-canvas p-3" aria-label="Mức dùng của bạn">
      {storage.data && (
        <UsageBar
          label="Lưu trữ"
          value={`${formatBytes(storage.data.usedBytes)} / ${formatBytes(storage.data.quotaBytes)}`}
          percent={usagePercent(storage.data.usedBytes, storage.data.quotaBytes)}
        />
      )}
      {ai.data && ai.data.aiEnabled && (
        <UsageBar
          label="Hoa văn AI (24 giờ)"
          value={`${ai.data.used} / ${ai.data.limit}`}
          percent={usagePercent(ai.data.used, ai.data.limit)}
        />
      )}
    </div>
  );
}

function UsageBar({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-landing-muted">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-landing-line" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn("h-full rounded-full", percent >= 90 ? "bg-danger" : "bg-landing-green")} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
