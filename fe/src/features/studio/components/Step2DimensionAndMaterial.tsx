"use client";

import React from "react";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Gift,
  Check,
  Info,
} from "lucide-react";
import { BoxDimensions, CURRENT_FORMULA_VERSION, FitCheckReport } from "@wrapfit/shared";

import { GoiMascot } from "@/components/common/GoiMascot";
import type { DimensionLimits } from "@/types/api";
import { GIFT_PRESETS, type GiftPreset } from "@/features/studio/utils/boxStructures";
import { PAPER_STOCKS } from "@/features/studio/utils/paperStocks";
import { MmInput } from "./MmInput";
import {
  clampDimension,
  dielinePiecesOf,
  dimensionErrors,
  type DimensionField,
} from "@/features/studio/utils/dieline";

/** Paper stocks of the editor (same list as the materials page). */
const PAPER_MATERIALS = PAPER_STOCKS.map((paper) => ({
  id: paper.theme,
  name: paper.name,
  finish: paper.finishLabel,
  desc: paper.description,
  caliper: paper.spec.caliper,
}));

/** Slider ranges when the structure has no limits (offline demo). */
const DEFAULT_RANGES: Record<DimensionField, { min: number; max: number }> = {
  length: { min: 20, max: 400 },
  width: { min: 20, max: 300 },
  height: { min: 15, max: 300 },
  paperThickness: { min: 0.3, max: 0.6 },
};

interface Step2DimensionAndMaterialProps {
  dimensions: BoxDimensions;
  onDimensionsChange: (dims: BoxDimensions) => void;
  activeMaterial: string;
  onMaterialChange: (mat: string) => void;
  fitCheckReport: FitCheckReport;
  /** Allowed size of each dimension for the box structure (`GET /templates/structures`). */
  limits?: DimensionLimits;
  /** Box structure and dieline formulas (sheet size, proportion rules); a new design uses the current formulas. */
  structure: string;
  formulaVersion?: number;
  /** Omitted: no way back (the structure of a saved project is fixed). */
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  /** The next step is running (e.g. creating the project). */
  busy?: boolean;
}

