"use client";

import type { LucideIcon } from "lucide-react";
import React from "react";
import { cn } from "@/utils/helpers";

// Building blocks of the four studio steps, in the pack.ly style: slate canvas, white 28 px cards, bold headings,
// lime pill actions.

/** Eyebrow, big bold title and a muted line, as on pack.ly's tool pages. */
export function StepHeader({ step, title, subtitle, actions }: { step: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-landing-green">{step}</p>
        <h1 className="mt-1 font-landing-heading text-3xl font-bold tracking-tight text-landing-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-base leading-7 text-landing-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StudioCard({ className, children, as: Tag = "section", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "aside" }) {
  return (
    <Tag className={cn("rounded-[28px] bg-white", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardTitle({ children, action, id }: { children: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="font-landing-heading text-lg font-bold text-landing-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Pill switch between views (3D / 2D, tabs). */
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
    <div role="tablist" aria-label={label} className={cn("inline-flex rounded-full bg-landing-tile p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm transition-colors",
              active ? "bg-white font-semibold text-landing-ink shadow-sm" : "text-landing-muted hover:text-landing-ink",
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** One figure of a structure or a box: icon tile, label, value. */
export function MetricRow({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-landing-canvas p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-landing-green">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-landing-muted">{label}</span>
        <span className="block truncate font-landing-heading text-base font-bold text-landing-ink">{value}</span>
      </span>
      {hint && <span className="shrink-0 text-xs text-landing-muted">{hint}</span>}
    </div>
  );
}

/** Lime main action. */
export const PRIMARY_PILL =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-landing-lime px-6 text-base font-semibold text-landing-green-night transition-colors hover:bg-[#AFEC88] disabled:cursor-not-allowed disabled:opacity-60";
/** White secondary action. */
export const SECONDARY_PILL =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-landing-ink transition-colors hover:bg-landing-tile";

/** Bar at the bottom of a step: back on the left, the current spec, the next step on the right. */
export function StepActionBar({ back, summary, next }: { back?: React.ReactNode; summary?: React.ReactNode; next: React.ReactNode }) {
  return (
    <div className="sticky bottom-24 z-30 mt-6 md:bottom-4">
      <div className="flex flex-col items-stretch gap-3 rounded-[28px] bg-white/95 p-3 shadow-soft-16 ring-1 ring-landing-line/60 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:pl-4">
        <div className="flex items-center gap-3">{back}</div>
        {summary && <div className="hidden min-w-0 text-right text-sm text-landing-muted md:block">{summary}</div>}
        <div className="flex flex-wrap items-center justify-end gap-2">{next}</div>
      </div>
    </div>
  );
}
