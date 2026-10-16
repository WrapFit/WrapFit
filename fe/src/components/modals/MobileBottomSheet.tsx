"use client";

import React, { useEffect, useId, useState, useRef } from "react";
import { animate } from "animejs";
import {
  ChevronUp,
  ChevronDown,
  Ruler,
  ShieldCheck,
  Download,
  Layers,
  Eye,
  Sliders,
  Sparkles,
  Palette,
} from "lucide-react";
import { BoxDimensions, FitCheckReport } from "@wrapfit/shared";
import { DimensionControls } from "@/features/studio/components/DimensionControls";
import { FitCheckDrawer } from "@/features/studio/components/fitcheck/FitCheckDrawer";


interface MobileBottomSheetProps {
  dimensions: BoxDimensions;
  onDimensionsChange: (dims: BoxDimensions) => void;
  fitCheckReport: FitCheckReport;
  onAutoFixFitCheck: () => void;
  activeView: "2d" | "3d";
  onToggleView: (v: "2d" | "3d") => void;
  foldProgress: number;
  onFoldProgressChange: (p: number) => void;
  onExport: () => void;
  className?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  dimensions,
  onDimensionsChange,
  fitCheckReport,
  onAutoFixFitCheck,
  activeView,
  onToggleView,
  foldProgress,
  onFoldProgressChange,
  onExport,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dimensions" | "fitcheck">("dimensions");
  const sheetRef = useRef<HTMLDivElement>(null);
  const viewToggleRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const contentId = useId();

  // Escape folds the sheet back and returns focus to its handle.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      handleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const toggleOpen = () => {
    
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (sheetRef.current) {
      animate(sheetRef.current, {
        translateY: nextOpen ? [20, 0] : [0, 0],
        duration: 320,
        ease: "outQuad",
      });
    }
  };

  const handleSwitchView = (targetView: "2d" | "3d") => {
    
    onToggleView(targetView);

    if (viewToggleRef.current) {
      animate(viewToggleRef.current, {
        scale: [0.94, 1],
        duration: 250,
        ease: "outBack",
      });
    }
  };

  return (
    <div
      ref={sheetRef}
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col font-sans select-none ${className}`}
    >
      {/* Background Dim Backdrop when opened */}
      {isOpen && (
        <div
          onClick={toggleOpen}
          aria-hidden
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      {/* Swipeable Drawer Container */}
      <div
        className={`relative z-40 bg-white rounded-t-squircle-xl border-t border-line shadow-tactile-lg transition-all duration-300 ease-out flex flex-col ${
          isOpen ? "max-h-[82vh]" : "max-h-24"
        }`}
      >
        {/* Pull Handle & Quick Glance Header: a real button (keyboard, screen readers), Escape folds it back. */}
        <button
          ref={handleRef}
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="w-full pt-2.5 pb-2 px-4 cursor-pointer flex flex-col items-center gap-1.5 border-b border-line/60 text-left outline-none hover:bg-surface-sunken/50 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-focus/40 transition"
        >
          {/* Pull Bar Indicator */}
          <span className="block w-12 h-1.5 bg-line rounded-full" aria-hidden />

          {/* Quick Info Thumb Bar */}
          <span className="w-full flex items-center justify-between text-xs pt-1">
            <span className="flex items-center gap-2">
              <span className="font-landing-heading font-bold font-bold text-fg">
                {dimensions.length} × {dimensions.width} × {dimensions.height} mm
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-caption font-bold ${
                  fitCheckReport.isValidForProduction ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg"
                }`}
              >
                {fitCheckReport.score}/100 Điểm
              </span>
            </span>

            <span className="flex items-center gap-1.5 text-fg-muted font-semibold text-caption">
              <span>{isOpen ? "Thu gọn" : "Chỉnh sửa mm"}</span>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </span>
          </span>
        </button>

        {/* Expanded Content Area */}
        {isOpen && (
          <div id={contentId} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[62vh]">
            {/* Tab switch between Dimensions and FitCheck */}
            <div className="flex items-center bg-surface-sunken p-1 rounded-squircle border border-line">
              <button
                type="button"
                onClick={() => {
                  
                  setActiveTab("dimensions");
                }}
                className={`flex-1 py-1.5 rounded-squircle text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === "dimensions"
                    ? "bg-white text-fg shadow-sm"
                    : "text-fg-muted"
                }`}
              >
                <Ruler className="w-3.5 h-3.5 text-vibrant-cobalt" />
                <span>Kích Thước Hộp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  
                  setActiveTab("fitcheck");
                }}
                className={`flex-1 py-1.5 rounded-squircle text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === "fitcheck"
                    ? "bg-white text-fg shadow-sm"
                    : "text-fg-muted"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-vibrant-coral" />
                <span>FitCheck™ ({fitCheckReport.violations.length})</span>
              </button>
            </div>

            {activeTab === "dimensions" ? (
              <div className="space-y-4">
                <DimensionControls
                  dimensions={dimensions}
                  onChange={onDimensionsChange}
                />

                {/* 3D Fold Slider on Mobile */}
                <div className="bg-surface-sunken/50 p-4 rounded-squircle border border-line space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-fg-muted">
                    <span>Gập mở 3D:</span>
                    <span className="font-mono text-vibrant-cobalt font-bold">
                      {Math.round(foldProgress * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={foldProgress}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onFoldProgressChange(v);
                      
                    }}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <FitCheckDrawer
                report={fitCheckReport}
                onAutoFix={onAutoFixFitCheck}
              />
            )}
          </div>
        )}

        {/* Fixed Thumb-Friendly Bottom Navigation Bar (48px Touch Targets) */}
        <div className="bg-white border-t border-line px-4 py-2.5 flex items-center justify-between safe-bottom">
          {/* Switch 2D / 3D with Anime.js */}
          <div
            ref={viewToggleRef}
            className="flex items-center gap-1 bg-surface-sunken p-1 rounded-squircle border border-line"
          >
            <button
              type="button"
              onClick={() => handleSwitchView("2d")}
              className={`min-w-[48px] h-10 px-3 rounded-squircle text-xs font-bold flex items-center justify-center gap-1 transition ${
                activeView === "2d"
                  ? "bg-white text-fg shadow-sm"
                  : "text-fg-muted"
              }`}
            >
              <Layers className="w-4 h-4 text-info-fg" />
              <span>2D</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchView("3d")}
              className={`min-w-[48px] h-10 px-3 rounded-squircle text-xs font-bold flex items-center justify-center gap-1 transition ${
                activeView === "3d"
                  ? "bg-white text-fg shadow-sm"
                  : "text-fg-muted"
              }`}
            >
              <Eye className="w-4 h-4 text-warning-fg" />
              <span>3D</span>
            </button>
          </div>

          {/* Quick Dimension Expand Button */}
          <button
            type="button"
            onClick={toggleOpen}
            className="min-w-[48px] h-10 px-3 rounded-squircle bg-surface-sunken text-fg text-xs font-bold flex items-center justify-center gap-1.5 border border-line hover:bg-line/60 transition"
          >
            <Sliders className="w-4 h-4 text-fg-muted" />
            <span>Thông Số</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={() => {
              
              onExport();
            }}
            className="min-w-[48px] h-10 px-4 rounded-squircle bg-vibrant-cobalt hover:bg-vibrant-cobalt-dark text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-cobalt-glow transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Xuất In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
