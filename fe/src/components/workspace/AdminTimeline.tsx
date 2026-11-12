"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Info, RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/helpers";
import { ADMIN_CARD } from "./adminSkin";

/** One day (or hour) of the chart. */
export interface TimelineBucket {
  /** Key and tooltip date, e.g. "2026-11-12". */
  key: string;
  /** Short axis label, e.g. "12/11". */
  label: string;
  value: number;
  /** Tooltip heading; defaults to the key read as a date. */
  title?: string;
}

export type TimelineTone = "good" | "warning" | "critical" | "info";

/** A dated event of the activity strip under the chart. */
export interface TimelineEvent {
  id: string;
  at: string;
  title: string;
  detail?: string;
  tone: TimelineTone;
}

const TONES: Record<TimelineTone, { icon: LucideIcon; label: string; dot: string; text: string }> = {
  good: { icon: CheckCircle2, label: "Ổn", dot: "bg-success", text: "text-success-fg" },
  warning: { icon: AlertTriangle, label: "Cần xem", dot: "bg-warning", text: "text-warning-fg" },
  critical: { icon: AlertTriangle, label: "Lỗi", dot: "bg-danger-solid", text: "text-danger-fg" },
  info: { icon: Info, label: "Thông tin", dot: "bg-info", text: "text-info-fg" },
};

const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Days from `days - 1` days ago to today (local time), as empty buckets keyed YYYY-MM-DD. */
export function lastDays(days: number, now = new Date()): TimelineBucket[] {
  return Array.from({ length: days }, (_, index) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - index));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { key, label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 };
  });
}

/** Local YYYY-MM-DD of an ISO time. */
export const dayKeyOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface AdminTimelineProps {
  title: string;
  /** What one bar counts, e.g. "hộp mới" (tooltip and table). */
  unit: string;
  buckets: TimelineBucket[];
  /** Formats a value for the tooltip, table and headline (default: vi-VN number). */
  format?: (value: number) => string;
  /** Newest first; the 6 latest are listed. */
  events?: TimelineEvent[];
  eventsTitle?: string;
  /** When the data was last fetched (ms), and the auto-refresh period shown next to it. */
  updatedAt?: number;
  refreshSeconds?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  /** Short message when the data could not be loaded; "Thử lại" calls onRefresh. */
  error?: string;
  /** Replaces "N ngày gần nhất" (e.g. "20 lần kiểm tra gần nhất"). */
  periodLabel?: string;
  /** Replaces "hôm nay" for the last bucket (e.g. "hiện tại"). */
  lastLabel?: string;
}

/**
 * Overview at the top of an admin page whose figures change over time: a day-by-day bar chart of one measure, the
 * latest events as a dated strip, and when it was last refreshed. One series, so no legend (the title names it); a
 * hidden table gives the same numbers to screen readers.
 */
