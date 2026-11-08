"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { ROUTES } from "@/constants";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import { buttonClass } from "@/components/ui";

export interface FlowStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepIndex?: number;
  initialStepIndex?: number;
}

interface StepInfo {
  number: string;

  title: string;
  imageSrc: string;
  imageAlt: string;
  targetHref: string;
  ctaLabel: string;
}

const STEPS: StepInfo[] = [
  {
    number: "01",

    title: "Bước 01: Nhập kích thước món quà — Tự động may đo hộp theo milimét",
    imageSrc: "/branding/screen-flow-1.png",
    imageAlt: "Giao diện may đo hộp quà theo kích thước món quà trên WrapFit",
    targetHref: ROUTES.editorNew,
    ctaLabel: "May đo ngay",
  },
  {
    number: "02",

    title: "Bước 02: Studio thiết kế 2D & Mô phỏng gập 3D thời gian thực",
    imageSrc: "/branding/screen-flow-2.png",
    imageAlt: "Giao diện Studio 2D Dieline và 3D Origami WebGL thời gian thực trên WrapFit",
    targetHref: ROUTES.editorDemo,
    ctaLabel: "Vào Studio 3D",
  },
  {
    number: "03",

    title: "Bước 03: FitCheck™ AI — Tự động kiểm duyệt an toàn in ấn",
    imageSrc: "/branding/screen-flow-3.png",
    imageAlt: "Giao diện FitCheck AI kiểm tra an toàn tràn lề, viền chữ và mép dán",
    targetHref: ROUTES.editorDemo,
    ctaLabel: "Thử FitCheck™",
  },
  {
    number: "04",

    title: "Bước 04: Xuất file chuẩn xưởng & Cắt kỹ thuật số từ 1 hộp",
    imageSrc: "/branding/screen-flow-4.png",
    imageAlt: "Giao diện kiểm duyệt chế bản in và xuất file vector đa lớp chuẩn xưởng",
    targetHref: "/editor/demo?dialog=export",
    ctaLabel: "Xuất file in",
  },
];

export function FlowStepModal({
  isOpen,
  onClose,
  stepIndex,
  initialStepIndex = 0,
}: FlowStepModalProps) {
  const [currentStep, setCurrentStep] = useState(stepIndex ?? initialStepIndex);

  useEffect(() => {
    if (stepIndex !== undefined) {
      setCurrentStep(stepIndex);
    }
  }, [stepIndex]);

  const current = STEPS[currentStep] ?? STEPS[0];

  // Priming audio when opening
  useEffect(() => {
    if (isOpen) {
      tactileAudio.playUnboxPop();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        tactileAudio.playSquishyTap();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-fg/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          tactileAudio.playSquishyTap();
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-sheet bg-white border border-line shadow-popover flex flex-col animate-pop-in">
        {/* ================= MODAL HEADER: TITLE & CLOSE BUTTON ================= */}
        <div className="flex items-center justify-between gap-4 border-b border-line/70 px-5 py-3.5 sm:px-7 bg-surface-sunken/40 shrink-0">
          <h3 className="font-landing-heading text-base sm:text-xl font-bold text-landing-ink tracking-tight min-w-0 pr-2">{current.title}</h3>

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              tactileAudio.playSquishyTap();
              onClose();
            }}
            aria-label="Đóng"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white border border-line/70 text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg shadow-2xs"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ================= VISUAL SHOWCASE: CLEAN FULL WEBSITE SCREENSHOT ================= */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-7 flex flex-col justify-center">
          <div className="relative w-full rounded-2xl border border-line/80 bg-surface-sunken/30 shadow-soft-8 overflow-hidden flex items-center justify-center">
            <img
              src={current.imageSrc}
              alt={current.imageAlt}
              className="w-full h-auto max-h-[66vh] object-contain block select-none mx-auto"
              loading="eager"
            />
          </div>
        </div>

        {/* ================= FOOTER: CLOSE & ACTION BUTTONS ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-5 py-3.5 sm:px-7 bg-surface-sunken/40 shrink-0">
          <button
            type="button"
            onClick={() => {
              tactileAudio.playSquishyTap();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line/80 bg-white px-4 py-2 text-xs font-semibold text-fg hover:bg-surface-sunken shadow-2xs transition-colors"
          >
            <span>Đóng lại</span>
          </button>

          {/* Quick step navigation */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((step, idx) => (
              <button
                key={step.number}
                type="button"
                onClick={() => {
                  tactileAudio.playSquishyTap();
                  setCurrentStep(idx);
                }}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-semibold transition-all",
                  currentStep === idx
                    ? "bg-fpt-orange text-white shadow-2xs"
                    : "bg-white border border-line/70 text-fg-muted hover:text-fg hover:bg-surface-sunken"
                )}
                aria-label={`Xem bước ${step.number}`}
              >
                Bước {step.number}
              </button>
            ))}
          </div>

          <Link
            href={current.targetHref}
            onClick={() => {
              tactileAudio.playSquishyTap();
              onClose();
            }}
            className={cn(
              buttonClass({ variant: "brand", size: "md" }),
              "shadow-soft-8 flex items-center justify-center gap-2 font-bold"
            )}
          >
            <span>{current.ctaLabel}</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
