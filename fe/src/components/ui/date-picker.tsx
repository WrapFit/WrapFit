"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/helpers";
import { INPUT_BASE, INPUT_SIZES } from "./field-styles";

/**
 * Date picker in Vietnamese conventions: weeks start on Monday, dates typed and shown as DD/MM/YYYY. The text field
 * accepts typing (for people who know the date); the calendar button opens a month grid. `mode="range"` picks a start
 * and an end (both stay editable in the text field as "DD/MM/YYYY – DD/MM/YYYY"). `withTime` adds a time field that
 * belongs to the same value.
 *
 * Calendar keyboard: arrows move by day / week, Page Up/Down by month, Home/End to the start / end of the week,
 * Enter selects, Escape closes. Out-of-range and disabled dates are struck through and skipped.
 */

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEKDAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

const pad = (n: number) => String(n).padStart(2, "0");
export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (a: Date | null | undefined, b: Date | null | undefined) => Boolean(a && b && a.toDateString() === b.toDateString());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const addMonths = (date: Date, months: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), last));
};

/** 15/10/2026 */
export const formatDate = (date: Date | null | undefined) => (date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : "");

/** Reads DD/MM/YYYY (also D/M/YY, dashes or dots). Returns null when it is not a real date. */
export function parseDate(text: string): Date | null {
  const match = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const date = new Date(year, Number(m) - 1, Number(d));
  return date.getDate() === Number(d) && date.getMonth() === Number(m) - 1 ? date : null;
}

/** The 6 × 7 days shown for a month, Monday first. */
function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface CommonProps {
  label: string;
  /** Earliest / latest selectable day. */
  min?: Date;
  max?: Date;
  /** Other unavailable days (holidays, sold-out delivery days). */
  isDateDisabled?: (date: Date) => boolean;
  hint?: string;
  id?: string;
  className?: string;
}

export type DatePickerProps = CommonProps &
  (
    | { mode?: "single"; value: Date | null; onChange(value: Date | null): void; withTime?: boolean }
    | { mode: "range"; value: DateRange; onChange(value: DateRange): void; withTime?: never }
  );

