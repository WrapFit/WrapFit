'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Coins,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  QrCode,
  Gift,
  Sparkles,
  Palette,
  Wand2,
  FileDown,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import React from 'react';
import { XU_PACKS, XU_VALUE_VND, type XuPackId } from '@wrapfit/shared';
import { getXuHistory } from '@/api/payments';
import { Button } from '@/components/ui';
import { Badge, Panel, PanelTitle, WorkspaceError } from '@/components/workspace';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data';
import { tactileAudio } from '@/services/audio/tactileAudio';
import type { XuHistoryEntry, XuPackPurpose, XuWallet } from '@/types/api';
import { cn } from '@/utils/helpers';

const PACKS = (Object.keys(XU_PACKS) as XuPackId[]).map((id) => XU_PACKS[id]);

interface SourceMeta {
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
}

const SOURCE_META: Record<NonNullable<XuHistoryEntry['source']>, SourceMeta> = {
  PLAN_ALLOWANCE: {
    label: 'Định mức gói',
    sub: 'Cấp theo gói thành viên',
    icon: Crown,
    badgeClass: 'bg-blue-50 text-focus border-blue-200',
  },
  PURCHASE: {
    label: 'Nạp xu VietQR',
    sub: 'Chuyển khoản ngân hàng',
    icon: QrCode,
    badgeClass: 'bg-orange-50 text-fpt-orange-ink border-fpt-orange/20',
  },
  ADMIN: {
    label: 'Quà tặng WrapFit',
    sub: 'Thưởng từ hệ thống',
    icon: Gift,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

interface ReasonMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const REASON_META: Record<NonNullable<XuHistoryEntry['reason']>, ReasonMeta> = {
  AI_IMAGE: {
    label: 'Ảnh mặt hộp AI',
    icon: Sparkles,
  },
  AI_PATTERN: {
    label: 'Hoa văn AI',
    icon: Palette,
  },
  AI_TOOL: {
    label: 'Xử lý ảnh AI',
    icon: Wand2,
  },
  EXPORT_UNLOCK: {
    label: 'Xuất file in CAD',
    icon: FileDown,
  },
  ADMIN_ADJUSTMENT: {
    label: 'Điều chỉnh số dư',
    icon: ArrowRight,
  },
};

const SOURCE_LABELS: Record<NonNullable<XuHistoryEntry['source']>, string> = {
  PLAN_ALLOWANCE: SOURCE_META.PLAN_ALLOWANCE.label,
  PURCHASE: SOURCE_META.PURCHASE.label,
  ADMIN: SOURCE_META.ADMIN.label,
};

const REASON_LABELS: Record<NonNullable<XuHistoryEntry['reason']>, string> = {
  AI_IMAGE: REASON_META.AI_IMAGE.label,
  AI_PATTERN: REASON_META.AI_PATTERN.label,
  AI_TOOL: REASON_META.AI_TOOL.label,
  EXPORT_UNLOCK: REASON_META.EXPORT_UNLOCK.label,
  ADMIN_ADJUSTMENT: REASON_META.ADMIN_ADJUSTMENT.label,
};

const PACK_ESTIMATES: Record<XuPackId, string> = {
  XU_500: '~12 ảnh AI hoặc 500 hoa văn',
  XU_1050: '~26 ảnh AI hoặc 1.000 hoa văn',
  XU_2200: 'Trọn gói cho 50+ mẫu hộp quà',
};

const xu = (count: number) => `${count.toLocaleString('vi-VN')} xu`;
const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const timeDay = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = d.toLocaleDateString('vi-VN');
  return `${date} · ${time}`;
};

/**
 * Clean & Authentic "Ví xu Wrap" of the billing page (docs/19 S5):
 * Paper-craft packaging aesthetic, Pacdora-style hairline cards, and transparent ledger history.
 */
export function XuWalletPanel({ wallet, onBuy }: { wallet: XuWallet | undefined; onBuy(purpose: XuPackPurpose): void }) {
  const history = useInfiniteQuery({
    queryKey: queryKeys.xuHistory,
    queryFn: ({ pageParam }) => getXuHistory({ before: pageParam ?? undefined, limit: 10 }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextBefore,
  });

  const entries = history.data?.pages.flatMap((page) => page.entries) ?? [];
  const lots = wallet?.lots.filter((lot) => lot.remaining > 0) ?? [];

  const allowance = wallet?.allowance?.perPeriod ?? 50;
  const progressPercent = Math.min(100, Math.max(8, Math.round(((wallet?.balance ?? 0) / allowance) * 100)));

  const handleBuy = (packId: XuPackId) => {
    tactileAudio.playSquishyTap();
    onBuy(packId);
  };

  return (
    <Panel aria-labelledby="xu-wallet-title" className="space-y-6">
      <PanelTitle id="xu-wallet-title" action={<Badge tone="grey">1 xu = {formatVnd(XU_VALUE_VND)}</Badge>}>
        Ví xu Wrap
      </PanelTitle>

      {/* Clean Paper Balance Card */}
      <div className="rounded-2xl border border-library-line bg-white p-6 shadow-xs transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 pb-5 border-b border-library-line/70">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-library-muted">
              <span className="flex size-6 items-center justify-center rounded-lg bg-orange-50 text-fpt-orange-ink border border-fpt-orange/20">
                <Coins className="size-3.5" aria-hidden />
              </span>
              <span>Tổng số dư khả dụng</span>
            </div>

            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="font-mono text-4xl sm:text-5xl font-bold text-library-ink tabular-nums tracking-tight">
                {wallet ? wallet.balance.toLocaleString('vi-VN') : '–'}
              </span>
              <span className="text-base font-semibold text-library-muted">xu Wrap</span>
              {wallet && (
                <span className="ml-1 font-mono text-sm text-library-sub">
                  (≈ {formatVnd(wallet.balance * XU_VALUE_VND)})
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-library-sub">
              Dùng cho ảnh AI, hoa văn và xuất file sản xuất.
            </p>
          </div>

          {wallet && (
            <div className="rounded-xl border border-library-line/80 bg-library-tile/60 p-3 sm:text-right shrink-0">
              <span className="text-xs text-library-muted block">Định mức gói</span>
              <span className="font-mono text-sm font-bold text-library-ink mt-0.5 block">
                +{xu(wallet.allowance.perPeriod)} <span className="text-library-muted font-normal">/ kỳ</span>
              </span>
              <span className="block text-caption text-fpt-orange-ink font-medium mt-0.5">
                Làm mới {day(wallet.allowance.resetsAt)}
              </span>
            </div>
          )}
        </div>

        {/* Period allowance progress */}
        {wallet && (
          <div className="mt-4 pt-1">
            <div className="flex items-center justify-between text-xs text-library-muted mb-1.5">
              <span>Hạn mức kỳ này</span>
              <span className="font-mono tabular-nums text-library-sub">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-library-tile overflow-hidden">
              <div
                className="h-full rounded-full bg-fpt-orange transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-library-line/70 text-xs text-library-sub">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
            Tự động hoàn xu nếu lỗi hệ thống
          </span>
          <span className="text-library-line hidden sm:inline">·</span>
          <span className="inline-flex items-center gap-1.5 text-library-muted">
            <Clock className="size-3.5" aria-hidden />
            Hạn dùng 12 tháng
          </span>
        </div>
      </div>

      {/* Clean Pacdora-style Recharge Packages */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-library-ink">Gói nạp xu VietQR</h3>

        <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {PACKS.map((pack) => {
            const bonus = pack.xu - pack.priceVnd / XU_VALUE_VND;
            const isPopular = pack.id === 'XU_1050';
            const isVIP = pack.id === 'XU_2200';

            return (
              <li
                key={pack.id}
                className={cn(
                  'group relative flex flex-col justify-between rounded-xl p-5 transition-all duration-200 border bg-white',
                  isPopular
                    ? 'border-fpt-orange bg-orange-50/15 shadow-sm hover:border-fpt-orange hover:shadow-hard-sm'
                    : 'border-library-line hover:border-library-ink/40 hover:shadow-hard-sm'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-2xl font-bold tabular-nums text-library-ink block">
                        {xu(pack.xu)}
                      </span>
                      <span className="font-semibold text-sm text-fpt-orange-ink font-mono mt-0.5 block">
                        {formatVnd(pack.priceVnd)}
                      </span>
                    </div>

                    {isPopular ? (
                      <span className="rounded-full bg-fpt-orange px-2.5 py-0.5 text-caption font-semibold text-white">
                        Phổ biến
                      </span>
                    ) : isVIP ? (
                      <span className="rounded-full bg-library-tile border border-library-line px-2.5 py-0.5 text-caption font-medium text-library-ink">
                        Tiết kiệm 10%
                      </span>
                    ) : null}
                  </div>

                  {/* Packaging Estimate */}
                  <div className="my-3 space-y-1 border-t border-library-line/60 pt-2.5 text-xs">
                    {bonus > 0 && (
                      <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
                        +{xu(bonus)} tặng thêm
                      </p>
                    )}
                    <p className="text-caption text-library-muted">
                      {PACK_ESTIMATES[pack.id]}
                    </p>
                  </div>
                </div>

                {/* Call to action */}
                <Button
                  size="sm"
                  shape="rounded"
                  variant={isPopular ? 'brand' : 'outline'}
                  className="w-full font-semibold transition-all mt-1"
                  onClick={() => handleBuy(pack.id)}
                >
                  Nạp {formatVnd(pack.priceVnd)}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Credit Lots (FIFO) */}
      {lots.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-library-ink">Các đợt xu trong ví</h3>
            <span className="text-xs text-library-sub">Ưu tiên trừ đợt cũ</span>
          </div>
          <ul className="divide-y divide-library-line rounded-xl border border-library-line bg-white shadow-xs overflow-hidden">
            {lots.map((lot) => {
              const meta = SOURCE_META[lot.source] ?? {
                label: 'Xu khả dụng',
                sub: '',
                icon: Coins,
                badgeClass: 'bg-library-tile text-library-ink border-library-line',
              };
              const Icon = meta.icon;

              return (
                <li key={lot.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-library-tile/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border', meta.badgeClass)}>
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div>
                      <span className="font-medium text-library-ink block">{meta.label}</span>
                      <span className="text-caption text-library-sub">
                        {lot.expiresAt ? `Hạn đến ${day(lot.expiresAt)}` : 'Không thời hạn'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold tabular-nums text-library-ink font-mono block">
                      {xu(lot.remaining)}
                    </span>
                    <span className="text-caption text-library-muted">
                      Gốc: {lot.quantity.toLocaleString('vi-VN')} xu
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Transaction Ledger History */}
      <div className="space-y-2 pt-2">
        <h3 className="text-sm font-semibold text-library-ink">Lịch sử giao dịch xu</h3>
        {history.isError ? (
          <WorkspaceError error={history.error} onRetry={() => void history.refetch()} retrying={history.isFetching} />
        ) : history.isPending ? (
          <div className="h-28 animate-pulse rounded-xl bg-library-panel" />
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-library-line p-6 text-center text-sm text-library-sub">
            Chưa có giao dịch xu nào trong ví của bạn.
          </div>
        ) : (
          <ul className="divide-y divide-library-line rounded-xl border border-library-line bg-white shadow-xs overflow-hidden">
            {entries.map((entry) => {
              const isGrant = entry.type === 'GRANT';
              let label = '';
              let Icon: React.ComponentType<{ className?: string }> = Coins;
              let iconClass = 'bg-library-tile text-library-ink border-library-line';

              if (isGrant) {
                const sourceMeta = SOURCE_META[entry.source ?? 'PURCHASE'];
                label = sourceMeta?.label ?? 'Cộng xu vào ví';
                Icon = sourceMeta?.icon ?? ArrowDownLeft;
                iconClass = sourceMeta?.badgeClass ?? 'bg-emerald-50 text-emerald-700 border-emerald-200';
              } else {
                const reasonMeta = REASON_META[entry.reason ?? 'ADMIN_ADJUSTMENT'];
                label = reasonMeta?.label ?? 'Chi tiêu xu';
                Icon = reasonMeta?.icon ?? ArrowUpRight;
                iconClass = 'bg-slate-50 text-slate-700 border-slate-200';
              }

              return (
                <li key={`${entry.type}-${entry.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-library-tile/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border', iconClass)}>
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div>
                      <span className="font-medium text-library-ink block">{label}</span>
                      <span className="text-caption text-library-sub">{timeDay(entry.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={cn(
                        'block font-bold tabular-nums font-mono',
                        entry.refundedAt
                          ? 'text-library-muted line-through'
                          : entry.quantity > 0
                            ? 'text-emerald-700'
                            : 'text-library-ink'
                      )}
                    >
                      {entry.quantity > 0 ? '+' : '−'}
                      {xu(Math.abs(entry.quantity))}
                    </span>
                    {entry.refundedAt && (
                      <span className="inline-flex items-center gap-1 text-caption font-medium text-amber-700">
                        <RotateCcw className="size-3" aria-hidden /> Đã hoàn xu
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {history.hasNextPage && (
          <Button size="sm" variant="ghost" className="mt-2 font-medium" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
            {history.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm giao dịch cũ'}
          </Button>
        )}
      </div>
    </Panel>
  );
}
