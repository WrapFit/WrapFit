"use client";

import React from "react";
import { BoxDimensions } from "@wrapfit/shared";
import { Ruler } from "lucide-react";
import type { DimensionLimits } from "@/types/api";
import { clampDimension } from "@/features/studio/utils/dieline";
import { MmInput } from "./MmInput";

/** Ranges when the structure has no limits (offline demo). */
const DEFAULT_RANGES = {
  length: { min: 30, max: 350 },
  width: { min: 20, max: 260 },
  height: { min: 15, max: 200 },
};


interface DimensionControlsProps {
  dimensions: BoxDimensions;
  onChange: (dims: BoxDimensions) => void;
  /** Allowed size of each dimension for the box structure (`GET /templates/structures`). */
  limits?: DimensionLimits;
  className?: string;
}

export const DimensionControls: React.FC<DimensionControlsProps> = ({
  dimensions,
  onChange,
  limits,
  className = "",
}) => {
  const updateDim = (key: "length" | "width" | "height", val: number) => {
    const { min, max } = limits?.[key] ?? DEFAULT_RANGES[key];
    onChange({
      ...dimensions,
      [key]: Math.max(min, Math.min(max, Math.round(val))),
    });
  };

  const handleGsmChange = (t: number) => {
    onChange({
      ...dimensions,
      paperThickness: clampDimension(limits, "paperThickness", t),
    });
  };

  return (
    <div
      className={`bg-white rounded-squircle-lg border border-stone-200 p-5 space-y-4 shadow-tactile font-sans ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-vibrant-cobalt" />
          <h3 className="font-serif font-bold text-stone-900 text-base">
            Kích Thước Khối (mm)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
          Dung sai ±0.5mm
        </span>
      </div>

      {([
        { field: "length", label: "Chiều Dài (Length - L)" },
        { field: "width", label: "Chiều Rộng (Width - W)" },
        { field: "height", label: "Chiều Cao (Height - H)" },
      ] as const).map(({ field, label }) => {
        const { min, max } = limits?.[field] ?? DEFAULT_RANGES[field];
        return (
          <div key={field} className="space-y-1.5">
            <div className="flex justify-between items-center gap-2 text-xs font-semibold text-stone-700">
              <span>{label}</span>
              <MmInput
                value={dimensions[field]}
                min={min}
                max={max}
                step={1}
                label={label}
                onCommit={(value) => updateDim(field, value)}
              />
            </div>
            <input
              type="range"
              aria-label={label}
              min={min}
              max={max}
              value={dimensions[field]}
              onChange={(e) => updateDim(field, Number(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        );
      })}

      {/* Paper GSM & Thickness preset */}
      <div className="pt-3 border-t border-stone-100 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-stone-700">
          <span>Định Lượng Giấy & Độ Dày ($t$)</span>
          <span className="font-mono text-[11px] text-stone-500">
            t = {dimensions.paperThickness.toFixed(2)} mm
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { gsm: 250, t: 0.3, label: "250 GSM", desc: "Hộp mỏng" },
            { gsm: 300, t: 0.38, label: "300 GSM", desc: "Chuẩn quà" },
            { gsm: 350, t: 0.45, label: "350 GSM", desc: "Cứng cáp" },
          ].map((item) => {
            const isSelected = Math.abs(dimensions.paperThickness - item.t) < 0.03;
            return (
              <button
                key={item.gsm}
                type="button"
                onClick={() => handleGsmChange(item.t)}
                className={`py-2 px-1 text-center rounded-squircle transition border flex flex-col items-center ${
                  isSelected
                    ? "bg-brand-forest text-white border-brand-forest shadow-sm"
                    : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                }`}
              >
                <span className="text-xs font-bold font-mono">{item.label}</span>
                <span className={`text-[9px] ${isSelected ? "text-stone-200" : "text-stone-400"}`}>
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