export function DatePicker(props: DatePickerProps) {
  const { label, min, max, isDateDisabled, hint, className } = props;
  const autoId = useId();
  const id = props.id ?? `date-${autoId}`;
  const range = props.mode === "range";
  const single = !range ? (props.value as Date | null) : null;
  const rangeValue = range ? (props.value as DateRange) : null;

  const textOf = () => (range ? (rangeValue!.from ? `${formatDate(rangeValue!.from)}${rangeValue!.to ? ` – ${formatDate(rangeValue!.to)}` : ""}` : "") : formatDate(single));
  const [text, setText] = useState(textOf);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const anchor = (range ? rangeValue!.from : single) ?? startOfDay(new Date());
  const [month, setMonth] = useState(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const [focused, setFocused] = useState<Date>(startOfDay(anchor));
  const [hovered, setHovered] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setText(textOf()), [single?.getTime(), rangeValue?.from?.getTime(), rangeValue?.to?.getTime()]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) gridRef.current?.querySelector<HTMLButtonElement>('[data-focused="true"]')?.focus();
  }, [open, focused]);

  const disabled = (date: Date) =>
    Boolean((min && date < startOfDay(min)) || (max && date > startOfDay(max)) || isDateDisabled?.(date));

  const withTimeOf = (date: Date, from: Date | null) => {
    if (range || !props.withTime || !from) return date;
    const next = new Date(date);
    next.setHours(from.getHours(), from.getMinutes());
    return next;
  };

  const choose = (date: Date) => {
    if (disabled(date)) return;
    setError(null);
    if (!range) {
      (props.onChange as (v: Date | null) => void)(withTimeOf(date, single));
      setOpen(false);
      return;
    }
    const { from, to } = rangeValue!;
    const onChange = props.onChange as (v: DateRange) => void;
    if (!from || to) onChange({ from: date, to: null });
    else if (date < from) onChange({ from: date, to: from });
    else {
      onChange({ from, to: date });
      setOpen(false);
    }
  };

  const commitText = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(null);
      if (range) (props.onChange as (v: DateRange) => void)({ from: null, to: null });
      else (props.onChange as (v: Date | null) => void)(null);
      return;
    }
    if (range) {
      const [a, b] = trimmed.split(/\s*[–-]\s*(?=\d{1,2}[/.])/);
      const from = parseDate(a ?? "");
      const to = b ? parseDate(b) : null;
      if (!from || (b && !to)) return setError("Nhập theo dạng DD/MM/YYYY – DD/MM/YYYY, ví dụ 01/11/2026 – 15/11/2026");
      if (disabled(from) || (to && disabled(to))) return setError("Có ngày nằm ngoài khoảng cho phép.");
      setError(null);
      (props.onChange as (v: DateRange) => void)(to && to < from ? { from: to, to: from } : { from, to });
      return;
    }
    const date = parseDate(trimmed);
    if (!date) return setError("Nhập theo dạng DD/MM/YYYY, ví dụ 15/10/2026");
    if (disabled(date)) return setError("Ngày này không chọn được.");
    setError(null);
    (props.onChange as (v: Date | null) => void)(withTimeOf(date, single));
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const moveFocus = (date: Date) => {
    setFocused(date);
    if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -((focused.getDay() + 6) % 7)),
      End: () => addDays(focused, 6 - ((focused.getDay() + 6) % 7)),
    };
    if (moves[event.key]) {
      event.preventDefault();
      moveFocus(moves[event.key]());
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>("[data-calendar-toggle]")?.focus();
    }
  };

  const days = useMemo(() => monthGrid(month), [month]);
  const monthTitle = `Tháng ${month.getMonth() + 1}, ${month.getFullYear()}`;

  const inRange = (date: Date) => {
    if (!range) return false;
    const { from, to } = rangeValue!;
    const end = to ?? (from && hovered && hovered > from ? hovered : null);
    return Boolean(from && end && date > from && date < end);
  };
  const isSelected = (date: Date) => (range ? sameDay(date, rangeValue!.from) || sameDay(date, rangeValue!.to) : sameDay(date, single));

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label text-fg">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            placeholder={range ? "DD/MM/YYYY – DD/MM/YYYY" : "DD/MM/YYYY"}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={commitText}
            onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), commitText())}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
            className={cn(INPUT_BASE, INPUT_SIZES.md, "pr-12 font-mono tabular-nums")}
          />
          <button
            type="button"
            data-calendar-toggle
            onClick={() => {
              setFocused(startOfDay((range ? rangeValue!.from : single) ?? today));
              setOpen((value) => !value);
            }}
            aria-label={open ? "Đóng lịch" : "Mở lịch chọn ngày"}
            aria-expanded={open}
            aria-haspopup="dialog"
            className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-fg-muted outline-none hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40"
          >
            <CalendarDays className="size-4" aria-hidden />
          </button>
        </div>
        {!range && props.withTime && (
          <input
            type="time"
            aria-label={`${label}: giờ`}
            disabled={!single}
            value={single ? `${pad(single.getHours())}:${pad(single.getMinutes())}` : ""}
            onChange={(event) => {
              if (!single) return;
              const [h, m] = event.target.value.split(":").map(Number);
              const next = new Date(single);
              next.setHours(h || 0, m || 0);
              (props.onChange as (v: Date | null) => void)(next);
            }}
            className={cn(INPUT_BASE, INPUT_SIZES.md, "w-32 shrink-0 font-mono")}
          />
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption font-medium text-danger-fg">
          {error}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={`Chọn ngày: ${label}`}
          className="absolute left-0 top-full z-50 mt-2 w-[19.5rem] max-w-[calc(100vw-2rem)] animate-pop-in rounded-panel border border-line bg-surface-raised p-3 shadow-popover"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="Tháng trước" className="flex size-9 items-center justify-center rounded-full outline-none hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-focus/40">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p className="text-label font-semibold text-fg" aria-live="polite">
              {monthTitle}
            </p>
            <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Tháng sau" className="flex size-9 items-center justify-center rounded-full outline-none hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-focus/40">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div ref={gridRef} role="grid" aria-label={monthTitle} onKeyDown={onGridKeyDown} className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day, i) => (
              <span key={day} role="columnheader" aria-label={WEEKDAY_NAMES[i]} className="flex h-8 items-center justify-center text-label-sm text-fg-muted">
                {day}
              </span>
            ))}
            {days.map((date) => {
              const outside = date.getMonth() !== month.getMonth();
              const off = disabled(date);
              const selected = isSelected(date);
              const between = inRange(date);
              const isToday = sameDay(date, today);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  role="gridcell"
                  tabIndex={sameDay(date, focused) ? 0 : -1}
                  data-focused={sameDay(date, focused)}
                  aria-selected={selected}
                  aria-disabled={off || undefined}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${WEEKDAY_NAMES[(date.getDay() + 6) % 7]}, ${formatDate(date)}${off ? ", không chọn được" : ""}`}
                  onClick={() => choose(date)}
                  onMouseEnter={() => setHovered(date)}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-lg font-mono text-body-sm tabular-nums outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/50",
                    outside ? "text-fg-muted/60" : "text-fg",
                    !off && !selected && "hover:bg-surface-sunken",
                    between && "rounded-none bg-accent-bg",
                    selected && "bg-accent font-semibold text-accent-contrast",
                    off && "cursor-not-allowed text-fg-muted/40 line-through",
                    isToday && !selected && "font-semibold ring-1 ring-inset ring-fg/30",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              disabled={disabled(today)}
              onClick={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                choose(today);
              }}
              className="rounded-lg px-2.5 py-1.5 text-label font-semibold text-accent-fg outline-none hover:bg-accent-bg focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:opacity-40"
            >
              Hôm nay
            </button>
            {(range ? rangeValue!.from : single) && (
              <button
                type="button"
                onClick={() => {
                  if (range) (props.onChange as (v: DateRange) => void)({ from: null, to: null });
                  else (props.onChange as (v: Date | null) => void)(null);
                }}
                className="rounded-lg px-2.5 py-1.5 text-label text-fg-muted outline-none hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40"
              >
                Xoá
              </button>
            )}
          </div>
          {range && <p className="mt-1 px-1 text-caption text-fg-muted">{rangeValue!.from && !rangeValue!.to ? "Chọn ngày kết thúc" : "Chọn ngày bắt đầu"}</p>}
        </div>
      )}
    </div>
  );
}
