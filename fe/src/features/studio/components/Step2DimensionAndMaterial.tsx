"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle,
  ChevronDown,
  Link2,
  Maximize2,
  Minus,
  Paperclip,
  Plus,
  RotateCcw,
  Ruler,
  Gift,
  Coffee,
  SlidersHorizontal,
  Unlink2,
  Wand2,
} from "lucide-react";
import {
  BoxDimensions,
  BoxStructureType,
  CURRENT_FORMULA_VERSION,
  DEFAULT_CELLS,
  DEFAULT_CUPS,
  MAX_CUPS,
  CUP_CARRIER_MIN_LENGTH_MM,
  cupCarrierSizeForCups,
  cupCarrierSizesOf,
  insertSizeForCells,
  FLAT_STRUCTURES,
  MAX_CELLS,
  SHEET_ONLY_STRUCTURES,
  LOCK_BOTTOM_MIN_WEIGHT_G,
  usesLockBottom,
} from "@wrapfit/shared";

import {
  AXIS_COLORS,
  AXIS_LETTER,
  DIMENSION_AXES,
  type DimensionAxis,
} from "@/features/studio/components/three/guides";
import { formatNumber, innerVolumeMl, outerSize, sheetFits } from "@/features/studio/utils/boxMetrics";
import type { DimensionLimits } from "@/types/api";
import { GIFT_PRESETS, type GiftPreset } from "@/features/studio/utils/boxStructures";
import { Badge, Button, Field, Input } from "@/components/ui";
import { cn } from "@/utils/helpers";
import {
  clampDimension,
  dielinePiecesOf,
  dimensionErrors,
  type DimensionField,
} from "@/features/studio/utils/dieline";

/** Slider ranges when the structure has no limits (offline demo). */
const DEFAULT_RANGES: Record<DimensionField, { min: number; max: number }> = {
  length: { min: 20, max: 400 },
  width: { min: 20, max: 300 },
  height: { min: 15, max: 300 },
  paperThickness: { min: 0.3, max: 0.6 },
};

/** Units of the panel. Sizes are stored in mm (0.1 mm precision); the unit only changes what is shown and typed. */
const UNITS = {
  mm: { label: "mm", perMm: 1, step: 1, decimals: 0 },
  cm: { label: "cm", perMm: 0.1, step: 0.1, decimals: 1 },
  inch: { label: "inch", perMm: 1 / 25.4, step: 0.05, decimals: 2 },
} as const;
type Unit = keyof typeof UNITS;

/** Inner size (what the gift needs, stored) or outer size (what the shelf or courier sees). */
type Basis = "inner" | "outer";

const CUP_CARRIER_PRESETS = [
  { id: "1-cup", name: "Khay 1 ly (1×1)", rows: 1, cols: 1, length: 105, width: 105, height: 55 },
  { id: "2-cups", name: "Khay 2 ly (1×2) · Chuẩn", rows: 1, cols: 2, length: 205, width: 105, height: 55 },
  { id: "4-cups", name: "Khay 4 ly (2×2)", rows: 2, cols: 2, length: 205, width: 205, height: 60 },
  { id: "6-cups", name: "Khay 6 ly (2×3)", rows: 2, cols: 3, length: 305, width: 205, height: 60 },
];

const AXIS_LABEL: Record<DimensionAxis, { name: string; hint: string }> = {
  length: { name: "Dài", hint: "Mặt trước" },
  width: { name: "Rộng", hint: "Trước ra sau" },
  height: { name: "Cao", hint: "Đáy tới nắp" },
};

/** Size labels per structure: flat tags and cards are measured across and up, the belly band and insert elsewhere. */
function axisLabelOf(structure: BoxStructureType, axis: DimensionAxis): { name: string; hint: string } {
  if (SHEET_ONLY_STRUCTURES.includes(structure)) {
    const card = structure === "folded-card";
    return axis === "length"
      ? { name: "Ngang", hint: card ? "Thiệp đã gấp" : "Bề ngang thẻ" }
      : { name: "Cao", hint: card ? "Thiệp đã gấp" : "Cả đầu vát" };
  }
  if (structure === "belly-band") {
    const hints = { length: "Phủ bì hộp cần bọc", width: "Sâu của hộp", height: "Cao của hộp" };
    return { name: AXIS_LABEL[axis].name, hint: hints[axis] };
  }
  if (structure === "cup-carrier") {
    const hints = { length: "Số ly × 100 mm + 5 mm lề", width: "Số hàng × 100 mm + 5 mm lề", height: "Thành khay (chuẩn 55–60 mm)" };
    return { name: AXIS_LABEL[axis].name, hint: hints[axis] };
  }
  if (structure === "insert") {
    const hints = { length: "Lòng hộp chứa, trừ 1–2 mm", width: "Trước ra sau", height: "Thành khay" };
    return { name: AXIS_LABEL[axis].name, hint: hints[axis] };
  }
  return AXIS_LABEL[axis];
}

