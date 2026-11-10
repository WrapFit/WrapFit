'use client';

import { CalendarClock, Crown, RefreshCw, ShieldCheck } from 'lucide-react';
import React from 'react';
import { XU_VALUE_VND } from '@wrapfit/shared';
import { Badge, Button, ButtonLink, TONE_SOFT } from '@/components/ui';
import { Panel, PanelTitle, StatTile } from '@/components/workspace';
import { TIER_LABELS } from '@/constants';
import { formatVnd } from '@/features/pricing';
import type { BillingSummary, SubscriptionTier } from '@/types/api';
import { cn } from '@/utils/helpers';
import { SOURCE_META, day, xu } from './xu-meta';

const SOON_DAYS = 30;
const DAY_MS = 86_400_000;

/** Xu that expire within 30 days, and the first date it happens. */
function expiringSoon(wallet: BillingSummary['xu'], now = Date.now()) {
  const soon = wallet.lots.filter((lot) => lot.remaining > 0 && lot.expiresAt && new Date(lot.expiresAt).getTime() - now <= SOON_DAYS * DAY_MS);
  const first = soon.map((lot) => lot.expiresAt as string).sort()[0];
  return { total: soon.reduce((sum, lot) => sum + lot.remaining, 0), first };
}

export interface BalanceAsideProps {
  billing: BillingSummary | undefined;
  tier: SubscriptionTier;
  loading: boolean;
  refreshing: boolean;
  onRefresh(): void;
}

/** Side column of the wallet: balance, xu about to expire, plan in use, lots in spending order. */
export function BalanceAside({ billing, tier, loading, refreshing, onRefresh }: BalanceAsideProps) {
  const wallet = billing?.xu;
  const lots = wallet?.lots.filter((lot) => lot.remaining > 0) ?? [];
  const soon = wallet ? expiringSoon(wallet) : null;
  const proEnd = billing?.subscription?.currentPeriodEnd;
  const paid = tier !== 'FREE';

  return (
    <div className="flex flex-col gap-6">
      <Panel aria-labelledby="wallet-balance-title">
        <PanelTitle
          id="wallet-balance-title"
          action={
            <Button variant="ghost" size="icon-sm" shape="rounded" aria-label="Làm mới số dư" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn(refreshing && 'animate-spin motion-reduce:animate-none')} aria-hidden />
            </Button>
          }
        >
          Số dư khả dụng
        </PanelTitle>
        {loading || !wallet ? (
          <div className="h-16 animate-pulse rounded-panel bg-surface-sunken" aria-label="Đang tải số dư" />
        ) : (
          <>
            <p className="flex items-baseline gap-2">
              <span className="font-mono text-display font-semibold tabular-nums text-fg">{wallet.balance.toLocaleString('vi-VN')}</span>
              <span className="text-body font-medium text-fg-muted">xu Wrap</span>
            </p>
            <p className="mt-1 text-caption tabular-nums text-fg-muted">≈ {formatVnd(wallet.balance * XU_VALUE_VND)}</p>
            <p className="mt-4 text-caption text-fg-muted">
              Định mức gói <strong className="tabular-nums text-fg">+{xu(wallet.allowance.perPeriod)}</strong> mỗi kỳ, làm mới {day(wallet.allowance.resetsAt)}.
            </p>
          </>
        )}
        <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-caption text-success-fg">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          Tự động hoàn xu nếu lỗi hệ thống
        </p>
      </Panel>

      <Panel aria-labelledby="wallet-expiring-title">
        <PanelTitle id="wallet-expiring-title">Xu sắp hết hạn</PanelTitle>
        {!soon ? (
          <div className="h-12 animate-pulse rounded-panel bg-surface-sunken" />
        ) : soon.total === 0 ? (
          <p className="text-body-sm text-fg-muted">Không có xu nào hết hạn trong {SOON_DAYS} ngày tới.</p>
        ) : (
          <StatTile label={`Hết hạn từ ${day(soon.first)}`} value={xu(soon.total)} hint={`Trong ${SOON_DAYS} ngày tới, được trừ trước`} />
        )}
      </Panel>

      <Panel aria-labelledby="wallet-plan-title">
        <PanelTitle id="wallet-plan-title" action={<Badge tone={paid ? 'success' : 'neutral'}>{paid ? 'Đang hoạt động' : 'Miễn phí'}</Badge>}>
          Gói đang dùng
        </PanelTitle>
        <p className="flex items-center gap-2 text-title text-fg">
          <Crown className="size-5 text-accent-fg" aria-hidden />
          {TIER_LABELS[tier]}
        </p>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-body-sm">
          {proEnd && (
            <>
              <dt className="flex items-center gap-1.5 text-fg-muted">
                <CalendarClock className="size-3.5" aria-hidden /> Hạn Pro
              </dt>
              <dd className="tabular-nums text-fg">{day(proEnd)}</dd>
            </>
          )}
          <dt className="text-fg-muted">Lượt xuất còn lại</dt>
          <dd className="tabular-nums text-fg">{billing ? billing.exportCredits.balance : '–'}</dd>
        </dl>
        <ButtonLink href="/dashboard/billing" variant="outline" shape="rounded" size="sm" block className="mt-4">
          Quản lý gói và hóa đơn
        </ButtonLink>
      </Panel>

      {lots.length > 0 && (
        <Panel aria-labelledby="wallet-lots-title">
          <PanelTitle id="wallet-lots-title" action={<span className="text-caption text-fg-muted">Trừ đợt cũ trước</span>}>
            Các đợt xu
          </PanelTitle>
          <ul className="divide-y divide-line">
            {lots.map((lot) => {
              const meta = SOURCE_META[lot.source];
              return (
                <li key={lot.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-control [&_svg]:size-4', TONE_SOFT[meta.tone])}>
                    <meta.icon aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium text-fg">{meta.label}</span>
                    <span className="block text-caption text-fg-muted">{lot.expiresAt ? `Hạn đến ${day(lot.expiresAt)}` : 'Không thời hạn'}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-body-sm font-semibold tabular-nums text-fg">{xu(lot.remaining)}</span>
                    <span className="block text-caption tabular-nums text-fg-muted">/ {lot.quantity.toLocaleString('vi-VN')}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
