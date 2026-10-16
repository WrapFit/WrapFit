"use client";

import React, { useId } from "react";
import { cn } from "@/utils/helpers";

export interface SliderProps {
  label: string;
  value: number;
  onChange(value: number): void;
  min: number;
  max: number;
  /** 1 for whole mm, 0.01 for a continuous ratio. */
  step?: number;
  /** Formats the value shown right of the label and at both ends: v => `${v} mm`. */
  format?: (value: number) => string;
  /** Labelled stops under the track, e.g. [{ value: 0, label: "Phẳng" }, { value: 100, label: "Đóng" }]. */
  marks?: { value: number; label: string }[];
  /** Hide the label row (the context names it); still read. */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Range slider on the native input (keyboard: arrows, Page Up/Down, Home/End). Styled in globals.css: kraft track,
 * 20 px forest thumb that grows and turns cobalt while dragged, cobalt focus outline. The filled part of the track
 * shows the value.
 */
export function Slider({ label, value, onChange, min, max, step = 1, format = String, marks, hideLabel = false, disabled = false, className }: SliderProps) {
  const id = useId();
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-50", className)}>
      <div className={cn("flex items-baseline justify-between gap-3", hideLabel && "sr-only")}>
        <label htmlFor={id} className="text-label text-fg">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-body-sm font-semibold tabular-nums text-fg">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #1A362B ${percent}%, #E8D8C8 ${percent}%)` }}
      />
      {marks ? (
        <div className="relative h-4 text-caption text-fg-muted" aria-hidden>
          {marks.map((mark) => (
            <span
              key={mark.value}
              className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
              style={{ left: `${((mark.value - min) / (max - min)) * 100}%` }}
            >
              {mark.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex justify-between text-caption text-fg-muted" aria-hidden>
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      )}
    </div>
  );
}
