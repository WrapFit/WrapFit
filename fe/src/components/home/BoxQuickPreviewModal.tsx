"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import { ArrowRight, CheckCircle2, Eye, Layers, Maximize2, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
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
      <div className="flex size-full flex-col items-center justify-center gap-3 bg-fg/40 text-white/75">
        <div className="size-8 animate-spin rounded-full border-2 border-line-strong border-t-white" />
        <span className="font-mono text-xs uppercase tracking-wider">Đang khởi tạo 3D Canvas…</span>
      </div>
    ),
  }
);

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

  const studioUrl = `${ROUTES.editorNew}?structure=${structure.id}&l=${currentPreset.dims.length}&w=${currentPreset.dims.width}&d=${currentPreset.dims.height}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-fg/75 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={() => {
          tactileAudio.playSquishyTap();
          onClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line/40 bg-fg text-white/95 shadow-2xl transition-all sm:flex-row">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            tactileAudio.playSquishyTap();
            onClose();
          }}
          className="absolute right-4 top-4 z-20 inline-flex size-10 items-center justify-center rounded-full bg-fg/80 text-white/75 backdrop-blur-md transition hover:bg-fg hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-lime"
          aria-label="Đóng cửa sổ xem nhanh"
        >
          <X className="size-5" />
        </button>

        {/* 3D Canvas Stage (Left) */}
        <div className="relative flex h-[340px] w-full flex-col bg-gradient-to-b from-fg via-fg to-fg sm:h-auto sm:w-[58%]">
          {/* Status Header */}
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-emerald-950/60 px-3 py-1 text-xs font-medium text-success backdrop-blur-md">
              <span className="size-2 animate-pulse rounded-full bg-success" />
              Live 3D Fold
            </span>
            <span className="hidden rounded-full border border-fg-muted/60 bg-fg/60 px-2.5 py-1 font-mono text-xs text-white/75 backdrop-blur-md sm:inline-block">
              {formatDimensions(currentPreset.dims)}
            </span>
          </div>

          {/* 3D Viewport */}
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

          {/* Interactive Folding Slider Dock */}
          <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-fg-muted/50 bg-fg/85 p-3 backdrop-blur-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white/75">
                <Layers className="size-3.5 text-landing-lime" />
                Độ gập mô hình: <span className="font-mono text-landing-lime font-semibold">{Math.round(foldProgress * 100)}%</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleFoldChange(0.0)}
                  className={cn(
                    "rounded px-2 py-0.5 text-caption transition",
                    foldProgress === 0.0 ? "bg-action text-action-fg font-bold" : "bg-fg text-fg-muted hover:text-white/85"
                  )}
                >
                  Phẳng (0%)
                </button>
                <button
                  type="button"
                  onClick={() => handleFoldChange(0.5)}
                  className={cn(
                    "rounded px-2 py-0.5 text-caption transition",
                    foldProgress === 0.5 ? "bg-action text-action-fg font-bold" : "bg-fg text-fg-muted hover:text-white/85"
                  )}
                >
                  Bán gập (50%)
                </button>
                <button
                  type="button"
                  onClick={() => handleFoldChange(1.0)}
                  className={cn(
                    "rounded px-2 py-0.5 text-caption transition",
                    foldProgress === 1.0 ? "bg-action text-action-fg font-bold" : "bg-fg text-fg-muted hover:text-white/85"
                  )}
                >
                  Đóng (100%)
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={foldProgress}
              onChange={(e) => handleFoldChange(parseFloat(e.target.value))}
              aria-label="Điều chỉnh độ gập hộp 3D"
              className="h-1.5 w-full cursor-ew-resize appearance-none rounded-lg bg-fg accent-landing-lime"
            />
          </div>
        </div>

        {/* Technical Info & Multi-action Suite (Right) */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto bg-fg p-5 sm:p-7">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-fg-muted bg-fg px-2.5 py-0.5 font-mono text-cad-spec-micro uppercase tracking-wider text-fg-muted">
                  {structure.name}
                </span>
                <span className="rounded-full border border-landing-lime/30 bg-landing-lime/10 px-2.5 py-0.5 text-caption font-medium text-landing-lime">
                  {structure.badge}
                </span>
                <span className="flex items-center gap-1 rounded-full border border-success/30 bg-emerald-950/40 px-2 py-0.5 text-caption text-success">
                  <CheckCircle2 className="size-3" />
                  {structure.feasibilityRate}
                </span>
              </div>
              <h2 id="quick-preview-title" className="mt-2 text-2xl font-bold tracking-tight text-white lg:text-3xl">
                {structure.vietnameseName}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{structure.description}</p>
            </div>

            {/* Size Selector Switcher (S / M / L) */}
            <div className="rounded-2xl border border-fg bg-fg/60 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/75">Chọn kích thước chuẩn:</span>
                <span className="font-mono text-xs text-landing-lime font-medium">
                  {formatDimensions(currentPreset.dims)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {presets.map((preset) => {
                  const isActive = preset.label === selectedSize;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSizeChange(preset.label)}
                      className={cn(
                        "flex flex-col items-center rounded-xl border p-2 text-center transition",
                        isActive
                          ? "border-landing-lime bg-landing-lime/10 text-landing-lime shadow-sm"
                          : "border-fg bg-fg/60 text-fg-muted hover:border-fg-muted hover:text-white/85"
                      )}
                    >
                      <span className="text-xs font-bold uppercase">{preset.label} · {preset.name}</span>
                      <span className="mt-0.5 font-mono text-cad-spec-micro text-fg-muted">{preset.dims.length}×{preset.dims.width} mm</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-caption text-fg-muted">
                <span className="font-medium text-white/75">Phù hợp:</span> {currentPreset.description}
              </p>
            </div>

            {/* Material Theme Swatches */}
            <div className="flex items-center justify-between rounded-xl border border-fg bg-fg/40 px-3.5 py-2.5 text-xs">
              <span className="text-fg-muted">Chất liệu giấy:</span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "ivory", label: "Ivory", color: "#FAF8F5" },
                    { id: "kraft", label: "Kraft", color: "#D1A980" },
                    { id: "forest", label: "Forest", color: "#1A362B" },
                  ] as const
                ).map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleThemeChange(mat.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption transition",
                      theme === mat.id
                        ? "border-landing-lime bg-fg text-landing-lime font-medium"
                        : "border-fg text-fg-muted hover:border-fg-muted"
                    )}
                  >
                    <span className="size-2 rounded-full border border-fg-muted" style={{ backgroundColor: mat.color }} />
                    {mat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Packaging Technical Specs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-fg/80 bg-fg/30 p-2.5">
                <span className="text-fg-muted block text-caption">Định lượng khuyên dùng</span>
                <span className="font-medium text-white/85 mt-0.5 block">{structure.recommendedPaper}</span>
              </div>
              <div className="rounded-xl border border-fg/80 bg-fg/30 p-2.5">
                <span className="text-fg-muted block text-caption">Thời gian gập hộp</span>
                <span className="font-medium text-white/85 mt-0.5 block">⚡ {structure.foldTimeSec} giây ({structure.foldDifficulty})</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col gap-2 pt-2 border-t border-fg">
            <Link
              href={studioUrl}
              onClick={() => {
                tactileAudio.playCreaseSnap();
                onClose();
              }}
              className={buttonClass({ size: "lg", shape: "rounded", block: true })}
            >
              <span>Mở trong Studio 3D</span>
              <ArrowRight className="size-4" />
            </Link>
            <div className="flex items-center justify-between text-xs text-fg-muted px-1">
              <Link
                href={`${ROUTES.templates}?structure=${structure.id}`}
                onClick={onClose}
                className="hover:text-landing-lime underline underline-offset-2 transition"
              >
                Xem 30+ mẫu thiết kế có sẵn →
              </Link>
              <span className="font-mono text-cad-spec-micro text-fg-muted">CAD v2.4 · FEFCO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
