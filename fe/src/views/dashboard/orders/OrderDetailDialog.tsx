'use client';

import { useQuery } from '@tanstack/react-query';
import { Box, Calendar, CheckCircle2, Clock, Factory, MapPin, PackageCheck, Phone, ShieldCheck, Truck, User } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { getOrder } from '@/api/orders';
import { Badge, Button, Dialog, LoadingState } from '@/components/ui';
import { ROUTES } from '@/constants';
import { orderStatusBadge } from '@/features/orders';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data/queryKeys';
import { cn } from '@/utils/helpers';

export interface OrderDetailDialogProps {
  orderId: string;
  onClose(): void;
  onPay?(orderId: string): void;
}

export function OrderDetailDialog({ orderId, onClose, onPay }: OrderDetailDialogProps) {
  const query = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder(orderId),
  });

  const order = query.data;
  const badge = order ? orderStatusBadge(order.status) : null;

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '–';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      title={order ? `Đơn in mẫu #${order.orderCode}` : 'Chi tiết đơn hàng'}
      description={order ? `Tạo lúc ${formatDate(order.createdAt)}` : 'Đang tải thông tin…'}
      icon={<PackageCheck className="size-5" aria-hidden />}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {order?.status === 'pending_payment' && onPay ? (
            <Button
              variant="brand"
              size="sm"
              onClick={() => onPay(order.id)}
            >
              Thanh toán ngay · {formatVnd(order.totalVnd ?? order.sampleFeeVnd ?? 0)}
            </Button>
          ) : (
            <span className="text-caption text-library-muted">
              Hỗ trợ đơn hàng: <a href="tel:19001000" className="text-fpt-orange-ink font-semibold hover:underline">1900 1000</a>
            </span>
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
        <div className="py-6 text-center text-sm text-danger-fg">
          Không tải được thông tin chi tiết đơn hàng. Vui lòng thử lại sau.
        </div>
      ) : (
        <div className="space-y-5 text-sm">
          {/* Status banner */}
          <div className="flex items-center justify-between rounded-xl border border-library-line bg-library-tile/50 p-4">
            <div>
              <span className="text-caption text-library-muted block">Trạng thái hiện tại</span>
              <div className="flex items-center gap-2 mt-1">
                {badge && (
                  <Badge
                    tone={
                      badge.tone === 'green'
                        ? 'success'
                        : badge.tone === 'amber'
                          ? 'warning'
                          : badge.tone === 'red'
                            ? 'danger'
                            : 'neutral'
                    }
                  >
                    {badge.label}
                  </Badge>
                )}
                <span className="text-caption text-library-sub font-mono">{order.orderCode}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-caption text-library-muted block">Tổng phí thanh toán</span>
              <span className="font-mono text-base font-bold text-library-ink">
                {formatVnd(order.totalVnd ?? order.sampleFeeVnd ?? 0)}
              </span>
            </div>
          </div>

          {/* Packaging & Project info */}
          <div className="rounded-xl border border-library-line bg-white p-4 space-y-3">
            <h3 className="font-semibold text-library-ink text-sm flex items-center gap-2">
              <Box className="size-4 text-fpt-orange-ink" aria-hidden />
              Quy cách hộp in mẫu
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-caption text-library-sub">
              <div>
                <span className="text-library-muted block">Tên dự án thiết kế:</span>
                {order.projectId ? (
                  <Link href={ROUTES.editor(order.projectId)} className="font-medium text-library-ink hover:underline">
                    {order.projectTitle}
                  </Link>
                ) : (
                  <span className="font-medium text-library-ink">{order.projectTitle}</span>
                )}
              </div>
              <div>
                <span className="text-library-muted block">Kích thước sản phẩm (L × W × H):</span>
                <span className="font-mono text-library-ink font-medium">
                  {order.dimensions ? `${order.dimensions.length} × ${order.dimensions.width} × ${order.dimensions.height} mm` : 'Theo tỷ lệ chuẩn'}
                </span>
              </div>
              <div>
                <span className="text-library-muted block">Số lượng in thử:</span>
                <span className="font-mono text-library-ink font-semibold">{order.quantity} hộp</span>
              </div>
              <div>
                <span className="text-library-muted block">Chất liệu giấy:</span>
                <span className="text-library-ink font-medium">{order.paperStock || 'Ivory 300 GSM'}</span>
              </div>
            </div>
          </div>

          {/* Shipping & Print shop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-library-line bg-white p-4 space-y-2">
              <h3 className="font-semibold text-library-ink text-sm flex items-center gap-2">
                <MapPin className="size-4 text-fpt-orange-ink" aria-hidden />
                Địa chỉ giao hàng
              </h3>
              <p className="text-caption font-medium text-library-ink">{order.recipientName}</p>
              <p className="text-caption text-library-sub flex items-center gap-1.5 font-mono">
                <Phone className="size-3 text-library-muted" aria-hidden />
                {order.phone || order.recipientPhone || '–'}
              </p>
              <p className="text-caption text-library-sub leading-relaxed">{order.shippingAddress}</p>
            </div>

            <div className="rounded-xl border border-library-line bg-white p-4 space-y-2">
              <h3 className="font-semibold text-library-ink text-sm flex items-center gap-2">
                <Factory className="size-4 text-fpt-orange-ink" aria-hidden />
                Xưởng in thực hiện
              </h3>
              <p className="text-caption font-medium text-library-ink">
                {order.printShopName || order.partnerShop?.name || 'Xưởng đối tác kỹ thuật WrapFit'}
              </p>
              <p className="text-caption text-library-sub">
                {order.partnerShop?.city ? `Khu vực: ${order.partnerShop.city}` : 'Mạng lưới xưởng in chuẩn WrapFit'}
              </p>
              <span className="inline-flex items-center gap-1 text-caption text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                <ShieldCheck className="size-3" aria-hidden />
                Kiểm định FitCheck™ 100% trước khi giao
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-library-line bg-white p-4 space-y-3">
            <h3 className="font-semibold text-library-ink text-sm flex items-center gap-2">
              <Clock className="size-4 text-fpt-orange-ink" aria-hidden />
              Tiến trình đơn hàng
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-caption">
              <div className="p-2.5 rounded-lg bg-library-tile/60 border border-library-line/60">
                <span className="text-library-muted block text-caption">1. Đặt đơn</span>
                <span className="font-medium text-library-ink block mt-0.5">{formatDate(order.createdAt)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-library-tile/60 border border-library-line/60">
                <span className="text-library-muted block text-caption">2. Thanh toán</span>
                <span className="font-medium text-library-ink block mt-0.5">
                  {order.paidAt ? formatDate(order.paidAt) : order.status === 'pending_payment' ? 'Chờ thanh toán' : '–'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-library-tile/60 border border-library-line/60">
                <span className="text-library-muted block text-caption">3. Sản xuất in</span>
                <span className="font-medium text-library-ink block mt-0.5">
                  {order.shippedAt ? formatDate(order.shippedAt) : ['in_production', 'shipped', 'delivered'].includes(order.status) ? 'Đang in mẫu' : '–'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-library-tile/60 border border-library-line/60">
                <span className="text-library-muted block text-caption">4. Giao hàng</span>
                <span className="font-medium text-library-ink block mt-0.5">
                  {order.deliveredAt ? formatDate(order.deliveredAt) : order.status === 'delivered' ? 'Đã giao' : '–'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
