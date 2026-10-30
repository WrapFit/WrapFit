"use client";

/**
 * "Số liệu thiết kế" on `/dashboard` (docs/17 S7): boxes created per day, the mix of box structures, FitCheck errors
 * stopped before printing and the active time it takes to make a box, from `GET /analytics/summary`.
 * Charts follow the dataviz rules: one hue (FPT orange) for one measure, bars ≤ 24 px with a 4 px rounded end and a
 * 2 px gap, hairline grid, values in text colours, a hover / keyboard readout and a table view.
 */

import { Plus } from "lucide-react";
import Link from "next/link";
import React, { useId, useState } from "react";
import { ANALYTICS_PERIODS, type AnalyticsBoxType, type AnalyticsPeriod, type AnalyticsScope, type AnalyticsSummary } from "@wrapfit/shared";
import { EmptyState } from "@/components/common/StatusViews";
import { createBoxButton } from "@/components/library";
import { Skeleton } from "@/components/ui";
import { Panel, PanelTitle, SegmentedControl, StatTile, WorkspaceError } from "@/components/workspace";
import { ROUTES } from "@/constants";
import { cn } from "@/utils/helpers";
import { formatCount } from "../format";
import { useAnalyticsSummary } from "../useAnalytics";

const SCOPES: { value: AnalyticsScope; label: string }[] = [
  { value: "me", label: "Của bạn" },
  { value: "global", label: "Toàn WrapFit" },
];
const PERIODS = ANALYTICS_PERIODS.map((days) => ({ value: String(days) as `${AnalyticsPeriod}`, label: `${days} ngày` }));

const BOX_TYPE_LABELS: Record<AnalyticsBoxType, string> = {
  "tuck-top": "Hộp nắp gài",
  "sleeve-drawer": "Hộp bao diêm",
  "lid-base": "Hộp âm dương",
  pillow: "Hộp gối",
  other: "Khác (nhãn dán…)",
};

const FORMAT_LABELS: Record<string, string> = {
  PDF_CMYK: "PDF CMYK",
  PDF_A4_PRINT: "PDF A4",
  SVG: "SVG",
  DXF: "DXF",
  PRINT_PACKAGE: "Gói nhà in",
};

/** "45 giây", "4 phút 20 giây", "1 giờ 5 phút". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total} giây`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  return rest > 0 ? `${minutes} phút ${rest} giây` : `${minutes} phút`;
}

/** "2026-10-29" → "29/10". */
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Clean top of the value axis: 4, 5, 6, 8, 10, 20, 40… (never below 4, so a quiet week still has room). */
function axisTop(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 4, 5, 6, 8, 10].map((step) => step * magnitude).find((top) => top >= max) ?? 10 * magnitude;
}

