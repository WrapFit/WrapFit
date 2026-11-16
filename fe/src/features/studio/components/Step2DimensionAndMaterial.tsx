"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Box,
  ChevronDown,
  Link2,
  Minus,
  Paperclip,
  Plus,
  RotateCcw,
  Ruler,
  Gift,
  SlidersHorizontal,
  Tag,
  Unlink2,
} from "lucide-react";
import {
  BoxDimensions,
  BoxStructureType,
  CanvasElement,
  CURRENT_FORMULA_VERSION,
  DEFAULT_CELLS,
  DEFAULT_CUPS,
  MAX_CUPS,
  cupCarrierSizeForCups,
  cupCarrierSizesOf,
  insertSizeForCells,
  FLAT_STRUCTURES,
  MAX_CELLS,
  SHEET_ONLY_STRUCTURES,
  FitCheckReport,
  LOCK_BOTTOM_MIN_WEIGHT_G,
  usesLockBottom,
} from "@wrapfit/shared";

import { Box3DView } from "@/features/studio/components/three/Box3DView";
import {
  AXIS_COLORS,
  AXIS_LETTER,
  DIMENSION_AXES,
  type DimensionAxis,
  type DimensionGuides,
} from "@/features/studio/components/three/guides";
import {
  PRIMARY_PILL,
  SECONDARY_PILL,
  SectionCard,
  StepActionBar,
  StepHeader,
} from "@/features/studio/components/studioUi";
import { continueTo, studioStep } from "@/features/studio/components/StudioStepper";
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
    const hints = { length: "Số ly × (miệng ly + 5 mm)", width: "Miệng ly + 5 mm mỗi hàng", height: "Thành khay" };
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
  a.cells?.rows === b.cells?.rows &&
  a.cells?.cols === b.cells?.cols;

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
  onMaterialChange: _onMaterialChange,
  fitCheckReport,
  limits,
  structure,
  formulaVersion = CURRENT_FORMULA_VERSION,
  onBack,
  onNext,
  nextLabel = continueTo(3),
  busy = false,
  elements = [],
  backgroundPatternSvg = null,
}) => {
  const boxType = structure as BoxStructureType;
  const sheetOnly = SHEET_ONLY_STRUCTURES.includes(boxType);
  const flat = (FLAT_STRUCTURES as readonly string[]).includes(boxType);
  const range = (field: DimensionAxis) => limits?.[field] ?? DEFAULT_RANGES[field];

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

  // --- Preferences of the panel (unit, basis, ratio lock, 3D guides)
  const [unit, setUnit] = useState<Unit>("mm");
  const [basis, setBasis] = useState<Basis>("inner");
  const [locked, setLocked] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [cameraView, setCameraView] = useState<"angle" | "front" | "side" | "top">("angle");
  const [showFaceLabels, setShowFaceLabels] = useState(true);
  const [active, setActive] = useState<DimensionAxis | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
      if (saved.unit in UNITS) setUnit(saved.unit);
      if (saved.basis === "inner" || saved.basis === "outer") setBasis(saved.basis);
      if (typeof saved.showGuides === "boolean") setShowGuides(saved.showGuides);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ unit, basis, showGuides }));
    } catch {}
  }, [unit, basis, showGuides]);

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

  const fitTone =
    fitCheckReport.score >= 90
      ? "bg-orange-50 text-fpt-orange-ink"
      : fitCheckReport.score >= 70
        ? "bg-warning-bg text-warning-fg"
        : "bg-danger-bg text-danger-fg";

  // Formatted outer sizes with Vietnamese comma
  const outerL = (draft.length + 2 * t).toFixed(1).replace(".", ",");
  const outerW = (draft.width + 2 * t).toFixed(1).replace(".", ",");
  const outerH = (draft.height + 2 * t).toFixed(1).replace(".", ",");

  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col px-4 sm:px-6">
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Left Column: Controls — natural flow without restrictive max-height */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Kích thước (with gift presets as inline pills) */}
          <SectionCard
            data-tour="s2-size"
            tone="accent"
            icon={Ruler}
            title="Kích thước"
            hint={sheetOnly ? "Ngang × cao" : "Dài × rộng × cao"}
            action={
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
            }
            bodyClassName="pt-3 sm:pt-3"
          >
            {/* Priority 1: Gift preset quick-pick pills (horizontal scroll) */}
            {!flat && boxType !== "cup-carrier" && (
              <div data-tour="s2-presets" className="pb-3">
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
                    const presetFits = fitsLimits(gp.dims);
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
                        onClick={() => change({ ...gp.dims, giftWeight: draft.giftWeight, bottomType: draft.bottomType, window: draft.window }, true)}
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

            {/* Basis & quick actions */}
            <div className="flex items-center justify-between pb-3">
              <SegmentedSwitch
                label="Đo theo"
                value={basis}
                options={[
                  { value: "inner", label: "Lọt lòng" },
                  { value: "outer", label: "Phủ bì" },
                ]}
                onChange={setBasis}
              />

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

            {/* 3 Dimension Rows */}
            <div className="border-t border-slate-100 pt-1 divide-y divide-slate-100">
              {DIMENSION_AXES.filter((axis) => !(axis === "width" && SHEET_ONLY_STRUCTURES.includes(boxType))).map((axis) => (
                <DimensionRow
                  key={axis}
                  axis={axis}
                  label={axisLabelOf(boxType, axis)}
                  inner={draft[axis]}
                  range={range(axis)}
                  active={active === axis}
                  unit={unit}
                  basis={basis}
                  thickness={t}
                  onActive={(on) => setActive(on ? axis : null)}
                  onChange={(val, now) => updateAxis(axis, val, now)}
                  onRelease={flush}
                />
              ))}
            </div>

            {/* Bottom note: Phủ bì & paper thickness */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-orange-50/70 px-3.5 py-2.5 text-xs text-fg-muted">
              <Paperclip className="size-4 shrink-0 text-fpt-orange" aria-hidden />
              <span>
                {flat ? (
                  <>Giấy dày {t.toFixed(2).replace(".", ",")} mm</>
                ) : (
                  <>
                    Phủ bì:{" "}
                    <strong className="font-semibold text-fg">
                      {outerL} × {outerW} × {outerH} mm
                    </strong>{" "}
                    · giấy dày {t.toFixed(2).replace(".", ",")} mm
                  </>
                )}
              </span>
            </div>
          </SectionCard>

          {/* Priority 2: Box options as collapsible accordion (collapsed by default) */}
          {(boxType === "tuck-top" || boxType === "lid-base" || boxType === "insert" || boxType === "cup-carrier") && (
            <AccordionCard
              icon={SlidersHorizontal}
              title="Tuỳ chọn hộp"
              summary={boxOptionsSummary(draft, boxType)}
            >
          {boxType === "tuck-top" && (
            <GiftWeightCard
              weight={draft.giftWeight}
              bottomType={draft.bottomType}
              onWeight={(giftWeight, now) => change({ ...draft, giftWeight }, now)}
              onBottom={(bottomType) => change({ ...draft, bottomType }, true)}
            />
          )}

          {/* Card: display window (tuck-top front, lid & base lid; docs/23 S17) */}
          {(boxType === "tuck-top" || boxType === "lid-base") && (
            <WindowCard
              on={!!draft.window}
              where={boxType === "tuck-top" ? "mặt trước" : "mặt nắp"}
              onChange={(window) => change({ ...draft, window: window || undefined }, true)}
            />
          )}

          {/* Card: cells of a divider insert (docs/23 S18) */}
          {boxType === "insert" && (
            <CellsCard
              cells={draft.cells ?? DEFAULT_CELLS}
              onChange={(cells) => changeCount(insertSizeForCells(draft, cells))}
            />
          )}

          {/* Card: cups of a cup carrier */}
          {boxType === "cup-carrier" && (
            <CupsCard
              cups={draft.cells ?? DEFAULT_CUPS}
              diameter={cupCarrierSizesOf(draft).cupDiameter}
              onChange={(cells) => changeCount(cupCarrierSizeForCups(draft, cells))}
            />
          )}
            </AccordionCard>
          )}

          {/* Gift presets grid removed — now inline pills in the dimension card above */}
        </div>

        {/* Right Column: 3D Box Preview — sticky to viewport */}
        <div className="flex flex-col gap-0 lg:sticky lg:top-24 lg:self-start">
          {/* 3D Box Card with integrated HUD stats */}
          <div className="relative flex-1 rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            {/* Top Left Badge */}
            <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm border border-slate-100 backdrop-blur-xs">
              <span aria-hidden className="size-2 rounded-full bg-fpt-orange" />
              {sheetOnly
                ? `${draft.length} × ${draft.height} mm`
                : `${draft.length} × ${draft.width} × ${draft.height} mm · ${boxType === "belly-band" ? "phủ bì hộp" : "lọt lòng"}`}
            </span>

            {/* Top Right Guide Toggle Button */}
            <button
              type="button"
              onClick={() => setShowGuides((prev) => !prev)}
              className={cn(
                "absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all shadow-sm",
                showGuides
                  ? "bg-fg text-fg-inverse hover:bg-fg/90"
                  : "bg-white/90 text-slate-700 border border-slate-200 hover:bg-slate-100",
              )}
            >
              <Ruler className="size-3.5" aria-hidden />
              <span>Đường kích thước</span>
            </button>

            {/* 3D Canvas */}
            <div className="relative h-[480px] bg-landing-canvas sm:h-[520px] lg:h-[580px]">
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={committed.current}
                  liveDimensions={draft}
                  foldProgress={1}
                  faceLabels={showFaceLabels ? true : false}
                  boxType={boxType}
                  theme={activeMaterial as never}
                  elements={elements}
                  backgroundPatternSvg={backgroundPatternSvg}
                  formulaVersion={formulaVersion}
                  cameraView={cameraView}
                  guides={
                    showGuides
                      ? {
                          active,
                          labels: {
                            length: `${draft.length} mm`,
                            width: sheetOnly ? "" : `${draft.width} mm`,
                            height: `${draft.height} mm`,
                          },
                        }
                      : null
                  }
                  showHud={false}
                  showStatusBar={false}
                  viewControls={false}
                  enableMacroZoom={false}
                  frameless
                  minHeight={false}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* Bottom HUD bar with stats + interactive 3D Controls dock */}
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white/95 via-white/85 to-transparent px-4 pb-3 pt-6 backdrop-blur-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dl className="flex items-center gap-4 text-xs tabular-nums">
                  <HudStat label="Thể tích" value={`${formatNumber(innerVolumeMl(draft))} ml`} />
                  <span className="h-4 w-px bg-slate-200" aria-hidden />
                  <HudStat label="Khổ phôi" value={fits.map((fit) => `${fit.width}×${fit.height}`).join(" + ") + " mm"} />
                  <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
                  <HudStat className="hidden sm:block" label="Hộp / tờ B1" value={fits.length ? `${Math.min(...fits.map((fit) => fit.perSheet))} hộp` : "–"} />
                </dl>
                <div className="flex items-center gap-1.5">
                  <div role="toolbar" aria-label="Góc nhìn hộp 3D" className="inline-flex items-center gap-0.5 rounded-full bg-white/90 p-1 shadow-sm ring-1 ring-black/5 backdrop-blur-md">
                    {(
                      [
                        { view: "angle", label: "3/4" },
                        { view: "front", label: "Trước" },
                        { view: "side", label: "Bên" },
                        { view: "top", label: "Trên" },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.view}
                        type="button"
                        onClick={() => setCameraView(item.view)}
                        aria-pressed={cameraView === item.view}
                        title={`Góc nhìn ${item.label.toLowerCase()}`}
                        className={cn(
                          "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors",
                          cameraView === item.view
                            ? "bg-fpt-orange text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        {item.view === "angle" && <Box className="size-3" aria-hidden />}
                        <span>{item.label}</span>
                      </button>
                    ))}
                    <span className="mx-0.5 h-3.5 w-px bg-slate-200" aria-hidden />
                    <button
                      type="button"
                      onClick={() => setShowFaceLabels((prev) => !prev)}
                      aria-pressed={showFaceLabels}
                      title={showFaceLabels ? "Ẩn nhãn tên các mặt hộp" : "Hiện nhãn tên các mặt hộp"}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors",
                        showFaceLabels
                          ? "bg-fpt-orange text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Tag className="size-3" aria-hidden />
                      <span>Nhãn mặt</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-danger-bg p-4 text-sm text-danger-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errors.join(" ")}
        </p>
      )}

      {/* Priority 3: Full-width sticky bottom action bar */}
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
          <div className="font-sans">
            <span className="block text-xs text-landing-muted">Kích thước lọt lòng</span>
            <div className="flex items-center gap-2">
              <span className="font-sans font-semibold text-landing-ink">
                {draft.length} × {draft.width} × {draft.height} mm
              </span>
              <span className={`rounded-full px-2 py-0.5 font-sans text-xs font-semibold ${fitTone}`}>
                FitCheck {fitCheckReport.score}
              </span>
            </div>
          </div>
        }
        next={
          <button type="button" data-tour="studio-next" onClick={onNext} disabled={busy || errors.length > 0} className={PRIMARY_PILL}>
            {nextLabel}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        }
      />
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
  const heavy = weight !== undefined && weight > LOCK_BOTTOM_MIN_WEIGHT_G;
  const lock = usesLockBottom({ giftWeight: weight, bottomType });
  const read = (value: string) => {
    const grams = Number(value.replace(",", "."));
    return value.trim() === "" || !Number.isFinite(grams) || grams <= 0 ? undefined : Math.min(20_000, Math.round(grams));
  };
  const [text, setText] = useState(weight === undefined ? "" : String(weight));
  // Follow a weight set elsewhere (undo, a saved project), not the one being typed.
  useEffect(() => {
    setText((current) => (read(current) === weight ? current : weight === undefined ? "" : String(weight)));
  }, [weight]);

  return (
    <div data-tour="s2-weight" className="py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field
          label="Khối lượng quà (g)"
          hint={`Trên ${LOCK_BOTTOM_MIN_WEIGHT_G} g: dùng đáy khóa.`}
          className="sm:w-56"
        >
          {(control) => (
            <Input
              {...control}
              type="text"
              inputMode="decimal"
              placeholder="Ví dụ 350"
              value={text}
              trailing="g"
              className="tabular-nums"
              onChange={(event) => {
                setText(event.target.value);
                onWeight(read(event.target.value), false);
              }}
              onBlur={() => onWeight(read(text), true)}
            />
          )}
        </Field>
        <div className="flex min-w-0 flex-1 flex-col gap-2" aria-live="polite">
          <Badge tone={lock ? "warning" : "neutral"} className="w-fit">
            {lock ? "Đáy khóa FEFCO 0215" : "Đáy gài thường"}
          </Badge>
          <p className="text-caption text-fg-muted">
            {lock
              ? heavy && bottomType !== "lock"
                ? `Quà ${weight} g: đáy tự khóa, không sụt.`
                : "Đáy tự khóa, chịu quà nặng."
              : heavy
                ? `Quà ${weight} g: đáy khóa chắc hơn.`
                : "Đủ cho quà nhẹ."}
          </p>
        </div>
      </div>
      {(heavy || bottomType) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {lock ? (
            <Button variant="secondary" size="sm" onClick={() => onBottom("tuck")}>
              Dùng đáy gài thường
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => onBottom(heavy ? undefined : "lock")}>
              Dùng đáy khóa FEFCO 0215
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** "Số ngăn": rows × columns of a divider insert (shared/src/parametric/insert.ts). */
function CellsCard({ cells, onChange }: { cells: { rows: number; cols: number }; onChange(cells: { rows: number; cols: number }): void }) {
  const options = (max: number) => Array.from({ length: max }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  return (
    <div data-tour="s2-cells" className="py-4">
      <h3 className="text-body-sm font-semibold text-fg">Số ngăn</h3>
      <p className="mt-1 text-caption text-fg-muted">
        {cells.rows * cells.cols} ô · vách in tờ riêng
      </p>
      <div className="mt-3 flex flex-wrap gap-4">
        <SegmentedSwitch label="Hàng" value={String(cells.rows)} options={options(MAX_CELLS.rows)} onChange={(v) => onChange({ ...cells, rows: Number(v) })} />
        <SegmentedSwitch label="Cột" value={String(cells.cols)} options={options(MAX_CELLS.cols)} onChange={(v) => onChange({ ...cells, cols: Number(v) })} />
      </div>
    </div>
  );
}

/** "Số ly": rows × columns of cup holes in the base of a cup carrier (shared/src/parametric/cup-carrier.ts). */
function CupsCard({
  cups,
  diameter,
  onChange,
}: {
  cups: { rows: number; cols: number };
  diameter: number;
  onChange(cups: { rows: number; cols: number }): void;
}) {
  const options = (max: number) => Array.from({ length: max }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  return (
    <div data-tour="s2-cups" className="py-4">
      <h3 className="text-body-sm font-semibold text-fg">Số ly</h3>
      <p className="mt-1 text-caption text-fg-muted">
        {diameter > 0
          ? `${cups.rows * cups.cols} ly · lỗ Ø ${Math.round(diameter)} mm`
          : "Khay quá nhỏ: tăng kích thước hoặc chọn lại số ly."}
      </p>
      <div className="mt-3 flex flex-wrap gap-4">
        <SegmentedSwitch label="Hàng" value={String(cups.rows)} options={options(MAX_CUPS.rows)} onChange={(v) => onChange({ ...cups, rows: Number(v) })} />
        <SegmentedSwitch label="Ly mỗi hàng" value={String(cups.cols)} options={options(MAX_CUPS.cols)} onChange={(v) => onChange({ ...cups, cols: Number(v) })} />
      </div>
    </div>
  );
}

/** "Cửa sổ trưng bày": a cut-out backed by a PET film shows the gift (shared/src/parametric/openings.ts). */
function WindowCard({ on, where, onChange }: { on: boolean; where: string; onChange(on: boolean): void }) {
  return (
    <div data-tour="s2-window" className="py-4">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <h3 className="text-body-sm font-semibold text-fg">Cửa sổ trưng bày</h3>
          <p className="mt-1 text-caption text-fg-muted">
            {on
              ? `Ô khoét ở ${where}, dán màng PET. Hình in trong ô bị cắt bỏ.`
              : `Khoét ô ở ${where} để thấy quà · +900đ/hộp`}
          </p>
        </div>
        <SegmentedSwitch
          label="Cửa sổ"
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
            <span className={cn("block text-xs mt-0.5", outOfRange ? "text-danger-fg" : "text-slate-400")}>
              {outOfRange ? `Từ ${shown(range.min)} đến ${shown(range.max)} ${unitLabel}` : label.hint}
            </span>
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
      <dt className="text-[10px] text-slate-400 leading-none">{label}</dt>
      <dd className="mt-0.5 font-sans text-xs font-bold text-slate-800 truncate">{value}</dd>
    </div>
  );
}

/** Collapsible accordion card — collapsed by default. Shows a one-line summary when closed. */
function AccordionCard({
  icon: Icon,
  title,
  summary,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-sheet border border-line bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 border-b border-line bg-surface-sunken/60 px-4 py-3 text-left sm:px-5"
      >
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-fpt-orange ring-1 ring-line"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-landing-heading text-body font-bold text-fg">{title}</h2>
          {!open && summary && <p className="truncate text-caption text-fg-muted">{summary}</p>}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-fg-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && <div className="divide-y divide-line p-4 sm:p-5">{children}</div>}
    </section>
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
