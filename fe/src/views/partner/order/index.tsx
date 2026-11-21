"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CARRIERS, carrierOf, shipmentProblem } from "@wrapfit/shared";
import { ArrowLeft, Download, FileDown, MapPin, PackageCheck, Phone, Printer, User } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { acceptOrder, getOrderPrintFiles, getStaffOrder, rejectOrder, updateOrderStatus } from "@/api";
import { useToast } from "@/components/common/Toast";
import { Button } from "@/components/ui";
import { Badge, Panel, PanelTitle, WORKSPACE_INPUT, WorkspaceError } from "@/components/workspace";
import { PartnerShell } from "@/components/workspace/PartnerShell";
import { OrderChat, OrderProgress, orderStatusBadge } from "@/features/orders";
import { formatVnd } from "@/features/pricing";
import { errorMessage } from "@/services/api";
import type { OrderStatus, SampleOrder } from "@/types/api";
import { cn } from "@/utils/helpers";

const FILE_LABELS: Record<string, string> = {
  PDF_CMYK: "PDF CMYK tách lớp",
  PDF_A4_PRINT: "PDF A4/A3 có dấu xén",
  SVG: "SVG máy cắt",
  DXF: "DXF máy bế",
  PRINT_PACKAGE: "Gói nhà in (ZIP)",
};

const orderKey = (id: string) => ["orders", "partner", id] as const;

/** `/partner/orders/:id`: one order for the shop — take or refuse it, print, ship with a tracking code, deliver, talk. */
export default function PartnerOrderPage({ orderId }: { orderId: string }) {
  const order = useQuery({ queryKey: orderKey(orderId), queryFn: () => getStaffOrder(orderId), refetchInterval: 30_000 });
  return (
    <PartnerShell
      title={order.data ? `Đơn ${order.data.orderCode}` : "Đơn in"}
      actions={
        <Link href="/partner" className="inline-flex items-center gap-1.5 text-sm font-semibold text-library-sub hover:text-library-ink">
          <ArrowLeft className="size-4" aria-hidden /> Hàng đợi
        </Link>
      }
    >
      {order.isError ? (
        <WorkspaceError error={order.error} title="Không mở được đơn" onRetry={() => void order.refetch()} retrying={order.isFetching} />
      ) : !order.data ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-2xl bg-library-panel" />
      ) : (
        <OrderScreen order={order.data} />
      )}
    </PartnerShell>
  );
}

