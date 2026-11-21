"use client";

import { AlertTriangle, CheckCircle2, Circle, ExternalLink, Truck } from "lucide-react";
import React from "react";
import type { OrderStatus, SampleOrder } from "@/types/api";
import { cn } from "@/utils/helpers";

const time = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : null;

/** "Thứ Ba, 24/11" of a YYYY-MM-DD in Vietnam. */
export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00+07:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

const ORDER: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];

interface Step {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
  detail?: string;
}

/** Steps of a sample order (docs/19 G.5), with the time each one happened, from the order's own fields and timeline. */
export function orderSteps(order: SampleOrder): Step[] {
  const status = order.orderStatus ?? (order.status.toUpperCase() as OrderStatus);
  const reached = (target: OrderStatus) => status !== "CANCELLED" && ORDER.indexOf(status) >= ORDER.indexOf(target);
  const at = (target: OrderStatus) => order.timeline?.find((row) => row.status === target)?.at ?? null;
  return [
    { key: "placed", label: "Đặt đơn", at: order.createdAt, done: true },
    { key: "paid", label: "Thanh toán", at: order.paidAt ?? at("PAID"), done: reached("PAID") },
    {
      key: "accepted",
      label: "Xưởng nhận đơn",
      at: order.acceptedAt ?? null,
      done: !!order.acceptedAt || reached("IN_PRODUCTION"),
      detail: !order.acceptedAt && reached("PAID") && order.acceptDeadline ? `Hạn nhận ${time(order.acceptDeadline)}` : undefined,
    },
    { key: "printing", label: "Đang in", at: at("IN_PRODUCTION"), done: reached("IN_PRODUCTION") },
    {
      key: "shipped",
      label: "Đang giao",
      at: order.shippedAt ?? at("SHIPPED"),
      done: reached("SHIPPED"),
      detail: order.carrierName ? `${order.carrierName}${order.trackingCode ? ` · ${order.trackingCode}` : ""}` : undefined,
    },
    { key: "delivered", label: "Đã giao", at: order.deliveredAt ?? at("DELIVERED"), done: reached("DELIVERED") },
  ];
}

/**
 * Where an order stands: every step with its time, the delivery date the customer was promised and whether it is late,
 * the carrier link, and the order being moved to another shop or cancelled.
 */
export function OrderProgress({ order, className }: { order: SampleOrder; className?: string }) {
  const steps = orderSteps(order);
  const current = steps.findIndex((step) => !step.done);
  const cancelled = order.status === "cancelled";
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {order.estimatedDelivery && !cancelled && order.status !== "delivered" && (
        <p className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", order.isLate ? "bg-danger-bg text-danger-fg" : "bg-library-tile text-library-ink")}>
          {order.isLate ? <AlertTriangle className="size-4 shrink-0" aria-hidden /> : <Truck className="size-4 shrink-0" aria-hidden />}
          {order.isLate ? "Trễ so với ngày dự kiến " : "Nhận dự kiến "}
          <strong className="font-semibold">{dayLabel(order.estimatedDelivery)}</strong>
        </p>
      )}
      {order.rejectedAt && !order.acceptedAt && !cancelled && (
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          Xưởng không nhận được đơn này. WrapFit đang chuyển đơn sang xưởng khác.
          {order.rejectReason ? ` Lý do: ${order.rejectReason}` : ""}
        </p>
      )}
      {cancelled && <p className="rounded-lg bg-library-tile px-3 py-2 text-sm text-library-sub">Đơn đã hủy {time(order.cancelledAt) ?? ""}.</p>}
      <ol className="flex flex-col gap-0" aria-label="Tiến trình đơn">
        {steps.map((step, index) => {
          const active = !cancelled && index === current;
          return (
            <li key={step.key} className="relative flex gap-3 pb-3 last:pb-0">
              {index < steps.length - 1 && (
                <span aria-hidden className={cn("absolute left-[9px] top-5 h-full w-0.5", step.done ? "bg-success-fg/50" : "bg-library-line")} />
              )}
              <span className="relative z-10 mt-0.5 shrink-0">
                {step.done ? (
                  <CheckCircle2 className="size-5 text-success-fg" aria-hidden />
                ) : (
                  <Circle className={cn("size-5", active ? "text-fpt-orange-ink" : "text-library-line")} aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", step.done || active ? "font-semibold text-library-ink" : "text-library-muted")}>
                  {step.label}
                  {active && <span className="ml-2 text-caption font-normal text-fpt-orange-ink">đang chờ</span>}
                </span>
                {(step.at || step.detail) && (
                  <span className="block text-caption text-library-muted">
                    {[step.done ? time(step.at) : null, step.detail].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {order.trackingUrl && (
        <a href={order.trackingUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-fpt-orange-ink hover:underline">
          Tra cứu vận đơn {order.trackingCode} <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}