export function DesignStats() {
  const [scope, setScope] = useState<AnalyticsScope>("me");
  const [days, setDays] = useState<AnalyticsPeriod>(30);
  const summary = useAnalyticsSummary(scope, days);
  const data = summary.data;

  let body: React.ReactNode;
  if (summary.isPending) {
    body = <StatsSkeleton />;
  } else if (summary.isError && !data) {
    body = (
      <WorkspaceError error={summary.error} title="Không tải được số liệu thiết kế" onRetry={() => void summary.refetch()} retrying={summary.isFetching} />
    );
  } else if (data && isEmpty(data)) {
    body = (
      <EmptyState
        title={scope === "me" ? `Chưa có hộp nào trong ${days} ngày qua` : `WrapFit chưa có hộp nào trong ${days} ngày qua`}
        description="Tạo một hộp, kiểm FitCheck và xuất file in: số hộp, kiểu hộp, lỗi đã chặn và thời gian làm hộp sẽ hiện ở đây."
        action={
          <Link href={ROUTES.editorNew} className={createBoxButton}>
            <Plus className="size-4" aria-hidden />
            Tạo hộp mới
          </Link>
        }
      />
    );
  } else if (data) {
    // Refetch keeps the frame: the previous numbers stay, dimmed, while the new period loads.
    body = (
      <div className={cn("flex flex-col gap-5 transition-opacity", summary.isPlaceholderData && "opacity-60")} aria-busy={summary.isPlaceholderData}>
        <StatTiles data={data} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Panel aria-labelledby="boxes-by-day-title">
            <PanelTitle id="boxes-by-day-title">Hộp tạo theo ngày</PanelTitle>
            <BoxesByDayChart data={data} />
          </Panel>
          <Panel aria-labelledby="box-types-title">
            <PanelTitle id="box-types-title">Cơ cấu kiểu hộp</PanelTitle>
            <BoxTypeBars data={data} />
            <ExportFormats data={data} />
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="design-stats-title" className="flex flex-col gap-4">
      <PanelTitle id="design-stats-title">Số liệu thiết kế</PanelTitle>
      <div className="-mt-2 flex flex-wrap items-center gap-3">
        <SegmentedControl<AnalyticsScope> label="Phạm vi số liệu" value={scope} options={SCOPES} onChange={setScope} />
        <SegmentedControl<`${AnalyticsPeriod}`> label="Khoảng thời gian" value={String(days) as `${AnalyticsPeriod}`} options={PERIODS} onChange={(value) => setDays(Number(value) as AnalyticsPeriod)} />
      </div>
      <p className="-mt-1 text-body-sm text-library-sub">
        {data ? `Từ ${shortDate(data.from)} đến ${shortDate(data.to)}. ` : ""}
        {scope === "me" ? "Các hộp trong tài khoản của bạn." : "Tổng ẩn danh của mọi người dùng WrapFit, cập nhật mỗi phút."}
      </p>
      {body}
    </section>
  );
}

function isEmpty(data: AnalyticsSummary): boolean {
  return data.boxes.total === 0 && data.exports.total === 0 && data.fitcheck.prevented === 0;
}

function StatTiles({ data }: { data: AnalyticsSummary }) {
  const { fitcheck, creationTime } = data;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile label="Hộp đã tạo" value={formatCount(data.boxes.total)} hint={`Trong ${data.days} ngày`} />
      <StatTile
        label="Lỗi FitCheck đã chặn"
        value={formatCount(fitcheck.prevented)}
        hint={`${formatCount(fitcheck.blockedAtExport)} lúc xuất file · ${formatCount(fitcheck.autoFixed)} nhờ Auto-Fix`}
      />
      <StatTile
        label="Thời gian tạo hộp"
        value={creationTime.medianSeconds !== null ? formatDuration(creationTime.medianSeconds) : "–"}
        hint={
          creationTime.medianSeconds !== null && creationTime.meanSeconds !== null
            ? `Trung vị ${formatCount(creationTime.projects)} hộp · trung bình ${formatDuration(creationTime.meanSeconds)}`
            : "Từ lúc tạo tới lần xuất file đầu tiên"
        }
      />
      <StatTile
        label="File in đã xuất"
        value={formatCount(data.exports.total)}
        hint={fitcheck.checked > 0 ? `${formatCount(fitcheck.passed)}/${formatCount(fitcheck.checked)} hộp đạt FitCheck 100` : "Chưa có hộp được FitCheck"}
      />
    </div>
  );
}

