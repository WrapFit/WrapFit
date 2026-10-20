"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Link2,
  Minus,
  Paperclip,
  Plus,
  RotateCcw,
  Ruler,
  Unlink2,
} from "lucide-react";
import {
  BoxDimensions,
  BoxStructureType,
  CanvasElement,
  CURRENT_FORMULA_VERSION,
  FitCheckReport,
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
  StepActionBar,
  StepHeader,
} from "@/features/studio/components/studioUi";
import { formatNumber, innerVolumeMl, outerSize, sheetFits } from "@/features/studio/utils/boxMetrics";
import type { DimensionLimits } from "@/types/api";
import { GIFT_PRESETS, type GiftPreset } from "@/features/studio/utils/boxStructures";
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
  length: { name: "Dài", hint: "Chiều dài mặt trước" },
  width: { name: "Rộng", hint: "Chiều sâu, từ trước ra sau" },
  height: { name: "Cao", hint: "Từ đáy lên nắp" },
};

const COMMIT_DELAY_MS = 180;
const PREFS_KEY = "wf-dimension-panel";

const round1 = (value: number) => Math.round(value * 10) / 10;
const sameSize = (a: BoxDimensions, b: BoxDimensions) =>
  a.length === b.length &&
  a.width === b.width &&
  a.height === b.height &&
  a.paperThickness === b.paperThickness;

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
  nextLabel = "Tiếp tục: chất liệu",
  busy = false,
  elements = [],
  backgroundPatternSvg = null,
}) => {
  const boxType = structure as BoxStructureType;
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
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6">
      <StepHeader
        title="Kích thước hộp"
        subtitle={`Nhập kích thước lọt lòng của món quà; mỗi nếp gấp được cộng độ dày giấy ${t.toFixed(2)} mm để nắp đóng êm.`}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Left Column: Dimension Inputs & Presets */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Kích thước */}
          <div data-tour="s2-size" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            {/* Row 1: Heading & Unit Segmented Switch */}
            <div className="flex items-center justify-between pb-3">
              <h2 className="font-landing-heading text-title font-bold text-slate-900">
                Kích thước
              </h2>
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

            {/* Row 2: Basis Segmented Switch & Action Icons */}
            <div className="flex items-center justify-between border-t border-slate-100 py-3">
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
              {DIMENSION_AXES.map((axis) => (
                <DimensionRow
                  key={axis}
                  axis={axis}
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
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100/70 px-3.5 py-2.5 text-xs text-slate-500">
              <Paperclip className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span>
                Phủ bì:{" "}
                <strong className="font-semibold text-slate-800">
                  {outerL} × {outerW} × {outerH} mm
                </strong>{" "}
                · giấy dày {t.toFixed(2)} mm, đổi ở bước Chất liệu.
              </span>
            </div>
          </div>

          {/* Card 2: Món quà mẫu */}
          <div data-tour="s2-presets" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="font-landing-heading text-title font-bold text-slate-900">
                Món quà mẫu
              </h2>
              <span className="text-xs text-slate-400">
                Kích thước lọt lòng chuẩn
              </span>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
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
                    onClick={() => change(gp.dims, true)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-all",
                      isMatch
                        ? "border-fpt-orange bg-orange-50/20 ring-1 ring-fpt-orange shadow-xs"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs",
                      !presetFits && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <div className="font-bold text-xs text-slate-900 leading-snug truncate">
                      {gp.name}
                    </div>
                    <div className="mt-1 text-caption text-fg-muted tabular-nums">
                      {gp.dims.length} × {gp.dims.width} × {gp.dims.height} mm
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: 3D Box Preview & Stats */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {/* 3D Box Card */}
          <div className="relative rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            {/* Top Left Badge */}
            <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm border border-slate-100 backdrop-blur-xs">
              <span aria-hidden className="size-2 rounded-full bg-fpt-orange" />
              {draft.length} × {draft.width} × {draft.height} mm · lọt lòng
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
            <div className="relative h-[440px] bg-landing-canvas sm:h-[500px]">
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={committed.current}
                  liveDimensions={draft}
                  foldProgress={1}
                  boxType={boxType}
                  theme={activeMaterial as never}
                  elements={elements}
                  backgroundPatternSvg={backgroundPatternSvg}
                  formulaVersion={formulaVersion}
                  guides={
                    showGuides
                      ? {
                          active,
                          labels: {
                            length: `${draft.length} mm`,
                            width: `${draft.width} mm`,
                            height: `${draft.height} mm`,
                          },
                        }
                      : null
                  }
                  showHud={false}
                  showStatusBar={false}
                  viewControls={true}
                  enableMacroZoom={false}
                  frameless
                  minHeight={false}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* Bottom Caption */}
            <div className="border-t border-slate-100 bg-white/80 px-4 py-2.5 text-center">
              <p className="text-xs text-slate-400">
                Kéo để xoay, cuộn để phóng to. Rê chuột lên một cạnh bên trái để thấy nó trên hộp.
              </p>
            </div>
          </div>

          {/* Bottom 3 Stat Cards */}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="Thể tích lọt lòng"
              value={`${formatNumber(innerVolumeMl(draft))} ml`}
            />
            <Stat
              label="Khổ phôi trải phẳng"
              value={fits.map((fit) => `${fit.width} × ${fit.height}`).join(" + ") + " mm"}
            />
            <Stat
              label="Số hộp / tờ B1"
              value={fits.length ? `${Math.min(...fits.map((fit) => fit.perSheet))} hộp` : "–"}
              hint="Khổ 1020 × 720 mm"
            />
          </dl>
        </div>
      </div>

      {errors.length > 0 && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-danger-bg p-4 text-sm text-danger-fg">
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
              {AXIS_LABEL[axis].name}
            </label>
            <span className={cn("block text-xs mt-0.5", outOfRange ? "text-danger-fg" : "text-slate-400")}>
              {outOfRange ? `Từ ${shown(range.min)} đến ${shown(range.max)} ${unitLabel}` : AXIS_LABEL[axis].hint}
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
            aria-label={`Giảm ${AXIS_LABEL[axis].name.toLowerCase()}`}
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
            aria-label={`Tăng ${AXIS_LABEL[axis].name.toLowerCase()}`}
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
          aria-label={`${AXIS_LABEL[axis].name} (kéo)`}
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

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 font-sans text-base font-bold text-slate-900">{value}</dd>
      {hint && <dd className="mt-0.5 text-caption text-fg-muted">{hint}</dd>}
    </div>
  );
}
