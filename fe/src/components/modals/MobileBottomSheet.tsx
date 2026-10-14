"use client";

import React, { useState, useRef } from "react";
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      {/* Swipeable Drawer Container */}
      <div
        className={`relative z-40 bg-white rounded-t-squircle-xl border-t border-stone-200 shadow-tactile-lg transition-all duration-300 ease-out flex flex-col ${
          isOpen ? "max-h-[82vh]" : "max-h-24"
        }`}
      >
        {/* Pull Handle & Quick Glance Header */}
        <div
          onClick={toggleOpen}
          className="pt-2.5 pb-2 px-4 cursor-pointer flex flex-col items-center gap-1.5 border-b border-stone-100 hover:bg-stone-50 transition"
        >
          {/* Pull Bar Indicator */}
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />

          {/* Quick Info Thumb Bar */}
          <div className="w-full flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="font-landing-heading font-bold font-bold text-stone-900">
                {dimensions.length} × {dimensions.width} × {dimensions.height} mm
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  fitCheckReport.isValidForProduction
                    ? "bg-green-100 text-green-800"
                    : "bg-vibrant-coral/15 text-vibrant-coral"
                }`}
              >
                {fitCheckReport.score}/100 Điểm
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-stone-500 font-semibold text-[11px]">
              <span>{isOpen ? "Thu gọn" : "Chỉnh sửa mm"}</span>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content Area */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[62vh]">
            {/* Tab switch between Dimensions and FitCheck */}
            <div className="flex items-center bg-stone-100 p-1 rounded-squircle border border-stone-200">
              <button
                type="button"
                onClick={() => {
                  
                  setActiveTab("dimensions");
                }}
                className={`flex-1 py-1.5 rounded-squircle text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === "dimensions"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500"
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
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500"
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
                <div className="bg-stone-50 p-4 rounded-squircle border border-stone-200 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-700">
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
        <div className="bg-white border-t border-stone-200 px-4 py-2.5 flex items-center justify-between safe-bottom">
          {/* Switch 2D / 3D with Anime.js */}
          <div
            ref={viewToggleRef}
            className="flex items-center gap-1 bg-stone-100 p-1 rounded-squircle border border-stone-200"
          >
            <button
              type="button"
              onClick={() => handleSwitchView("2d")}
              className={`min-w-[48px] h-10 px-3 rounded-squircle text-xs font-bold flex items-center justify-center gap-1 transition ${
                activeView === "2d"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500"
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>2D</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchView("3d")}
              className={`min-w-[48px] h-10 px-3 rounded-squircle text-xs font-bold flex items-center justify-center gap-1 transition ${
                activeView === "3d"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500"
              }`}
            >
              <Eye className="w-4 h-4 text-amber-600" />
              <span>3D</span>
            </button>
          </div>

          {/* Quick Dimension Expand Button */}
          <button
            type="button"
            onClick={toggleOpen}
            className="min-w-[48px] h-10 px-3 rounded-squircle bg-stone-100 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-stone-200 hover:bg-stone-200 transition"
          >
            <Sliders className="w-4 h-4 text-stone-600" />
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
