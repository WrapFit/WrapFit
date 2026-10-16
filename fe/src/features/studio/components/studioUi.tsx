"use client";

import type { LucideIcon } from "lucide-react";
import React from "react";
import { buttonClass, Tab, TabList, Tabs } from "@/components/ui";
import { cn } from "@/utils/helpers";

// Building blocks of the four studio steps, in the pack.ly style: slate canvas, white 28 px cards, bold headings,
// lime pill actions.

/**
 * Flat tool button of the toolbars attached to the 3D stage and the dieline canvas: no fill until hovered, grey when
 * on. Nothing floats over the model; controls live in one bar at its edge.
 */
export const stageBarButton = (on = false) =>
  cn(
    "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-label-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:opacity-40",
    on ? "bg-surface-sunken text-fg" : "text-fg-muted hover:bg-surface-sunken/70 hover:text-fg",
  );

/** Eyebrow, big bold title and a muted line, as on pack.ly's tool pages. */
export function StepHeader({ step, title, subtitle, actions }: { step?: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {step && <p className="text-label font-semibold text-success-fg">{step}</p>}
        <h1 className="mt-1 font-landing-heading text-heading-lg text-fg">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-body text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StudioCard({ className, children, as: Tag = "section", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "aside" }) {
  return (
    <Tag className={cn("rounded-sheet bg-surface-raised", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardTitle({ children, action, id }: { children: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="font-landing-heading text-title font-bold text-fg">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Pill switch between views (3D / 2D, tabs): the shared Tabs (arrow keys, roving focus), pill variant. */
export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: LucideIcon }[];
  onChange(value: T): void;
  label: string;
  className?: string;
}) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabList label={label}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Tab key={option.value} value={option.value} icon={Icon ? <Icon aria-hidden /> : undefined}>
              {option.label}
            </Tab>
          );
        })}
      </TabList>
    </Tabs>
  );
}

/** One figure of a structure or a box: icon tile, label, value. */
export function MetricRow({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-landing-canvas p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-fpt-orange">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption text-landing-muted">{label}</span>
        <span className="block truncate font-landing-heading text-body font-bold text-landing-ink">{value}</span>
      </span>
      {hint && <span className="shrink-0 text-caption text-landing-muted">{hint}</span>}
    </div>
  );
}

/** Orange main action (shared Button, xl). */
export const PRIMARY_PILL = buttonClass({ variant: "brand", size: "xl" });
/** White secondary action (shared Button, xl). */
export const SECONDARY_PILL = buttonClass({ variant: "secondary", size: "xl", className: "ring-0 font-medium" });

/** Bar at the bottom of a step: back on the left, the current spec, the next step on the right. */
export function StepActionBar({ back, summary, next }: { back?: React.ReactNode; summary?: React.ReactNode; next: React.ReactNode }) {
  return (
    <div className="sticky bottom-24 z-30 mt-6 md:bottom-4">
      <div className="flex flex-col items-stretch gap-3 rounded-sheet bg-white/95 p-3 shadow-soft-16 ring-1 ring-landing-line/60 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:pl-4">
        <div className="flex items-center gap-3">{back}</div>
        {summary && <div className="hidden min-w-0 text-right text-body-sm text-landing-muted md:block">{summary}</div>}
        <div className="flex flex-wrap items-center justify-end gap-2">{next}</div>
      </div>
    </div>
  );
}
