'use client';

/**
 * `/admin/print-shops`: partner print shops (`GET /print-shops`) and the sample print orders sent to them
 * (`GET /orders`, ADMIN). An admin moves an order through its lifecycle (`PATCH /orders/:id/status`): confirm a payment
 * by hand, start printing, ship, deliver, or cancel before printing. The API checks every step again (409).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import React, { useState } from 'react';
import { listPrintShops, listStaffOrders, updateOrderStatus } from '@/api';
import { useToast } from '@/components/common/Toast';
import { Button, DataTable, type DataColumn } from '@/components/ui';
import { AdminShell, Badge, Panel, PanelTitle, StatTile, WORKSPACE_INPUT, WorkspaceEmpty, WorkspaceError } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';
import { formatRelative } from '@/features/dashboard';
import { ORDER_NEXT_STEPS, orderStatusBadge } from '@/features/orders';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data';
import type { OrderStatus, PrintShop, SampleOrder } from '@/types/api';
import { cn } from '@/utils/helpers';

const SHOP_STATE = {
  active: { tone: 'green', label: 'Đang hợp tác' },
  review: { tone: 'amber', label: 'Đang thẩm định' },
  paused: { tone: 'grey', label: 'Tạm dừng' },
} as const;

const STATUS_FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'IN_PRODUCTION', label: 'Đang in' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

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
  const shops = useQuery({ queryKey: queryKeys.printShops.all, queryFn: listPrintShops, staleTime: 60_000 });
  // Every order once (for the counters), filtered in the page: the queue of a few partner shops stays small.
  const orders = useQuery({ queryKey: queryKeys.orders.staff({ limit: 100 }), queryFn: () => listStaffOrders({ limit: 100 }), staleTime: 15_000 });

  const change = useMutation({
    mutationFn: ({ order, to }: { order: SampleOrder; to: OrderStatus }) => updateOrderStatus(order.id, to),
    onSuccess: (order) => toast.show({ tone: 'success', title: `${order.orderCode}: ${orderStatusBadge(order.status).label}` }),
    onError: (error) => toast.error(error, 'Chưa đổi được trạng thái đơn'),
    // A 409 means someone else moved the order first: reload the list either way.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
  });

  const all = orders.data ?? [];
  const rows = all.filter((order) => (!status || order.orderStatus === status) && (!shopId || order.printShopId === shopId));
  const countBy = (predicate: (order: SampleOrder) => boolean) => (orders.data ? String(all.filter(predicate).length) : '–');
  const shopList: PrintShop[] = shops.data ?? [];

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
      key: 'status',
      label: 'Trạng thái',
      sortValue: (order) => orderStatusBadge(order.status).label,
      render: (order) => {
        const badge = orderStatusBadge(order.status);
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
    { key: 'time', label: 'Đặt lúc', sortValue: (order) => new Date(order.createdAt), render: (order) => <span className="whitespace-nowrap text-library-sub">{formatRelative(order.createdAt)}</span> },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (order) => {
        const steps = order.orderStatus ? ORDER_NEXT_STEPS[order.orderStatus] : [];
        if (!steps.length) return <span className="text-caption text-library-muted">Đã xong</span>;
        return (
          <span className="flex flex-wrap justify-end gap-2">
            {steps.map((step) => (
              <Button
                key={step.to}
                size="sm"
                shape="rounded"
                variant={step.to === 'CANCELLED' ? 'ghost' : 'outline'}
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
      description="Mạng lưới xưởng nhận file PDF CMYK từ WrapFit và các đơn in mẫu khách đã đặt. Chuyển trạng thái đơn theo từng bước: thanh toán, in, giao."
    >
      <div className="flex flex-col gap-6">
        <section aria-label="Số đơn in" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Chờ thanh toán" value={countBy((order) => order.orderStatus === 'PENDING_PAYMENT')} />
          <StatTile label="Chờ xưởng in" value={countBy((order) => order.orderStatus === 'PAID')} />
          <StatTile label="Đang in / giao" value={countBy((order) => order.orderStatus === 'IN_PRODUCTION' || order.orderStatus === 'SHIPPED')} />
          <StatTile label="Đã giao" value={countBy((order) => order.orderStatus === 'DELIVERED')} hint={orders.data ? `Trên ${all.length} đơn gần nhất` : undefined} />
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
            <DataTable<PrintShop>
              label="Danh sách xưởng in"
              rows={shopList}
              rowKey={(shop) => shop.id}
              mobile="cards"
              columns={[
                { key: 'name', label: 'Xưởng', primary: true, render: (shop) => <span className="font-medium">{shop.name}</span> },
                { key: 'city', label: 'Thành phố', render: (shop) => shop.city },
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
                    return <Badge tone={state.tone}>{state.label}</Badge>;
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
