"use client";

import React from "react";
import { CheckCircle2, Lock } from "lucide-react";

/** 1 structure · 2 size · 3 paper · 4 artwork · 5 3D & gift · 6 FitCheck & export. */
export type StudioStep = 1 | 2 | 3 | 4 | 5 | 6;

export const STUDIO_STEPS: { step: StudioStep; label: string }[] = [
  { step: 1, label: "Khởi đầu" },
  { step: 2, label: "Kích thước" },
  { step: 3, label: "Giấy & hoàn thiện" },
  { step: 4, label: "Thiết kế" },
  { step: 5, label: "Quà & mở hộp" },
  { step: 6, label: "Đặt in" },
];
const STEPS = STUDIO_STEPS;

interface StudioStepperProps {
  current: StudioStep;
  onSelect: (step: StudioStep) => void;
  /** Steps that cannot be opened, with the reason shown on hover. */
  locked?: Partial<Record<StudioStep, string>>;
}

/** The 6 steps of the studio as pack.ly menu pills (current label from `lg`, all labels from `2xl`, numbers below). */
export function StudioStepper({ current, onSelect, locked = {} }: StudioStepperProps) {
  return (
    <nav aria-label="Các bước thiết kế" className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
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
            className={`min-h-[36px] shrink-0 px-2 lg:px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed ${
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
              <CheckCircle2 className="w-3.5 h-3.5 text-fpt-orange" aria-hidden />
            ) : (
              <span
                aria-hidden
                className={`size-5 rounded-full text-caption font-semibold flex items-center justify-center ${
                  isActive ? "bg-fpt-orange text-white" : "bg-landing-tile text-landing-muted"
                }`}
              >
                {s.step}
              </span>
            )}
            <span className={isActive ? "hidden lg:inline" : "hidden 2xl:inline"}>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
