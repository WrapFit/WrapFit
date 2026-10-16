"use client";

import React from "react";
import { BoxDimensions, caliperOf } from "@wrapfit/shared";
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
      className={`bg-white rounded-3xl border border-landing-line p-5 space-y-4 shadow-none font-sans ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-fpt-orange" />
          <h3 className="font-landing-heading font-bold text-landing-ink text-base">
            Kích Thước Khối (mm)
          </h3>
        </div>
        <span className="font-sans text-xs text-landing-muted bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
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
            <div className="flex justify-between items-center gap-2 text-xs font-semibold text-landing-ink">
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
              className="w-full cursor-pointer accent-fpt-orange"
            />
          </div>
        );
      })}

      {/* Paper GSM & Thickness preset */}
      <div className="pt-3 border-t border-landing-line space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-landing-ink">
          <span>Định Lượng Giấy & Độ Dày (t)</span>
          <span className="font-sans text-xs font-medium text-landing-muted">
            t = {dimensions.paperThickness.toFixed(2)} mm
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { gsm: 250, label: "250 GSM", desc: "Hộp mỏng" },
            { gsm: 300, label: "300 GSM", desc: "Chuẩn quà" },
            { gsm: 350, label: "350 GSM", desc: "Cứng cáp" },
          ].map(({ gsm, ...item }) => ({ ...item, gsm, t: caliperOf(gsm) })).map((item) => {
            const isSelected = Math.abs(dimensions.paperThickness - item.t) < 0.03;
            return (
              <button
                key={item.gsm}
                type="button"
                onClick={() => handleGsmChange(item.t)}
                className={`py-2 px-1 text-center rounded-xl transition border flex flex-col items-center ${
                  isSelected
                    ? "bg-fpt-orange text-white border-fpt-orange shadow-xs"
                    : "bg-slate-50 border-slate-200 text-landing-ink hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold font-sans">{item.label}</span>
                <span className={`text-caption ${isSelected ? "text-white/80" : "text-fg-muted"}`}>
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
