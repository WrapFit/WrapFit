'use client';

/**
 * `/admin/bank-transactions`: bank transfers the SePay webhook could not match to a payment (docs/21 §3.5, §4.3).
 * An admin assigns each one to a payment (which confirms it and grants what it bought) or ignores it with a note.
 * Backed by `GET /admin/bank-transactions` and `POST /admin/bank-transactions/:id/resolve`.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import React, { useState } from 'react';
import { BANK_TX_KEY, listBankTransactions, type BankTransaction, type BankTxStatus } from '@/api/admin/bank-transactions';
import { Badge as ToneBadge, Button, DataTable, Tab, TabList, Tabs } from '@/components/ui';
import { AdminShell, Panel, WorkspaceEmpty, WorkspaceError } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';
import { formatVnd } from '@/features/pricing';
import { AssignDialog, IgnoreDialog } from './ResolveDialogs';
import { formatDateTime, REASON_LABELS, REASON_TONES, STATUS_LABELS, STATUS_TONES } from './labels';

type QueueStatus = BankTxStatus;

const TABS: { value: QueueStatus; label: string }[] = [
  { value: 'UNMATCHED', label: 'Chưa khớp' },
  { value: 'MATCHED', label: 'Tự khớp' },
  { value: 'RESOLVED', label: 'Đã gán' },
  { value: 'IGNORED', label: 'Đã bỏ qua' },
];

/** Other admins and customers change this queue while the page is open: ask again this often. */
const REFRESH_MS = 4000;

const EMPTY: Record<QueueStatus, { title: string; description: string }> = {
  UNMATCHED: { title: 'Không còn giao dịch chờ đối soát', description: 'Tiền về đúng mã và đúng số tiền được khớp tự động. Khoản nào lệch sẽ hiện ở đây.' },
  MATCHED: { title: 'Chưa có giao dịch tự khớp', description: 'Tiền về đúng mã và đúng số tiền sẽ hiện ở đây.' },
  RESOLVED: { title: 'Chưa có giao dịch nào được gán', description: 'Giao dịch đã gán cho một thanh toán sẽ hiện ở đây.' },
  IGNORED: { title: 'Chưa có giao dịch nào bị bỏ qua', description: 'Giao dịch đã hoàn tiền tay hoặc không liên quan sẽ hiện ở đây.' },
};

const PAGE_SIZE = 30;

type Action = { kind: 'assign' | 'ignore'; tx: BankTransaction };

export default function AdminBankTransactionsPage() {
  return (
    <RequireAuth role="ADMIN">
      <BankTransactionsScreen />
    </RequireAuth>
  );
}

function BankTransactionsScreen() {
  const [status, setStatus] = useState<QueueStatus>('UNMATCHED');
  const [action, setAction] = useState<Action | null>(null);

  const list = useInfiniteQuery({
    queryKey: [...BANK_TX_KEY, 'list', status],
    queryFn: ({ pageParam }) => listBankTransactions({ status, before: pageParam ?? undefined, limit: PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextBefore,
    // Paused while a resolve dialog is open, so the row being handled does not move under the admin.
    refetchInterval: action ? false : REFRESH_MS,
  });
  const rows = list.data?.pages.flatMap((page) => page.entries) ?? [];
  const waiting = status === 'UNMATCHED';

  return (
    <AdminShell
      title="Đối soát chuyển khoản"
      description="Tiền về tài khoản ngân hàng nhưng chưa khớp được với thanh toán nào: thiếu hoặc thừa tiền, quá hạn, thiếu mã, thanh toán đã trả."
    >
      <Panel aria-label="Giao dịch ngân hàng">
        <Tabs<QueueStatus> value={status} onValueChange={setStatus} className="mb-4">
          <TabList label="Lọc theo trạng thái xử lý">
            {TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>

        {list.isError ? (
          <WorkspaceError error={list.error} title="Không tải được giao dịch ngân hàng" onRetry={() => void list.refetch()} retrying={list.isFetching} />
        ) : list.isPending ? (
          <div className="h-40 animate-pulse rounded-panel bg-surface-sunken" role="status" aria-label="Đang tải giao dịch" />
        ) : (
          <>
            <DataTable<BankTransaction>
              label="Giao dịch ngân hàng"
              mobile="cards"
              rows={rows}
              rowKey={(tx) => tx.id}
              empty={<WorkspaceEmpty icon={Landmark} title={EMPTY[status].title} description={EMPTY[status].description} />}
              columns={[
                {
                  key: 'time',
                  label: 'Thời gian',
                  primary: true,
                  render: (tx) => (
                    <span className="flex flex-col items-start gap-1 max-md:items-end">
                      <time dateTime={tx.transactionAt} className="whitespace-nowrap tabular-nums text-fg">
                        {formatDateTime(tx.transactionAt)}
                      </time>
                    </span>
                  ),
                },
                { key: 'amount', label: 'Số tiền', align: 'right', render: (tx) => <span className="font-semibold tabular-nums">{formatVnd(tx.amountVnd)}</span> },
                {
                  key: 'content',
                  label: 'Nội dung',
                  render: (tx) => (
                    <span className="block max-w-xs break-words font-mono text-xs text-fg-muted" title={tx.content}>
                      {tx.content}
                    </span>
                  ),
                },
                {
                  key: 'reference',
                  label: 'Mã tách được',
                  render: (tx) =>
                    tx.extractedReference ? <span className="font-mono text-sm">{tx.extractedReference}</span> : <span className="text-fg-muted">Không có</span>,
                },
                {
                  key: 'reason',
                  label: waiting ? 'Lý do' : 'Xử lý',
                  render: (tx) =>
                    waiting && tx.unmatchedReason ? (
                      <ToneBadge tone={REASON_TONES[tx.unmatchedReason]}>{REASON_LABELS[tx.unmatchedReason]}</ToneBadge>
                    ) : (
                      <span className="flex flex-col items-start gap-0.5 max-md:items-end">
                        <ToneBadge tone={STATUS_TONES[tx.status]}>{STATUS_LABELS[tx.status]}</ToneBadge>
                        {tx.payment && (tx.status === 'RESOLVED' || tx.status === 'MATCHED') && <span className="font-mono text-caption text-fg-muted">{tx.payment.reference}</span>}
                        {tx.resolvedNote && <span className="max-w-xs break-words text-caption text-fg-muted">{tx.resolvedNote}</span>}
                      </span>
                    ),
                },
                ...(waiting
                  ? [
                      {
                        key: 'actions',
                        label: 'Xử lý',
                        align: 'right' as const,
                        render: (tx: BankTransaction) => (
                          <span className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="primary" onClick={() => setAction({ kind: 'assign', tx })}>
                              Gán cho thanh toán
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'ignore', tx })}>
                              Bỏ qua
                            </Button>
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
            {list.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" loading={list.isFetchingNextPage} loadingLabel="Đang tải…" onClick={() => void list.fetchNextPage()}>
                  Xem thêm
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>

      {action?.kind === 'assign' && <AssignDialog key={action.tx.id} tx={action.tx} onClose={() => setAction(null)} />}
      {action?.kind === 'ignore' && <IgnoreDialog key={action.tx.id} tx={action.tx} onClose={() => setAction(null)} />}
    </AdminShell>
  );
}
