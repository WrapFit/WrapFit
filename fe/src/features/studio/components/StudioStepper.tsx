"use client";

import React from "react";
import { Check, Lock } from "lucide-react";

/** 1 structure · 2 size · 3 paper · 4 artwork · 5 3D & gift · 6 FitCheck & export. */
export type StudioStep = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The one list of step names: the stepper, the page titles and the "next" buttons all read it, so a step is called the
 * same everywhere. `label` is the short name in the stepper, `title` the heading of the step's page.
 */
export const STUDIO_STEPS: { step: StudioStep; label: string; title: string }[] = [
  { step: 1, label: "Kiểu hộp", title: "Chọn kiểu hộp" },
  { step: 2, label: "Kích thước", title: "Kích thước hộp" },
  { step: 3, label: "Giấy & hoàn thiện", title: "Giấy & hoàn thiện" },
  { step: 4, label: "Thiết kế", title: "Thiết kế" },
  { step: 5, label: "Quà & mở hộp", title: "Quà & mở hộp" },
  { step: 6, label: "Đặt in", title: "Kiểm tra & đặt in" },
];

export const studioStep = (step: StudioStep) => STUDIO_STEPS[step - 1];

/** "Tiếp tục: kích thước": the label of a "next" button that opens `step`. */
export const continueTo = (step: StudioStep) => {
  const { label } = studioStep(step);
  return `Tiếp tục: ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
};

interface StudioStepperProps {
  current: StudioStep;
  onSelect: (step: StudioStep) => void;
  /** Steps that cannot be opened, with the reason shown on hover. */
  locked?: Partial<Record<StudioStep, string>>;
}

/**
 * The 6 steps as pills joined by a progress line. Every label shows from `xl`; below it only the open step keeps its
 * label (from `md`) and the others show their number or a tick.
 */
export function StudioStepper({ current, onSelect, locked = {} }: StudioStepperProps) {
  return (
    <nav aria-label="Các bước thiết kế" className="min-w-0 overflow-x-auto [scrollbar-width:none]">
      <ol className="flex items-center">
        {STUDIO_STEPS.map((s, index) => {
          const isActive = current === s.step;
          const isPast = current > s.step;
          const lockReason = locked[s.step];

          return (
            <li key={s.step} className="flex shrink-0 items-center">
              {index > 0 && (
                <span aria-hidden className={`mx-0.5 h-px w-2 xl:w-3 ${current >= s.step ? "bg-fpt-orange/60" : "bg-landing-line"}`} />
              )}
              <button
                type="button"
                disabled={!!lockReason}
                title={lockReason ?? `Bước ${s.step}: ${s.label}`}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Bước ${s.step}: ${s.label}${isPast ? " (đã qua)" : ""}${lockReason ? ` (${lockReason})` : ""}`}
                onClick={() => onSelect(s.step)}
                className={`flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:cursor-not-allowed xl:px-2.5 ${
                  isActive
                    ? "bg-landing-tile font-semibold text-landing-ink"
                    : isPast
                      ? "text-landing-ink hover:bg-landing-canvas disabled:hover:bg-transparent"
                      : "text-landing-muted hover:bg-landing-canvas hover:text-landing-ink disabled:hover:bg-transparent"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-caption font-semibold ${
                    isActive
                      ? "bg-fpt-orange text-white"
                      : isPast
                        ? "bg-orange-100 text-fpt-orange-ink"
                        : "bg-landing-tile text-landing-muted"
                  }`}
                >
                  {lockReason && !isActive ? (
                    <Lock className="size-3" />
                  ) : isPast ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : (
                    s.step
                  )}
                </span>
                <span className={isActive ? "hidden md:inline" : "hidden xl:inline"}>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
