"use client";

import React, { useState, useRef, useEffect } from "react";
import { Palette, CheckCircle2, ChevronDown, Check } from "lucide-react";
import { type IccProfileId, ICC_PROFILES } from "../../types/imposition";
import type { BoxMaterialTheme } from "../three/InteractiveFoldingBox3D";
import { StudioCard } from "../studioUi";
import { cn } from "@/utils/helpers";


interface PrePressColorCardProps {
  activeMaterial: BoxMaterialTheme;
  selectedIccProfile: IccProfileId;
  onIccProfileChange: (id: IccProfileId) => void;
  className?: string;
}

/** ICC profile of the exported file. Imposition and printer marks are left to the print shop. */
export function PrePressColorCard({ activeMaterial, selectedIccProfile, onIccProfileChange, className }: PrePressColorCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProfile = ICC_PROFILES.find((p) => p.id === selectedIccProfile) ?? ICC_PROFILES[0];
  const isRecommended = currentProfile.recommendedFor.includes(activeMaterial);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
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
            <h4 className="text-xs font-bold text-fg uppercase tracking-wider truncate">Profile màu ICC</h4>
            <p className="text-caption text-fg-muted truncate">Chuẩn màu CMYK quốc tế</p>
          </div>
        </div>
        {isRecommended && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-caption font-semibold text-emerald-700 whitespace-nowrap shrink-0">
            <CheckCircle2 className="size-3 text-emerald-600" aria-hidden />
            Khớp chuẩn giấy
          </span>
        )}
      </div>

      <p className="mt-3 mb-2 text-xs font-semibold text-fg">Không gian màu xuất file</p>
      <div className="relative z-30" ref={dropdownRef}>
        <button
          type="button"
          aria-label="Chọn profile màu ICC"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "w-full flex items-center justify-between gap-2 rounded-xl border bg-surface-sunken/40 px-3.5 py-2.5 text-left transition-all hover:bg-surface-sunken hover:border-line-strong cursor-pointer",
            isOpen ? "border-fpt-orange ring-2 ring-fpt-orange/20 bg-white" : "border-line"
          )}
        >
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs font-bold text-fg">{currentProfile.name}</span>
              {isRecommended && (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2 text-caption font-semibold text-emerald-800">Khuyên dùng</span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-caption text-fg-muted">
              {currentProfile.standard} • TAC ≤ {currentProfile.tac}%
            </span>
          </span>
          <span className="flex items-center shrink-0">
            <ChevronDown className={cn("size-4 text-fg-muted transition-transform duration-200", isOpen && "rotate-180")} aria-hidden />
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-line bg-white p-1.5 shadow-2xl origin-top animate-pop-in motion-reduce:animate-none space-y-1 max-h-64 overflow-y-auto">
            {ICC_PROFILES.map((p) => {
              const isSelected = p.id === selectedIccProfile;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onIccProfileChange(p.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all cursor-pointer",
                    isSelected ? "bg-fpt-orange-light/30 border border-fpt-orange/40 text-fpt-orange-ink" : "hover:bg-surface-sunken text-fg"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block truncate text-caption font-normal text-fg-muted">{p.description}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {p.recommendedFor.includes(activeMaterial) && (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-caption font-semibold px-1.5 whitespace-nowrap">
                        Khuyên dùng
                      </span>
                    )}
                    {isSelected && <Check className="size-4 text-fpt-orange" strokeWidth={2.5} aria-hidden />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isOpen && (
        <div className="mt-2 rounded-xl border border-line/80 bg-surface-sunken/40 p-3 text-caption">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="whitespace-nowrap rounded-md bg-white px-2 py-0.5 font-semibold text-fg ring-1 ring-line/60">{currentProfile.standard}</span>
            <span className="whitespace-nowrap rounded-md bg-fpt-orange-light px-2 py-0.5 font-semibold tabular-nums text-fpt-orange-ink">Tổng mực TAC ≤ {currentProfile.tac}%</span>
          </div>
          <p className="mt-2 leading-relaxed text-fg-muted">{currentProfile.gamutNote}</p>
        </div>
      )}
    </StudioCard>
  );
}
