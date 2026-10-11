"use client";

import React from "react";
import {
  Ruler,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Gift,
  Check,
  Info,
} from "lucide-react";
import { BoxDimensions, FitCheckReport } from "@wrapfit/shared";

import { GoiMascot } from "@/components/common/GoiMascot";
import type { DimensionLimits } from "@/types/api";
import { MmInput } from "./MmInput";
import { clampDimension, dimensionErrors, type DimensionField } from "@/features/studio/utils/dieline";

interface GiftPreset {
  id: string;
  name: string;
  category: string;
  dims: { length: number; width: number; height: number; paperThickness: number };
}

const GIFT_PRESETS: GiftPreset[] = [
  {
    id: "candle",
    name: "Hũ Nến Thơm Gỗ Thông",
    category: "Home & Craft",
    dims: { length: 85, width: 85, height: 105, paperThickness: 0.45 },
  },
  {
    id: "perfume",
    name: "Chai Nước Hoa 50ml",
    category: "Cosmetics",
    dims: { length: 65, width: 40, height: 120, paperThickness: 0.42 },
  },
  {
    id: "jewelry",
    name: "Hộp Vòng Tay / Dây Chuyền",
    category: "Luxury",
    dims: { length: 100, width: 100, height: 60, paperThickness: 0.5 },
  },
  {
    id: "lipstick",
    name: "Thỏi Son Môi Handmade",
    category: "Beauty",
    dims: { length: 28, width: 28, height: 88, paperThickness: 0.35 },
  },
  {
    id: "ceramic_mug",
    name: "Cốc Gốm Mộc & Trà Hoa",
    category: "Artisan",
    dims: { length: 95, width: 95, height: 105, paperThickness: 0.48 },
  },
  {
    id: "macaron",
    name: "Hộp 6 Bánh Macaron",
    category: "Pastry",
    dims: { length: 180, width: 55, height: 50, paperThickness: 0.4 },
  },
];

const PAPER_MATERIALS = [
  {
    id: "ivory",
    name: "Giấy Ivory Mộc 300 GSM",
    finish: "Cán Mờ Tự Nhiên",
    desc: "Mặt giấy đanh trắng ngà, bắt mực in rực rỡ, độ cứng tiêu chuẩn cho bán lẻ.",
    caliper: 0.38,
  },
  {
    id: "kraft",
    name: "Giấy Kraft Linen 300 GSM",
    finish: "Mộc Thủ Công",
    desc: "Màu nâu kraft mộc mạc ấm áp, 100% tái chế thân thiện môi trường.",
    caliper: 0.42,
  },
  {
    id: "forest",
    name: "Giấy Duplex Cao Cấp 350 GSM",
    finish: "Phủ Màng Nhung Soft-Touch",
    desc: "Dày dặn, bề mặt êm ái như nhung lụa, chống trầy xước.",
    caliper: 0.45,
  },
  {
    id: "gold_foil",
    name: "Carton Lạnh Bồi Mỹ Thuật 400 GSM",
    finish: "Ép Kim Vàng Champagne",
    desc: "Khối lượng đầm tay, nắp cứng cáp tuyệt đối, dành riêng cho quà VIP.",
    caliper: 0.52,
  },
];

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

  const fitsLimits = (dims: BoxDimensions) => dimensionErrors(dims, limits).length === 0;
  const errors = dimensionErrors(dimensions, limits);

  const applyPreset = (p: GiftPreset) => {
    onDimensionsChange(p.dims);
  };

  // Approximate flat dieline sheet footprint
  const estSheetW = dimensions.length * 2 + dimensions.width * 2 + 30;
  const estSheetH = dimensions.height + dimensions.width * 2 + 40;

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 py-8 space-y-8 animate-fadeIn font-sans">
      {/* Heading */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-brand-forest">
          <Ruler className="w-3.5 h-3.5" />
          <span>Bước 2: Cấu Hình Kích Thước & Vật Liệu Giấy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-brand-forest">
          Đo Kích Thước Món Quà Chuẩn CAD (mm)
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          Kích thước được tính theo lọt lòng của hộp. Hệ thống tự động bù trừ độ dày giấy{" "}
          <span className="font-mono font-bold text-vibrant-cobalt">
            +{dimensions.paperThickness * 2}mm
          </span>{" "}
          để đảm bảo quà vừa vặn, nắp gài đóng êm không bị cấn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Parametric Dimension Sliders & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Gift Presets */}
          <div className="bg-white p-5 rounded-squircle-lg border border-stone-200 shadow-tactile space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-vibrant-cobalt" />
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
                        ? "border-vibrant-cobalt bg-blue-50/70 text-vibrant-cobalt shadow-sm ring-2 ring-blue-500/20"
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
                <span className="font-mono font-bold text-vibrant-cobalt text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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
                className="w-full accent-vibrant-cobalt cursor-pointer"
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
                <span className="text-[10px] text-stone-400 block">Ước tính khổ trải phẳng:</span>
                <span className="font-mono font-bold text-stone-800 text-xs">
                  {estSheetW} × {estSheetH} mm
                </span>
              </div>
              <div className="p-2.5 rounded-squircle bg-stone-50 border border-stone-100">
                <span className="text-[10px] text-stone-400 block">Bù trừ nếp gập (2t):</span>
                <span className="font-mono font-bold text-vibrant-cobalt text-xs">
                  +{(dimensions.paperThickness * 2).toFixed(2)} mm
                </span>
              </div>
            </div>

            {/* Bé Gói Copilot Advice */}
            <div className="flex items-center gap-3 p-3 rounded-squircle bg-[#FDFBF7] border border-[#E8D8C8]">
              <GoiMascot pose="measuring" size={44} />
              <div className="text-xs text-stone-600">
                <span className="font-serif font-bold text-brand-forest block">
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
          className="w-full sm:w-auto min-h-[44px] px-7 py-3 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white font-semibold text-sm shadow-tactile flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
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
