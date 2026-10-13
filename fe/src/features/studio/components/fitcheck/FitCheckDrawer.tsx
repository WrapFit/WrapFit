"use client";

import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Wand2,
  ChevronDown,
  Info,
} from "lucide-react";
import { FitCheckReport } from "@wrapfit/shared";


interface FitCheckDrawerProps {
  report: FitCheckReport;
  onAutoFix?: () => void;
  className?: string;
}

export const FitCheckDrawer: React.FC<FitCheckDrawerProps> = ({
  report,
  onAutoFix,
  className = "",
}) => {
  const handleAutoFixClick = () => {
    
    if (onAutoFix) onAutoFix();
  };

  return (
    <div
      className={`bg-white rounded-squircle-lg border border-stone-200 p-5 space-y-4 shadow-tactile font-sans ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-vibrant-coral" />
          <div>
            <h3 className="font-landing-heading font-bold text-stone-900 text-base leading-tight">
              FitCheck™ Engine
            </h3>
            <span className="text-[10px] font-mono text-stone-400">
              Kiểm định dung sai in ấn
            </span>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
            report.isValidForProduction
              ? "bg-green-100 text-green-800"
              : "bg-vibrant-coral/15 text-vibrant-coral"
          }`}
        >
          {report.score}/100 Điểm
        </span>
      </div>

      {/* Production Readiness Status */}
      <div className="text-xs">
        {report.isValidForProduction ? (
          <div className="flex items-start gap-2.5 text-green-800 bg-green-50/80 p-3 rounded-squircle border border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Bản vẽ bế đạt 100% tiêu chuẩn kỹ thuật! Toàn bộ nội dung nằm trong vùng an toàn và mép tràn lề đầy đủ.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 text-amber-900 bg-amber-50/80 p-3 rounded-squircle border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-vibrant-coral flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Phát hiện {report.violations.length} lỗi tiềm ẩn có thể gây rách chữ hoặc viền trắng khi xén giấy.
            </p>
          </div>
        )}
      </div>

      {/* List of Violations */}
      {report.violations.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {report.violations.map((v) => (
            <div
              key={v.id}
              className={`p-3 rounded-squircle border text-xs space-y-1 ${
                v.severity === "error"
                  ? "bg-red-50/60 border-red-200 text-red-900"
                  : "bg-amber-50/60 border-amber-200 text-amber-900"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {v.severity === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                )}
                <span className="line-clamp-1">{v.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{v.message}</p>
              <p className="text-[11px] italic font-medium pt-1 text-stone-700">
                👉 Gợi ý: {v.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 1-Click Auto Fix Button */}
      {onAutoFix && !report.isValidForProduction && (
        <button
          type="button"
          onClick={handleAutoFixClick}
          className="w-full py-2.5 px-4 bg-vibrant-coral hover:bg-vibrant-coral-dark text-white rounded-squircle text-xs font-bold transition shadow-coral-glow flex items-center justify-center gap-2"
        >
          <Wand2 className="w-4 h-4" />
          <span>1-Click: Tự Động Sửa Lỗi Nếp Gấp & Tràn Lề</span>
        </button>
      )}
    </div>
  );
};
