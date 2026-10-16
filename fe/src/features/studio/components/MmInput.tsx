"use client";

import React from "react";
import { NumberStepper } from "@/components/ui";

/**
 * Exact value in mm: typed freely, applied (and kept in range, rounded to the step) on blur or Enter; ↑/↓ change it
 * by one step. The shared NumberStepper without its − / + buttons.
 */
export function MmInput({
  value,
  min,
  max,
  step,
  label,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  return <NumberStepper value={value} min={min} max={max} step={step} label={label} unit="mm" size="sm" buttons={false} onChange={onCommit} className="bg-library-panel" />;
}
