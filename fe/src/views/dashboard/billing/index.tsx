'use client';

/**
 * `/dashboard/billing`: plan, quotas, payment and history, in the pacdora.com workspace style. The plan comes from
 * `GET /auth/me` (subscriptionTier), the quotas from `GET /storage/usage` and `GET /ai/usage`, the sample-print orders
 * from `GET /orders/my-orders`. The API has no payment records yet: payment methods, the next charge and cancelling
 * say so and lead to checkout or to the billing team.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, CalendarClock, Landmark, Receipt, Tag } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { listMyOrders } from '@/api/orders';
import { outlineButton, primaryButton } from '@/components/library';
import { PaymentMark } from '@/components/layout/PaymentLogos';
import { Badge, DataTable, Meter, Panel, PanelTitle, WORKSPACE_INPUT, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { TIER_LABELS } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import { ConfirmDialog, DIALOG_DANGER, formatBytes, usagePercent, useAiUsage, useStorageUsage } from '@/features/dashboard';
import { PLANS, PRO_PERIOD_DAYS, SINGLE_EXPORT_PRICE, formatQuota, formatVnd } from '@/features/pricing';
import { PROMO_CODES } from '@/features/site/cart';
import { queryKeys } from '@/hooks/data';
import type { SampleOrder } from '@/types/api';
import { cn } from '@/utils/helpers';

export default function BillingPage() {
  return (
    <RequireAuth>
      <BillingScreen />
    </RequireAuth>
  );
}

/** Sample orders are paid on delivery: an order is paid once it was delivered. */
/** Order statuses after the payment (`SampleOrder.status`). */
const PAID = new Set<SampleOrder['status']>(['paid', 'in_production', 'shipped', 'delivered']);
const paymentBadge = (status: SampleOrder['status']) =>
  status === 'cancelled' ? { tone: 'grey' as const, label: 'Đã hủy' } : PAID.has(status) ? { tone: 'green' as const, label: 'Đã thu' } : { tone: 'amber' as const, label: 'Chờ thu' };

const METHODS = [
  // Each method shows the same brand mark as the footer.
  { mark: 'vietqr' as const, title: 'VietQR / chuyển khoản', text: 'Mọi ngân hàng Việt Nam, xác nhận trong vài phút' },
  { mark: 'momo' as const, title: 'Ví MoMo', text: 'Quét mã trong ứng dụng MoMo' },
  { mark: 'napas' as const, title: 'Thẻ ATM nội địa (Napas)', text: 'Qua cổng thanh toán của ngân hàng' },
];

const BILLING_KEY = 'wrapfit:billing-details';

