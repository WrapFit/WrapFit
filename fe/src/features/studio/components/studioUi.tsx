"use client";

import type { LucideIcon } from "lucide-react";
import React from "react";
import { buttonClass, Tab, TabList, Tabs } from "@/components/ui";
import { cn } from "@/utils/helpers";

// Building blocks of the studio steps: slate canvas, white cards, bold headings, orange pill actions.

/**
 * A titled panel of a step: a header band (icon chip, title, short hint, an action on the right) over its body.
 * Every setting card of steps 2, 3 and 6 wears it, so the steps read as one tool.
 */
export function SectionCard({
  icon: Icon,
  title,
  hint,
  action,
  tone = "default",
  children,
  className,
  bodyClassName,
  ...rest
}: Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  icon: LucideIcon;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  /** "accent": the card the step is about (orange tint); "default": a supporting one. */
  tone?: "default" | "accent";
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-sheet border border-line bg-surface-raised", className)} {...rest}>
      <header
        className={cn(
          "flex items-center gap-3 border-b px-4 py-3 sm:px-5",
          tone === "accent" ? "border-orange-100 bg-orange-50/70" : "border-line bg-surface-sunken/60",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl",
            tone === "accent" ? "bg-fpt-orange text-white" : "bg-surface-raised text-fpt-orange ring-1 ring-line",
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-landing-heading text-body font-bold text-fg">{title}</h2>
          {hint && <p className="truncate text-caption text-fg-muted">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Flat tool button of the toolbars attached to the 3D stage and the dieline canvas: no fill until hovered, grey when
 * on. Nothing floats over the model; controls live in one bar at its edge.
 */
export const stageBarButton = (on = false) =>
  cn(
    "inline-flex h-7.5 min-w-7.5 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:opacity-40",
    on
      ? "bg-fpt-orange text-white shadow-xs"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
export function StepActionBar({
  back,
  summary,
  next,
  className,
}: {
  back?: React.ReactNode;
  summary?: React.ReactNode;
  next?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sticky bottom-3 z-30 mt-6 sm:mt-8", className)}>
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 px-5 py-3 shadow-sm backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">{back}</div>
        {summary && <div className="hidden min-w-0 text-right text-body-sm text-landing-muted md:block">{summary}</div>}
        {next && <div className="flex flex-wrap items-center justify-end gap-2">{next}</div>}
      </div>
    </div>
  );
}
