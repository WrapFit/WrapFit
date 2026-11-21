"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, ClipboardList, MessageCircle } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { getPartnerMe, getPartnerSummary, listStaffOrders } from "@/api";
import { Badge, Panel, PanelTitle, SegmentedControl, StatTile, WorkspaceEmpty, WorkspaceError } from "@/components/workspace";
import { PartnerShell } from "@/components/workspace/PartnerShell";
import { dayLabel, orderStatusBadge } from "@/features/orders";
import type { SampleOrder } from "@/types/api";
import { cn } from "@/utils/helpers";

/** Columns of the queue (docs/19 G.5): what the shop has to do next. */
type Lane = "accept" | "start" | "printing" | "shipped" | "done";

const LANES: { value: Lane; label: string; match: (order: SampleOrder) => boolean }[] = [
  { value: "accept", label: "Chờ nhận", match: (o) => o.orderStatus === "PAID" && !o.acceptedAt && !o.rejectedAt },
  { value: "start", label: "Cần in", match: (o) => o.orderStatus === "PAID" && !!o.acceptedAt },
  { value: "printing", label: "Đang in", match: (o) => o.orderStatus === "IN_PRODUCTION" },
  { value: "shipped", label: "Đang giao", match: (o) => o.orderStatus === "SHIPPED" },
  { value: "done", label: "Đã xong", match: (o) => o.orderStatus === "DELIVERED" || o.orderStatus === "CANCELLED" || (o.orderStatus === "PAID" && !!o.rejectedAt) },
];

const QUEUE_REFRESH_MS = 30_000;

/** Time left to answer, or how late the answer is. */
function deadlineText(iso: string): { text: string; late: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  const hours = Math.round(Math.abs(ms) / 3_600_000);
  if (ms < 0) return { text: `Quá hạn nhận ${hours} giờ`, late: true };
  return { text: hours < 1 ? "Còn dưới 1 giờ để nhận" : `Còn ${hours} giờ để nhận`, late: hours < 4 };
}

/** `/partner`: the queue of a print shop account, by what to do next, refreshed every 30 seconds. */
export default function PartnerHomePage() {
  const [lane, setLane] = useState<Lane>("accept");
  const me = useQuery({ queryKey: ["partner", "me"], queryFn: getPartnerMe });
  const summary = useQuery({ queryKey: ["partner", "summary"], queryFn: getPartnerSummary, refetchInterval: QUEUE_REFRESH_MS });
  const orders = useQuery({ queryKey: ["orders", "partner"], queryFn: () => listStaffOrders({ limit: 100 }), refetchInterval: QUEUE_REFRESH_MS });

  const all = (orders.data ?? []).filter((order) => order.orderStatus !== "PENDING_PAYMENT");
  const current = LANES.find((item) => item.value === lane)!;
  const rows = all.filter(current.match).sort((a, b) => (a.acceptDeadline ?? a.createdAt).localeCompare(b.acceptDeadline ?? b.createdAt));
  const count = (value: Lane) => all.filter(LANES.find((item) => item.value === value)!.match).length;
  const s = summary.data;

  return (
    <PartnerShell title={me.data ? me.data.shop.name : "Đơn cần làm"}>
      <div className="flex flex-col gap-6">
        {me.data?.shop.pausedUntil && new Date(me.data.shop.pausedUntil) > new Date() && (
          <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning-fg">
            Xưởng đang tạm nghỉ đến {new Date(me.data.shop.pausedUntil).toLocaleDateString("vi-VN")}: khách chưa thấy xưởng khi đặt đơn mới.{" "}
            <Link href="/partner/settings" className="font-semibold underline">
              Đổi
            </Link>
          </p>
        )}
        <section aria-label="Việc cần làm" className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile label="Chờ nhận" value={s ? s.waitingAccept : "–"} hint={s?.overdueAccept ? `${s.overdueAccept} quá hạn` : undefined} />
          <StatTile label="Cần in" value={s ? s.toStart : "–"} />
          <StatTile label="Đang in" value={s ? s.inProduction : "–"} />
          <StatTile label="Đang giao" value={s ? s.shipped : "–"} />
          <StatTile label="Tin chưa đọc" value={s ? s.unreadMessages : "–"} />
        </section>

        <Panel aria-labelledby="queue-title">
          <PanelTitle id="queue-title">Hàng đợi</PanelTitle>
          <div className="mb-4 overflow-x-auto">
            <SegmentedControl<Lane>
              label="Lọc đơn theo việc"
              value={lane}
              onChange={setLane}
              options={LANES.map((item) => ({ value: item.value, label: `${item.label} (${orders.data ? count(item.value) : "…"})` }))}
            />
          </div>
          {orders.isError ? (
            <WorkspaceError error={orders.error} title="Không tải được đơn của xưởng" onRetry={() => void orders.refetch()} retrying={orders.isFetching} />
          ) : orders.isPending ? (
            <div aria-busy="true" className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-library-panel" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <WorkspaceEmpty icon={ClipboardList} title="Không có đơn ở mục này" description="Đơn mới đã thanh toán hiện ở “Chờ nhận”, kèm hạn nhận." />
          ) : (
            <ul className="flex flex-col divide-y divide-library-line">
              {rows.map((order) => (
                <QueueRow key={order.id} order={order} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PartnerShell>
  );
}

function QueueRow({ order }: { order: SampleOrder }) {
  const badge = orderStatusBadge(order.status);
  const deadline = order.orderStatus === "PAID" && !order.acceptedAt && !order.rejectedAt && order.acceptDeadline ? deadlineText(order.acceptDeadline) : null;
  return (
    <li>
      <Link href={`/partner/orders/${order.id}`} className="flex items-center gap-3 py-3 outline-none hover:bg-library-tile/40 focus-visible:ring-[3px] focus-visible:ring-focus/40">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-library-ink">{order.orderCode}</span>
            <Badge tone={badge.tone}>{order.rejectedAt && !order.acceptedAt ? "Đã từ chối" : badge.label}</Badge>
            {order.isLate && <Badge tone="red">Trễ hạn giao</Badge>}
            {!!order.unreadMessages && (
              <span className="inline-flex items-center gap-1 text-caption font-semibold text-fpt-orange-ink">
                <MessageCircle className="size-3.5" aria-hidden /> {order.unreadMessages} tin mới
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-caption text-library-sub">
            {order.items?.length ? order.items.map((item) => `${item.projectTitle} × ${item.quantity}`).join(" · ") : `${order.projectTitle} × ${order.quantity}`}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-caption text-library-muted">
            {deadline && (
              <span className={cn("inline-flex items-center gap-1", deadline.late && "font-semibold text-danger-fg")}>
                {deadline.late && <AlertTriangle className="size-3" aria-hidden />}
                {deadline.text}
              </span>
            )}
            {order.estimatedDelivery && <span>Khách nhận dự kiến {dayLabel(order.estimatedDelivery)}</span>}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-library-muted" aria-hidden />
      </Link>
    </li>
  );
}