function BillingScreen() {
  const { user } = useAuth();
  const tier = user?.subscriptionTier ?? 'FREE';
  const plan = PLANS[tier];
  const paid = tier !== 'FREE';
  const storage = useStorageUsage();
  const ai = useAiUsage();
  const orders = useQuery({ queryKey: queryKeys.orders.myOrders, queryFn: listMyOrders });
  const [cancelOpen, setCancelOpen] = useState(false);

  const storagePercent = storage.data ? usagePercent(storage.data.usedBytes, storage.data.quotaBytes) : 0;
  const aiPercent = ai.data ? usagePercent(ai.data.used, ai.data.limit) : 0;

  return (
    <WorkspaceShell
      title="Thanh toán & gói cước"
      description="Gói đang dùng, hạn mức, cách thanh toán và lịch sử đơn của tài khoản."
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
                    ? `Thiết kế, FitCheck™ và xem 3D không giới hạn; PDF A4 có watermark ở tai dán. File in sạch từ ${formatVnd(SINGLE_EXPORT_PRICE)}/lượt.`
                    : plan.isPerExport
                      ? `Mỗi lượt xuất mở khóa file in sạch của một bản thiết kế, từ ${formatVnd(SINGLE_EXPORT_PRICE)}/lượt.`
                      : plan.contactOnly
                        ? 'Gói theo hợp đồng với WrapFit.'
                        : `${formatVnd(plan.price.monthly)} cho ${PRO_PERIOD_DAYS} ngày xuất file in không giới hạn.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={plan.contactOnly ? '/contact' : '/checkout/step-1?plan=STARTER'} className={primaryButton}>
                  {plan.contactOnly ? 'Liên hệ' : tier === 'STARTER' ? 'Gia hạn' : `Nâng lên ${PLANS.STARTER.name}`}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
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
                  <span className="text-library-sub">Hoa văn AI (24 giờ)</span>
                  <span className="text-library-ink">{ai.data ? `${ai.data.used} / ${ai.data.limit}` : `${plan.aiPatternsPerDay}/ngày`}</span>
                </div>
                <Meter percent={aiPercent} label="Lượt hoa văn AI đã dùng" />
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
                  ? 'Gói Free không có kỳ thanh toán. Bạn chỉ trả khi xuất file in hoặc nâng cấp gói.'
                  : plan.isPerExport
                    ? 'Không có phí định kỳ: mỗi lần xuất file in được tính riêng.'
                    : 'Trong bản thử nghiệm, gói trả phí được kích hoạt sau khi WrapFit xác nhận chuyển khoản; ngày gia hạn sẽ hiện ở đây khi cổng thanh toán tự động được bật.'}
              </p>
            </div>
          </Panel>

          {/* History */}
          <Panel>
            <PanelTitle action={<Link href="/dashboard/orders" className="text-sm font-medium text-fpt-orange-ink hover:underline">Theo dõi sản xuất</Link>}>Lịch sử thanh toán</PanelTitle>
            <div className="mt-4">
              {orders.isError ? (
                <WorkspaceError error={orders.error} onRetry={() => orders.refetch()} retrying={orders.isFetching} />
              ) : orders.isLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-library-panel" />
              ) : !orders.data?.length ? (
                <WorkspaceEmpty icon={Receipt} title="Chưa có khoản thanh toán nào" description="Phí in mẫu và gói cước sẽ hiện ở đây sau lần đặt đầu tiên." action={<Link href="/cart" className={primaryButton}>Mở giỏ in mẫu</Link>} />
              ) : (
                <DataTable<SampleOrder>
                  label="Lịch sử thanh toán"
                  rows={orders.data}
                  rowKey={(row) => row.id}
                  columns={[
                    { key: 'date', label: 'Ngày', render: (row) => new Date(row.createdAt).toLocaleDateString('vi-VN') },
                    { key: 'item', label: 'Nội dung', render: (row) => <span className="line-clamp-1">In mẫu {row.quantity} hộp · {row.projectTitle}</span> },
                    { key: 'code', label: 'Mã', render: (row) => <span className="font-mono text-xs">{row.orderCode ?? row.id}</span> },
                    { key: 'method', label: 'Cách trả', render: () => <span className="text-library-sub">Khi nhận hàng</span> },
                    { key: 'total', label: 'Số tiền', align: 'right', render: (row) => formatVnd(row.totalVnd ?? row.sampleFeeVnd ?? 0) },
                    { key: 'paid', label: 'Thanh toán', align: 'right', render: (row) => <Badge tone={paymentBadge(row.status).tone}>{paymentBadge(row.status).label}</Badge> },
                  ]}
                />
              )}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <Panel>
            <PanelTitle>Phương thức thanh toán</PanelTitle>
            <p className="mt-2 text-sm text-library-sub">Chưa lưu phương thức nào. WrapFit không lưu số thẻ; bạn chọn cách trả ở bước thanh toán.</p>
            <ul className="mt-4 flex flex-col gap-2">
              {METHODS.map((method) => (
                <li key={method.title} className="flex items-center gap-3 rounded-xl border border-library-line p-3">
                  <PaymentMark method={method.mark} className="shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-library-ink">{method.title}</span>
                    <span className="block text-xs text-library-sub">{method.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <PromoPanel />
          <BillingDetails />
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
            Gói vẫn dùng được đến hết kỳ đã trả, sau đó tài khoản chuyển về gói Free. Dự án và file không bị xoá; dung lượng vượt hạn mức Free chỉ chặn tải tệp mới. Trong bản thử nghiệm, yêu cầu huỷ được gửi qua email đến bộ phận thanh toán.
          </p>
        </ConfirmDialog>
      )}
    </WorkspaceShell>
  );
}

function PromoPanel() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const check = () => {
    const value = code.trim().toUpperCase();
    if (!value) return;
    const promo = PROMO_CODES[value];
    setResult(promo ? { ok: true, text: `${promo.label}. Mã dùng ở giỏ in mẫu hoặc bước thanh toán.` } : { ok: false, text: 'Mã không hợp lệ hoặc đã hết hạn.' });
  };
  return (
    <Panel>
      <PanelTitle>Mã ưu đãi</PanelTitle>
      <div className="mt-3 flex gap-2">
        <label htmlFor="billing-promo" className="sr-only">
          Mã ưu đãi
        </label>
        <input id="billing-promo" value={code} onChange={(event) => setCode(event.target.value)} placeholder="WRAPFIT10" className={cn(WORKSPACE_INPUT, 'font-mono uppercase')} />
        <button type="button" onClick={check} className={cn(outlineButton, 'shrink-0 whitespace-nowrap')}>
          <Tag className="size-4" aria-hidden /> Kiểm tra
        </button>
      </div>
      {result && <p className={cn('mt-2 text-xs', result.ok ? 'text-fpt-orange-ink' : 'text-danger-fg')}>{result.text}</p>}
    </Panel>
  );
}

/** Name and tax code printed on VAT invoices; kept on this device until the invoice API exists. */
function BillingDetails() {
  const [details, setDetails] = useState({ company: '', taxCode: '', email: '' });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BILLING_KEY);
      if (stored) setDetails(JSON.parse(stored));
    } catch {
      // Private mode.
    }
  }, []);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      localStorage.setItem(BILLING_KEY, JSON.stringify(details));
    } catch {
      // Private mode.
    }
    setSaved(true);
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
        <button type="submit" className={outlineButton}>
          Lưu thông tin
        </button>
        {saved && <p className="text-xs text-library-sub">Đã lưu trên thiết bị này; hoá đơn của đơn tiếp theo sẽ dùng thông tin này.</p>}
      </form>
    </Panel>
  );
}
