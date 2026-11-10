'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ReceiptText, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';
import { getXuHistory } from '@/api/payments';
import { Button, DatePicker, Tab, TabList, Tabs, TONE_SOFT, type DateRange } from '@/components/ui';
import { DataTable, Panel, PanelTitle, WorkspaceEmpty, WorkspaceError } from '@/components/workspace';
import { queryKeys } from '@/hooks/data';
import type { XuHistoryEntry, XuHistoryType } from '@/types/api';
import { cn } from '@/utils/helpers';
import { HISTORY_TABS, dayTime, entryMeta, xu } from './xu-meta';

const PAGE_SIZE = 10;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

/** "Lịch sử giao dịch": filter tabs, a date range, the ledger as a table and "Xem thêm" for the next cursor page. */
export function HistoryPanel() {
  const [tab, setTab] = useState<'all' | XuHistoryType>('all');
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  // A range with only a start is half picked: filter once both ends are there.
  const complete = range.from && range.to ? { from: startOfDay(range.from).toISOString(), to: endOfDay(range.to).toISOString() } : null;
  const type = tab === 'all' ? undefined : tab;

  const history = useInfiniteQuery({
    // Starts with queryKeys.xuHistory so the checkout refreshes every filter after a top-up.
    queryKey: [...queryKeys.xuHistory, type ?? 'all', complete?.from ?? null, complete?.to ?? null],
    queryFn: ({ pageParam }) => getXuHistory({ before: pageParam ?? undefined, limit: PAGE_SIZE, type, from: complete?.from, to: complete?.to }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextBefore,
  });
  const entries = history.data?.pages.flatMap((page) => page.entries) ?? [];
  const filtered = tab !== 'all' || complete !== null;

  return (
    <Panel aria-labelledby="wallet-history-title">
      <PanelTitle id="wallet-history-title">Lịch sử giao dịch</PanelTitle>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs<"all" | XuHistoryType> value={tab} onValueChange={setTab}>
          <TabList label="Lọc theo loại giao dịch">
            {HISTORY_TABS.map((item) => (
              <Tab key={item.value} value={item.value}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <div className="flex items-end gap-2">
          <DatePicker mode="range" label="Khoảng ngày" max={new Date()} value={range} onChange={setRange} className="w-full sm:w-72" />
          {(range.from || range.to) && (
            <Button variant="ghost" size="sm" shape="rounded" onClick={() => setRange({ from: null, to: null })}>
              Xóa
            </Button>
          )}
        </div>
      </div>

      {history.isError ? (
        <WorkspaceError error={history.error} onRetry={() => void history.refetch()} retrying={history.isFetching} />
      ) : history.isPending ? (
        <div className="h-40 animate-pulse rounded-panel bg-surface-sunken" />
      ) : (
        <>
          <DataTable<XuHistoryEntry>
            label="Lịch sử giao dịch xu"
            mobile="cards"
            rows={entries}
            rowKey={(entry) => `${entry.type}-${entry.id}`}
            empty={
              <WorkspaceEmpty
                icon={ReceiptText}
                title={filtered ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch xu'}
                description={filtered ? 'Đổi loại giao dịch hoặc khoảng ngày để xem thêm.' : 'Xu nạp, xu định mức và xu đã dùng sẽ hiện ở đây.'}
              />
            }
            columns={[
              {
                key: 'type',
                label: 'Giao dịch',
                primary: true,
                render: (entry) => {
                  const meta = entryMeta(entry);
                  return (
                    <span className="flex items-center gap-3">
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-control [&_svg]:size-4', TONE_SOFT[meta.tone])}>
                        <meta.icon aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-fg">{meta.label}</span>
                        {meta.sub && <span className="block text-caption font-normal text-fg-muted">{meta.sub}</span>}
                      </span>
                    </span>
                  );
                },
              },
              {
                key: 'time',
                label: 'Thời gian',
                render: (entry) => (
                  <time dateTime={entry.createdAt} className="tabular-nums text-fg-muted">
                    {dayTime(entry.createdAt)}
                  </time>
                ),
              },
              {
                key: 'quantity',
                label: 'Số xu',
                align: 'right',
                render: (entry) => (
                  <span className="inline-flex flex-col items-end">
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        entry.refundedAt ? 'text-fg-muted line-through' : entry.quantity > 0 ? 'text-success-fg' : 'text-fg',
                      )}
                    >
                      {entry.quantity > 0 ? '+' : '−'}
                      {xu(Math.abs(entry.quantity))}
                    </span>
                    {entry.refundedAt && (
                      <span className="inline-flex items-center gap-1 text-caption text-warning-fg">
                        <RotateCcw className="size-3" aria-hidden /> Đã hoàn xu
                      </span>
                    )}
                  </span>
                ),
              },
            ]}
          />
          {history.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" shape="rounded" loading={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
                Xem thêm giao dịch cũ
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
