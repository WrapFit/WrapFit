'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Factory, MapPin, MessageCircle, PackageCheck, Phone } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { confirmOrderReceived, getOrder } from '@/api/orders';
import { useToast } from '@/components/common/Toast';
import { Badge, Button, Dialog, LoadingState } from '@/components/ui';
import { ROUTES } from '@/constants';
import { OrderChat, OrderProgress, orderStatusBadge } from '@/features/orders';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data/queryKeys';

export interface OrderDetailDialogProps {
  orderId: string;
  onClose(): void;
  onPay?(orderId: string): void;
}

const BADGE_TONE = { green: 'success', amber: 'warning', red: 'danger', grey: 'neutral' } as const;

/**
 * One order of the customer (docs/19 G.5): every step with its time and the promised date, the carrier link, the shop's
 * phone once it took the order, the conversation with the shop, and "Đã nhận hàng" while the boxes are on their way.
 */
export function OrderDetailDialog({ orderId, onClose, onPay }: OrderDetailDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.orders.detail(orderId), queryFn: () => getOrder(orderId), refetchInterval: 30_000 });
  const received = useMutation({
    mutationFn: () => confirmOrderReceived(orderId),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(orderId), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.show({ tone: 'success', title: 'Cảm ơn bạn! Đơn đã hoàn tất.' });
    },
    onError: (error) => toast.error(error, 'Chưa xác nhận được'),
  });

  const order = query.data;
  const badge = order ? orderStatusBadge(order.status) : null;
  const accepted = !!order?.acceptedAt;
  const closedAt = order?.deliveredAt ?? order?.cancelledAt;
  const closed = !!closedAt && Date.now() - new Date(closedAt).getTime() > 30 * 86_400_000;
  const created = order ? new Date(order.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <Dialog
      title={order ? `Đơn in mẫu #${order.orderCode}` : 'Chi tiết đơn hàng'}
      description={order ? `Tạo lúc ${created}` : 'Đang tải thông tin…'}
      icon={<PackageCheck className="size-5" aria-hidden />}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {order?.status === 'pending_payment' && onPay ? (
            <Button variant="brand" size="sm" onClick={() => onPay(order.id)}>
              Thanh toán ngay · {formatVnd(order.totalVnd ?? order.sampleFeeVnd ?? 0)}
            </Button>
          ) : order?.status === 'shipped' ? (
            <Button variant="brand" size="sm" disabled={received.isPending} onClick={() => received.mutate()}>
              Đã nhận hàng
            </Button>
          ) : (
            <span className="text-caption text-library-muted">Mọi trao đổi về đơn: nhắn ngay trong đơn để WrapFit hỗ trợ khi cần.</span>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      {query.isPending ? (
        <LoadingState label="Đang tải thông tin đơn hàng…" />
      ) : query.isError || !order ? (
        <div className="py-6 text-center text-sm text-danger-fg">Không tải được thông tin chi tiết đơn hàng. Vui lòng thử lại sau.</div>
      ) : (
        <div className="space-y-5 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-library-line bg-library-tile/50 p-4">
            <div>
              <span className="block text-caption text-library-muted">Trạng thái hiện tại</span>
              <div className="mt-1 flex items-center gap-2">
                {badge && <Badge tone={BADGE_TONE[badge.tone]}>{badge.label}</Badge>}
                {order.isLate && <Badge tone="danger">Trễ hẹn</Badge>}
              </div>
            </div>
            <div className="text-right">
              <span className="block text-caption text-library-muted">Tổng thanh toán</span>
              <span className="font-mono text-base font-bold text-library-ink">{formatVnd(order.totalVnd ?? order.sampleFeeVnd ?? 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-library-line bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-library-ink">Tiến trình</h3>
              <OrderProgress order={order} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="space-y-2 rounded-xl border border-library-line bg-white p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-library-ink">
                  <Factory className="size-4 text-fpt-orange-ink" aria-hidden /> Xưởng in
                </h3>
                <p className="text-caption font-medium text-library-ink">{order.printShopName || order.partnerShop?.name}</p>
                <p className="text-caption text-library-sub">{order.partnerShop?.city}</p>
                {accepted && order.partnerShop?.contactPhone ? (
                  <p className="flex items-center gap-1.5 font-mono text-caption text-library-sub">
                    <Phone className="size-3 text-library-muted" aria-hidden />
                    <a href={`tel:${order.partnerShop.contactPhone.replace(/\s/g, '')}`} className="hover:underline">
                      {order.partnerShop.contactPhone}
                    </a>
                    {order.partnerShop.zalo && <span className="font-sans">· Zalo {order.partnerShop.zalo}</span>}
                  </p>
                ) : (
                  <p className="text-caption text-library-muted">Số điện thoại xưởng hiện khi xưởng nhận đơn.</p>
                )}
              </div>
              <div className="space-y-2 rounded-xl border border-library-line bg-white p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-library-ink">
                  <MapPin className="size-4 text-fpt-orange-ink" aria-hidden /> Giao tới
                </h3>
                <p className="text-caption font-medium text-library-ink">
                  {order.recipientName} · <span className="font-mono">{order.phone || order.recipientPhone}</span>
                </p>
                <p className="text-caption leading-relaxed text-library-sub">{order.shippingAddress}</p>
              </div>
              <div className="space-y-2 rounded-xl border border-library-line bg-white p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-library-ink">
                  <Box className="size-4 text-fpt-orange-ink" aria-hidden /> Thiết kế
                </h3>
                <ul className="space-y-1 text-caption text-library-sub">
                  {(order.items?.length ? order.items : [{ projectId: order.projectId, projectTitle: order.projectTitle, quantity: order.quantity }]).map((item, index) => (
                    <li key={`${item.projectId ?? index}`}>
                      {item.projectId ? (
                        <Link href={ROUTES.editor(item.projectId)} className="font-medium text-library-ink hover:underline">
                          {item.projectTitle}
                        </Link>
                      ) : (
                        <span className="font-medium text-library-ink">{item.projectTitle}</span>
                      )}{' '}
                      × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {order.status !== 'pending_payment' && (
            <div className="rounded-xl border border-library-line bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-library-ink">
                <MessageCircle className="size-4 text-fpt-orange-ink" aria-hidden /> Nhắn với xưởng
              </h3>
              <OrderChat orderId={order.id} accepted={accepted} closed={closed} />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
