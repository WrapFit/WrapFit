"use client";

import { Minus, Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "@/utils/helpers";

export interface NumberStepperProps {
  value: number;
  onChange(value: number): void;
  min: number;
  max: number;
  /** Change per button press and per ↑/↓ key (Shift ×10). */
  step?: number;
  /** Names the value: "Chiều dài". Read with the unit. */
  label: string;
  /** Shown after the number: "mm", "hộp". */
  unit?: string;
  /** sm 32 px buttons (cards, tables), md 36 px, lg 44 px with a large number (studio). */
  size?: "sm" | "md" | "lg";
  /** Hide the − / + buttons: a plain exact-value field. */
  buttons?: boolean;
  disabled?: boolean;
  className?: string;
}

const SIZE = {
  sm: { button: "size-8", input: "w-12 text-body-sm", gap: "gap-0.5" },
  md: { button: "size-9", input: "w-14 text-body", gap: "gap-1" },
  lg: { button: "size-11", input: "w-16 text-heading-sm", gap: "gap-1" },
} as const;

const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

/**
 * Number with − / + buttons and direct typing. The value is checked when typing ends (blur or Enter): a comma works
 * as a decimal point, anything that is not a number brings the previous value back, and the result is kept between
 * min and max and rounded to the step. The button at a bound is disabled. ↑/↓ change by one step, Shift by ten.
 */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  size = "md",
  buttons = true,
  disabled = false,
  className,
}: NumberStepperProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const clamp = (next: number) => {
    const rounded = Number((Math.round((next - min) / step) * step + min).toFixed(decimals(step)));
    return Math.min(max, Math.max(min, rounded));
  };
  const set = (next: number) => {
    const clamped = clamp(next);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };
  const commit = () => {
    const parsed = Number(draft.replace(",", ".").trim());
    if (draft.trim() === "" || !Number.isFinite(parsed)) setDraft(String(value));
    else set(parsed);
  };

  const s = SIZE[size];
  const buttonClass = cn(
    "flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-fg outline-none transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-40",
    s.button,
  );

  return (
    <div className={cn("inline-flex items-center rounded-full bg-surface-sunken p-1", s.gap, disabled && "opacity-50", className)}>
      {buttons && (
        <button type="button" className={buttonClass} disabled={disabled || value <= min} onClick={() => set(value - step)} aria-label={`Giảm ${label.toLowerCase()} ${step}${unit ? ` ${unit}` : ""}`}>
          <Minus className="size-4" aria-hidden />
        </button>
      )}
      <label className="flex items-baseline gap-1 px-1.5">
        <input
          type="text"
          inputMode="decimal"
          role="spinbutton"
          aria-label={unit ? `${label} (${unit})` : label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          disabled={disabled}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const delta = (event.key === "ArrowUp" ? 1 : -1) * step * (event.shiftKey ? 10 : 1);
              set(value + delta);
            } else if (event.key === "Home") {
              event.preventDefault();
              set(min);
            } else if (event.key === "End") {
              event.preventDefault();
              set(max);
            }
          }}
          className={cn("bg-transparent text-right font-mono font-semibold tabular-nums text-fg outline-none focus-visible:underline focus-visible:decoration-focus focus-visible:decoration-2 focus-visible:underline-offset-4", s.input)}
        />
        {unit && <span className="text-caption text-fg-muted">{unit}</span>}
      </label>
      {buttons && (
        <button type="button" className={buttonClass} disabled={disabled || value >= max} onClick={() => set(value + step)} aria-label={`Tăng ${label.toLowerCase()} ${step}${unit ? ` ${unit}` : ""}`}>
          <Plus className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
