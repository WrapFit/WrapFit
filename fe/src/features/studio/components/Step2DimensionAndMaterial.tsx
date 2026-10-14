"use client";

import React from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import { BoxDimensions, BoxStructureType, CanvasElement, CURRENT_FORMULA_VERSION, FitCheckReport } from "@wrapfit/shared";

import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { CardTitle, PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, StudioCard } from "@/features/studio/components/studioUi";
import { formatNumber, innerVolumeMl, outerSize, sheetFits } from "@/features/studio/utils/boxMetrics";
import type { DimensionLimits } from "@/types/api";
import { GIFT_PRESETS, type GiftPreset } from "@/features/studio/utils/boxStructures";
import { PAPER_STOCKS } from "@/features/studio/utils/paperStocks";
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
  /** Artwork shown on the live 3D box. */
  elements?: CanvasElement[];
  backgroundPatternSvg?: string | null;
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
  nextLabel = "Tiếp tục: chất liệu",
  busy = false,
  elements = [],
  backgroundPatternSvg = null,
}) => {
  const boxType = structure as BoxStructureType;
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

  // Since formula version 3 the dieline adds the paper thickness to each panel (shared/README.md)
  const addsThickness = formulaVersion >= 3;

  const pieces = dielinePiecesOf(structure, dimensions, formulaVersion);
  const fits = sheetFits(pieces);
  const t = dimensions.paperThickness;
  const fitTone =
    fitCheckReport.score >= 90 ? "bg-landing-lime-mist text-landing-green-deep" : fitCheckReport.score >= 70 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6">
      <StepHeader
        step="Bước 2 / 6 · Kích thước"
        title="Kích thước hộp"
        subtitle={
          addsThickness
            ? `Nhập kích thước lọt lòng theo milimét; mỗi nếp gấp được cộng thêm độ dày giấy ${t.toFixed(2)} mm để nắp đóng êm.`
            : "Nhập kích thước lọt lòng theo milimét. Dự án dùng công thức cũ: phôi chưa cộng độ dày giấy."
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Inputs */}
        <div className="flex flex-col gap-3">
          {SIDES.map((side) => {
            const { min, max } = range(side.field);
            const value = dimensions[side.field];
            return (
              <StudioCard key={side.field} as="div" className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-landing-heading text-base font-bold text-landing-ink">
                      <span aria-hidden className={`size-2.5 rounded-full ${side.dot}`} />
                      {side.label} ({side.letter})
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-landing-muted">
                      Phủ bì ≈ {outerSize(value, t)} mm · {min}–{max}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-landing-canvas p-1">
                    <button
                      type="button"
                      onClick={() => updateDim(side.field, value - 1)}
                      disabled={value <= min}
                      aria-label={`Giảm ${side.label.toLowerCase()} 1 mm`}
                      className="flex size-9 items-center justify-center rounded-full bg-white text-landing-ink transition-colors hover:bg-landing-tile disabled:opacity-40"
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <NumberField value={value} min={min} max={max} label={side.label} onCommit={(next) => updateDim(side.field, next)} />
                    <button
                      type="button"
                      onClick={() => updateDim(side.field, value + 1)}
                      disabled={value >= max}
                      aria-label={`Tăng ${side.label.toLowerCase()} 1 mm`}
                      className="flex size-9 items-center justify-center rounded-full bg-white text-landing-ink transition-colors hover:bg-landing-tile disabled:opacity-40"
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  aria-label={side.label}
                  min={min}
                  max={max}
                  step={1}
                  value={value}
                  onChange={(e) => updateDim(side.field, Number(e.target.value))}
                  className="mt-3 w-full cursor-pointer accent-landing-green"
                />
              </StudioCard>
            );
          })}

          <StudioCard className="p-4">
            <CardTitle>Món quà mẫu</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {GIFT_PRESETS.map((gp) => {
                const isMatch = gp.dims.length === dimensions.length && gp.dims.width === dimensions.width && gp.dims.height === dimensions.height;
                const presetFits = fitsLimits(gp.dims);
                return (
                  <button
                    key={gp.id}
                    type="button"
                    disabled={!presetFits}
                    aria-pressed={isMatch}
                    title={presetFits ? `${gp.dims.length} × ${gp.dims.width} × ${gp.dims.height} mm` : "Ngoài giới hạn của cấu trúc hộp này"}
                    onClick={() => applyPreset(gp)}
                    className={`rounded-full px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      isMatch ? "bg-landing-green-night text-white" : "bg-landing-canvas text-landing-ink hover:bg-landing-tile"
                    }`}
                  >
                    {gp.name}
                  </button>
                );
              })}
            </div>
          </StudioCard>
        </div>

        {/* Live model */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <StudioCard className="relative overflow-hidden">
            <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-landing-ink shadow-sm">
              <span aria-hidden className="size-2 rounded-full bg-landing-green" />
              Hộp 3D theo kích thước
            </span>
            <div className="relative h-[440px] bg-landing-canvas sm:h-[520px]">
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={dimensions}
                  foldProgress={1}
                  boxType={boxType}
                  theme={activeMaterial as never}
                  elements={elements}
                  backgroundPatternSvg={backgroundPatternSvg}
                  formulaVersion={formulaVersion}
                  showHud={false}
                  showStatusBar={false}
                  enableMacroZoom={false}
                  frameless
                  minHeight={false}
                  className="h-full w-full"
                />
              </div>
            </div>
            <p className="px-4 py-3 text-xs text-landing-muted">Kéo để xoay, cuộn để phóng to.</p>
          </StudioCard>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Thể tích lọt lòng" value={`${formatNumber(innerVolumeMl(dimensions))} ml`} />
            <Stat label="Khổ phôi trải phẳng" value={fits.map((fit) => `${fit.width} × ${fit.height}`).join(" + ") + " mm"} />
            <Stat label="Số hộp / tờ B1" value={fits.length ? `${Math.min(...fits.map((fit) => fit.perSheet))} hộp` : "–"} hint="Khổ 1020 × 720 mm" />
          </dl>
        </div>
      </div>

      {errors.length > 0 && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errors.join(" ")}
        </p>
      )}

      <StepActionBar
        back={
          onBack ? (
            <button type="button" onClick={onBack} className={SECONDARY_PILL}>
              <ArrowLeft className="size-4" aria-hidden />
              Đổi cấu trúc
            </button>
          ) : undefined
        }
        summary={
          <>
            <span className="block text-xs">Kích thước lọt lòng</span>
            <span className="font-mono text-landing-ink">
              {dimensions.length} × {dimensions.width} × {dimensions.height} mm
            </span>{" "}
            <span className={`ml-1 rounded-full px-2 py-0.5 font-mono text-xs ${fitTone}`}>FitCheck {fitCheckReport.score}</span>
          </>
        }
        next={
          <button type="button" onClick={onNext} disabled={busy || errors.length > 0} className={PRIMARY_PILL}>
            {nextLabel}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
};

/** L, W, H with the axis colours of the dimension pills. */
const SIDES = [
  { field: "length", letter: "L", label: "Dài", dot: "bg-sky-500" },
  { field: "width", letter: "W", label: "Rộng", dot: "bg-orange-400" },
  { field: "height", letter: "H", label: "Cao", dot: "bg-emerald-500" },
] as const;

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-3">
      <dt className="text-xs text-landing-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-base text-landing-ink">{value}</dd>
      {hint && <dd className="text-[11px] text-landing-muted">{hint}</dd>}
    </div>
  );
}

/** A size in mm: typed freely, applied (and kept in range) on blur or Enter. */
function NumberField({ value, min, max, label, onCommit }: { value: number; min: number; max: number; label: string; onCommit(value: number): void }) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    if (draft.trim() === "" || !Number.isFinite(parsed)) setDraft(String(value));
    else onCommit(parsed);
  };
  return (
    <label className="flex items-baseline gap-1 px-2">
      <input
        type="number"
        inputMode="decimal"
        aria-label={`${label} (mm)`}
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="w-14 bg-transparent text-right font-mono text-xl font-semibold text-landing-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-xs text-landing-muted">mm</span>
    </label>
  );
}
