'use client';

/**
 * `/checkout/step-3?plan=&pack=`: what the upgrade changes, from the current quotas of the account (`GET /auth/me`,
 * `GET /storage/usage`) to the ones of the chosen plan, then the VietQR checkout of the pack or of Pro (docs/17 S5).
 */

import { ArrowRight, Clock, QrCode } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { CheckoutShell, priceOf, useCheckoutParams } from '@/components/checkout/CheckoutShell';
import { ROUTES, TIER_LABELS } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import { CheckoutDialog } from '@/features/payments';
import { formatBytes, useStorageUsage } from '@/features/dashboard';
import { PLANS, formatQuota, formatVnd } from '@/features/pricing';

export default function CheckoutStep3Page() {
  return (
    <RequireAuth>
      <Review />
    </RequireAuth>
  );
}

function Review() {
  const { user } = useAuth();
  const storage = useStorageUsage();
  const { tier, pack, query } = useCheckoutParams();
  const current = PLANS[user?.subscriptionTier ?? 'FREE'];
  const next = PLANS[tier];
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const rows = [
    { label: 'Gói', from: TIER_LABELS[current.tier], to: TIER_LABELS[next.tier] },
    { label: 'Dung lượng lưu trữ', from: formatQuota(current.storageBytes), to: formatQuota(next.storageBytes) },
    { label: 'Hoa văn AI / 24 giờ', from: `${current.aiPatternsPerDay} lượt`, to: `${next.aiPatternsPerDay} lượt` },
  ];

  return (
    <CheckoutShell step={3} tier={tier} pack={pack} query={query()}>
      <section aria-labelledby="checkout-title" className="p-6 sm:p-8">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-fpt-orange text-white">
          <Clock className="size-6" aria-hidden />
        </span>
        <h1 id="checkout-title" className="mt-5 font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {paid ? `Đã kích hoạt Gói ${next.name}` : `Sẵn sàng lên Gói ${next.name}`}
        </h1>
        <p className="mt-2 text-base leading-7 text-landing-muted">
          {paid
            ? 'Thanh toán thành công. Dự án và tệp hiện có của bạn giữ nguyên.'
            : 'Thanh toán bằng VietQR; gói được kích hoạt ngay khi WrapFit nhận tiền. Dự án và tệp hiện có của bạn giữ nguyên.'}
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-landing-ink/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist-100 text-landing-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Mục</span>
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Hiện tại
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Sau khi nâng cấp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-landing-line">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-4 py-3 font-medium">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-landing-muted">{row.from}</td>
                  <td className="px-4 py-3 font-semibold text-fpt-orange-ink">{row.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {storage.data && (
          <p className="mt-3 text-sm text-landing-muted">
            Bạn đang dùng {formatBytes(storage.data.usedBytes)} trong {formatBytes(storage.data.quotaBytes)}.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {paid ? (
            <Link
              href={ROUTES.dashboard}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-fpt-orange px-6 text-base font-semibold text-white transition-colors hover:bg-action-hover"
            >
              Về không gian làm việc
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-fpt-orange px-6 text-base font-semibold text-white transition-colors hover:bg-action-hover"
            >
              <QrCode className="size-4" aria-hidden />
              Thanh toán {formatVnd(priceOf(tier, pack))}
            </button>
          )}
          <Link href={`/checkout/step-2${query()}`} className="inline-flex h-12 items-center justify-center rounded-full px-6 text-base font-medium text-landing-ink ring-1 ring-landing-line hover:bg-mist-100">
            Sửa thông tin thanh toán
          </Link>
        </div>
      </section>
      {paying && (
        <CheckoutDialog
          purpose={tier === 'PAY_PER_EXPORT' ? pack : 'PRO_MONTH'}
          onPaid={() => setPaid(true)}
          onClose={() => setPaying(false)}
        />
      )}
    </CheckoutShell>
  );
}