export const Step2DimensionAndMaterial: React.FC<Step2DimensionAndMaterialProps> = ({
  dimensions,
  onDimensionsChange,
  activeMaterial,
  onMaterialChange,
  fitCheckReport,
  limits,
  structure,
  formulaVersion = CURRENT_FORMULA_VERSION,
  onBack,
  onNext,
  nextLabel = "Tiến Vào Xưởng Bản Vẽ Bế 2D (Bước 3)",
  busy = false,
}) => {
  const range = (field: DimensionField) => {
    const own = limits?.[field];
    if (!own) return DEFAULT_RANGES[field];
    // Sliders stay usable: the paper slider keeps its fine range inside the allowed one.
    if (field === "paperThickness") {
      return {
        min: Math.max(own.min, Math.min(DEFAULT_RANGES.paperThickness.min, own.max)),
        max: Math.min(own.max, Math.max(DEFAULT_RANGES.paperThickness.max, own.min)),
      };
    }
    return own;
  };

  const updateDim = (field: "length" | "width" | "height", value: number) => {
    const { min, max } = range(field);
    onDimensionsChange({
      ...dimensions,
      [field]: Math.max(min, Math.min(max, Math.round(value))),
    });
  };

  const updateThickness = (value: number) => {
    onDimensionsChange({
      ...dimensions,
      paperThickness: clampDimension(limits, "paperThickness", Number(value.toFixed(2))),
    });
  };

  const fitsLimits = (dims: BoxDimensions) => dimensionErrors(dims, limits, structure).length === 0;
  const errors = dimensionErrors(dimensions, limits, structure);

  const applyPreset = (p: GiftPreset) => {
    onDimensionsChange(p.dims);
  };

  // Flat sheet of every piece, from the dieline that gets printed
  const sheets = dielinePiecesOf(structure, dimensions, formulaVersion)
    .map(({ geometry: { totalBoundingBox: b } }) => `${Math.round(b.width)} × ${Math.round(b.height)}`)
    .join(" + ");
  // Since formula version 3 the dieline adds the paper thickness to each panel (shared/README.md)
  const addsThickness = formulaVersion >= 3;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      {/* Heading */}
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-library-accent">Bước 2 · Kích thước & giấy</p>
        <h1 className="mt-1 font-landing-heading text-2xl font-medium text-library-ink sm:text-[32px] sm:leading-tight">Kích thước món quà (mm)</h1>
        <p className="mt-1.5 text-base leading-[1.6] text-library-sub">
          Kích thước được tính theo lọt lòng của hộp.{" "}
          {addsThickness ? (
            <>
              Phôi tự cộng độ dày giấy{" "}
              <span className="font-mono font-bold text-library-accent">+{dimensions.paperThickness} mm</span> vào
              mỗi mặt để quà vừa vặn, nắp đóng êm không bị cấn.
            </>
          ) : (
            "Dự án dùng công thức cũ: phôi chưa cộng độ dày giấy."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Parametric Dimension Sliders & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Gift Presets */}
          <div className="bg-white p-5 rounded-squircle-lg border border-stone-200 shadow-tactile space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-library-accent" />
                Món Quà Mẫu Chuẩn Sẵn (1-Click Preset)
              </span>
              <span className="text-[11px] text-stone-500 font-mono">Đo chuẩn theo quà</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {GIFT_PRESETS.map((gp) => {
                const isMatch =
                  gp.dims.length === dimensions.length &&
                  gp.dims.width === dimensions.width &&
                  gp.dims.height === dimensions.height;
                const fits = fitsLimits(gp.dims);

                return (
                  <button
                    key={gp.id}
                    type="button"
                    disabled={!fits}
                    title={fits ? undefined : "Kích thước này ngoài giới hạn của cấu trúc hộp đã chọn"}
                    onClick={() => applyPreset(gp)}
                    className={`p-3 rounded-squircle text-left border transition-all flex flex-col justify-between disabled:cursor-not-allowed disabled:opacity-45 ${
                      isMatch
                        ? "border-library-accent bg-library-accent-mist/70 text-library-accent shadow-sm ring-2 ring-library-accent/20"
                        : "border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-white text-stone-700"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold block truncate" title={gp.name}>{gp.name}</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {gp.category}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold mt-2">
                      {gp.dims.length}×{gp.dims.width}×{gp.dims.height} mm
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Parametric Dimension Controls (L, W, H) */}
          <div className="bg-white p-6 rounded-squircle-lg border border-stone-200 shadow-tactile space-y-5">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              Nhập Kích Thước Lọt Lòng Hộp (Length × Width × Height)
            </span>

            {([
              { field: "length", label: "Chiều Dài (Length - L)" },
              { field: "width", label: "Chiều Rộng (Width - W)" },
              { field: "height", label: "Chiều Cao / Độ Sâu (Height - H)" },
            ] as const).map(({ field, label }) => {
              const { min, max } = range(field);
              return (
                <div key={field} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-stone-700">{label}</span>
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
                    step={1}
                    value={dimensions[field]}
                    onChange={(e) => updateDim(field, Number(e.target.value))}
                    className="w-full accent-brand-forest cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                    <span>{min} mm</span>
                    <span>{Math.round((min + max) / 2)} mm</span>
                    <span>{max} mm</span>
                  </div>
                </div>
              );
            })}

            {/* Paper Thickness (t) */}
            <div className="pt-3 border-t border-stone-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                  Độ Dày Giấy (Caliper - t)
                </span>
                <span className="font-mono font-bold text-library-accent text-xs bg-library-accent-mist px-2 py-0.5 rounded border border-library-accent/30">
                  {dimensions.paperThickness} mm ({(dimensions.paperThickness * 1000).toFixed(0)}µm)
                </span>
              </div>
              <input
                type="range"
                aria-label="Độ dày giấy"
                min={range("paperThickness").min}
                max={range("paperThickness").max}
                step={0.01}
                value={dimensions.paperThickness}
                onChange={(e) => updateThickness(Number(e.target.value))}
                className="w-full accent-library-accent cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Paper Material Spec & FitCheck Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Material Selection */}
          <div className="bg-white p-5 rounded-squircle-lg border border-stone-200 shadow-tactile space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              Chất Liệu Giấy & Lớp Hoàn Thiện
            </span>

            <div className="space-y-2.5">
              {PAPER_MATERIALS.map((mat) => {
                const isSelected = activeMaterial === mat.id;

                return (
                  <div
                    key={mat.id}
                    onClick={() => {
                      onMaterialChange(mat.id);
                      onDimensionsChange({
                        ...dimensions,
                        paperThickness: clampDimension(limits, "paperThickness", mat.caliper),
                      });
                    }}
                    className={`p-3.5 rounded-squircle border transition-all cursor-pointer ${
                      isSelected
                        ? "border-brand-forest bg-stone-50/80 shadow-sm ring-2 ring-brand-forest/20"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-brand-forest bg-brand-forest text-white"
                              : "border-stone-300"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="font-semibold text-xs text-stone-900">{mat.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                        {mat.caliper} mm
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1 pl-6 leading-relaxed">
                      {mat.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FitCheck Live Box Audit */}
          <div className="bg-white p-5 rounded-squircle-lg border border-stone-200 shadow-tactile space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Kiểm Định Khả Thi In Ấn (FitCheck™)
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  fitCheckReport.score >= 95
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {fitCheckReport.score}/100 Điểm
              </span>
            </div>

            {/* Calculations Readout */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-squircle bg-stone-50 border border-stone-100">
                <span className="text-[10px] text-stone-400 block">Khổ phôi trải phẳng:</span>
                <span className="font-mono font-bold text-stone-800 text-xs">{sheets} mm</span>
              </div>
              <div className="p-2.5 rounded-squircle bg-stone-50 border border-stone-100">
                <span className="text-[10px] text-stone-400 block">Bù độ dày giấy (t) mỗi mặt:</span>
                <span className="font-mono font-bold text-library-accent text-xs">
                  {addsThickness ? `+${dimensions.paperThickness.toFixed(2)} mm` : "Không (công thức cũ)"}
                </span>
              </div>
            </div>

            {/* Bé Gói Copilot Advice */}
            <div className="flex items-center gap-3 p-3 rounded-squircle bg-[#FDFBF7] border border-[#E8D8C8]">
              <GoiMascot pose="measuring" size={44} />
              <div className="text-xs text-stone-600">
                <span className="font-landing-heading font-bold text-brand-forest block">
                  Bé Gói thẩm định:
                </span>
                <span className="text-[11px] leading-snug block mt-0.5">
                  Tỉ lệ {dimensions.length}:{dimensions.width}:{dimensions.height} rất chuẩn xác! Khổ
                  giấy trải gọn gàng trong khổ in thương mại tiêu chuẩn.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {errors.length > 0 && (
        <div role="alert" className="p-4 rounded-squircle-lg bg-vibrant-coral/10 border border-vibrant-coral/30 text-xs text-stone-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-vibrant-coral-dark flex-shrink-0 mt-0.5" />
          <span>{errors.join(" ")}</span>
        </div>
      )}
      <div className={`flex flex-col sm:flex-row items-center gap-4 p-5 rounded-squircle-lg bg-white border border-stone-200 shadow-tactile ${onBack ? "justify-between" : "justify-end"}`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay Lại Bước 1 (Chọn Mẫu Hộp)</span>
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={busy || errors.length > 0}
          className="w-full sm:w-auto min-h-[44px] px-6 rounded-lg bg-library-lime hover:bg-[#AFEC88] text-library-lime-ink font-medium text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin motion-reduce:animate-none" />
          ) : null}
          <span>{nextLabel}</span>
          {!busy && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
