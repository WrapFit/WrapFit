'use client';

/**
 * `/dashboard/billing`: plan, quotas, payment and history, in the pacdora.com workspace style. The plan comes from
 * `GET /auth/me` (subscriptionTier), the Pro period from `GET /billing/me`, the quotas from `GET /storage/usage` and
 * `GET /ai/usage`, the sample-print orders from `GET /orders/my-orders`. Pro is paid here with the VietQR checkout
 * (docs-old/17 S5; export packs are no longer sold, docs-old/25 item 7); cancelling still goes to the billing team.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, CalendarClock, Coins, Landmark, Receipt } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { getBillingDetails, getBillingSummary, listMyPayments, saveBillingDetails } from '@/api/payments';
import { outlineButton, primaryButton } from '@/components/library';
import { ButtonLink } from '@/components/ui';
import { Badge, DataTable, Meter, Panel, PanelTitle, WORKSPACE_INPUT, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { TIER_LABELS } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import { ConfirmDialog, DIALOG_DANGER, formatBytes, usagePercent, useAiUsage, useStorageUsage } from '@/features/dashboard';
import { CheckoutDialog } from '@/features/payments';
import { PLANS, PRO_PERIOD_DAYS, PRO_SUMMARY, formatQuota, formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data';
import type { BillingDetails, PaymentHistoryEntry, PaymentPurpose, SalePurpose } from '@/types/api';
import { cn } from '@/utils/helpers';

export default function BillingPage() {
  return (
    <RequireAuth>
      <BillingScreen />
    </RequireAuth>
  );
}

/** Payment history: export packs are no longer sold but old payments still show what was bought. */
const PURPOSE_LABELS: Record<PaymentPurpose, string> = {
  EXPORT_1: '1 lượt xuất',
  EXPORT_5: '5 lượt xuất',
  EXPORT_15: '15 lượt xuất',
  PRO_MONTH: 'Pro 30 ngày',
  SAMPLE_ORDER: 'Đơn in mẫu',
  XU_500: '500 xu Wrap',
  XU_1050: '1.050 xu Wrap',
  XU_2200: '2.200 xu Wrap',
  XU_CUSTOM: 'Nạp xu Wrap',
};

const STATUS_BADGES: Record<PaymentHistoryEntry['status'], { tone: 'green' | 'amber' | 'grey'; label: string }> = {
  PAID: { tone: 'green', label: 'Đã thanh toán' },
  PENDING: { tone: 'amber', label: 'Chờ chuyển khoản' },
  EXPIRED: { tone: 'grey', label: 'Hết hạn' },
  CANCELLED: { tone: 'grey', label: 'Đã hủy' },
};

const PROVIDER_LABELS: Record<PaymentHistoryEntry['provider'], string> = {
  VIETQR: 'VietQR',
  VNPAY: 'VNPay (sandbox)',
};

const HISTORY_PAGE = 10;

