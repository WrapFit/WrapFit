"use client";

import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from "lucide-react";
import React from "react";
import { outlineButton } from "@/components/library";
import { Badge as UiBadge, cardClass, INPUT_BASE, INPUT_SIZES, Switch, type DataColumn as UiDataColumn } from "@/components/ui";
import { DataTable as UiDataTable } from "@/components/ui";
import { errorMessage } from "@/services/api";
import { cn } from "@/utils/helpers";

// Building blocks of the workspace pages (pacdora.com style, WrapFit greens).

/** White panel with a hairline border: the shared Card, panel variant. */
export function Panel({ className, children, as: Tag = "section", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag className={cardClass({ variant: "panel", padding: "md", className })} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelTitle({ children, action, id }: { children: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-title text-library-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Grey card with the black outline and hard shadow of Pacdora's search card. */
export function HeroPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-squircle-md border-[1.5px] border-library-ink bg-library-tile p-5 shadow-hard sm:p-8", className)}>{children}</section>;
}

/** Number with its label, on a grey tile. */
export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-library-panel px-4 py-3">
      <p className="text-caption text-library-muted">{label}</p>
      <p className="mt-0.5 text-heading-sm font-medium tabular-nums text-library-ink">{value}</p>
      {hint && <p className="mt-0.5 text-caption text-library-sub">{hint}</p>}
    </div>
  );
}

/** Workspace tone names → shared feedback tones (every pair ≥ 4.5:1). */
const BADGE_TONES = {
  green: "success",
  lime: "success",
  amber: "warning",
  red: "danger",
  grey: "neutral",
} as const;

/** Status label of the workspace: the shared Badge with the pacdora 6 px corners. */
export function Badge({ tone = "grey", children, className }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode; className?: string }) {
  return (
    <UiBadge tone={BADGE_TONES[tone]} variant={tone === "lime" ? "solid" : "soft"} className={cn("rounded-md", tone === "lime" && "bg-fpt-orange text-white", className)}>
      {children}
    </UiBadge>
  );
}

/** Row of mutually exclusive buttons (tabs, filters). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  tone = "ink",
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange(value: T): void;
  label: string;
  /** Colour of the chosen option: black ink (default in the workspace) or orange. */
  tone?: "brand" | "ink";
}) {
  // Radio group keyboard: one tab stop, arrows move and select.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((option) => option.value === value);
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-library-ink p-0.5 [scrollbar-width:none]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          data-value={option.value}
          tabIndex={value === option.value ? 0 : -1}
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 shrink-0 whitespace-nowrap rounded-md px-3 text-body-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
            value === option.value ? (tone === "ink" ? "bg-fg text-fg-inverse" : "bg-fpt-orange text-white") : "text-library-ink hover:bg-library-panel"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * On / off switch without a visible label (the row around it names it): the shared Switch. Use `<Switch>` with its
 * label and description for new settings.
 */
export function Toggle({ checked, onChange, label, disabled, tone }: { checked: boolean; onChange(value: boolean): void; label: string; disabled?: boolean; tone?: "brand" | "ink" }) {
  return <Switch checked={checked} onChange={onChange} label={label} hideLabel disabled={disabled} tone={tone} />;
}

/** Field input of the workspace forms: the shared input look (strong border, cobalt focus, red when invalid). */
export const WORKSPACE_INPUT = cn(INPUT_BASE, INPUT_SIZES.md);

/** Thin usage bar. */
export function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-library-panel">
      <div className={cn("h-full rounded-full", percent >= 90 ? "bg-danger" : percent >= 70 ? "bg-warning" : "bg-success")} style={{ width: `${percent}%` }} />
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
      <h2 className="mt-4 text-title font-medium text-library-ink">{title}</h2>
      {description && <p className="mt-1.5 max-w-md text-body-sm leading-[1.6] text-library-sub">{description}</p>}
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
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-2xl border border-danger/25 bg-danger-bg/60 px-6 py-10 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-xl bg-white text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-title font-medium text-library-ink">{title}</h2>
      <p className="mt-1.5 max-w-md text-body-sm leading-[1.6] text-library-sub">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className={cn(outlineButton, "mt-5")}>
          <RotateCw className={cn("size-4", retrying && "animate-spin motion-reduce:animate-none")} aria-hidden />
          {retrying ? "Đang thử lại…" : "Thử lại"}
        </button>
      )}
    </div>
  );
}

/** Column of a workspace table (shared DataTable: sortable headers, phone card layout). */
export type DataColumn<Row> = UiDataColumn<Row>;

/** Plain table with hairline rows; scrolls sideways on small screens unless `mobile="cards"`. */
export const DataTable = UiDataTable;

/** Marks a screen whose figures are examples: there is no API behind it yet (same badge as the marketing pages). */
export { SampleBadge } from "@/components/site/SiteKit";
