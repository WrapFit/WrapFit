"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ArrowRight, FileText, Layers, Timer, X } from "lucide-react";
import { ROUTES } from "@/constants";
import type { BoxStructureOption, BoxSizePreset } from "@/features/studio/utils/boxStructures";
import { formatDimensions } from "@/features/templates/labels";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import type { BoxMaterialTheme } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { buttonClass } from "@/components/ui";

// Dynamically import InteractiveFoldingBox3D for SSR safety
const InteractiveFoldingBox3D = dynamic(
  () => import("@/features/studio/components/three/InteractiveFoldingBox3D").then((m) => m.InteractiveFoldingBox3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full flex-col items-center justify-center gap-3 text-fg-muted">
        <div className="size-8 rounded-full border-2 border-line border-t-fpt-orange motion-safe:animate-spin" />
        <span className="text-caption font-medium">Đang dựng mô hình 3D…</span>
      </div>
    ),
  }
);

/** Shortcuts of the fold slider. */
const FOLD_STOPS = [
  { label: "Phẳng", value: 0 },
  { label: "Bán gập", value: 0.5 },
  { label: "Đóng", value: 1 },
] as const;

/** Paper themes of the 3D box, with the colour of a real sheet as swatch. */
const MATERIALS = [
  { id: "ivory", label: "Ivory", color: "#FAF8F5" },
  { id: "kraft", label: "Kraft", color: "#D1A980" },
  { id: "forest", label: "Forest", color: "#1A362B" },
] as const;

interface BoxQuickPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: BoxStructureOption | null;
  initialSizeLabel?: "S" | "M" | "L";
}