function BillingScreen() {
  const { user } = useAuth();
  const tier = user?.subscriptionTier ?? 'FREE';
  const plan = PLANS[tier];
  const paid = tier !== 'FREE';
  const storage = useStorageUsage();
  const ai = useAiUsage();
  const history = useInfiniteQuery({
    queryKey: queryKeys.paymentHistory,
    queryFn: ({ pageParam }) => listMyPayments({ before: pageParam ?? undefined, limit: HISTORY_PAGE }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextBefore,
  });
  const payments = history.data?.pages.flatMap((page) => page.entries) ?? [];
  const [cancelOpen, setCancelOpen] = useState(false);
  const billing = useQuery({ queryKey: queryKeys.billing, queryFn: getBillingSummary });
  const [buying, setBuying] = useState<SalePurpose | null>(null);
  const proEnd = billing.data?.subscription?.currentPeriodEnd;

  const storagePercent = storage.data ? usagePercent(storage.data.usedBytes, storage.data.quotaBytes) : 0;
  const xu = ai.data?.xu;
  const xuPercent = xu ? usagePercent(xu.balance, xu.allowance.perPeriod) : 0;

  return (
    <WorkspaceShell
      title="Thanh toán & gói cước"
      description="Gói cước, hạn mức tài nguyên và lịch sử thanh toán."
      actions={
        <Link href="/pricing" className={outlineButton}>
          So sánh các gói
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          {/* Plan */}
          <Panel>
            <PanelTitle action={<Badge tone={paid ? 'lime' : 'grey'}>{paid ? 'Đang hoạt động' : 'Miễn phí'}</Badge>}>Gói hiện tại</PanelTitle>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-2xl font-medium text-library-ink">{TIER_LABELS[tier]}</p>
                <p className="mt-1 text-sm text-library-sub">
                  {tier === 'FREE'
                    ? 'Thiết kế, FitCheck™ và xem 3D miễn phí. File in mở khi bạn thanh toán đơn in mẫu.'
                    : tier === 'PAY_PER_EXPORT'
                      ? 'Gói lượt xuất đã ngừng bán: lượt còn lại được đổi sang xu Wrap. File in mở khi bạn thanh toán đơn in mẫu.'
                      : plan.contactOnly
                        ? 'Gói theo hợp đồng với WrapFit.'
                        : `${formatVnd(plan.price.monthly)} / ${PRO_PERIOD_DAYS} ngày: ${PRO_SUMMARY}.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.contactOnly ? (
                  <Link href="/contact" className={primaryButton}>
                    Liên hệ
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : (
                  <button type="button" onClick={() => setBuying('PRO_MONTH')} className={primaryButton}>
                    {tier === 'STARTER' ? 'Gia hạn 30 ngày' : `Nâng lên ${PLANS.STARTER.name}`}
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                )}
                {paid && (
                  <button type="button" onClick={() => setCancelOpen(true)} className={outlineButton}>
                    Huỷ gói
                  </button>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-library-sub">Dung lượng</span>
                  <span className="text-library-ink">{storage.data ? `${formatBytes(storage.data.usedBytes)} / ${formatBytes(storage.data.quotaBytes)}` : formatQuota(plan.storageBytes)}</span>
                </div>
                <Meter percent={storagePercent} label="Dung lượng đã dùng" />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-library-sub">Xu Wrap</span>
                  <span className="tabular-nums text-library-ink">
                    {xu ? `${xu.balance.toLocaleString('vi-VN')} xu` : `${plan.xuPerPeriod.toLocaleString('vi-VN')} xu/kỳ`}
                  </span>
                </div>
                <Meter percent={xuPercent} label="Xu còn lại so với hạn mức mỗi kỳ" />
                {xu && (
                  <p className="mt-1.5 text-xs text-library-sub">
                    Gói cộng {xu.allowance.perPeriod.toLocaleString('vi-VN')} xu mỗi kỳ, kỳ tới từ {new Date(xu.allowance.resetsAt).toLocaleDateString('vi-VN')}.
                  </p>
                )}
              </div>
            </div>
          </Panel>

          {/* Next payment */}
          <Panel>
            <PanelTitle>Kỳ thanh toán tới</PanelTitle>
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-library-panel p-4">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-library-sub" aria-hidden />
              <p className="text-sm leading-relaxed text-library-sub">
                {tier === 'FREE'
                  ? 'Gói Free không có phí định kỳ. Bạn chỉ trả khi đặt in mẫu hoặc nâng cấp.'
                  : tier === 'PAY_PER_EXPORT'
                    ? 'Không có phí định kỳ.'
                    : proEnd
                      ? `Hạn dùng Pro đến ${new Date(proEnd).toLocaleDateString('vi-VN')} (không tự gia hạn, nạp nối tiếp khi cần).`
                      : 'Gói theo thỏa thuận với WrapFit: không có kỳ thanh toán tự động.'}
              </p>
            </div>
          </Panel>

          {/* Xu wallet */}
          <Panel>
            <PanelTitle>Ví xu Wrap</PanelTitle>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-baseline gap-2">
                <Coins className="size-5 self-center text-fpt-orange-ink" aria-hidden />
                <span className="font-mono text-heading-lg font-semibold tabular-nums text-library-ink">{xu ? xu.balance.toLocaleString('vi-VN') : '–'}</span>
                <span className="text-sm text-library-sub">xu Wrap</span>
              </p>
              <ButtonLink href="/dashboard/wallet" variant="outline" shape="rounded">
                Mở ví xu
                <ArrowRight aria-hidden />
              </ButtonLink>
            </div>
            <p className="mt-2 text-xs text-library-sub">Nạp xu, xem xu sắp hết hạn và lịch sử giao dịch trong ví.</p>
          </Panel>

          {/* History */}
          <Panel>
            <PanelTitle action={<Link href="/dashboard/orders" className="text-sm font-medium text-fpt-orange-ink hover:underline">Theo dõi sản xuất</Link>}>Lịch sử thanh toán</PanelTitle>
            <div className="mt-4">
              {history.isError ? (
                <WorkspaceError error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />
              ) : history.isLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-library-panel" />
              ) : !payments.length ? (
                <WorkspaceEmpty icon={Receipt} title="Chưa có khoản thanh toán nào" description="Gói cước, xu Wrap và phí in mẫu sẽ hiện ở đây sau lần thanh toán đầu tiên." />
              ) : (
                <>
                  <DataTable<PaymentHistoryEntry>
                    label="Lịch sử thanh toán"
                    rows={payments}
                    rowKey={(row) => row.id}
                    columns={[
                      { key: 'date', label: 'Ngày', render: (row) => <span className="tabular-nums">{new Date(row.paidAt ?? row.createdAt).toLocaleDateString('vi-VN')}</span> },
                      { key: 'item', label: 'Nội dung', render: (row) => <span className="line-clamp-1">{PURPOSE_LABELS[row.purpose] ?? row.purpose}</span> },
                      { key: 'code', label: 'Mã', render: (row) => <span className="font-mono text-xs">{row.reference}</span> },
                      { key: 'method', label: 'Cách trả', render: (row) => <span className="text-library-sub">{PROVIDER_LABELS[row.provider] ?? row.provider}</span> },
                      { key: 'total', label: 'Số tiền', align: 'right', render: (row) => <span className="tabular-nums">{formatVnd(row.amountVnd)}</span> },
                      { key: 'paid', label: 'Trạng thái', align: 'right', render: (row) => <Badge tone={STATUS_BADGES[row.status].tone}>{STATUS_BADGES[row.status].label}</Badge> },
                    ]}
                  />
                  {history.hasNextPage && (
                    <div className="mt-4 flex justify-center">
                      <button type="button" onClick={() => void history.fetchNextPage()} disabled={history.isFetchingNextPage} className={outlineButton}>
                        {history.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <BillingDetailsPanel />
        </div>
      </div>

      {cancelOpen && (
        <ConfirmDialog
          title="Huỷ gói cước?"
          icon="cancel"
          confirmLabel="Gửi yêu cầu huỷ"
          busyLabel="Đang mở email…"
          confirmClassName={DIALOG_DANGER}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => {
            window.location.href = `mailto:billing@wrapfit.vn?subject=${encodeURIComponent('Yêu cầu huỷ gói cước')}`;
            setCancelOpen(false);
          }}
        >
          <p className="text-sm leading-relaxed text-library-sub">
            Gói vẫn dùng được đến hết kỳ đã thanh toán. Dự án và file được lưu giữ an toàn.
          </p>
        </ConfirmDialog>
      )}
      {buying && <CheckoutDialog purpose={buying} onClose={() => setBuying(null)} />}
    </WorkspaceShell>
  );
}

/** Name, tax code and email printed on VAT invoices, kept on the account (`GET|PUT /billing/details`). */
function BillingDetailsPanel() {
  const queryClient = useQueryClient();
  const stored = useQuery({ queryKey: queryKeys.billingDetails, queryFn: getBillingDetails });
  const [details, setDetails] = useState<BillingDetails>({ company: '', taxCode: '', email: '' });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (stored.data) setDetails(stored.data);
  }, [stored.data]);
  const mutation = useMutation({
    mutationFn: () => saveBillingDetails(details),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.billingDetails, result);
      setDetails(result);
      setSaved(true);
    },
  });
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    mutation.mutate();
  };
  return (
    <Panel>
      <PanelTitle>Thông tin xuất hoá đơn VAT</PanelTitle>
      <form onSubmit={save} className="mt-3 flex flex-col gap-3">
        {(
          [
            ['company', 'Tên đơn vị / hộ kinh doanh', Building2],
            ['taxCode', 'Mã số thuế', Landmark],
            ['email', 'Email nhận hoá đơn', Receipt],
          ] as const
        ).map(([key, label, Icon]) => (
          <label key={key} className="text-sm text-library-sub">
            <span className="mb-1 flex items-center gap-1.5">
              <Icon className="size-3.5" aria-hidden /> {label}
            </span>
            <input value={details[key]} onChange={(event) => (setSaved(false), setDetails({ ...details, [key]: event.target.value }))} className={WORKSPACE_INPUT} inputMode={key === 'taxCode' ? 'numeric' : undefined} type={key === 'email' ? 'email' : 'text'} />
          </label>
        ))}
        <button type="submit" className={outlineButton} disabled={mutation.isPending || stored.isLoading}>
          {mutation.isPending ? 'Đang lưu…' : 'Lưu thông tin'}
        </button>
        {mutation.isError && (
          <p role="alert" className="text-xs text-danger-fg">
            {mutation.error instanceof Error ? mutation.error.message : 'Chưa lưu được, hãy thử lại.'}
          </p>
        )}
        {saved && (
          <p role="status" className="text-xs text-library-sub">
            Đã lưu thông tin xuất hoá đơn vào tài khoản.
          </p>
        )}
      </form>
    </Panel>
  );
}
