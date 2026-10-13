"use client";

import React from "react";
import { CheckCircle2, Lock } from "lucide-react";

export type StudioStep = 1 | 2 | 3 | 4;

const STEPS: { step: StudioStep; label: string }[] = [
  { step: 1, label: "1. Cấu trúc" },
  { step: 2, label: "2. Kích thước" },
  { step: 3, label: "3. Thiết kế 2D" },
  { step: 4, label: "4. Xem 3D" },
];

interface StudioStepperProps {
  current: StudioStep;
  onSelect: (step: StudioStep) => void;
  /** Steps that cannot be opened, with the reason shown on hover. */
  locked?: Partial<Record<StudioStep, string>>;
}

/** The 4 steps of the studio as a segmented pill (labels from `xl`, numbers below). */
export function StudioStepper({ current, onSelect, locked = {} }: StudioStepperProps) {
  return (
    <nav aria-label="Các bước thiết kế" className="flex items-center gap-1 rounded-lg border border-library-ink bg-white p-0.5">
      {STEPS.map((s) => {
        const isActive = current === s.step;
        const isPast = current > s.step;
        const lockReason = locked[s.step];

        return (
          <button
            key={s.step}
            type="button"
            disabled={!!lockReason}
            title={lockReason}
            aria-current={isActive ? "step" : undefined}
            aria-label={s.label}
            onClick={() => onSelect(s.step)}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed ${
              isActive
                ? "bg-library-lime-ink text-white font-medium"
                : isPast
                  ? "text-library-ink hover:bg-library-panel disabled:hover:bg-transparent"
                  : "text-library-sub hover:text-library-ink hover:bg-library-panel disabled:text-library-muted disabled:hover:bg-transparent"
            }`}
          >
            {lockReason && !isActive ? (
              <Lock className="w-3.5 h-3.5 text-stone-400" aria-hidden />
            ) : isPast ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-library-accent" aria-hidden />
            ) : (
              <span
                aria-hidden
                className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono ${
                  isActive ? "bg-library-lime text-library-lime-ink" : "bg-library-tile text-library-ink"
                }`}
              >
                {s.step}
              </span>
            )}
            <span className="hidden xl:inline">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
