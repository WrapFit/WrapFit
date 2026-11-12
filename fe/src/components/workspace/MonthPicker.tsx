"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/helpers";

const MONTHS = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];

/** "YYYY-MM" ⇄ year and month (1–12). */
const parse = (value: string) => {
  const [y, m] = value.split("-").map(Number);
  return { year: y, month: m };
};
const format = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
const shift = (value: string, by: number) => {
  const { year, month } = parse(value);
  const index = year * 12 + (month - 1) + by;
  return format(Math.floor(index / 12), (index % 12) + 1);
};

interface MonthPickerProps {
  /** "YYYY-MM". */
  value: string;
  onChange(value: string): void;
  /** Latest month that can be picked ("YYYY-MM"), e.g. this month. */
  max?: string;
  label?: string;
}

/**
 * Month picker of the admin console, in place of the browser's `<input type="month">`: ‹ month › arrows for the
 * neighbouring months, and a popover with the year and a grid of the 12 months (Vietnamese, future months disabled).
 */
export function MonthPicker({ value, onChange, max, label = "Tháng báo cáo" }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const { year, month } = parse(value);
  const [viewYear, setViewYear] = useState(year);
  const rootRef = useRef<HTMLDivElement>(null);
  const maxParts = max ? parse(max) : null;
  const after = (y: number, m: number) => !!maxParts && (y > maxParts.year || (y === maxParts.year && m > maxParts.month));
  const nextDisabled = !!max && shift(value, 1) > max;

  useEffect(() => setViewYear(year), [year, open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (m: number) => {
    onChange(format(viewYear, m));
    setOpen(false);
  };

  const arrow = "flex size-9 items-center justify-center rounded-full text-fg-muted outline-none transition-colors hover:bg-landing-canvas hover:text-landing-ink focus-visible:ring-[3px] focus-visible:ring-focus/50 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-0.5 rounded-full bg-white p-1 shadow-xs ring-1 ring-line/70">
        <button type="button" className={arrow} aria-label="Tháng trước" onClick={() => onChange(shift(value, -1))}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${label}: tháng ${month} năm ${year}`}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-9 min-w-[150px] items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold tabular-nums text-landing-ink outline-none transition-colors hover:bg-landing-canvas focus-visible:ring-[3px] focus-visible:ring-focus/50",
            open && "bg-fpt-orange-light text-accent"
          )}
        >
          <CalendarDays className="size-4 text-fpt-orange" aria-hidden />
          Tháng {month}, {year}
        </button>
        <button type="button" className={arrow} aria-label="Tháng sau" disabled={nextDisabled} onClick={() => onChange(shift(value, 1))}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Chọn tháng"
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl bg-white p-3 shadow-[0_16px_40px_-12px_rgba(29,41,61,0.28)] ring-1 ring-line/70 animate-fadeIn"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className={arrow} aria-label="Năm trước" onClick={() => setViewYear((y) => y - 1)}>
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="font-landing-heading text-sm font-bold tabular-nums text-landing-ink">{viewYear}</span>
            <button type="button" className={arrow} aria-label="Năm sau" disabled={!!maxParts && viewYear >= maxParts.year} onClick={() => setViewYear((y) => y + 1)}>
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((name, index) => {
              const m = index + 1;
              const selected = viewYear === year && m === month;
              const current = !!maxParts && viewYear === maxParts.year && m === maxParts.month;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={after(viewYear, m)}
                  aria-pressed={selected}
                  onClick={() => pick(m)}
                  className={cn(
                    "relative h-10 rounded-xl text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/50 disabled:pointer-events-none disabled:text-fg-muted/40",
                    selected ? "bg-fpt-orange font-semibold text-white shadow-xs" : "text-landing-ink hover:bg-fpt-orange-light hover:text-accent"
                  )}
                >
                  {name}
                  {current && !selected && <span aria-hidden className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-fpt-orange" />}
                </button>
              );
            })}
          </div>
          {max && (
            <div className="mt-3 flex justify-end border-t border-line/60 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  onChange(max);
                  setOpen(false);
                }}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-accent hover:bg-fpt-orange-light"
              >
                Tháng này
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
