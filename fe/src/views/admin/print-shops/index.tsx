'use client';

/**
 * `/admin/print-shops`: partner print shops (`GET /print-shops`) and the sample print orders sent to them
 * (`GET /orders`, ADMIN). An admin moves an order through its lifecycle (`PATCH /orders/:id/status`): confirm a payment
 * by hand, start printing, ship, deliver, or cancel before printing. The API checks every step again (409).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import React, { useState } from 'react';
import { listAdminPrintShops, listStaffOrders, reassignOrder, updateOrderStatus, updatePrintShop } from '@/api';
import { useToast } from '@/components/common/Toast';
import { Button, DataTable, type DataColumn } from '@/components/ui';
import { AdminShell, AdminTimeline, Badge, Panel, PanelTitle, AdminStat, WORKSPACE_INPUT, WorkspaceEmpty, WorkspaceError, ADMIN_STAT_GROUP, dayKeyOf, lastDays, type TimelineEvent } from '@/components/workspace';
import { ADMIN_TIMELINE_REFRESH_S } from '@/features/admin';
import { RequireAuth } from '@/features/auth';
import { formatRelative } from '@/features/dashboard';
import { ORDER_NEXT_STEPS, orderStatusBadge } from '@/features/orders';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data';
import type { AdminPrintShop, OrderStatus, SampleOrder, UpdatePrintShopRequest } from '@/types/api';
import { cn } from '@/utils/helpers';

const SHOP_STATE = {
  active: { tone: 'green', label: 'Đang hợp tác' },
  review: { tone: 'amber', label: 'Đang thẩm định' },
  paused: { tone: 'grey', label: 'Tạm dừng' },
  suspended: { tone: 'red', label: 'Đình chỉ' },
} as const;

/** What an admin may set a shop to (docs/19 B.1): paused keeps running orders, suspended hands them to another shop. */
const SHOP_STATUS_OPTIONS: { value: NonNullable<UpdatePrintShopRequest['status']>; label: string }[] = [
  { value: 'ACTIVE', label: 'Đang hợp tác' },
  { value: 'REVIEW', label: 'Đang thẩm định' },
  { value: 'PAUSED', label: 'Tạm dừng' },
  { value: 'SUSPENDED', label: 'Đình chỉ' },
];

/** 1500 → "15 %". */
const percentOf = (bps: number) => `${(bps / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} %`;

const STATUS_FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'IN_PRODUCTION', label: 'Đang in' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];
/** Status words of the order events, from the filter labels. */
const STATUS_TEXT: Record<string, string> = Object.fromEntries(STATUS_FILTERS.filter((f) => f.value).map((f) => [f.value, f.label]));


export default function AdminPrintShopsPage() {
  return (
    <RequireAuth role="ADMIN">
      <PrintShopsScreen />
    </RequireAuth>
  );
}

function PrintShopsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [shopId, setShopId] = useState('');
  // Admin list: contacts, contract fee and queue of every shop, also those under review.
  const shops = useQuery({ queryKey: [...queryKeys.printShops.all, 'admin'], queryFn: listAdminPrintShops, staleTime: 60_000 });
  const editShop = useMutation({
    mutationFn: ({ shop, data }: { shop: AdminPrintShop; data: UpdatePrintShopRequest }) => updatePrintShop(shop.id, data),
    onSuccess: (shop) => toast.show({ tone: 'success', title: `${shop.name}: đã lưu` }),
    onError: (error) => toast.error(error, 'Chưa lưu được xưởng'),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.printShops.all }),
  });
  // Every order once (for the counters), filtered in the page: the queue of a few partner shops stays small.
  const orders = useQuery({ queryKey: queryKeys.orders.staff({ limit: 100 }), queryFn: () => listStaffOrders({ limit: 100 }), staleTime: 15_000 });

  const change = useMutation({
    mutationFn: ({ order, to }: { order: SampleOrder; to: OrderStatus }) => updateOrderStatus(order.id, to),
    onSuccess: (order) => toast.show({ tone: 'success', title: `${order.orderCode}: ${orderStatusBadge(order.status).label}` }),
    onError: (error) => toast.error(error, 'Chưa đổi được trạng thái đơn'),
    // A 409 means someone else moved the order first: reload the list either way.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
  });

  // A paid order no shop took (refused, late): move it to a shop that can print it (docs/19 AF-A2).
  const reassign = useMutation({
    mutationFn: ({ order, shopId }: { order: SampleOrder; shopId: string }) => reassignOrder(order.id, shopId),
    onSuccess: (order) => toast.show({ tone: 'success', title: `${order.orderCode}: đã chuyển sang ${order.printShopName}` }),
    onError: (error) => toast.error(error, 'Chưa chuyển được đơn'),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
  });

  const all = orders.data ?? [];
  // Timeline at the top: orders per day over 14 days, newest orders as events.
  const orderBuckets = React.useMemo(() => {
    const buckets = lastDays(14);
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const order of all) {
      const bucket = byKey.get(dayKeyOf(order.createdAt));
      if (bucket) bucket.value += 1;
    }
    return buckets;
  }, [all]);
  const orderEvents: TimelineEvent[] = [...all]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((order) => ({
      id: order.id,
      at: order.createdAt,
      tone: order.status === 'cancelled' ? 'critical' : order.status === 'pending_payment' ? 'warning' : order.status === 'delivered' ? 'good' : 'info',
      title: `${STATUS_TEXT[order.status.toUpperCase()] ?? order.status} · ${formatVnd(order.totalVnd ?? 0)}`,
      detail: order.printShopName ?? undefined,
    }));
  const rows = all.filter((order) => (!status || order.orderStatus === status) && (!shopId || order.printShopId === shopId));
  const countBy = (predicate: (order: SampleOrder) => boolean) => (orders.data ? String(all.filter(predicate).length) : '–');
  const shopList: AdminPrintShop[] = shops.data ?? [];

  const columns: DataColumn<SampleOrder>[] = [
    {
      key: 'order',
      label: 'Đơn',
      primary: true,
      sortValue: (order) => order.orderCode,
      render: (order) => (
        <span className="block max-w-[220px]">
          <span className="block font-mono text-sm tabular-nums text-library-ink">{order.orderCode}</span>
          <span className="block truncate text-caption text-library-muted" title={order.projectTitle}>
            {order.projectTitle} · {order.quantity} hộp
          </span>
        </span>
      ),
    },
    { key: 'shop', label: 'Xưởng', sortValue: (order) => order.printShopName ?? '', render: (order) => <span className="text-library-sub">{order.printShopName}</span> },
    {
      key: 'recipient',
      label: 'Người nhận',
      render: (order) => (
        <span className="block max-w-[200px]">
          <span className="block truncate text-library-ink">{order.recipientName}</span>
          <span className="block font-mono text-caption tabular-nums text-library-muted">{order.recipientPhone ?? order.phone}</span>
        </span>
      ),
    },
    { key: 'total', label: 'Tổng', align: 'right', sortValue: (order) => order.totalVnd ?? 0, render: (order) => <span className="tabular-nums">{formatVnd(order.totalVnd ?? 0)}</span> },
    {
      key: 'fee',
      label: 'Phí nền tảng',
      align: 'right',
      sortValue: (order) => order.platformFeeVnd ?? 0,
      render: (order) =>
        order.platformFeeVnd === undefined ? (
          <span className="text-library-muted">–</span>
        ) : (
          <span className="block tabular-nums" title={`Xưởng nhận ${formatVnd(order.shopPayableVnd ?? 0)}`}>
            {formatVnd(order.platformFeeVnd)}
            <span className="block text-caption text-library-muted">{percentOf(order.platformFeeBps ?? 0)}</span>
          </span>
        ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortValue: (order) => orderStatusBadge(order.status).label,
      render: (order) => {
        const badge = orderStatusBadge(order.status);
        const waiting = order.orderStatus === 'PAID' && !order.acceptedAt;
        const overdue = waiting && !order.rejectedAt && !!order.acceptDeadline && new Date(order.acceptDeadline) < new Date();
        return (
          <span className="flex flex-col items-start gap-1">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {waiting && order.rejectedAt && (
              <span className="text-caption font-semibold text-danger-fg" title={order.rejectReason ?? undefined}>
                Xưởng từ chối{order.rejectReason ? `: ${order.rejectReason}` : ''}
              </span>
            )}
            {overdue && <span className="text-caption font-semibold text-danger-fg">Quá hạn nhận</span>}
            {waiting && !order.rejectedAt && !overdue && <span className="text-caption text-library-muted">Chờ xưởng nhận</span>}
            {order.isLate && <span className="text-caption font-semibold text-danger-fg">Trễ hẹn giao</span>}
          </span>
        );
      },
    },
    { key: 'time', label: 'Đặt lúc', sortValue: (order) => new Date(order.createdAt), render: (order) => <span className="whitespace-nowrap text-library-sub">{formatRelative(order.createdAt)}</span> },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (order) => {
        // Shipping needs the carrier and its tracking code, which the shop enters in its portal (docs/19 BR-G25).
        const steps = (order.orderStatus ? ORDER_NEXT_STEPS[order.orderStatus] : []).filter((step) => step.to !== 'SHIPPED');
        const movable = order.orderStatus === 'PAID' && !order.acceptedAt;
        if (!steps.length && !movable) {
          return <span className="text-caption text-library-muted">{order.orderStatus === 'IN_PRODUCTION' ? 'Xưởng nhập vận đơn' : 'Đã xong'}</span>;
        }
        return (
          <span className="flex flex-wrap justify-end gap-2">
            {movable && (
              <select
                aria-label={`Chuyển ${order.orderCode} sang xưởng khác`}
                value=""
                disabled={reassign.isPending}
                onChange={(event) => event.target.value && reassign.mutate({ order, shopId: event.target.value })}
                className={cn(WORKSPACE_INPUT, 'h-8 w-auto py-0 text-caption text-library-ink')}
              >
                <option value="">Chuyển xưởng…</option>
                {shopList
                  .filter((shop) => shop.id !== order.printShopId && (shop.status ?? 'active') === 'active')
                  .map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
              </select>
            )}
            {steps.map((step) => (
              <Button
                key={step.to}
                size="sm"
                shape="rounded"
                variant={step.to === 'CANCELLED' ? 'ghost' : 'secondary'}
                disabled={change.isPending}
                onClick={() => change.mutate({ order, to: step.to })}
                aria-label={`${step.label}: ${order.orderCode}`}
              >
                {step.label}
              </Button>
            ))}
          </span>
        );
      },
    },
  ];

  let ordersBody: React.ReactNode;
  if (orders.isError) {
    ordersBody = <WorkspaceError error={orders.error} title="Không tải được đơn in" onRetry={() => void orders.refetch()} retrying={orders.isFetching} />;
  } else if (orders.isPending) {
    ordersBody = (
      <div aria-busy="true" className="flex flex-col gap-2">
        <span role="status" className="sr-only">
          Đang tải đơn in…
        </span>
        {[0, 1, 2].map((index) => (
          <div key={index} aria-hidden className="h-14 animate-pulse rounded-xl bg-library-panel motion-reduce:animate-none" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    ordersBody = (
      <WorkspaceEmpty
        icon={PackageCheck}
        title={all.length ? 'Không có đơn khớp bộ lọc' : 'Chưa có đơn in mẫu nào'}
        description={all.length ? 'Chọn trạng thái hoặc xưởng khác.' : 'Đơn khách đặt từ giỏ in mẫu sẽ hiện ở đây.'}
      />
    );
  } else {
    ordersBody = (
      <DataTable
        label="Đơn in mẫu gửi xưởng"
        columns={columns}
        rows={rows}
        rowKey={(order) => order.id}
        mobile="cards"
        initialSort={{ key: 'time', direction: 'desc' }}
        search={{ label: 'Lọc đơn in', placeholder: 'Mã đơn, dự án, người nhận…', text: (order) => `${order.orderCode} ${order.projectTitle} ${order.recipientName} ${order.recipientPhone ?? ''}` }}
      />
    );
  }

  return (
    <AdminShell
      title="Xưởng in đối tác"
      description="Xưởng đối tác và đơn in mẫu theo trạng thái."
    >
      <div className="flex flex-col gap-6">
        <AdminTimeline
          title="Đơn in mẫu mỗi ngày"
          unit="đơn"
          buckets={orderBuckets}
          loading={orders.isPending}
          error={orders.isError ? 'Chưa tải được đơn in mẫu. Kiểm tra kết nối máy chủ rồi thử lại.' : undefined}
          events={orderEvents}
          eventsTitle="Đơn mới nhất"
          updatedAt={orders.dataUpdatedAt || undefined}
          refreshSeconds={ADMIN_TIMELINE_REFRESH_S}
          refreshing={orders.isFetching}
          onRefresh={() => void orders.refetch()}
        />

        <section aria-label="Số đơn in" className={`${ADMIN_STAT_GROUP} grid-cols-2 md:grid-cols-4`}>
          <AdminStat label="Chờ thanh toán" value={countBy((order) => order.orderStatus === 'PENDING_PAYMENT')} />
          <AdminStat label="Chờ xưởng in" value={countBy((order) => order.orderStatus === 'PAID')} />
          <AdminStat label="Đang in / giao" value={countBy((order) => order.orderStatus === 'IN_PRODUCTION' || order.orderStatus === 'SHIPPED')} />
          <AdminStat label="Đã giao" value={countBy((order) => order.orderStatus === 'DELIVERED')} hint={orders.data ? `Trên ${all.length} đơn gần nhất` : undefined} />
        </section>

        <Panel aria-labelledby="orders-heading">
          <PanelTitle id="orders-heading">Đơn in mẫu</PanelTitle>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-col gap-1 text-sm text-library-sub sm:w-56">
              Trạng thái
              <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | '')} className={cn(WORKSPACE_INPUT, 'text-library-ink')}>
                {STATUS_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-library-sub sm:w-64">
              Xưởng
              <select value={shopId} onChange={(event) => setShopId(event.target.value)} className={cn(WORKSPACE_INPUT, 'text-library-ink')}>
                <option value="">Mọi xưởng</option>
                {shopList.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {ordersBody}
        </Panel>

        <Panel aria-labelledby="shops-heading">
          <PanelTitle id="shops-heading">Danh sách xưởng in</PanelTitle>
          {shops.isError ? (
            <WorkspaceError error={shops.error} title="Không tải được danh sách xưởng" onRetry={() => void shops.refetch()} retrying={shops.isFetching} />
          ) : (
            <DataTable<AdminPrintShop>
              label="Danh sách xưởng in"
              rows={shopList}
              rowKey={(shop) => shop.id}
              mobile="cards"
              columns={[
                { key: 'name', label: 'Xưởng', primary: true, render: (shop) => <span className="font-medium">{shop.name}</span> },
                { key: 'city', label: 'Thành phố', render: (shop) => shop.city },
                { key: 'fee', label: 'Phí nền tảng', align: 'right', render: (shop) => <span className="tabular-nums">{percentOf(shop.platformFeeBps)}</span> },
                {
                  key: 'queue',
                  label: 'Hàng đợi',
                  align: 'right',
                  render: (shop) => (
                    <span className="tabular-nums" title="Đơn đã thanh toán, chưa giao">
                      {shop.activeOrders} đơn · {shop.dailyCapacity}/ngày
                    </span>
                  ),
                },
                { key: 'sheet', label: 'Khổ máy', render: (shop) => <span className="tabular-nums">{shop.sheet || shop.sheetSize}</span> },
                { key: 'services', label: 'Gia công', render: (shop) => <span className="text-library-sub">{Array.isArray(shop.services) ? shop.services.join(', ') : String(shop.services ?? '')}</span> },
                { key: 'lead', label: 'Thời gian', render: (shop) => shop.leadTime || (shop.leadTimeDays ? `${shop.leadTimeDays} ngày` : '') },
                {
                  key: 'orders',
                  label: 'Đơn đang mở',
                  align: 'right',
                  render: (shop) => (
                    <span className="tabular-nums">
                      {countBy((order) => order.printShopId === shop.id && !['DELIVERED', 'CANCELLED'].includes(order.orderStatus ?? ''))}
                    </span>
                  ),
                },
                {
                  key: 'state',
                  label: 'Trạng thái',
                  align: 'right',
                  render: (shop) => {
                    const state = SHOP_STATE[(shop.state || shop.status || 'active') as keyof typeof SHOP_STATE] ?? SHOP_STATE.paused;
                    return (
                      <span className="flex items-center justify-end gap-2">
                        <Badge tone={state.tone}>{state.label}</Badge>
                        <select
                          aria-label={`Đổi trạng thái của ${shop.name}`}
                          value={(shop.status ?? 'active').toUpperCase()}
                          disabled={editShop.isPending}
                          onChange={(event) =>
                            editShop.mutate({ shop, data: { status: event.target.value as NonNullable<UpdatePrintShopRequest['status']> } })
                          }
                          className={cn(WORKSPACE_INPUT, 'h-8 w-auto py-0 text-caption text-library-ink')}
                        >
                          {SHOP_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </span>
                    );
                  },
                },
              ]}
            />
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
