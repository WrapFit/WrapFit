'use client';

/**
 * `/checkout/step-1?plan=&billing=`: choose the paid plan and the billing cycle. Prices and quotas come from
 * features/pricing (the quotas the API enforces); the plan in use comes from `GET /auth/me`.
 */

import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { CheckoutShell, priceOf, useCheckoutParams, yearlySaving, type Billing, type PaidTier } from '@/components/checkout/CheckoutShell';
import { RequireAuth, useAuth } from '@/features/auth';
import { PLANS, PLAN_ORDER, formatQuota, formatUsd } from '@/features/pricing';
import { cn } from '@/utils/helpers';

export default function CheckoutStep1Page() {
  return (
    <RequireAuth>
      <ChoosePlan />
    </RequireAuth>
  );
}

const PAID: PaidTier[] = ['PAY_PER_EXPORT', 'STARTER', 'PRO_BUSINESS'];

function ChoosePlan() {
  const { user } = useAuth();
  const { tier, billing, query } = useCheckoutParams();
  const currentIndex = user ? PLAN_ORDER.indexOf(user.subscriptionTier) : 0;
  const owned = (item: PaidTier) => item !== 'PAY_PER_EXPORT' && PLAN_ORDER.indexOf(item) <= currentIndex;
  const blocked = owned(tier);

  return (
    <CheckoutShell step={1} tier={tier} billing={billing} query={query()}>
      <section aria-labelledby="checkout-title" className="rounded-sheet bg-white p-6 sm:p-8">
        <h1 id="checkout-title" className="font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Chọn gói của bạn
        </h1>
        <p className="mt-2 text-base leading-7 text-landing-muted">Mọi gói đều có đủ studio; gói trả phí nâng dung lượng lưu trữ và lượt tạo hoa văn AI.</p>

        <div className="mt-6 inline-flex rounded-full bg-mist-200 p-1" role="radiogroup" aria-label="Chu kỳ thanh toán">
          {(['monthly', 'yearly'] as Billing[]).map((cycle) => (
            <Link
              key={cycle}
              href={query({ billing: cycle })}
              replace
              scroll={false}
              role="radio"
              aria-checked={billing === cycle}
              className={cn('inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors', billing === cycle ? 'bg-white text-landing-ink shadow-sm' : 'text-landing-muted hover:text-landing-ink')}
            >
              {cycle === 'monthly' ? 'Theo tháng' : 'Theo năm'}
              {cycle === 'yearly' && <span className="rounded-full bg-landing-lime px-2 py-0.5 text-xs text-landing-green-night">−{yearlySaving(PLANS.STARTER)}%</span>}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3" role="radiogroup" aria-label="Gói">
          {PAID.map((item) => {
            const plan = PLANS[item];
            const { perMonth } = priceOf(plan, billing);
            const active = item === tier;
            const isOwned = owned(item);
            const isPerExport = item === 'PAY_PER_EXPORT';
            return (
              <Link
                key={item}
                href={query({ tier: item })}
                replace
                scroll={false}
                role="radio"
                aria-checked={active}
                aria-disabled={isOwned || undefined}
                className={cn(
                  'relative flex flex-col gap-3 rounded-2xl p-5 transition-shadow',
                  active ? 'ring-2 ring-landing-ink' : 'ring-1 ring-landing-ink/10 hover:ring-landing-ink/40',
                  isOwned && 'pointer-events-none opacity-50',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-landing-heading text-xl font-bold">{plan.name}</span>
                  <span
                    className={cn('flex size-6 items-center justify-center rounded-full', active ? 'bg-landing-lime text-landing-green-night' : 'ring-1 ring-landing-line')}
                    aria-hidden
                  >
                    {active && <Check className="size-4" />}
                  </span>
                </span>
                <span className="text-xl font-semibold">
                  {formatUsd(perMonth)}
                  <span className="ml-1 text-sm font-normal text-landing-muted">{isPerExport ? '/ lần' : '/ tháng'}</span>
                </span>
                <span className="flex flex-col gap-1.5 text-sm text-landing-muted">
                  <span>{formatQuota(plan.storageBytes)} lưu trữ</span>
                  <span>{plan.aiPatternsPerDay} lượt hoa văn AI / 24h</span>
                </span>
                {isOwned && <span className="text-xs font-medium text-landing-green-deep">Đã có trong gói của bạn</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/pricing" className="py-2 text-center text-sm font-medium text-landing-muted hover:text-landing-ink hover:underline">
            So sánh đủ các gói
          </Link>
          {blocked ? (
            <span className="inline-flex h-12 items-center justify-center rounded-full bg-mist-200 px-6 text-base font-medium text-landing-muted">Bạn đã có gói này</span>
          ) : (
            <Link
              href={`/checkout/step-2${query()}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-landing-lime px-6 text-base font-semibold text-landing-green-night transition-colors hover:bg-action-hover"
            >
              Tiếp tục
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </section>
    </CheckoutShell>
  );
}