function OrderScreen({ order }: { order: SampleOrder }) {
  const badge = orderStatusBadge(order.status);
  const accepted = !!order.acceptedAt;
  const closedAt = order.deliveredAt ?? order.cancelledAt;
  const closed = !!closedAt && Date.now() - new Date(closedAt).getTime() > 30 * 86_400_000;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <Panel aria-labelledby="next-step">
          <PanelTitle id="next-step" action={<Badge tone={badge.tone}>{order.rejectedAt && !accepted ? "Đã từ chối" : badge.label}</Badge>}>
            Việc tiếp theo
          </PanelTitle>
          <NextStep order={order} />
        </Panel>

        <Panel aria-labelledby="items-title">
          <PanelTitle id="items-title" action={accepted && order.orderStatus !== "CANCELLED" ? <SlipLink id={order.id} /> : undefined}>
            Thiết kế cần in
          </PanelTitle>
          <ul className="flex flex-col divide-y divide-library-line text-sm">
            {(order.items?.length ? order.items : [{ projectId: order.projectId, projectTitle: order.projectTitle, quantity: order.quantity, lineTotalVnd: order.subtotalVnd ?? 0, paperStock: order.paperStock }]).map(
              (item, index) => (
                <li key={`${item.projectId ?? index}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0">
                    <span className="block font-semibold text-library-ink">{item.projectTitle}</span>
                    <span className="block text-caption text-library-muted">
                      {item.quantity} hộp mẫu · {item.paperStock ?? order.paperStock}
                      {"projectVersion" in item && item.projectVersion ? ` · phiên bản ${item.projectVersion}` : ""}
                    </span>
                  </span>
                </li>
              )
            )}
          </ul>
          {order.notes && <p className="mt-3 rounded-lg bg-library-tile px-3 py-2 text-sm text-library-sub">Ghi chú của khách: {order.notes}</p>}
          <PrintFiles orderId={order.id} />
        </Panel>

        <Panel aria-labelledby="chat-title">
          <PanelTitle id="chat-title">Tin nhắn với khách</PanelTitle>
          <OrderChat orderId={order.id} accepted={accepted} closed={closed} placeholder="Nhắn cho khách (hỏi file, hẹn giao, báo trễ…)" />
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        <Panel aria-labelledby="progress-title">
          <PanelTitle id="progress-title">Tiến trình</PanelTitle>
          <OrderProgress order={order} />
        </Panel>
        <Panel aria-labelledby="recipient-title">
          <PanelTitle id="recipient-title">Người nhận</PanelTitle>
          <div className="flex flex-col gap-1.5 text-sm text-library-sub">
            <span className="flex items-center gap-2 text-library-ink">
              <User className="size-4 text-library-muted" aria-hidden /> {order.recipientName}
            </span>
            {accepted ? (
              <>
                <span className="flex items-center gap-2 font-mono">
                  <Phone className="size-4 text-library-muted" aria-hidden /> {order.recipientPhone}
                </span>
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-library-muted" aria-hidden /> {order.shippingAddress}
                </span>
              </>
            ) : (
              <p className="text-caption text-library-muted">Số điện thoại và địa chỉ hiện sau khi xưởng nhận đơn.</p>
            )}
          </div>
        </Panel>
        {order.platformFeeVnd !== undefined && (
          <Panel aria-labelledby="money-title">
            <PanelTitle id="money-title">Tiền đơn</PanelTitle>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-library-muted">Khách trả</dt>
                <dd className="tabular-nums">{formatVnd(order.totalVnd ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-library-muted">Phí nền tảng ({((order.platformFeeBps ?? 0) / 100).toLocaleString("vi-VN")} %)</dt>
                <dd className="tabular-nums">− {formatVnd(order.platformFeeVnd)}</dd>
              </div>
              <div className="flex justify-between border-t border-library-line pt-1.5 font-semibold">
                <dt>Xưởng nhận</dt>
                <dd className="tabular-nums">{formatVnd(order.shopPayableVnd ?? 0)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-caption text-library-muted">Ghi vào sổ khi đơn giao xong, trả theo kỳ đối soát.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function SlipLink({ id }: { id: string }) {
  return (
    <Link href={`/partner/orders/${id}/slip`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-library-sub hover:text-library-ink">
      <Printer className="size-4" aria-hidden /> In phiếu đóng gói
    </Link>
  );
}

/** The one action the shop has to take now, with its form. */
function NextStep({ order }: { order: SampleOrder }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [carrier, setCarrier] = useState("GHN");
  const [code, setCode] = useState("");
  const [proof, setProof] = useState("");

  const done = (updated: SampleOrder, title: string) => {
    queryClient.setQueryData(orderKey(order.id), updated);
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["partner"] });
    toast.show({ tone: "success", title });
  };
  const act = useMutation({
    mutationFn: async (step: { kind: "accept" } | { kind: "reject" } | { kind: "status"; to: OrderStatus }) => {
      if (step.kind === "accept") return acceptOrder(order.id);
      if (step.kind === "reject") return rejectOrder(order.id, reason.trim());
      if (step.to === "SHIPPED") return updateOrderStatus(order.id, "SHIPPED", undefined, { carrier, trackingCode: code.trim() || undefined });
      if (step.to === "DELIVERED") return updateOrderStatus(order.id, "DELIVERED", proof.trim());
      return updateOrderStatus(order.id, step.to);
    },
    onSuccess: (updated, step) =>
      done(updated, step.kind === "accept" ? "Đã nhận đơn" : step.kind === "reject" ? "Đã từ chối đơn" : orderStatusBadge(updated.status).label),
    onError: (error) => toast.error(error, "Chưa cập nhật được đơn"),
  });

  const status = order.orderStatus;
  if (status === "PAID" && order.rejectedAt && !order.acceptedAt) {
    return <p className="text-sm text-library-sub">Bạn đã từ chối đơn này. WrapFit đang chuyển đơn sang xưởng khác.</p>;
  }
  if (status === "PAID" && !order.acceptedAt) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-library-sub">
          Khách đã thanh toán. Kiểm tra file in và năng lực xưởng, rồi nhận đơn
          {order.acceptDeadline ? ` trước ${new Date(order.acceptDeadline).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}` : ""}.
        </p>
        {refusing ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-library-ink">
              Lý do không nhận được (WrapFit đọc để chuyển xưởng)
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} className={cn(WORKSPACE_INPUT, "mt-1 h-auto py-2")} />
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRefusing(false)}>
                Quay lại
              </Button>
              <Button size="sm" variant="ghost" disabled={reason.trim().length < 5 || act.isPending} onClick={() => act.mutate({ kind: "reject" })}>
                Gửi lý do và từ chối
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="brand" size="sm" disabled={act.isPending} onClick={() => act.mutate({ kind: "accept" })}>
              <PackageCheck className="size-4" aria-hidden /> Nhận đơn
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRefusing(true)}>
              Không nhận được
            </Button>
          </div>
        )}
      </div>
    );
  }
  if (status === "PAID") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-library-sub">Đã nhận đơn. Khi đưa vào máy, bấm bắt đầu in để khách theo dõi.</p>
        <Button variant="brand" size="sm" className="self-start" disabled={act.isPending} onClick={() => act.mutate({ kind: "status", to: "IN_PRODUCTION" })}>
          Bắt đầu in
        </Button>
      </div>
    );
  }
  if (status === "IN_PRODUCTION") {
    const problem = shipmentProblem(carrier, code);
    const needsCode = carrierOf(carrier)?.needsCode ?? true;
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-library-sub">In và đóng gói xong thì nhập hãng vận chuyển và mã vận đơn: khách tra cứu được ngay.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-library-ink">
            Hãng vận chuyển
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={cn(WORKSPACE_INPUT, "mt-1")}>
              {CARRIERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {needsCode && (
            <label className="text-sm font-medium text-library-ink">
              Mã vận đơn
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: GHN123456789" className={cn(WORKSPACE_INPUT, "mt-1 font-mono")} />
            </label>
          )}
        </div>
        {code && problem && <p className="text-caption text-danger-fg">{problem}</p>}
        <Button variant="brand" size="sm" className="self-start" disabled={!!problem || act.isPending} onClick={() => act.mutate({ kind: "status", to: "SHIPPED" })}>
          Đã gửi hàng
        </Button>
      </div>
    );
  }
  if (status === "SHIPPED") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-library-sub">
          Khách bấm “Đã nhận hàng” là đơn xong. Nếu hãng đã báo giao, ghi bằng chứng để báo đã giao; không có tin gì thì đơn tự xong sau 10 ngày.
        </p>
        <label className="text-sm font-medium text-library-ink">
          Bằng chứng đã giao
          <input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="VD: GHN báo đã giao lúc 10:30 ngày 24/11, người nhận ký" className={cn(WORKSPACE_INPUT, "mt-1")} />
        </label>
        <Button variant="secondary" size="sm" className="self-start" disabled={proof.trim().length < 5 || act.isPending} onClick={() => act.mutate({ kind: "status", to: "DELIVERED" })}>
          Báo đã giao
        </Button>
      </div>
    );
  }
  if (status === "DELIVERED") return <p className="text-sm text-library-sub">Đơn đã giao xong. Cảm ơn xưởng!</p>;
  if (status === "CANCELLED") return <p className="text-sm text-library-sub">Đơn đã hủy.</p>;
  return <p className="text-sm text-library-sub">Đơn chưa thanh toán.</p>;
}

/** Links to the print files of the ordered versions, fetched on demand (they last 15 minutes). */
function PrintFiles({ orderId }: { orderId: string }) {
  const [asked, setAsked] = useState(false);
  const files = useQuery({ queryKey: ["orders", orderId, "files"], queryFn: () => getOrderPrintFiles(orderId), enabled: asked, staleTime: 10 * 60_000 });
  if (!asked) {
    return (
      <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAsked(true)}>
        <FileDown className="size-4" aria-hidden /> Lấy link tải file in
      </Button>
    );
  }
  if (files.isPending) return <p className="mt-4 text-caption text-library-muted">Đang lấy link…</p>;
  if (files.isError) return <p className="mt-4 text-caption text-danger-fg">{errorMessage(files.error)}</p>;
  if (!files.data.length) {
    return <p className="mt-4 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">Khách chưa xuất file in cho phiên bản này. Nhắn khách bên dưới để xuất file.</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {files.data.map((file) => (
        <li key={file.fileName}>
          <a href={file.url} className="inline-flex items-center gap-2 text-sm font-semibold text-fpt-orange-ink hover:underline" download={file.fileName}>
            <Download className="size-4" aria-hidden />
            {file.projectTitle} · {FILE_LABELS[file.fileType] ?? file.fileType}
          </a>
        </li>
      ))}
      <li className="text-caption text-library-muted">Link hết hạn sau 15 phút.</li>
    </ul>
  );
}
