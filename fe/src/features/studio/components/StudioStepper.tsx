"use client";

import React from "react";
import { CheckCircle2, Lock } from "lucide-react";

/** 1 structure · 2 size · 3 paper · 4 artwork · 5 3D & gift · 6 FitCheck & export. */
export type StudioStep = 1 | 2 | 3 | 4 | 5 | 6;

export const STUDIO_STEPS: { step: StudioStep; label: string }[] = [
  { step: 1, label: "Cấu trúc" },
  { step: 2, label: "Kích thước" },
  { step: 3, label: "Chất liệu" },
  { step: 4, label: "Thiết kế" },
  { step: 5, label: "Xem 3D" },
  { step: 6, label: "Xuất file" },
];
const STEPS = STUDIO_STEPS;

interface StudioStepperProps {
  current: StudioStep;
  onSelect: (step: StudioStep) => void;
  /** Steps that cannot be opened, with the reason shown on hover. */
  locked?: Partial<Record<StudioStep, string>>;
}

/** The 6 steps of the studio as pack.ly menu pills (labels from `xl`, numbers below). */
export function StudioStepper({ current, onSelect, locked = {} }: StudioStepperProps) {
  return (
    <nav aria-label="Các bước thiết kế" className="flex items-center gap-0.5">
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
            aria-label={`Bước ${s.step}: ${s.label}`}
            onClick={() => onSelect(s.step)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed ${
              isActive
                ? "bg-landing-tile text-landing-ink font-semibold"
                : isPast
                  ? "text-landing-ink hover:bg-landing-canvas disabled:hover:bg-transparent"
                  : "text-landing-muted hover:text-landing-ink hover:bg-landing-canvas disabled:hover:bg-transparent"
            }`}
          >
            {lockReason && !isActive ? (
              <Lock className="w-3.5 h-3.5 text-landing-muted" aria-hidden />
            ) : isPast ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-landing-green" aria-hidden />
            ) : (
              <span
                aria-hidden
                className={`size-5 rounded-full text-[11px] font-semibold flex items-center justify-center ${
                  isActive ? "bg-landing-lime text-landing-green-night" : "bg-landing-tile text-landing-muted"
                }`}
              >
                {s.step}
              </span>
            )}
            <span className={isActive ? "hidden sm:inline" : "hidden 2xl:inline"}>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