export function AdminTimeline({
  title,
  unit,
  buckets,
  format = (value) => value.toLocaleString("vi-VN"),
  events = [],
  eventsTitle = "Diễn biến gần đây",
  updatedAt,
  refreshSeconds,
  onRefresh,
  refreshing = false,
  loading = false,
  error,
  periodLabel,
  lastLabel = "hôm nay",
}: AdminTimelineProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const total = buckets.reduce((sum, b) => sum + b.value, 0);
  const today = buckets.at(-1)?.value ?? 0;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 10));

  // Re-render every second so "x giây trước" stays true.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!updatedAt) return;
    const timer = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [updatedAt]);
  const ago = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;

  return (
    <section aria-label={title} className={cn(ADMIN_CARD, "p-5 sm:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-landing-heading text-lg font-bold text-landing-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-library-sub">
            {periodLabel ?? `${buckets.length} ngày gần nhất`} · tổng <strong className="font-semibold tabular-nums text-library-ink">{format(total)}</strong> {unit} · {lastLabel}{" "}
            <strong className="font-semibold tabular-nums text-library-ink">{format(today)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-library-sub" role="status">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
          <span>
            {updatedAt ? <>Cập nhật {timeFmt.format(updatedAt)}{ago !== null && ago > 1 ? ` · ${ago}s trước` : ""}</> : "Đang tải…"}
            {refreshSeconds ? ` · tự làm mới ${refreshSeconds}s` : ""}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Làm mới ngay"
              title="Làm mới ngay"
              className="flex size-9 items-center justify-center rounded-full outline-none hover:bg-library-panel focus-visible:ring-[3px] focus-visible:ring-focus/50"
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-landing-canvas px-4 py-3.5">
          <span className="flex items-center gap-2.5 text-sm text-landing-ink">
            <AlertTriangle className="size-4 shrink-0 text-warning-fg" aria-hidden />
            {error}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-landing-ink shadow-xs ring-1 ring-line/60 hover:bg-landing-canvas"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin motion-reduce:animate-none")} aria-hidden />
              Thử lại
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* Chart */}
          <div>
            <div className="relative">
              <div
                className={cn("flex h-40 items-end gap-[2px] border-b border-library-line", loading && "animate-pulse motion-reduce:animate-none")}
                role="img"
                aria-label={`${title}: ${buckets.map((b) => `${b.label} ${format(b.value)}`).join(", ")}`}
                onMouseLeave={() => setHover(null)}
              >
                {buckets.map((bucket, index) => {
                  const height = loading ? 8 : bucket.value === 0 ? 0 : Math.max(4, (bucket.value / max) * 100);
                  const on = hover === index;
                  return (
                    // Full-height hit target, bigger than the bar itself.
                    <div
                      key={bucket.key}
                      className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                      onMouseEnter={() => setHover(index)}
                      onFocus={() => setHover(index)}
                      onBlur={() => setHover(null)}
                      tabIndex={0}
                      aria-label={`${bucket.label}: ${format(bucket.value)} ${unit}`}
                    >
                      {on && <span aria-hidden className="absolute inset-0 rounded-t bg-library-panel" />}
                      <span
                        aria-hidden
                        className={cn("relative w-full max-w-[18px] rounded-t transition-[height] duration-300", on ? "bg-fpt-orange-dark" : "bg-fpt-orange")}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              {hover !== null && buckets[hover] && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-library-ink px-2.5 py-1.5 text-xs text-white shadow-popover"
                  style={{ left: `${((hover + 0.5) / buckets.length) * 100}%` }}
                >
                  <span className="block text-white/70">{buckets[hover].title ?? buckets[hover].key.split("-").reverse().join("/")}</span>
                  <span className="font-semibold tabular-nums">
                    {format(buckets[hover].value)} {unit}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-1.5 flex gap-[2px] text-[11px] tabular-nums text-library-sub" aria-hidden>
              {buckets.map((bucket, index) => (
                <span key={bucket.key} className="min-w-0 flex-1 text-center">
                  {index % labelEvery === 0 || index === buckets.length - 1 ? bucket.label : ""}
                </span>
              ))}
            </div>
            <table className="sr-only">
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Ngày</th>
                  <th scope="col">{unit}</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((bucket) => (
                  <tr key={bucket.key}>
                    <th scope="row">{bucket.key}</th>
                    <td>{format(bucket.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Event strip */}
          <div>
            <h3 className="text-sm font-medium text-library-ink">{eventsTitle}</h3>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-library-sub">{loading ? "Đang tải…" : "Chưa có sự kiện nào."}</p>
            ) : (
              <ol className="relative mt-3 flex flex-col gap-3 border-l border-library-line pl-4">
                {events.slice(0, 6).map((event) => {
                  const tone = TONES[event.tone];
                  const Icon = tone.icon ?? Circle;
                  return (
                    <li key={event.id} className="relative">
                      <span aria-hidden className={cn("absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-2 ring-white", tone.dot)} />
                      <p className="flex flex-wrap items-center gap-x-2 text-sm">
                        <time dateTime={event.at} className="tabular-nums text-library-sub">
                          {dateTimeFmt.format(new Date(event.at))}
                        </time>
                        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", tone.text)}>
                          <Icon className="size-3.5" aria-hidden />
                          {tone.label}
                        </span>
                      </p>
                      <p className="text-sm font-medium text-library-ink">{event.title}</p>
                      {event.detail && <p className="truncate text-xs text-library-sub">{event.detail}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
