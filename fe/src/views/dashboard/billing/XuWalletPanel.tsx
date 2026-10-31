'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Coins, RotateCcw } from 'lucide-react';
import React from 'react';
import { XU_PACKS, XU_VALUE_VND, type XuPackId } from '@wrapfit/shared';
import { getXuHistory } from '@/api/payments';
import { Button } from '@/components/ui';
import { Badge, Panel, PanelTitle, WorkspaceError } from '@/components/workspace';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data';
import type { XuHistoryEntry, XuPackPurpose, XuWallet } from '@/types/api';

const PACKS = (Object.keys(XU_PACKS) as XuPackId[]).map((id) => XU_PACKS[id]);

const SOURCE_LABELS: Record<NonNullable<XuHistoryEntry['source']>, string> = {
  PLAN_ALLOWANCE: 'Xu của gói',
  PURCHASE: 'Gói xu đã mua',
  ADMIN: 'WrapFit tặng',
};
const REASON_LABELS: Record<NonNullable<XuHistoryEntry['reason']>, string> = {
  AI_IMAGE: 'Tạo ảnh AI',
  AI_PATTERN: 'Hoa văn AI',
  AI_TOOL: 'Công cụ ảnh AI',
  EXPORT_UNLOCK: 'Mở khóa bản thiết kế',
  ADMIN_ADJUSTMENT: 'Điều chỉnh',
};

const xu = (count: number) => `${count.toLocaleString('vi-VN')} xu`;
const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** "Ví xu" of the billing page (docs/19 S5): balance, lots by expiry, history, and the xu packs on sale. */
export function XuWalletPanel({ wallet, onBuy }: { wallet: XuWallet | undefined; onBuy(purpose: XuPackPurpose): void }) {
  const history = useInfiniteQuery({
    queryKey: queryKeys.xuHistory,
    queryFn: ({ pageParam }) => getXuHistory({ before: pageParam ?? undefined, limit: 10 }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextBefore,
  });
  const entries = history.data?.pages.flatMap((page) => page.entries) ?? [];
  const lots = wallet?.lots.filter((lot) => lot.remaining > 0) ?? [];

  return (
    <Panel aria-labelledby="xu-wallet-title">
      <PanelTitle id="xu-wallet-title" action={<span className="text-xs text-library-sub">1 xu = {formatVnd(XU_VALUE_VND)}</span>}>
        Ví xu Wrap
      </PanelTitle>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-2xl font-medium tabular-nums text-library-ink">
            <Coins className="size-6 text-fpt-orange-ink" aria-hidden />
            {wallet ? xu(wallet.balance) : '–'}
          </p>
          {wallet && (
            <p className="mt-1 text-sm text-library-sub">
              Gói cộng {xu(wallet.allowance.perPeriod)} mỗi kỳ, kỳ tới từ {day(wallet.allowance.resetsAt)}. Xu chưa dùng giữ thêm một kỳ.
            </p>
          )}
          <p className="mt-1 text-sm text-library-sub">Dùng cho ảnh AI, hoa văn AI, phóng to, xóa nền, vector hóa. Lỗi phía WrapFit thì xu được hoàn.</p>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-medium text-library-ink">Nạp thêm xu</h3>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PACKS.map((pack) => {
          const bonus = pack.xu - pack.priceVnd / XU_VALUE_VND;
          return (
            <li key={pack.id} className="flex flex-col gap-2 rounded-xl border border-library-line p-3">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-medium tabular-nums text-library-ink">{xu(pack.xu)}</span>
                {bonus > 0 && <Badge tone="green">+{xu(bonus)}</Badge>}
              </span>
              <span className="text-xs text-library-sub">{formatVnd(pack.priceVnd)} · dùng trong 12 tháng</span>
              <Button size="sm" shape="rounded" variant="outline" onClick={() => onBuy(pack.id)}>
                Nạp {formatVnd(pack.priceVnd)}
              </Button>
            </li>
          );
        })}
      </ul>

      {lots.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-medium text-library-ink">Các lô xu</h3>
          <p className="text-xs text-library-sub">Lô sắp hết hạn được trừ trước.</p>
          <ul className="mt-2 divide-y divide-library-line rounded-xl border border-library-line">
            {lots.map((lot) => (
              <li key={lot.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-library-ink">{SOURCE_LABELS[lot.source]}</span>
                <span className="text-right">
                  <span className="block tabular-nums text-library-ink">
                    {xu(lot.remaining)} <span className="text-library-muted">/ {lot.quantity.toLocaleString('vi-VN')}</span>
                  </span>
                  <span className="block text-xs text-library-sub">{lot.expiresAt ? `hết hạn ${day(lot.expiresAt)}` : 'không hết hạn'}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="mt-6 text-sm font-medium text-library-ink">Lịch sử xu</h3>
      {history.isError ? (
        <WorkspaceError error={history.error} onRetry={() => void history.refetch()} retrying={history.isFetching} />
      ) : history.isPending ? (
        <div className="mt-2 h-20 animate-pulse rounded-xl bg-library-panel" />
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm text-library-sub">Chưa có giao dịch xu nào.</p>
      ) : (
        <ul className="mt-2 divide-y divide-library-line">
          {entries.map((entry) => (
            <li key={`${entry.type}-${entry.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="block text-library-ink">
                  {entry.type === 'GRANT' ? SOURCE_LABELS[entry.source ?? 'ADMIN'] : REASON_LABELS[entry.reason ?? 'ADMIN_ADJUSTMENT']}
                </span>
                <span className="block text-xs text-library-sub">{new Date(entry.createdAt).toLocaleString('vi-VN')}</span>
              </span>
              <span className="text-right">
                <span
                  className={`block font-medium tabular-nums ${entry.refundedAt ? 'text-library-muted line-through' : entry.quantity > 0 ? 'text-success-fg' : 'text-library-ink'}`}
                >
                  {entry.quantity > 0 ? '+' : '−'}
                  {xu(Math.abs(entry.quantity))}
                </span>
                {entry.refundedAt && (
                  <span className="inline-flex items-center gap-1 text-xs text-library-sub">
                    <RotateCcw className="size-3" aria-hidden /> đã hoàn
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {history.hasNextPage && (
        <Button size="sm" variant="ghost" className="mt-2" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
          {history.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
        </Button>
      )}
    </Panel>
  );
}
