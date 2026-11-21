"use client";

import { useQuery } from "@tanstack/react-query";
import { provinceOf } from "@wrapfit/shared";
import QRCode from "qrcode";
import React, { useEffect, useState } from "react";
import { getStaffOrder } from "@/api";
import { Button } from "@/components/ui";
import { dayLabel } from "@/features/orders";
import { errorMessage } from "@/services/api";

/**
 * `/partner/orders/:id/slip`: the packing slip of an order, to print and put in the box (docs/19 G.5). Its QR code opens
 * the order in the portal, so whoever packs or ships updates it from a phone.
 */
export default function PackingSlipPage({ orderId }: { orderId: string }) {
  const order = useQuery({ queryKey: ["orders", "partner", orderId], queryFn: () => getStaffOrder(orderId) });
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/partner/orders/${orderId}`;
    void QRCode.toString(url, { type: "svg", margin: 0, width: 128 }).then(setQr).catch(() => setQr(null));
  }, [orderId]);

  if (order.isError) return <p className="p-8 text-sm text-danger-fg">{errorMessage(order.error)}</p>;
  if (!order.data) return <p className="p-8 text-sm text-library-muted">Đang tải phiếu…</p>;
  const o = order.data;
  const items = o.items?.length ? o.items : [{ projectTitle: o.projectTitle, quantity: o.quantity, paperStock: o.paperStock }];

  return (
    <main className="mx-auto max-w-2xl bg-white p-8 text-library-ink print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <Button size="sm" variant="brand" onClick={() => window.print()}>
          In phiếu
        </Button>
      </div>
      <header className="flex items-start justify-between gap-6 border-b border-library-line pb-4">
        <div>
          <p className="text-caption uppercase tracking-widest text-library-muted">Phiếu đóng gói · WrapFit</p>
          <h1 className="mt-1 font-mono text-2xl font-bold">{o.orderCode}</h1>
          <p className="mt-1 text-sm">{o.partnerShop?.name ?? o.printShopName}</p>
        </div>
        {qr && <div aria-label="Mã QR mở đơn trong cổng xưởng" role="img" className="size-32" dangerouslySetInnerHTML={{ __html: qr }} />}
      </header>
      <section className="grid grid-cols-2 gap-6 py-4 text-sm">
        <div>
          <p className="text-caption uppercase tracking-widest text-library-muted">Người nhận</p>
          <p className="mt-1 font-semibold">{o.recipientName}</p>
          <p className="font-mono">{o.recipientPhone}</p>
          <p>{o.shippingAddress}</p>
          {o.recipientProvince && <p>{provinceOf(o.recipientProvince)?.name}</p>}
        </div>
        <div>
          <p className="text-caption uppercase tracking-widest text-library-muted">Giao trước</p>
          <p className="mt-1 font-semibold">{o.estimatedDelivery ? dayLabel(o.estimatedDelivery) : "—"}</p>
          {o.notes && (
            <>
              <p className="mt-3 text-caption uppercase tracking-widest text-library-muted">Ghi chú</p>
              <p>{o.notes}</p>
            </>
          )}
        </div>
      </section>
      <table className="w-full border-t border-library-line text-sm">
        <thead>
          <tr className="text-left text-caption uppercase tracking-widest text-library-muted">
            <th className="py-2">Thiết kế</th>
            <th className="py-2">Giấy</th>
            <th className="py-2 text-right">Số hộp</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t border-library-line">
              <td className="py-2">{item.projectTitle}</td>
              <td className="py-2">{item.paperStock ?? o.paperStock}</td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 text-caption text-library-muted">Quét mã QR để mở đơn trên điện thoại và cập nhật gửi hàng. Kiểm tra số hộp và kích thước trước khi dán thùng.</p>
    </main>
  );
}
