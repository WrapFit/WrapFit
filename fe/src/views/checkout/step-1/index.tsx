'use client';

/**
 * `/checkout/step-1?plan=&pack=`: choose an export pack or Pro. Prices and quotas come from features/pricing (a display
 * layer over @wrapfit/shared/billing); the plan in use comes from `GET /auth/me`.
 */

import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { CheckoutShell, priceOf, useCheckoutParams, type PaidTier } from '@/components/checkout/CheckoutShell';
import { RequireAuth, useAuth } from '@/features/auth';
import { EXPORT_PACK_LIST, PLANS, PLAN_ORDER, PRO_PERIOD_DAYS, formatQuota, formatVnd, perExportOf } from '@/features/pricing';
import { cn } from '@/utils/helpers';

export default function CheckoutStep1Page() {
  return (
    <RequireAuth>
      <ChoosePlan />
    </RequireAuth>
  );
}

const PAID: PaidTier[] = ['PAY_PER_EXPORT', 'STARTER'];

function ChoosePlan() {
  const { user } = useAuth();
  const { tier, pack, query } = useCheckoutParams();
  const currentIndex = user ? PLAN_ORDER.indexOf(user.subscriptionTier) : 0;
  const owned = (item: PaidTier) => item !== 'PAY_PER_EXPORT' && PLAN_ORDER.indexOf(item) <= currentIndex;
  const blocked = owned(tier);

  return (
    <CheckoutShell step={1} tier={tier} pack={pack} query={query()}>
      <section aria-labelledby="checkout-title" className="p-6 sm:p-8">
        <h1 id="checkout-title" className="font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Chọn gói của bạn
        </h1>
        <p className="mt-2 text-base leading-7 text-landing-muted">Mọi gói đều có đủ studio; gói trả phí mở khóa file in sạch cho xưởng, thêm dung lượng và lượt tạo hoa văn AI.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" role="radiogroup" aria-label="Gói">
          {PAID.map((item) => {
            const plan = PLANS[item];
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
                    className={cn('flex size-6 items-center justify-center rounded-full', active ? 'bg-fpt-orange text-white' : 'ring-1 ring-landing-line')}
                    aria-hidden
                  >
                    {active && <Check className="size-4" />}
                  </span>
                </span>
                <span className="text-xl font-semibold">
                  {isPerExport ? `từ ${formatVnd(priceOf(item, 'EXPORT_1'))}` : formatVnd(priceOf(item, pack))}
                  <span className="ml-1 text-sm font-normal text-landing-muted">{isPerExport ? '/ lượt' : `/ ${PRO_PERIOD_DAYS} ngày`}</span>
                </span>
                <span className="flex flex-col gap-1.5 text-sm text-landing-muted">
                  <span>{formatQuota(plan.storageBytes)} lưu trữ</span>
                  <span>{plan.xuPerPeriod.toLocaleString("vi-VN")} xu Wrap mỗi kỳ</span>
                </span>
                {isOwned && <span className="text-xs font-medium text-fpt-orange-ink">Đã có trong gói của bạn</span>}
              </Link>
            );
          })}
        </div>

        {tier === 'PAY_PER_EXPORT' && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Số lượt xuất">
            {EXPORT_PACK_LIST.map((item) => {
              const active = item.id === pack;
              return (
                <Link
                  key={item.id}
                  href={query({ pack: item.id })}
                  replace
                  scroll={false}
                  role="radio"
                  aria-checked={active}
                  className={cn('flex flex-col gap-1 rounded-2xl p-4 transition-shadow', active ? 'ring-2 ring-landing-ink' : 'ring-1 ring-landing-ink/10 hover:ring-landing-ink/40')}
                >
                  <span className="font-semibold">{item.credits} lượt · {formatVnd(item.priceVnd)}</span>
                  <span className="text-sm text-landing-muted">{item.credits === 1 ? 'Mua lẻ' : `${formatVnd(perExportOf(item))} mỗi lượt`}</span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/pricing" className="py-2 text-center text-sm font-medium text-landing-muted hover:text-landing-ink hover:underline">
            So sánh đủ các gói
          </Link>
          {blocked ? (
            <span className="inline-flex h-12 items-center justify-center rounded-full bg-mist-200 px-6 text-base font-medium text-landing-muted">Bạn đã có gói này</span>
          ) : (
            <Link
              href={`/checkout/step-2${query()}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-fpt-orange px-6 text-base font-semibold text-white transition-colors hover:bg-action-hover"
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