const COMMIT_DELAY_MS = 180;
const PREFS_KEY = "wf-dimension-panel";

const round1 = (value: number) => Math.round(value * 10) / 10;
const sameSize = (a: BoxDimensions, b: BoxDimensions) =>
  a.length === b.length &&
  a.width === b.width &&
  a.height === b.height &&
  a.paperThickness === b.paperThickness &&
  a.giftWeight === b.giftWeight &&
  a.bottomType === b.bottomType &&
  a.window === b.window &&
  a.showCups === b.showCups &&
  a.cells?.rows === b.cells?.rows &&
  a.cells?.cols === b.cells?.cols;

interface Step2DimensionAndMaterialProps {
  dimensions: BoxDimensions;
  onDimensionsChange: (dims: BoxDimensions) => void;
  /** Allowed size of each dimension for the box structure (`GET /templates/structures`). */
  limits?: DimensionLimits;
  /** Box structure and dieline formulas (sheet size, proportion rules); a new design uses the current formulas. */
  structure: string;
  formulaVersion?: number;
  activeAxis: DimensionAxis | null;
  onActiveAxis(axis: DimensionAxis | null): void;
}

export const Step2DimensionAndMaterial: React.FC<Step2DimensionAndMaterialProps> = ({
  dimensions, onDimensionsChange, limits, structure, formulaVersion = CURRENT_FORMULA_VERSION, activeAxis, onActiveAxis,
}) => {
  const boxType = structure as BoxStructureType;
  const sheetOnly = SHEET_ONLY_STRUCTURES.includes(boxType);
  const flat = (FLAT_STRUCTURES as readonly string[]).includes(boxType);
  const range = (field: DimensionAxis) => {
    if (boxType === "cup-carrier") {
      if (field === "height") return { min: 45, max: 80 };
      if (field === "length") return { min: 70, max: 400 };
      if (field === "width") return { min: 70, max: 300 };
    }
    return limits?.[field] ?? DEFAULT_RANGES[field];
  };

  // --- Draft and commit: the panel and the 3D preview follow every move; the studio gets the size after a short pause.
  const [draft, setDraft] = useState(dimensions);
  const committed = useRef(dimensions);
  const pending = useRef<{ timer: number; next: BoxDimensions } | null>(null);
  const initial = useRef(dimensions);
  const onChangeRef = useRef(onDimensionsChange);
  onChangeRef.current = onDimensionsChange;

  useEffect(() => {
    if (!sameSize(dimensions, committed.current)) {
      committed.current = dimensions;
      setDraft(dimensions);
    }
  }, [dimensions]);

  // Auto-correct cup carrier height if switching from a taller box or old state (ensure wall is just slightly higher than the cup)
  useEffect(() => {
    if (boxType === "cup-carrier" && (draft.height > 80 || draft.height < 45)) {
      const rows = draft.cells?.rows ?? DEFAULT_CUPS.rows;
      const targetH = rows > 1 ? 60 : 55;
      change({ ...draft, height: targetH }, true);
    }
  }, [boxType]);

  const commit = (next: BoxDimensions) => {
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = null;
    if (sameSize(next, committed.current)) return;
    committed.current = next;
    onChangeRef.current(next);
  };
  const flush = () => {
    if (pending.current) commit(pending.current.next);
  };
  const change = (next: BoxDimensions, now = false) => {
    setDraft(next);
    if (now) return commit(next);
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = { next, timer: window.setTimeout(() => commit(next), COMMIT_DELAY_MS) };
  };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unit, basis and ratio lock for the dimension inputs.
  const [unit, setUnit] = useState<Unit>("mm");
  const [basis, setBasis] = useState<Basis>("inner");
  const [locked, setLocked] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
      if (saved.unit in UNITS) setUnit(saved.unit);
      if (saved.basis === "inner" || saved.basis === "outer") setBasis(saved.basis);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ unit, basis }));
    } catch {}
  }, [unit, basis]);

  const t = draft.paperThickness;

  const clampInner = (field: DimensionAxis, value: number) => {
    const { min, max } = range(field);
    return Math.max(min, Math.min(max, round1(value)));
  };

  const updateAxis = (field: DimensionAxis, value: number, now = false) => {
    const target = clampInner(field, value);
    if (!locked) {
      change({ ...draft, [field]: target }, now);
      return;
    }
    const currentVal = Math.max(1, draft[field]);
    const ratio = target / currentVal;
    const next: BoxDimensions = {
      ...draft,
      length: clampInner("length", field === "length" ? target : Math.round(draft.length * ratio)),
      width: clampInner("width", field === "width" ? target : Math.round(draft.width * ratio)),
      height: clampInner("height", field === "height" ? target : Math.round(draft.height * ratio)),
    };
    change(next, now);
  };

  const swapLengthWidth = () => {
    const next: BoxDimensions = {
      ...draft,
      length: clampInner("length", draft.width),
      width: clampInner("width", draft.length),
    };
    change(next, true);
  };

  /** A new number of cups or cells brings its own length and width (each cup or cell keeps its room). */
  const changeCount = (sized: BoxDimensions) => {
    change({ ...sized, length: clampInner("length", sized.length), width: clampInner("width", sized.width) }, true);
  };

  const resetToInitial = () => {
    change(initial.current, true);
  };

  const fitsLimits = (dims: BoxDimensions) => dimensionErrors(dims, limits, structure).length === 0;
  const errors = dimensionErrors(draft, limits, structure);

  const pieces = dielinePiecesOf(structure, draft, formulaVersion);
  const fits = sheetFits(pieces);

  // Formatted outer sizes with Vietnamese comma
  const outerL = (draft.length + 2 * t).toFixed(1).replace(".", ",");
  const outerW = (draft.width + 2 * t).toFixed(1).replace(".", ",");
  const outerH = (draft.height + 2 * t).toFixed(1).replace(".", ",");

  return (
    <div className="space-y-4">
          <section
            data-tour="s2-size"
            className="min-w-0"
          >
            <div className="border-t border-slate-100 pt-1 divide-y divide-slate-100">
              {DIMENSION_AXES.filter((axis) => !(axis === "width" && SHEET_ONLY_STRUCTURES.includes(boxType))).map((axis) => (
                <DimensionRow
                  key={axis}
                  axis={axis}
                  label={axisLabelOf(boxType, axis)}
                  inner={draft[axis]}
                  range={range(axis)}
                  active={activeAxis === axis}
                  unit={unit}
                  basis={basis}
                  thickness={t}
                  onActive={(on) => onActiveAxis(on ? axis : null)}
                  onChange={(val, now) => updateAxis(axis, val, now)}
                  onRelease={flush}
                />
              ))}
            </div>

            <details className="border-t border-line py-2">
              <summary className="cursor-pointer py-2 text-label-sm font-semibold text-fg-muted">Tuỳ chọn đo · {unit}</summary>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                <SegmentedSwitch
                  label="Đo theo"
                  value={basis}
                  options={[
                    { value: "inner", label: "Lọt lòng" },
                    { value: "outer", label: "Phủ bì" },
                  ]}
                  onChange={setBasis}
                />

                <SegmentedSwitch
                  label="Đơn vị"
                  value={unit}
                  options={[
                    { value: "mm", label: "mm" },
                    { value: "cm", label: "cm" },
                    { value: "inch", label: "inch" },
                  ]}
                  onChange={setUnit}
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title={locked ? "Mở khoá tỉ lệ" : "Khoá tỉ lệ khi kéo"}
                  onClick={() => setLocked((prev) => !prev)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700",
                    locked && "bg-orange-50 text-fpt-orange hover:bg-orange-100/70 hover:text-fpt-orange",
                  )}
                >
                  {locked ? <Link2 className="size-4" /> : <Unlink2 className="size-4" />}
                </button>
                <button
                  type="button"
                  title="Đổi chiều Dài ↔ Rộng"
                  onClick={swapLengthWidth}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <ArrowLeftRight className="size-4" />
                </button>
                <button
                  type="button"
                  title="Khôi phục kích thước ban đầu"
                  onClick={resetToInitial}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>
            </div>
            </details>
            {!flat && boxType !== "cup-carrier" && (
              <div data-tour="s2-presets" className="pt-3">
                <div className="flex items-center gap-2 pb-2">
                  <Gift className="size-3.5 text-fpt-orange" aria-hidden />
                  <span className="text-xs font-semibold text-fg-muted">Chọn nhanh theo món quà</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 hover-scrollbar">
                  {GIFT_PRESETS.map((gp) => {
                    const isMatch =
                      gp.dims.length === draft.length &&
                      gp.dims.width === draft.width &&
                      gp.dims.height === draft.height;
                    const nextSize = { ...draft, length: gp.dims.length, width: gp.dims.width, height: gp.dims.height };
                    const presetFits = fitsLimits(nextSize);
                    return (
                      <button
                        key={gp.id}
                        type="button"
                        disabled={!presetFits}
                        aria-pressed={isMatch}
                        title={
                          presetFits
                            ? `${gp.dims.length} × ${gp.dims.width} × ${gp.dims.height} mm`
                            : "Ngoài giới hạn của cấu trúc hộp này"
                        }
                        onClick={() => change(nextSize, true)}
                        className={cn(
                          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                          isMatch
                            ? "border-fpt-orange bg-orange-50 text-fpt-orange-ink ring-1 ring-fpt-orange font-semibold"
                            : "border-line bg-surface-sunken/50 text-fg hover:border-fpt-orange/50 hover:bg-orange-50/40",
                          !presetFits && "cursor-not-allowed opacity-40",
                        )}
                      >
                        {gp.name.split("·")[0].trim()}
                        <span className="ml-1 text-fg-muted tabular-nums">
                          {gp.dims.length}×{gp.dims.width}×{gp.dims.height}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {boxType === "cup-carrier" && (
              <div data-tour="s2-cup-presets" className="pb-3 border-b border-line/60 mb-3">
                <div className="flex items-center gap-1.5 pb-2">
                  <Coffee className="size-3.5 text-fpt-orange" aria-hidden />
                  <span className="text-xs font-semibold text-fg">Chọn nhanh theo số ly (chuẩn ly 350ml – 500ml)</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 hover-scrollbar">
                  {CUP_CARRIER_PRESETS.map((cp) => {
                    const isMatch =
                      (draft.cells?.rows ?? DEFAULT_CUPS.rows) === cp.rows &&
                      (draft.cells?.cols ?? DEFAULT_CUPS.cols) === cp.cols &&
                      Math.abs(draft.length - cp.length) <= 5 &&
                      Math.abs(draft.width - cp.width) <= 5;
                    return (
                      <button
                        key={cp.id}
                        type="button"
                        aria-pressed={isMatch}
                        onClick={() =>
                          change(
                            {
                              ...draft,
                              cells: { rows: cp.rows, cols: cp.cols },
                              length: cp.length,
                              width: cp.width,
                              height: cp.height,
                            },
                            true
                          )
                        }
                        className={cn(
                          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                          isMatch
                            ? "border-fpt-orange bg-orange-50 text-fpt-orange-ink ring-1 ring-fpt-orange font-semibold shadow-2xs"
                            : "border-line bg-surface-sunken/50 text-fg hover:border-fpt-orange/50 hover:bg-orange-50/40"
                        )}
                      >
                        {cp.name}
                        <span className="ml-1 text-fg-muted tabular-nums">
                          ({cp.length}×{cp.width} mm)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Consolidated Footer: Outer dimensions + Cup carrier fit status */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-xs text-fg-muted">
              <div className="flex items-center gap-1.5">
                <Paperclip className="size-3.5 text-fpt-orange shrink-0" />
                <span>
                  {flat ? (
                    <>Giấy dày {t.toFixed(2).replace(".", ",")} mm</>
                  ) : (
                    <>
                      Phủ bì: <strong className="font-semibold text-fg">{outerL} × {outerW} × {outerH} mm</strong>
                      <span className="mx-1 text-slate-300">•</span>
                      giấy dày {t.toFixed(2).replace(".", ",")} mm
                    </>
                  )}
                </span>
              </div>

              {boxType === "cup-carrier" && (() => {
                const rows = draft.cells?.rows ?? DEFAULT_CUPS.rows;
                const cols = draft.cells?.cols ?? DEFAULT_CUPS.cols;
                const pitchL = draft.length > 0 && cols > 0 ? draft.length / cols : 100;
                const pitchW = draft.width > 0 && rows > 0 ? draft.width / rows : 100;
                const minPitch = Math.min(pitchL, pitchW);
                const isTight = minPitch < 92;
                const isTooTall = draft.height > 75;
                const isTooShort = draft.height < 45;
                const isMisaligned = isTight || isTooTall || isTooShort || Math.abs(pitchL - 100) > 12 || Math.abs(pitchW - 100) > 12;

                const autoFitCups = () => {
                  const fitL = Math.max(CUP_CARRIER_MIN_LENGTH_MM, cols * 100 + 5);
                  const fitW = rows * 100 + 5;
                  const fitH = rows > 1 ? 60 : 55;
                  change({ ...draft, length: fitL, width: fitW, height: fitH }, true);
                };

                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-orange-50/70 border border-fpt-orange/20 px-3 py-2 w-full mt-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={cn("size-2 rounded-full shrink-0", isMisaligned ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                      <span className={cn("font-medium", isMisaligned ? "text-amber-800" : "text-emerald-800")}>
                        {isTight
                          ? `Khay chật (${Math.round(minPitch)} mm) — dễ cấn ly`
                          : isTooTall
                            ? `Thành cao (${draft.height} mm) — nên 55–60 mm`
                            : isTooShort
                              ? `Thành thấp (${draft.height} mm)`
                              : `Chuẩn khít ly (${Math.round(minPitch)} mm/ly)`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={autoFitCups}
                      className={cn(
                        "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shadow-2xs cursor-pointer",
                        isMisaligned
                          ? "bg-fpt-orange text-white hover:bg-fpt-orange/90 ring-1 ring-fpt-orange/40"
                          : "bg-white border border-fpt-orange/30 text-fpt-orange-ink hover:bg-orange-50",
                      )}
                      title="Căn chỉnh kích thước chuẩn ôm khít ly"
                    >
                      <span>Tự sửa khít ly</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Advanced Structure Options (integrated into the same card without nesting) */}
            {(boxType === "tuck-top" || boxType === "lid-base" || boxType === "insert" || boxType === "cup-carrier") && (
              <div className="mt-3.5 border-t border-line/60 pt-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions((prev) => !prev)}
                  className="flex w-full items-center justify-between py-1 text-xs font-semibold text-fg hover:text-fpt-orange transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="size-3.5 text-fpt-orange" />
                    <span>Tuỳ chọn hộp</span>
                    <span className="font-normal text-fg-muted">· {boxOptionsSummary(draft, boxType)}</span>
                  </span>
                  <ChevronDown className={cn("size-3.5 text-fg-muted transition-transform", showAdvancedOptions && "rotate-180")} />
                </button>

                {showAdvancedOptions && (
                  <div className="mt-1 divide-y divide-line/40">
                    {boxType === "tuck-top" && (
                      <GiftWeightCard
                        weight={draft.giftWeight}
                        bottomType={draft.bottomType}
                        onWeight={(giftWeight, now) => change({ ...draft, giftWeight }, now)}
                        onBottom={(bottomType) => change({ ...draft, bottomType }, true)}
                      />
                    )}

                    {(boxType === "tuck-top" || boxType === "lid-base") && (
                      <WindowCard
                        on={!!draft.window}
                        where={boxType === "tuck-top" ? "mặt trước" : "mặt nắp"}
                        onChange={(window) => change({ ...draft, window: window || undefined }, true)}
                      />
                    )}

                    {boxType === "insert" && (
                      <CellsCard
                        cells={draft.cells ?? DEFAULT_CELLS}
                        onChange={(cells: { rows: number; cols: number }) => changeCount(insertSizeForCells(draft, cells))}
                      />
                    )}

                    {boxType === "cup-carrier" && (
                      <CupsCard
                        cups={draft.cells ?? DEFAULT_CUPS}
                        diameter={cupCarrierSizesOf(draft).cupDiameter}
                        showCups={draft.showCups !== false}
                        onToggleCups={(show: boolean) => change({ ...draft, showCups: show }, true)}
                        onChange={(cells: { rows: number; cols: number }) => changeCount(cupCarrierSizeForCups(draft, cells))}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
      <dl className="grid grid-cols-2 gap-3 rounded-panel bg-surface-sunken p-3">
        <HudStat label="Thể tích" value={`${formatNumber(innerVolumeMl(draft))} ml`} />
        <HudStat label="Khổ phôi" value={fits.map((fit) => `${fit.width}×${fit.height}`).join(" + ") + " mm"} />
        <HudStat label="Hộp / tờ B1" value={fits.length ? `${Math.min(...fits.map((fit) => fit.perSheet))} hộp` : "–"} />
      </dl>
      {errors.length > 0 && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-danger-bg p-3.5 text-sm text-danger-fg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{errors.join(" ")}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (boxType === "cup-carrier") {
                const rows = draft.cells?.rows ?? DEFAULT_CUPS.rows;
                const cols = draft.cells?.cols ?? DEFAULT_CUPS.cols;
                change({
                  ...draft,
                  length: Math.max(CUP_CARRIER_MIN_LENGTH_MM, cols * 100 + 5),
                  width: rows * 100 + 5,
                  height: rows > 1 ? 60 : 55,
                }, true);
              } else if (boxType === "pillow" && draft.height > draft.width / 2) {
                const width = Math.max(draft.width, 2 * range("height").min);
                change({ ...draft, width, height: Math.floor(width / 2) }, true);
              } else {
                resetToInitial();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-danger-fg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
          >
            <Wand2 className="size-3.5 text-danger-fg" />
            <span>Tự sửa lỗi kích thước</span>
          </button>
        </div>
      )}

    </div>
  );
};

/**
 * "Khối lượng quà (g)": above LOCK_BOTTOM_MIN_WEIGHT_G the tuck-top dieline gets a crash-lock bottom (FEFCO 0215,
 * shared/src/parametric/tuck-top.ts); the user may keep the plain tuck bottom instead (`bottomType: "tuck"`).
 */
function GiftWeightCard({
  weight,
  bottomType,
  onWeight,
  onBottom,
}: {
  weight: number | undefined;
  bottomType: "tuck" | "lock" | undefined;
  onWeight(weight: number | undefined, now: boolean): void;
  onBottom(bottomType: "tuck" | "lock" | undefined): void;
}) {
  const lock = usesLockBottom({ giftWeight: weight, bottomType });

  return (
    <div data-tour="s2-weight" className="pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-fg">Kiểu đáy hộp</h4>
          <p className="text-caption text-fg-muted">
            {lock ? "Đáy khóa tự động (FEFCO 0215) chịu quà nặng an toàn" : "Đáy gài tiêu chuẩn (cho quà nhẹ < 500g)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedSwitch
            value={lock ? "lock" : "tuck"}
            options={[
              { value: "tuck", label: "Đáy gài thường" },
              { value: "lock", label: "Đáy khóa chịu lực" },
            ]}
            onChange={(v) => onBottom(v as "tuck" | "lock")}
          />
        </div>
      </div>
    </div>
  );
}

/** "Số ngăn": rows × columns of a divider insert (shared/src/parametric/insert.ts). */
function CellsCard({ cells, onChange }: { cells: { rows: number; cols: number }; onChange(cells: { rows: number; cols: number }): void }) {
  const options = (max: number) => Array.from({ length: max }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  return (
    <div data-tour="s2-cells" className="pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-fg">Số ngăn chia vách</h4>
          <p className="text-caption text-fg-muted">{cells.rows * cells.cols} ô · vách in tờ rời</p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedSwitch label="Hàng" value={String(cells.rows)} options={options(MAX_CELLS.rows)} onChange={(v) => onChange({ ...cells, rows: Number(v) })} />
          <SegmentedSwitch label="Cột" value={String(cells.cols)} options={options(MAX_CELLS.cols)} onChange={(v) => onChange({ ...cells, cols: Number(v) })} />
        </div>
      </div>
    </div>
  );
}

/** "Cửa sổ trưng bày": a cut-out backed by a PET film shows the gift (shared/src/parametric/openings.ts). */
function WindowCard({ on, where, onChange }: { on: boolean; where: string; onChange(on: boolean): void }) {
  return (
    <div data-tour="s2-window" className="pt-3 border-t border-line/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-fg">Cửa sổ bóng kính PET</h4>
          <p className="text-caption text-fg-muted">
            {on ? `Khoét ô ở ${where}, dán màng PET trong suốt` : `Khoét ô ở ${where} để thấy quà (+900đ)`}
          </p>
        </div>
        <SegmentedSwitch
          value={on ? "on" : "off"}
          options={[
            { value: "off", label: "Không" },
            { value: "on", label: "Có cửa sổ" },
          ]}
          onChange={(value) => onChange(value === "on")}
        />
      </div>
    </div>
  );
}

/** "Số ly": rows × columns of cup holes in the base of a cup carrier (shared/src/parametric/cup-carrier.ts). */
function CupsCard({
  cups,
  diameter,
  showCups = true,
  onToggleCups,
  onChange,
}: {
  cups: { rows: number; cols: number };
  diameter: number;
  showCups?: boolean;
  onToggleCups?(show: boolean): void;
  onChange(cups: { rows: number; cols: number }): void;
}) {
  const options = (max: number) => Array.from({ length: max }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

  return (
    <div data-tour="s2-cups" className="pt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-fg">Số ngăn & Kích thước lỗ ly</h4>
          <p className="text-caption text-fg-muted">
            {cups.rows * cups.cols} ly · Lỗ cắt chuẩn Ø {Math.round(diameter)} mm (ôm khít ly 350ml – 500ml)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedSwitch label="Hàng" value={String(cups.rows)} options={options(MAX_CUPS.rows)} onChange={(v) => onChange({ ...cups, rows: Number(v) })} />
          <SegmentedSwitch label="Ly / hàng" value={String(cups.cols)} options={options(MAX_CUPS.cols)} onChange={(v) => onChange({ ...cups, cols: Number(v) })} />
        </div>
      </div>

      {onToggleCups && (
        <div className="flex items-center justify-between border-t border-line/40 pt-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-fg">
            <Coffee className="size-3.5 text-fpt-orange" />
            <span className="font-medium">Mô phỏng ly 350ml trong khay 3D</span>
          </div>
          <SegmentedSwitch
            value={showCups ? "on" : "off"}
            options={[
              { value: "on", label: "Có ly 350ml" },
              { value: "off", label: "Ẩn ly" },
            ]}
            onChange={(v) => onToggleCups(v === "on")}
          />
        </div>
      )}
    </div>
  );
}

/** Segmented switch pill component for unit and basis */
function SegmentedSwitch<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (val: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-slate-400 select-none">{label}</span>}
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-slate-100 p-0.5">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.hint}
              onClick={() => onChange(option.value)}
              className={cn(
                "h-7 rounded-lg px-2.5 text-xs font-medium transition-all outline-none",
                selected
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One measure: axis circular badge (D/R/C), stepper number box, and tactile slider with colored track.
 */
function DimensionRow({
  axis,
  label,
  inner,
  range,
  active,
  unit,
  basis,
  thickness,
  onActive,
  onChange,
  onRelease,
}: {
  axis: DimensionAxis;
  label: { name: string; hint: string };
  inner: number;
  range: { min: number; max: number };
  active: boolean;
  unit: Unit;
  basis: Basis;
  thickness: number;
  onActive(on: boolean): void;
  onChange(inner: number, now: boolean): void;
  onRelease(): void;
}) {
  const color = AXIS_COLORS[axis];
  const { perMm, step, decimals, label: unitLabel } = UNITS[unit];
  const offset = basis === "outer" ? 2 * thickness : 0;
  const shown = (mm: number) => {
    const converted = (mm + offset) * perMm;
    return decimals === 0 ? Math.round(converted) : Number(converted.toFixed(decimals));
  };

  const [text, setText] = useState<string | null>(null);
  const inputId = `dimension-${axis}`;

  const parse = (raw: string) => {
    const value = Number(raw.replace(",", ".").trim());
    return Number.isFinite(value) && raw.trim() !== "" ? value / perMm - offset : null;
  };
  const typed = text === null ? null : parse(text);
  const outOfRange = typed !== null && (typed < range.min - 0.05 || typed > range.max + 0.05);

  const apply = () => {
    if (text === null) return;
    const value = parse(text);
    setText(null);
    if (value !== null) onChange(value, true);
  };
  const nudge = (direction: 1 | -1, big: boolean) =>
    onChange(inner + (direction * step * (big ? 10 : 1)) / perMm, false);
  const percent = ((inner - range.min) / (range.max - range.min)) * 100;

  return (
    <div
      className="relative py-3.5 transition-colors"
      onPointerEnter={() => onActive(true)}
      onPointerLeave={() => onActive(false)}
      onFocusCapture={() => onActive(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) onActive(false);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-transform",
              active && "scale-110 shadow-sm",
            )}
            style={{ backgroundColor: color }}
          >
            {AXIS_LETTER[axis]}
          </span>
          <div className="min-w-0">
            <label htmlFor={inputId} className="block text-sm font-bold text-slate-900 cursor-pointer">
              {label.name}
            </label>
            {outOfRange && (
              <span className="block text-xs mt-0.5 text-danger-fg">
                Từ {shown(range.min)} đến {shown(range.max)} {unitLabel}
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex h-9 w-[9.5rem] shrink-0 items-center rounded-xl border bg-white transition-all",
            outOfRange
              ? "border-danger focus-within:ring-2 focus-within:ring-danger/20"
              : "border-slate-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100",
          )}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Giảm ${label.name.toLowerCase()}`}
            onClick={() => nudge(-1, false)}
            disabled={inner <= range.min}
            className="flex h-full w-8 shrink-0 items-center justify-center rounded-l-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={outOfRange || undefined}
            value={text ?? String(shown(inner))}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setText(event.target.value)}
            onBlur={apply}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply();
              else if (event.key === "Escape") setText(null);
              else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                setText(null);
                nudge(event.key === "ArrowUp" ? 1 : -1, event.shiftKey);
              }
            }}
            onKeyUp={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") onRelease();
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-right text-sm font-bold tabular-nums text-slate-900 outline-none pr-1"
          />
          <span className="pr-2 text-xs text-slate-400 select-none">{unitLabel}</span>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Tăng ${label.name.toLowerCase()}`}
            onClick={() => nudge(1, false)}
            disabled={inner >= range.max}
            className="flex h-full w-8 shrink-0 items-center justify-center rounded-r-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center">
        <input
          type="range"
          aria-label={`${label.name} (kéo)`}
          aria-valuetext={`${shown(inner)} ${unitLabel}`}
          min={range.min}
          max={range.max}
          step={1}
          value={Math.round(inner)}
          onChange={(event) => onChange(Number(event.target.value), false)}
          onPointerUp={onRelease}
          onKeyUp={onRelease}
          className="dimension-range w-full cursor-pointer"
          style={{ "--axis": color, "--fill": `${Math.max(0, Math.min(100, percent))}%` } as React.CSSProperties}
        />
      </div>

      <div className="mt-1 flex justify-between text-caption tabular-nums text-fg-muted select-none" aria-hidden>
        <span>{shown(range.min)}</span>
        <span>
          {shown(range.max)} {unitLabel}
        </span>
      </div>
    </div>
  );
}

/** Compact HUD stat for the 3D viewport bottom bar. */
function HudStat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-caption text-slate-400 leading-none">{label}</dt>
      <dd className="mt-0.5 font-sans text-xs font-bold text-slate-800 truncate">{value}</dd>
    </div>
  );
}



/** Summarise the current box options into a one-liner for the collapsed accordion header. */
function boxOptionsSummary(dims: BoxDimensions, boxType: BoxStructureType): string {
  const parts: string[] = [];
  if (boxType === "tuck-top") {
    parts.push(usesLockBottom(dims) ? "Đáy khóa" : "Đáy gài thường");
  }
  if ((boxType === "tuck-top" || boxType === "lid-base") && dims.window) {
    parts.push("Có cửa sổ");
  } else if (boxType === "tuck-top" || boxType === "lid-base") {
    parts.push("Không cửa sổ");
  }
  if (boxType === "insert" && dims.cells) {
    parts.push(`${dims.cells.rows}×${dims.cells.cols} ngăn`);
  }
  if (boxType === "cup-carrier" && dims.cells) {
    parts.push(`${dims.cells.rows * dims.cells.cols} ly`);
  }
  return parts.join(" · ") || "Riêng cho kiểu hộp này";
}
