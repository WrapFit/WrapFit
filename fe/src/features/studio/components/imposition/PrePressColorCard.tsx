"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Palette,
  CheckCircle2,
  ChevronDown,
  Check,
  Eye,
  Layers,
  FileCheck,
} from "lucide-react";
import {
  type IccProfileId,
  ICC_PROFILES,
  type PrinterMarksConfig,
  type PressSheetId,
} from "../../types/imposition";
import type { BoxMaterialTheme } from "../three/InteractiveFoldingBox3D";
import { StudioCard } from "../studioUi";
import { cn } from "@/utils/helpers";

interface PrePressColorCardProps {
  activeMaterial: BoxMaterialTheme;
  selectedIccProfile: IccProfileId;
  onIccProfileChange: (id: IccProfileId) => void;
  marksConfig: PrinterMarksConfig;
  onMarksConfigChange: (marks: PrinterMarksConfig) => void;
  selectedSheetId: PressSheetId;
  onSheetChange: (id: PressSheetId) => void;
  onViewImposition?: () => void;
  className?: string;
}

export function PrePressColorCard({
  activeMaterial,
  selectedIccProfile,
  onIccProfileChange,
  marksConfig,
  onMarksConfigChange,
  selectedSheetId,
  onSheetChange,
  onViewImposition,
  className,
}: PrePressColorCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProfile = ICC_PROFILES.find((p) => p.id === selectedIccProfile) ?? ICC_PROFILES[0];
  const isRecommended = currentProfile.recommendedFor.includes(activeMaterial);

  // Automatically detect the optimal recommended profile for this paper
  const recommendedProfile = ICC_PROFILES.find((p) => p.recommendedFor.includes(activeMaterial)) ?? ICC_PROFILES[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <StudioCard className={cn("p-4 border border-line bg-surface-raised", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex size-7 items-center justify-center rounded-lg bg-fpt-orange-light text-fpt-orange shrink-0">
            <Palette className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-fg uppercase tracking-wider truncate">
              Profile Màu ICC
            </h4>
            <p className="text-[11px] text-fg-muted truncate">
              Chuẩn quản trị CMYK ISO 12647 quốc tế
            </p>
          </div>
        </div>

        {isRecommended && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 whitespace-nowrap shrink-0">
            <CheckCircle2 className="size-3 text-emerald-600" />
            Khớp chuẩn giấy
          </span>
        )}
      </div>

      {/* ICC Profile Custom Selector */}
      <div className="mt-3 space-y-2" ref={dropdownRef}>
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-fg flex items-center gap-1">
            <span>Không gian màu xuất file (ICC Profile):</span>
          </label>
          {selectedIccProfile !== recommendedProfile.id && (
            <button
              type="button"
              onClick={() => onIccProfileChange(recommendedProfile.id)}
              className="text-[11px] font-semibold text-fpt-orange hover:underline inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <FileCheck className="size-3" />
              Đổi sang {recommendedProfile.name}
            </button>
          )}
        </div>

        {/* Custom Dropdown Trigger Container with relative positioning */}
        <div className="relative z-30">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              "w-full flex items-center justify-between rounded-xl border bg-surface-sunken/40 px-3.5 py-2.5 text-left transition-all hover:bg-surface-sunken hover:border-line-strong cursor-pointer",
              isOpen ? "border-fpt-orange ring-2 ring-fpt-orange/20 bg-white" : "border-line"
            )}
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-fg truncate">{currentProfile.name}</span>
                {isRecommended && (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.2 shrink-0 whitespace-nowrap">
                    Khuyên dùng
                  </span>
                )}
              </div>
              <p className="text-[11px] text-fg-muted truncate mt-0.5">
                {currentProfile.standard} • TAC ≤ {currentProfile.tac}% • {currentProfile.description}
              </p>
            </div>
            <ChevronDown className={cn("size-4 text-fg-muted shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>

          {/* Floating Custom Dropdown Menu: Sổ ngay dưới nút chọn */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-line bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-1 max-h-64 overflow-y-auto">
              {ICC_PROFILES.map((p) => {
                const isSelected = p.id === selectedIccProfile;
                const matchesPaper = p.recommendedFor.includes(activeMaterial);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onIccProfileChange(p.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-start justify-between gap-3 rounded-lg p-2.5 text-left transition-all text-xs cursor-pointer",
                      isSelected
                        ? "bg-fpt-orange-light/30 border border-fpt-orange/40 text-fpt-orange-ink font-semibold"
                        : "hover:bg-surface-sunken text-fg"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs">{p.name}</span>
                        {matchesPaper && (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-1.5 py-0.2 whitespace-nowrap">
                            Khớp giấy này
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-fg-muted font-normal">
                        <span>{p.standard}</span>
                        <span>•</span>
                        <span className="font-sans font-semibold tabular-nums text-fpt-orange-ink">TAC ≤ {p.tac}%</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-fg-muted line-clamp-1 font-normal">
                        {p.description} ({p.gamutNote})
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="size-4 text-fpt-orange shrink-0 mt-0.5" strokeWidth={2.5} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Technical Profile Details Badge - Chỉ hiện khi đóng dropdown để không bao giờ bị rối hay che khuất */}
        {!isOpen && (
          <div className="rounded-xl border border-line/80 bg-surface-sunken/40 p-2.5 text-[11px]">
            <div className="flex items-center justify-between text-fg font-semibold">
              <span>Tiêu chuẩn: {currentProfile.standard}</span>
              <span className="text-fpt-orange-ink font-sans font-bold tabular-nums">Tổng lượng mực TAC: ≤ {currentProfile.tac}%</span>
            </div>
            <p className="mt-1 text-fg-muted leading-relaxed">
              {currentProfile.description}. {currentProfile.gamutNote}
            </p>
          </div>
        )}
      </div>

      {/* Pre-Press Printer Marks Checklist */}
      <div className="mt-3.5 border-t border-line/60 pt-3">
        <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-fg mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="size-3.5 text-fpt-orange shrink-0" />
            <span className="truncate">Dấu in kỹ thuật</span>
            <span className="text-[11px] font-normal text-fg-muted">(Printer Marks)</span>
          </div>
          {onViewImposition && (
            <button
              type="button"
              onClick={onViewImposition}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-fpt-orange hover:text-fpt-orange-dark hover:underline cursor-pointer whitespace-nowrap shrink-0"
              title="Chuyển sang chế độ xem bình bản tờ in để thấy các dấu kỹ thuật này"
            >
              <Eye className="size-3" />
              <span>Xem trên tờ in bình bản ↗</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-fg-muted leading-relaxed mb-2.5">
          Tự động xuất vào file PDF để xưởng in canh kẽm, đo tram mực và định vị dao bế.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 rounded-xl border border-line/60 bg-surface-sunken/40 px-2.5 py-2 cursor-pointer hover:bg-surface-sunken transition-colors">
            <input
              type="checkbox"
              checked={marksConfig.registrationMarks}
              onChange={(e) =>
                onMarksConfigChange({ ...marksConfig, registrationMarks: e.target.checked })
              }
              className="rounded accent-fpt-orange size-3.5 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-fg font-semibold text-xs block truncate">Dấu chữ thập canh kẽm</span>
              <span className="text-[10px] text-fg-muted block truncate">Khớp 4 màu CMYK</span>
            </div>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-line/60 bg-surface-sunken/40 px-2.5 py-2 cursor-pointer hover:bg-surface-sunken transition-colors">
            <input
              type="checkbox"
              checked={marksConfig.colorBars}
              onChange={(e) =>
                onMarksConfigChange({ ...marksConfig, colorBars: e.target.checked })
              }
              className="rounded accent-fpt-orange size-3.5 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-fg font-semibold text-xs block truncate">Thước thang màu CMYK</span>
              <span className="text-[10px] text-fg-muted block truncate">Đo tram quang phổ</span>
            </div>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-line/60 bg-surface-sunken/40 px-2.5 py-2 cursor-pointer hover:bg-surface-sunken transition-colors">
            <input
              type="checkbox"
              checked={marksConfig.cropMarks}
              onChange={(e) =>
                onMarksConfigChange({ ...marksConfig, cropMarks: e.target.checked })
              }
              className="rounded accent-fpt-orange size-3.5 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-fg font-semibold text-xs block truncate">Dấu xén & nếp cấn gập</span>
              <span className="text-[10px] text-fg-muted block truncate">Định vị dao xén phôi</span>
            </div>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-line/60 bg-surface-sunken/40 px-2.5 py-2 cursor-pointer hover:bg-surface-sunken transition-colors">
            <input
              type="checkbox"
              checked={marksConfig.jobSlug}
              onChange={(e) =>
                onMarksConfigChange({ ...marksConfig, jobSlug: e.target.checked })
              }
              className="rounded accent-fpt-orange size-3.5 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-fg font-semibold text-xs block truncate">Nhãn thông số kỹ thuật</span>
              <span className="text-[10px] text-fg-muted block truncate">Tên job, khổ in, ngày</span>
            </div>
          </label>
        </div>
      </div>
    </StudioCard>
  );
}