export function BoxQuickPreviewModal({
  isOpen,
  onClose,
  structure,
  initialSizeLabel = "M",
}: BoxQuickPreviewModalProps) {
  const [selectedSize, setSelectedSize] = useState<"S" | "M" | "L">(initialSizeLabel);
  const [foldProgress, setFoldProgress] = useState<number>(0.95);
  const [theme, setTheme] = useState<BoxMaterialTheme>("ivory");
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Sync initial size when modal opens or structure changes
  useEffect(() => {
    if (isOpen) {
      setSelectedSize(initialSizeLabel);
      setFoldProgress(0.95);
      setAutoRotate(true);
      tactileAudio.playUnboxPop();
    }
  }, [isOpen, initialSizeLabel, structure]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
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

  if (!isOpen || !structure) return null;

  const presets: BoxSizePreset[] =
    structure.sizePresets && structure.sizePresets.length > 0
      ? structure.sizePresets
      : [
          {
            label: "S",
            name: "Nhỏ (Mini)",
            description: "Mỹ phẩm, phụ kiện nhỏ",
            dims: {
              ...structure.defaultDims,
              length: Math.round(structure.defaultDims.length * 0.8),
              width: Math.round(structure.defaultDims.width * 0.8),
              height: Math.round(structure.defaultDims.height * 0.8),
            },
          },
          {
            label: "M",
            name: "Tiêu chuẩn",
            description: "Kích thước chuẩn",
            dims: structure.defaultDims,
          },
          {
            label: "L",
            name: "Lớn",
            description: "Quà tặng lớn",
            dims: {
              ...structure.defaultDims,
              length: Math.round(structure.defaultDims.length * 1.3),
              width: Math.round(structure.defaultDims.width * 1.3),
              height: Math.round(structure.defaultDims.height * 1.3),
            },
          },
        ];

  const currentPreset: BoxSizePreset =
    presets.find((p) => p.label === selectedSize) ??
    presets[1] ??
    presets[0];

  const handleSizeChange = (label: "S" | "M" | "L") => {
    tactileAudio.playCreaseSnap();
    setSelectedSize(label);
  };

  const handleFoldChange = (val: number) => {
    tactileAudio.playPaperFold(val);
    setFoldProgress(val);
    setAutoRotate(false);
  };

  const handleThemeChange = (newTheme: BoxMaterialTheme) => {
    tactileAudio.playSquishyTap();
    setTheme(newTheme);
  };

  const close = () => {
    tactileAudio.playSquishyTap();
    onClose();
  };

  const studioUrl = `${ROUTES.editorNew}?structure=${structure.id}&l=${currentPreset.dims.length}&w=${currentPreset.dims.width}&d=${currentPreset.dims.height}`;
  const foldPercent = Math.round(foldProgress * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-fg/55 backdrop-blur-sm animate-fade-in" onClick={close} />

      {/* Dialog: light sheet, 3D stage on the left, details on the right */}
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-sheet bg-surface-raised shadow-popover ring-1 ring-line/60 animate-pop-in lg:flex-row">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-20 inline-flex size-11 items-center justify-center rounded-full bg-surface-raised/90 text-fg-muted shadow-xs ring-1 ring-inset ring-line/70 backdrop-blur transition-colors hover:bg-surface-sunken hover:text-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 lg:right-4 lg:top-4"
          aria-label="Đóng cửa sổ xem nhanh"
        >
          <X className="size-5" />
        </button>

        {/* 3D stage */}
        <div className="relative h-[320px] w-full shrink-0 border-b border-line/60 sm:h-[380px] lg:h-auto lg:min-h-[580px] lg:w-[56%] lg:border-b-0 lg:border-r">
          {/* The 3D stage draws its own structure chip (top left) and "Mở nắp" button (top right). */}
          <div className="size-full">
            <InteractiveFoldingBox3D
              dimensions={currentPreset.dims}
              foldProgress={foldProgress}
              boxType={structure.id}
              theme={theme}
              autoRotate={autoRotate}
              environment="studio"
              showStatusBar={false}
              minHeight={false}
              frameless={true}
              className="size-full"
            />
          </div>

          {/* Fold control */}
          <div className="absolute inset-x-3 bottom-3 z-10 rounded-panel bg-surface-raised/90 p-3 shadow-soft-8 ring-1 ring-inset ring-line/60 backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="quick-preview-fold" className="flex items-center gap-1.5 text-label-sm text-fg">
                <Layers className="size-4 text-fpt-orange-ink" aria-hidden />
                Độ gập
                <span className="tabular-nums text-fpt-orange-ink">{foldPercent}%</span>
                <span className="hidden font-medium tabular-nums text-fg-muted sm:inline">· {formatDimensions(currentPreset.dims)}</span>
              </label>
              <div role="group" aria-label="Mức gập nhanh" className="flex rounded-full bg-surface-sunken p-0.5">
                {FOLD_STOPS.map((stop) => {
                  const active = foldProgress === stop.value;
                  return (
                    <button
                      key={stop.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleFoldChange(stop.value)}
                      className={cn(
                        "h-8 rounded-full px-3 text-label-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                        active ? "bg-surface-raised text-fpt-orange-ink shadow-xs" : "text-fg-muted hover:text-fg"
                      )}
                    >
                      {stop.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* ds-allow: filled track of the slider in action orange / line. */}
            <input
              id="quick-preview-fold"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={foldProgress}
              onChange={(e) => handleFoldChange(parseFloat(e.target.value))}
              aria-valuetext={`${foldPercent}%`}
              className="mt-3 h-1.5 w-full cursor-ew-resize appearance-none rounded-full accent-fpt-orange"
              style={{ background: `linear-gradient(to right, #F26522 ${foldPercent}%, #CAD5E2 ${foldPercent}%)` }}
            />
          </div>
        </div>

        {/* Details */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6 lg:p-7">
            <header className="pr-12">
              <h2 id="quick-preview-title" className="font-landing-heading text-heading-md font-bold text-fg lg:text-heading-lg">
                {structure.vietnameseName}
              </h2>
              <p className="mt-2 text-body-sm leading-relaxed text-fg-muted">{structure.description}</p>
            </header>

            {/* Size presets */}
            <section aria-labelledby="quick-preview-size">
              <div className="flex items-baseline justify-between gap-2">
                <h3 id="quick-preview-size" className="text-label text-fg">Kích thước chuẩn</h3>
                <span className="text-label-sm tabular-nums text-fpt-orange-ink">{formatDimensions(currentPreset.dims)}</span>
              </div>
              <div role="radiogroup" aria-labelledby="quick-preview-size" className="mt-2.5 grid grid-cols-3 gap-2">
                {presets.map((preset) => {
                  const isActive = preset.label === selectedSize;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => handleSizeChange(preset.label)}
                      className={cn(
                        "flex min-h-[72px] flex-col items-start justify-center gap-1 rounded-control border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                        isActive
                          ? "border-accent bg-fpt-orange-light/60 ring-1 ring-inset ring-accent"
                          : "border-line bg-surface-raised hover:border-line-strong"
                      )}
                    >
                      <span className={cn("text-label leading-tight", isActive ? "text-accent" : "text-fg")}>{preset.label}</span>
                      <span className={cn("line-clamp-1 text-caption font-medium", isActive ? "text-accent" : "text-fg")}>{preset.name}</span>
                      <span className="text-caption tabular-nums text-fg-muted">
                        {preset.dims.length} × {preset.dims.width} mm
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-caption text-fg-muted">
                <span className="font-semibold text-fg">Phù hợp:</span> {currentPreset.description}
              </p>
            </section>

            {/* Paper */}
            <section aria-labelledby="quick-preview-paper">
              <h3 id="quick-preview-paper" className="text-label text-fg">Chất liệu giấy</h3>
              <div role="radiogroup" aria-labelledby="quick-preview-paper" className="mt-2.5 flex flex-wrap gap-2">
                {MATERIALS.map((mat) => {
                  const active = theme === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleThemeChange(mat.id)}
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-full border pl-1.5 pr-4 text-label-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                        active ? "border-accent bg-fpt-orange-light/60 text-accent" : "border-line bg-surface-raised text-fg hover:border-line-strong"
                      )}
                    >
                      <span className="size-8 rounded-full ring-1 ring-inset ring-fg/15" style={{ backgroundColor: mat.color }} aria-hidden />
                      {mat.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Specs */}
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 rounded-control bg-surface-sunken/70 p-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-caption text-fg-muted">Định lượng khuyên dùng</dt>
                  <dd className="mt-0.5 text-body-sm font-semibold text-fg">{structure.recommendedPaper}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-control bg-surface-sunken/70 p-3">
                <Timer className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-caption text-fg-muted">Thời gian gập hộp</dt>
                  <dd className="mt-0.5 text-body-sm font-semibold tabular-nums text-fg">
                    {structure.foldTimeSec} giây · {structure.foldDifficulty}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Actions stay in view at the bottom of the panel */}
          <div className="sticky bottom-0 flex flex-col gap-3 border-t border-line/60 bg-surface-raised/95 p-5 backdrop-blur sm:px-6 lg:px-7">
            <Link
              href={studioUrl}
              onClick={() => {
                tactileAudio.playCreaseSnap();
                onClose();
              }}
              className={buttonClass({ variant: "brand", size: "lg", block: true })}
            >
              <span>Mở trong Studio 3D</span>
              <ArrowRight className="size-4" />
            </Link>
            <div className="flex items-center justify-between gap-3 text-caption">
              <Link
                href={`${ROUTES.templates}?structure=${structure.id}`}
                onClick={onClose}
                className="inline-flex min-h-6 items-center gap-1 font-semibold text-fg-muted transition-colors hover:text-fpt-orange-ink"
              >
                Xem 30+ mẫu thiết kế có sẵn
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
              <span className="tabular-nums text-fg-muted">Bản vẽ khuôn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