/** Columns of boxes per day: one series, so no legend; the hover / arrow-key readout and the table carry the values. */
function BoxesByDayChart({ data }: { data: AnalyticsSummary }) {
  const days = data.boxes.byDay;
  const top = axisTop(Math.max(0, ...days.map((day) => day.count)));
  const [active, setActive] = useState<number | null>(null);
  const readoutId = useId();
  const current = active !== null ? days[active] : null;

  const indexAt = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.min(days.length - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * days.length)));
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : days.length - 1);
    } else if (step) {
      event.preventDefault();
      setActive((index) => Math.min(days.length - 1, Math.max(0, (index ?? days.length - 1) + step)));
    }
  };
  const middle = Math.floor((days.length - 1) / 2);
  // Keep the readout inside the plot near both edges.
  const readoutShift = active === null ? "" : active < days.length * 0.15 ? "translate-x-0" : active > days.length * 0.85 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <div>
      <div className="flex gap-2">
        {/* Value axis: 0, the middle when it is a whole number, the clean top. */}
        <div aria-hidden className="relative h-40 w-6 shrink-0 text-right text-caption tabular-nums text-library-muted">
          <span className="absolute right-0 top-0 -translate-y-1/2">{formatCount(top)}</span>
          {top % 2 === 0 && <span className="absolute right-0 top-1/2 -translate-y-1/2">{formatCount(top / 2)}</span>}
          <span className="absolute bottom-0 right-0 translate-y-1/2">0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            role="group"
            tabIndex={0}
            aria-label={`Hộp tạo theo ngày, ${shortDate(data.from)} đến ${shortDate(data.to)}: tổng ${data.boxes.total}. Dùng phím mũi tên để đọc từng ngày.`}
            aria-describedby={current ? readoutId : undefined}
            onPointerMove={(event) => setActive(indexAt(event))}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((index) => index ?? days.length - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={onKeyDown}
            className="relative h-40 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
          >
            <span aria-hidden className="absolute inset-x-0 top-0 border-t border-library-line" />
            <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-library-line" />
            <div aria-hidden className="absolute inset-0 flex items-end border-b border-library-ink">
              {days.map((day, index) => (
                <div key={day.date} className="flex h-full min-w-0 flex-1 items-end justify-center px-px">
                  {day.count > 0 && (
                    <div
                      className={cn("w-full max-w-6 rounded-t transition-colors", index === active ? "bg-fpt-orange-dark" : "bg-fpt-orange")}
                      style={{ height: `${(day.count / top) * 100}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
            {current && active !== null && (
              <div
                id={readoutId}
                role="status"
                className={cn("pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 shadow-popover", readoutShift)}
                style={{ left: `${((active + 0.5) / days.length) * 100}%` }}
              >
                <span className="text-body-sm font-semibold tabular-nums text-library-ink">{formatCount(current.count)} hộp</span>
                <span className="ml-2 text-caption text-library-sub">{shortDate(current.date)}</span>
              </div>
            )}
          </div>
          <div aria-hidden className="relative mt-2 h-4 text-caption tabular-nums text-library-muted">
            <span className="absolute left-0">{shortDate(days[0].date)}</span>
            {days.length > 7 && (
              <span className="absolute -translate-x-1/2" style={{ left: `${((middle + 0.5) / days.length) * 100}%` }}>
                {shortDate(days[middle].date)}
              </span>
            )}
            <span className="absolute right-0">{shortDate(days[days.length - 1].date)}</span>
          </div>
        </div>
      </div>
      <details className="mt-4 text-body-sm text-library-sub">
        <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-library-ink underline-offset-4 hover:underline">Xem bảng số liệu</summary>
        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Số hộp tạo mỗi ngày</caption>
            <thead>
              <tr className="border-b border-library-line text-caption text-library-muted">
                <th scope="col" className="py-1.5 font-medium">Ngày</th>
                <th scope="col" className="py-1.5 text-right font-medium">Hộp</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => (
                <tr key={day.date} className="border-b border-library-line last:border-0">
                  <td className="py-1.5 tabular-nums">{shortDate(day.date)}</td>
                  <td className="py-1.5 text-right tabular-nums text-library-ink">{formatCount(day.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Horizontal bars with their names and values beside them, so the mix reads without a legend (never a pie). */
function BoxTypeBars({ data }: { data: AnalyticsSummary }) {
  const max = Math.max(1, ...data.boxTypes.map((type) => type.count));
  const total = data.boxes.total;
  return (
    <ul className="flex flex-col gap-3" aria-label="Số hộp theo kiểu hộp">
      {data.boxTypes.map(({ type, count }) => (
        <li key={type} className="grid grid-cols-[minmax(6.5rem,8rem)_minmax(0,1fr)_auto] items-center gap-3">
          <span className="text-body-sm text-library-ink">{BOX_TYPE_LABELS[type]}</span>
          <span aria-hidden className="flex h-3 items-center">
            {count > 0 && <span className="h-full rounded-r bg-fpt-orange" style={{ width: `${(count / max) * 100}%` }} />}
          </span>
          <span className="min-w-[4.5rem] text-right text-body-sm tabular-nums text-library-ink">
            {formatCount(count)}
            <span className="ml-1 text-caption text-library-muted">{total > 0 ? `${Math.round((count / total) * 100)}%` : "0%"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ExportFormats({ data }: { data: AnalyticsSummary }) {
  if (data.exports.byFormat.length === 0) return null;
  return (
    <p className="mt-5 border-t border-library-line pt-3 text-body-sm text-library-sub">
      File in theo định dạng:{" "}
      {data.exports.byFormat.map(({ fileType, count }) => `${FORMAT_LABELS[fileType] ?? fileType} ${formatCount(count)}`).join(" · ")}
    </p>
  );
}

function StatsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span role="status" className="sr-only">
        Đang tải số liệu thiết kế…
      </span>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
