"use client";

import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from "lucide-react";
import React from "react";
import { outlineButton } from "@/components/library";
import { ApiError, errorMessage } from "@/services/api";
import { cn } from "@/utils/helpers";

// Building blocks of the workspace pages (pacdora.com style, WrapFit greens).

/** White panel with a hairline border. */
export function Panel({ className, children, as: Tag = "section", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag className={cn("rounded-2xl border border-library-line bg-white p-5 sm:p-6", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelTitle({ children, action, id }: { children: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-lg font-medium text-library-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Grey card with the black outline and hard shadow of Pacdora's search card. */
export function HeroPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-[20px] border-[1.5px] border-library-ink bg-library-tile p-5 shadow-hard sm:p-8", className)}>{children}</section>;
}

/** Number with its label, on a grey tile. */
export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-library-panel px-4 py-3">
      <p className="text-xs text-library-muted">{label}</p>
      <p className="mt-0.5 text-xl font-medium text-library-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-library-sub">{hint}</p>}
    </div>
  );
}

const BADGE_TONES = {
  green: "bg-library-accent-mist text-library-accent",
  lime: "bg-library-lime text-library-lime-ink",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  grey: "bg-library-panel text-library-sub",
} as const;

export function Badge({ tone = "grey", children, className }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium", BADGE_TONES[tone], className)}>{children}</span>;
}

/** Row of mutually exclusive buttons (tabs, filters). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange(value: T): void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-library-ink p-0.5 [scrollbar-width:none]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 shrink-0 whitespace-nowrap rounded-md px-3 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20",
            value === option.value ? "bg-library-lime-ink text-white" : "text-library-ink hover:bg-library-panel"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** On / off switch. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange(value: boolean): void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-accent/30",
        checked ? "bg-library-accent" : "bg-library-line"
      )}
    >
      <span className={cn("size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

/** Field input of the workspace forms. */
export const WORKSPACE_INPUT =
  "h-11 w-full rounded-lg border border-library-line bg-white px-3 text-sm text-library-ink outline-none transition-shadow placeholder:text-library-muted focus:border-library-accent focus:ring-[3px] focus:ring-library-accent/20 disabled:bg-library-panel aria-[invalid=true]:border-red-400";

/** Thin usage bar. */
export function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-library-panel">
      <div className={cn("h-full rounded-full", percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-library-accent")} style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Nothing to list yet: a dashed grey box with what to do next. */
export function WorkspaceEmpty({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-library-line bg-library-panel px-6 py-12 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-xl border border-library-ink bg-white text-library-ink">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-medium text-library-ink">{title}</h2>
      {description && <p className="mt-1.5 max-w-md text-sm leading-[1.6] text-library-sub">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

/** A section that could not load: the API's message, its request id and a retry. */
export function WorkspaceError({
  error,
  title = "Không tải được dữ liệu",
  onRetry,
  retrying = false,
  className,
}: {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-10 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-xl bg-white text-red-600">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-medium text-library-ink">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-[1.6] text-library-sub">{errorMessage(error)}</p>
      {requestId && <p className="mt-2 break-all font-mono text-[11px] text-library-muted">Mã lỗi · {requestId}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className={cn(outlineButton, "mt-5")}>
          <RotateCw className={cn("size-4", retrying && "animate-spin motion-reduce:animate-none")} aria-hidden />
          {retrying ? "Đang thử lại…" : "Thử lại"}
        </button>
      )}
    </div>
  );
}

export interface DataColumn<Row> {
  key: string;
  label: string;
  align?: "left" | "right";
  render(row: Row): React.ReactNode;
}

/** Plain table with hairline rows; scrolls sideways on small screens. */
export function DataTable<Row>({ columns, rows, rowKey, label }: { columns: DataColumn<Row>[]; rows: Row[]; rowKey(row: Row): string; label: string }) {
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-library-line text-library-muted">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn("px-3 py-2.5 font-normal first:pl-0 last:pr-0", column.align === "right" && "text-right")}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-library-line">
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={cn("px-3 py-3 text-library-ink first:pl-0 last:pr-0", column.align === "right" && "text-right")}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Marks a screen whose figures are examples: there is no API behind it yet. */
export function SampleBadge() {
  return (
    <span title="Chưa có API: số liệu trên trang này là ví dụ" className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-2.5 text-xs font-medium text-amber-800">
      Dữ liệu mẫu
    </span>
  );
}
