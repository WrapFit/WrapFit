"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { ROUTES } from "@/constants";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import { buttonClass } from "@/components/ui";
import { FlowStepClip } from "./FlowStepClip";

export interface FlowStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepIndex?: number;
  initialStepIndex?: number;
}

export interface FlowStep {
  number: string;
  /** Name of the step, as in the step bar of the studio. */
  name: string;
  title: string;
  /** Clip of this step cut from the studio demo video: `${clip}.mp4`, with `${clip}.webp` as its still on the home card. */
  clip: string;
  imageAlt: string;
  targetHref: string;
  ctaLabel: string;
}

/** The six steps of the studio, in its order; each clip is that step in the studio demo video. */
export const FLOW_STEPS: FlowStep[] = [
  {
    number: "01",
    name: "Chọn kiểu hộp",
    title: "Bước 01: Chọn kiểu hộp, xem trước dạng 3D và khuôn bế",
    clip: "/videos/flow/step-1",
    imageAlt: "Bước Kiểu hộp của Studio WrapFit: lưới các kiểu hộp và khung xem trước 3D",
    targetHref: `${ROUTES.editorDemo}?step=1`,
    ctaLabel: "Chọn kiểu hộp",
  },
  {
    number: "02",
    name: "Nhập kích thước",
    title: "Bước 02: Nhập kích thước món quà, hộp tự may đo theo milimét",
    clip: "/videos/flow/step-2",
    imageAlt: "Bước Kích thước của Studio WrapFit: thanh trượt dài, rộng, cao và hộp 3D có đường kích thước",
    targetHref: `${ROUTES.editorDemo}?step=2`,
    ctaLabel: "Nhập kích thước",
  },
  {
    number: "03",
    name: "Chọn giấy",
    title: "Bước 03: Chọn giấy, cán màng và gia công",
    clip: "/videos/flow/step-3",
    imageAlt: "Bước Giấy của Studio WrapFit: hộp 3D và bảng chọn loại giấy, độ dày, cán màng",
    targetHref: `${ROUTES.editorDemo}?step=3`,
    ctaLabel: "Chọn giấy",
  },
  {
    number: "04",
    name: "Thiết kế",
    title: "Bước 04: Thiết kế trên khuôn bế 2D, xem hộp gập 3D",
    clip: "/videos/flow/step-4",
    imageAlt: "Bước Thiết kế của Studio WrapFit: thư viện mẫu bên trái, khuôn bế 2D đã áp mẫu ở giữa",
    targetHref: `${ROUTES.editorDemo}?step=4`,
    ctaLabel: "Mở Studio",
  },
  {
    number: "05",
    name: "Quà & mở hộp",
    title: "Bước 05: Bối cảnh 3D, lời chúc và mã QR mở hộp",
    clip: "/videos/flow/step-5",
    imageAlt: "Bước Quà & mở hộp của Studio WrapFit: hộp 3D trên bàn và nút tạo lời chúc, mã QR",
    targetHref: `${ROUTES.editorDemo}?step=5`,
    ctaLabel: "Tạo lời chúc",
  },
  {
    number: "06",
    name: "Đặt in",
    title: "Bước 06: FitCheck™, báo giá, đặt in và xuất file in",
    clip: "/videos/flow/step-6",
    imageAlt: "Bước Đặt in của Studio WrapFit: khuôn bế 1:1, FitCheck và báo giá in theo số lượng",
    targetHref: `${ROUTES.editorDemo}?step=6`,
    ctaLabel: "Xem báo giá",
  },
];

const STEPS = FLOW_STEPS;

export function FlowStepModal({
  isOpen,
  onClose,
  stepIndex,
  initialStepIndex = 0,
}: FlowStepModalProps) {
  const activeStep = stepIndex ?? initialStepIndex;
  const current = STEPS[activeStep] ?? STEPS[0];

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
        {/* ================= MODAL HEADER: DEDICATED STEP ONLY ================= */}
        {/* Close only: the step title below already says which step this is (no "BƯỚC 0x" tag). */}
        <div className="flex items-center justify-end border-b border-line/70 px-5 py-3.5 sm:px-7 bg-surface-sunken/40 shrink-0">

          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              tactileAudio.playSquishyTap();
              onClose();
            }}
            aria-label="Đóng"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white border border-line/70 text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg shadow-2xs ml-3"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ================= STEP TITLE ================= */}
        <div className="px-5 pt-4 pb-2.5 sm:px-7 shrink-0">
          <h3 className="font-landing-heading text-lg sm:text-2xl font-bold text-landing-ink tracking-tight">
            {current.title}
          </h3>
        </div>

        {/* ================= VISUAL SHOWCASE: CLIP OF THE STEP FROM THE STUDIO DEMO ================= */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-7 flex flex-col justify-center">
          <div className="relative w-full rounded-2xl border border-line/80 bg-surface-sunken/30 shadow-soft-8 overflow-hidden flex items-center justify-center">
            <FlowStepClip
              key={current.clip}
              clip={current.clip}
              label={current.imageAlt}
              className="mx-auto aspect-video h-auto max-h-[66vh] w-full object-contain"
            />
          </div>
        </div>

        {/* ================= FOOTER: CLOSE & ACTION BUTTONS ================= */}
        <div className="flex items-center justify-between gap-3 border-t border-line/70 px-5 py-3.5 sm:px-7 bg-surface-sunken/40 shrink-0">
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
