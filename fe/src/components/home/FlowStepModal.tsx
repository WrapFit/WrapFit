"use client";

import React, { useEffect } from "react";
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
  badgeLabel: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  targetHref: string;
  ctaLabel: string;
}

const STEPS: StepInfo[] = [
  {
    number: "01",
    badgeLabel: "BƯỚC 01 · ĐO KÍCH THƯỚC QUÀ",
    title: "Bước 01: Nhập kích thước món quà, hộp tự may đo theo milimét",
    imageSrc: "/branding/screen-flow-1.png",
    imageAlt: "Bước Kích thước của Studio WrapFit: nhập dài, rộng, cao món quà, hộp 3D đổi theo",
    targetHref: `${ROUTES.editorDemo}?step=2`,
    ctaLabel: "Nhập kích thước",
  },
  {
    number: "02",
    badgeLabel: "BƯỚC 02 · THIẾT KẾ & GẬP 3D",
    title: "Bước 02: Thiết kế trên khuôn bế 2D, xem hộp gập 3D",
    imageSrc: "/branding/screen-flow-2.png",
    imageAlt: "Bước Thiết kế của Studio WrapFit: thanh công cụ bên trái, khuôn bế 2D ở giữa",
    targetHref: `${ROUTES.editorDemo}?step=4`,
    ctaLabel: "Mở Studio",
  },
  {
    number: "03",
    badgeLabel: "BƯỚC 03 · FITCHECK™ AI",
    title: "Bước 03: FitCheck™ tự kiểm tra lỗi in trước khi xuất",
    imageSrc: "/branding/screen-flow-3.png",
    imageAlt: "Bước Đặt in của Studio WrapFit: khuôn bế 1:1 và danh sách quy tắc sản xuất FitCheck",
    targetHref: `${ROUTES.editorDemo}?step=6`,
    ctaLabel: "Thử FitCheck",
  },
  {
    number: "04",
    badgeLabel: "BƯỚC 04 · XUẤT FILE & CẮT BẾ",
    title: "Bước 04: Báo giá, thanh toán và xuất file in",
    imageSrc: "/branding/screen-flow-4.png",
    imageAlt: "Bước Đặt in của Studio WrapFit: báo giá in theo số lượng và báo giá chi tiết",
    targetHref: `${ROUTES.editorDemo}?step=6`,
    ctaLabel: "Xem báo giá",
  },
];

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
