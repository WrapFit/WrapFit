"use client";
/* ds-artwork: paper swatches draw the colour of real paper stocks (docs/13_DESIGN_SYSTEM.md §2). */

import {
  artPaletteOf,
  FINISH_LABELS,
  LAMINATIONS,
  parseLibraryArt,
  quote,
  type BoxDimensions,
  type CanvasElement,
  type DielinePiece,
  type QuoteFinish,
} from "@wrapfit/shared";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleSlash,
  Columns3,
  Crown,
  Droplets,
  ExternalLink,
  Feather,
  Info,
  PaintRoller,
  Lock,
  PackageOpen,
  Shield,
  SlidersHorizontal,
  Gem,
  Stamp,
  Sun,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatVnd } from "@/features/pricing";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { clampDimension } from "@/features/studio/utils/dieline";
import { PAPER_STOCKS, paperAdvice, paperStockOf, type PaperStock } from "@/features/studio/utils/paperStocks";
import { Dialog, Tooltip } from "@/components/ui";
import type { DimensionLimits } from "@/types/api";
import { cn } from "@/utils/helpers";

/** Prices of this step are per box for a run of this many boxes. */
const PRICE_QUANTITY = 50;
const EXTRAS: QuoteFinish[] = ["foil", "spot-uv", "emboss"];
const LAMINATION_SHORT: Partial<Record<QuoteFinish, string>> = {
  "matte-lamination": "Mờ",
  "gloss-lamination": "Bóng",
  "soft-touch-lamination": "Nhung",
};

interface Step3PaperFinishProps {
  boxType: BoxStructureType;
  dimensions: BoxDimensions;
  onDimensionsChange(dimensions: BoxDimensions): void;
  activeMaterial: BoxMaterialTheme;
  onMaterialChange(theme: BoxMaterialTheme): void;
  finishes: QuoteFinish[];
  onFinishesChange(finishes: QuoteFinish[]): void;
  /** Dieline of the box: boxes per sheet, for the prices. */
  pieces: DielinePiece[];
  limits?: DimensionLimits;
  elements: CanvasElement[];
}

const isLight = (hex: string | undefined) => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.72;
};

/**
 * Texts and library art printed in a light colour straight on the paper: they disappear on brown kraft (no white ink).
 * On a panel covered by a printed background they stand on that background instead.
 */
function lightOnKraft(elements: CanvasElement[]) {
  const covered = new Set(elements.filter((el) => el.type === "pattern").map((el) => el.panelId));
  return elements.filter((el) => {
    if (covered.has(el.panelId)) return false;
    if (el.type === "text") return isLight(el.style?.color);
    const ref = parseLibraryArt(el.content);
    return ref !== null && el.type !== "pattern" && isLight(artPaletteOf(ref.palette)?.base);
  }).length;
}

/** A sample of the paper: its printed side, with what shows at the edge (grey back, board core, fibres). */
function PaperSwatch({ paper, className }: { paper: PaperStock; className?: string }) {
  const { outside, inside } = paper.swatch;
  return (
    <svg viewBox="0 0 56 56" className={cn("size-10 shrink-0 rounded-lg ring-1 ring-black/10", className)} aria-hidden>
      <rect width="56" height="56" fill={outside} />
      {paper.theme === "kraft" &&
        [6, 13, 21, 27, 34, 42, 49].map((y, i) => (
          <path key={y} d={`M0 ${y} q 14 ${i % 2 ? 2 : -2} 28 0 t 28 0`} stroke="#9C7651" strokeOpacity="0.22" strokeWidth="0.7" fill="none" />
        ))}
      {paper.theme === "rigid" && (
        <>
          <rect y="44" width="56" height="12" fill={inside} />
          <rect y="44" width="56" height="1.5" fill={outside} />
        </>
      )}
      {(paper.theme === "duplex" || paper.theme === "ivory" || paper.theme === "kraft") && <path d="M56 36 L36 56 L56 56 Z" fill={inside} />}
      {(paper.theme === "duplex" || paper.theme === "ivory" || paper.theme === "kraft") && <path d="M56 36 L36 56" stroke="#1C1917" strokeOpacity="0.15" />}
      <rect width="56" height="56" fill="none" stroke="#1C1917" strokeOpacity="0.12" rx="12" />
    </svg>
  );
}

/** A 1–5 score as five short bars (read out as "x trên 5"). */
function Meter({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label} ${value}/5`}>
      <span className="sr-only">
        {label} {value} trên 5
      </span>
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("h-1.5 w-3 rounded-full", n <= value ? "bg-fg" : "bg-line")} />
        ))}
      </span>
    </span>
  );
}

/**
 * The cut edge of the sheet, magnified: the layers a customer sees when they tear a sample. It is the surest way to
 * tell the stocks apart (white through, grey core, brown fibres, thick board).
 */
function EdgeSection({ paper }: { paper: PaperStock }) {
  const { outside, inside } = paper.swatch;
  return (
    <svg viewBox="0 0 120 40" className="h-10 w-full" aria-hidden>
      {paper.theme === "rigid" ? (
        <>
          <rect x="0" y="6" width="120" height="28" rx="2" fill={inside} />
          <path d="M0 4 H116 a4 4 0 0 1 4 4 V32 a4 4 0 0 1 -4 4 H0" fill="none" stroke={outside} strokeWidth="3" />
          <path d="M0 4 H116 a4 4 0 0 1 4 4 V32 a4 4 0 0 1 -4 4 H0" fill="none" stroke="#1C1917" strokeOpacity="0.15" strokeWidth="0.6" />
        </>
      ) : paper.theme === "duplex" ? (
        <>
          <rect x="0" y="12" width="120" height="3" fill={outside} />
          <rect x="0" y="15" width="120" height="13" fill={inside} />
        </>
      ) : (
        <rect x="0" y="12" width="120" height="16" fill={outside} />
      )}
      {paper.theme === "kraft" &&
        [16, 20, 24].map((y) => <path key={y} d={`M0 ${y} q 30 2 60 0 t 60 0`} stroke="#9C7651" strokeOpacity="0.35" strokeWidth="0.8" fill="none" />)}
      {paper.theme !== "rigid" && <rect x="0" y="12" width="120" height="16" fill="none" stroke="#1C1917" strokeOpacity="0.15" strokeWidth="0.6" />}
    </svg>
  );
}

/** How to recognise the chosen stock: its two sides and its cut edge, what it feels like, what prints well on it. */
function PaperIdentity({ paper }: { paper: PaperStock }) {
  const { identity } = paper;
  const sides = [
    { label: "Mặt in", color: paper.swatch.outside, text: identity.printSide },
    { label: "Mặt trong", color: paper.swatch.inside, text: identity.inside },
  ];
  // At a glance: the two sides and the cut edge as pictures, four scores as bars. The words wait behind "Chi tiết".
  const scores = [
    { label: "Màu in", value: paper.ratings.color },
    { label: "Độ cứng", value: paper.stiffness },
    { label: "Sang", value: paper.ratings.premium },
    { label: "Xanh", value: paper.ratings.eco },
  ];
  return (
    <section aria-label={`Nhận biết ${paper.name}`} className="mt-3 rounded-panel bg-surface-sunken p-3">
      <div className="grid grid-cols-3 gap-2">
        {sides.map((side) => (
          <div key={side.label} className="flex flex-col gap-1" title={side.text}>
            <span aria-hidden className="relative h-9 overflow-hidden rounded-control ring-1 ring-fg/10" style={{ backgroundColor: side.color }}>
              {paper.theme === "kraft" && (
                <span className="absolute inset-0 bg-[repeating-linear-gradient(170deg,rgba(156,118,81,0.18)_0_1px,transparent_1px_5px)]" />
              )}
            </span>
            <span className="text-caption text-fg-muted">{side.label}</span>
          </div>
        ))}
        <div className="flex flex-col gap-1" title={identity.edge}>
          <span className="flex h-9 items-center rounded-control bg-surface-raised px-1 ring-1 ring-fg/10">
            <EdgeSection paper={paper} />
          </span>
          <span className="text-caption text-fg-muted">Cạnh cắt</span>
        </div>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {scores.map((score) => (
          <li key={score.label} className="flex items-center justify-between gap-2 text-caption text-fg-muted">
            {score.label}
            <Meter value={score.value} label={score.label} />
          </li>
        ))}
      </ul>
      <details className="group mt-2">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-caption font-semibold text-fg">
          Chi tiết
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
        </summary>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-caption leading-5">
        <dt className="text-fg-muted">Mặt in</dt>
        <dd className="text-fg">{identity.printSide}</dd>
        <dt className="text-fg-muted">Mặt trong</dt>
        <dd className="text-fg">{identity.inside}</dd>
        <dt className="text-fg-muted">Cạnh cắt</dt>
        <dd className="text-fg">{identity.edge}</dd>
        <dt className="text-fg-muted">Cầm tay</dt>
        <dd className="text-fg">{identity.feel}</dd>
        <dt className="text-fg-muted">Màu in</dt>
        <dd className="text-fg">{identity.print}</dd>
        <dt className="text-fg-muted">Hợp với</dt>
        <dd className="text-fg">{paper.bestFor}</dd>
      </dl>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-caption font-semibold text-success-fg">Điểm mạnh</p>
          <ul className="mt-1 space-y-1 text-caption leading-5 text-fg">
            {paper.pros.map((item) => (
              <li key={item} className="flex gap-1.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success-fg" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-caption font-semibold text-warning-fg">Cần lưu ý</p>
          <ul className="mt-1 space-y-1 text-caption leading-5 text-fg">
            {paper.cons.map((item) => (
              <li key={item} className="flex gap-1.5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning-fg" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      </details>
    </section>
  );
}

/** Compare table of all paper stocks, shown in a clean Modal dialog. */
function PaperCompareDialog({
  open,
  onClose,
  current,
  prices,
  onChoose,
}: {
  open: boolean;
  onClose(): void;
  current: BoxMaterialTheme;
  prices: Record<string, number>;
  onChoose(stock: PaperStock): void;
}) {
  if (!open) return null;

  const rows: { label: string; cell(stock: PaperStock): React.ReactNode }[] = [
    { label: "Mặt in", cell: (stock) => <span className="text-xs leading-5 text-fg">{stock.identity.printSide}</span> },
    {
      label: "Mặt trong",
      cell: (stock) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm ring-1 ring-fg/15" style={{ backgroundColor: stock.swatch.inside }} />
          {stock.theme === "duplex" ? "Xám" : stock.theme === "kraft" ? "Nâu" : stock.theme === "rigid" ? "Xám carton" : "Trắng"}
        </span>
      ),
    },
    { label: "Màu in", cell: (stock) => <Meter value={stock.ratings.color} label="Màu in" /> },
    { label: "Độ cứng", cell: (stock) => <Meter value={stock.stiffness} label="Độ cứng" /> },
    { label: "Cảm giác cao cấp", cell: (stock) => <Meter value={stock.ratings.premium} label="Cảm giác cao cấp" /> },
    { label: "Thân thiện môi trường", cell: (stock) => <Meter value={stock.ratings.eco} label="Thân thiện môi trường" /> },
    { label: "Độ dày", cell: (stock) => <span className="tabular-nums font-mono">{stock.spec.caliper.toFixed(2).replace(".", ",")} mm</span> },
    {
      label: "Ưu điểm",
      cell: (stock) => (
        <ul className="space-y-1 text-xs text-fg">
          {stock.pros.map((p) => (
            <li key={p} className="flex items-start gap-1">
              <Check className="mt-0.5 size-3 shrink-0 text-success-fg" aria-hidden />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Cần lưu ý",
      cell: (stock) => (
        <ul className="space-y-1 text-xs text-fg">
          {stock.cons.map((c) => (
            <li key={c} className="flex items-start gap-1">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning-fg" aria-hidden />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <Dialog
      title="So sánh chi tiết 4 loại giấy bao bì"
      size="xl"
      onClose={onClose}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-caption">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-3 py-2.5 font-medium text-fg-muted w-36">
                Tiêu chí
              </th>
              {PAPER_STOCKS.map((stock) => {
                const isSelected = stock.theme === current;
                return (
                  <th key={stock.theme} scope="col" className={cn("px-3 py-2.5", isSelected && "bg-orange-50/80 rounded-t-xl")}>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm text-fg">{stock.name}</span>
                      <span className="text-xs text-fg-muted font-normal">{stock.finishLabel}</span>
                      {isSelected ? (
                        <div className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-fpt-orange py-1 text-xs font-semibold text-white shadow-xs">
                          <Check className="size-3.5 stroke-[2.5]" aria-hidden />
                          <span>Đang chọn</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onChoose(stock);
                            onClose();
                          }}
                          className="mt-1 w-full rounded-lg border border-line bg-white py-1 text-xs font-semibold text-fg hover:border-fpt-orange hover:text-fpt-orange-ink transition-colors"
                        >
                          Chọn loại này
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-slate-50/60 transition-colors">
                <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium text-fg-muted text-xs align-top">
                  {row.label}
                </th>
                {PAPER_STOCKS.map((stock) => (
                  <td key={stock.theme} className={cn("px-3 py-2.5 align-top", stock.theme === current && "bg-orange-50/40")}>
                    {row.cell(stock)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

/** Step 3: the paper stock (`materialSpec` of the API) and the finishes of the print shop, priced as they change. */
export function Step3PaperFinish({
  boxType,
  dimensions,
  onDimensionsChange,
  activeMaterial,
  onMaterialChange,
  finishes,
  onFinishesChange,
  pieces,
  limits,
  elements,
}: Step3PaperFinishProps) {
  const paper = paperStockOf(activeMaterial);
  const [showCompare, setShowCompare] = useState(false);

  // --- Draft and commit: slider and GSM / mm readouts follow every move smoothly at 60fps;
  // the studio state and 3D rebuild happen after a short pause (matching Step 2).
  const [draft, setDraft] = useState(dimensions);
  const committed = useRef(dimensions);
  const pending = useRef<{ timer: number; next: BoxDimensions } | null>(null);
  const onChangeRef = useRef(onDimensionsChange);
  onChangeRef.current = onDimensionsChange;

  useEffect(() => {
    if (
      dimensions.length !== committed.current.length ||
      dimensions.width !== committed.current.width ||
      dimensions.height !== committed.current.height ||
      dimensions.paperThickness !== committed.current.paperThickness
    ) {
      committed.current = dimensions;
      setDraft(dimensions);
    }
  }, [dimensions]);

  const commit = (next: BoxDimensions) => {
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = null;
    if (
      next.length === committed.current.length &&
      next.width === committed.current.width &&
      next.height === committed.current.height &&
      next.paperThickness === committed.current.paperThickness
    ) {
      return;
    }
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
    pending.current = { next, timer: window.setTimeout(() => commit(next), 160) };
  };

  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = draft.paperThickness;
  const range = limits?.paperThickness ?? { min: 0.3, max: 0.6 };
  const advice = useMemo(() => paperAdvice(boxType, draft), [boxType, draft]);
  const lamination = finishes.find((f) => LAMINATIONS.includes(f)) ?? null;
  const lightCount = useMemo(() => (paper.theme === "kraft" ? lightOnKraft(elements) : 0), [paper.theme, elements]);

  const finishSummary = useMemo(() => {
    const parts: string[] = [];
    if (lamination) {
      parts.push(`Cán màng ${LAMINATION_SHORT[lamination] ?? lamination}`);
    }
    const activeExtras = EXTRAS.filter((e) => finishes.includes(e));
    if (activeExtras.length > 0) {
      parts.push(activeExtras.map((e) => FINISH_LABELS[e]).join(", "));
    }
    if (parts.length === 0) {
      return "Mặc định: Không cán màng · Để mộc theo giấy";
    }
    return parts.join(" · ");
  }, [lamination, finishes]);

  const perBox = (stock: PaperStock, withFinishes: QuoteFinish[]) =>
    quote({ structure: boxType, pieces, quantity: PRICE_QUANTITY, paper: stock.quotePaper, finishes: withFinishes }).perBox;
  const prices = useMemo(() => {
    const byPaper = Object.fromEntries(PAPER_STOCKS.map((stock) => [stock.theme, perBox(stock, finishes)]));
    const base = perBox(paper, []);
    const extra = (finish: QuoteFinish) => Math.max(0, perBox(paper, [finish]) - base);
    return { byPaper, extra, current: byPaper[paper.theme] };
    // perBox reads only these
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxType, pieces, finishes, paper]);

  const choose = (stock: PaperStock) => {
    onMaterialChange(stock.theme);
    const next = { ...draft, paperThickness: clampDimension(limits, "paperThickness", stock.spec.caliper) };
    change(next, true);
  };
  const setLamination = (next: QuoteFinish | null) => {
    const rest = finishes.filter((f) => !LAMINATIONS.includes(f));
    // Spot UV is printed on a laminated sheet.
    onFinishesChange(next ? [next, ...rest] : rest.filter((f) => f !== "spot-uv"));
  };
  const toggle = (finish: QuoteFinish) =>
    onFinishesChange(finishes.includes(finish) ? finishes.filter((f) => f !== finish) : [...finishes, finish]);

  const chip = (on: boolean, disabled = false) =>
    cn(
      "flex min-h-11 flex-col items-start rounded-control border px-3 py-2 text-left transition-colors motion-reduce:transition-none",
      on ? "border-fpt-orange-ink bg-fpt-orange-light" : "border-line bg-surface-raised hover:border-fg",
      disabled && "cursor-not-allowed opacity-50 hover:border-line"
    );

  return (
    <>
          <section
            aria-label="Chất liệu giấy"
            className="min-w-0"
          >
            {/* Top action: So sánh các loại giấy */}
            <div className="flex items-center justify-end pb-3">
              <button
                type="button"
                onClick={() => setShowCompare(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-fpt-orange hover:text-fpt-orange-ink hover:underline transition-colors"
              >
                <span>So sánh các loại giấy</span>
                <ExternalLink className="size-3.5" aria-hidden />
              </button>
            </div>

            <div role="radiogroup" aria-label="Giấy" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PAPER_STOCKS.map((stock) => {
                const active = stock.theme === paper.theme;
                const soft = advice.tooSoft[stock.theme];
                const isRecommended = stock.theme === advice.recommended;
                return (
                  <button
                    key={stock.theme}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choose(stock)}
                    className={cn(
                      "group relative flex items-start gap-3 rounded-panel border-2 p-3 text-left transition-all motion-reduce:transition-none",
                      active
                        ? "border-fpt-orange bg-fpt-orange-light/20 shadow-xs ring-1 ring-fpt-orange/20"
                        : "border-line bg-surface-raised hover:border-line-strong hover:shadow-xs"
                    )}
                  >
                    <PaperSwatch paper={stock} className="size-10 rounded-lg shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-body-sm font-bold text-fg truncate">{stock.name}</span>
                        <span
                          className={cn(
                            "flex size-4.5 shrink-0 items-center justify-center rounded-full transition-all",
                            active
                              ? "bg-fpt-orange text-white shadow-xs"
                              : "border border-line bg-surface-sunken/40 text-transparent group-hover:border-line-strong"
                          )}
                          aria-hidden
                        >
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      </div>
                      {isRecommended && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <Tooltip content={advice.reason} side="top">
                            <span className="cursor-help rounded-full bg-success-bg px-2 py-0.5 text-label-sm font-semibold text-success-fg shrink-0">
                              Đề xuất
                            </span>
                          </Tooltip>
                        </div>
                      )}
                      {soft && (
                        <span className="mt-1.5 flex items-start gap-1 text-caption text-warning-fg">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {soft}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {(paper.printNote || lightCount > 0) && (
              <p role="note" className="mt-3 flex items-start gap-2 rounded-control bg-warning-bg px-3 py-2 text-body-sm text-warning-fg">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {paper.printNote}
                  {lightCount > 0 && ` ${lightCount} chữ/hình màu sáng: đổi sang màu đậm.`}
                </span>
              </p>
            )}

            {/* Tinh chỉnh độ dày giấy thực tế (đồng bộ trực quan mô hình 3D) */}
            <div className="mt-3.5 border-t border-line/60 pt-3">
              <div className="flex items-center justify-between text-caption font-semibold text-fg">
                <span className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3.5 text-fpt-orange" aria-hidden />
                  <span>Tinh chỉnh độ dày giấy thực tế</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-medium tabular-nums text-fg-muted">
                    ~{Math.round(t / 0.0014)} GSM
                  </span>
                  <span className="rounded-full bg-fpt-orange-light px-2.5 py-0.5 text-caption font-semibold tabular-nums text-fpt-orange-ink">
                    {t.toFixed(2).replace(".", ",")} mm
                  </span>
                </div>
              </div>
              <div className="mt-2 space-y-2.5 rounded-xl bg-surface-sunken/60 p-3">
                <label className="block">
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={0.01}
                    value={t}
                    onChange={(e) => {
                      const nextVal = clampDimension(limits, "paperThickness", Number(Number(e.target.value).toFixed(2)));
                      change({ ...draft, paperThickness: nextVal });
                    }}
                    className="w-full cursor-pointer accent-fpt-orange"
                  />
                  <span className="mt-1 flex justify-between text-caption tabular-nums text-fg-muted">
                    <span>Mỏng ({range.min.toFixed(2).replace(".", ",")} mm)</span>
                    <span className="font-medium text-fg">Độ dày viền cắt & thành hộp 3D</span>
                    <span>Dày ({range.max.toFixed(2).replace(".", ",")} mm)</span>
                  </span>
                </label>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {[
                    { label: "250 GSM (0,35mm)", val: 0.35 },
                    { label: "300 GSM (0,42mm)", val: 0.42 },
                    { label: "350 GSM (0,49mm)", val: 0.49 },
                    { label: "400 GSM (0,56mm)", val: 0.56 },
                  ].map((p) => {
                    const isClose = Math.abs(t - p.val) < 0.02;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          const nextVal = clampDimension(limits, "paperThickness", p.val);
                          change({ ...draft, paperThickness: nextVal }, true);
                        }}
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-caption font-medium transition-all",
                          isClose
                            ? "border-fpt-orange bg-fpt-orange-light font-semibold text-fpt-orange-ink shadow-2xs"
                            : "border-line bg-surface-raised text-fg-muted hover:border-fg-muted hover:text-fg"
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Real-world tactile feel indicator */}
                <div className="rounded-lg border border-slate-200/70 bg-white/80 p-2.5 text-caption">
                  <div className="flex items-center gap-1.5 font-semibold text-fg">
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full",
                        t <= 0.32
                          ? "bg-blue-500"
                          : t <= 0.45
                          ? "bg-emerald-500"
                          : t <= 0.65
                          ? "bg-amber-500"
                          : "bg-purple-500"
                      )}
                    />
                    <span>
                      {t <= 0.32
                        ? "Giấy mỏng nhẹ (~200–240 GSM)"
                        : t <= 0.45
                        ? "Giấy tiêu chuẩn (~250–320 GSM)"
                        : t <= 0.65
                        ? "Giấy dày chịu lực (~350–450 GSM)"
                        : "Bìa bồi carton cứng (≥ 500 GSM)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cán màng & Gia công thêm */}
            <div className="mt-3.5 border-t border-line/60 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-caption font-semibold text-fg flex items-center gap-1.5">
                  <PaintRoller className="size-3.5 text-fpt-orange" aria-hidden />
                  <span>Cán màng</span>
                </p>
                {lamination && (
                  <span className="text-label-sm text-fpt-orange-ink font-semibold bg-fpt-orange-light px-2 py-0.5 rounded-full">
                    {LAMINATION_SHORT[lamination]}
                  </span>
                )}
              </div>

              <div role="radiogroup" aria-label="Cán màng" className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { id: null, label: "Không cán", desc: "Giấy để mộc", icon: CircleSlash },
                  { id: "matte-lamination" as QuoteFinish, label: "Cán mờ", desc: "Chống chói, nhã nhặn", icon: Shield },
                  { id: "gloss-lamination" as QuoteFinish, label: "Cán bóng", desc: "Tươi sáng, bắt nét", icon: Sun },
                  { id: "soft-touch-lamination" as QuoteFinish, label: "Màng nhung", desc: "Mịn màng, đầm tay", icon: Feather },
                ].map((item) => {
                  const isSel = lamination === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="radio"
                      aria-checked={isSel}
                      onClick={() => setLamination(item.id)}
                      className={cn(
                        chip(isSel),
                        "gap-1 relative cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <Icon className={cn("size-3.5 shrink-0", isSel ? "text-fpt-orange" : "text-fg-muted")} aria-hidden />
                        <span className="text-body-sm font-semibold text-fg">{item.label}</span>
                      </div>
                      <span className="text-caption text-fg-muted line-clamp-1">{item.desc}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3.5 text-caption font-semibold text-fg flex items-center gap-1.5">
                <Gem className="size-3.5 text-fpt-orange" aria-hidden />
                <span>Gia công thêm</span>
              </p>

              <div className="mt-2 grid grid-cols-1 gap-2">
                {[
                  { id: "foil" as QuoteFinish, label: "Ép kim", icon: Crown, desc: "Nhũ vàng/bạc sang trọng" },
                  { id: "spot-uv" as QuoteFinish, label: "Phủ UV định hình", icon: Droplets, desc: "Bóng nổi chi tiết chính" },
                  { id: "emboss" as QuoteFinish, label: "Dập nổi (Thúc nổi)", icon: Stamp, desc: "Khối nổi 3D xúc giác" },
                ].map((item) => {
                  const needsLamination = item.id === "spot-uv" && !lamination;
                  const on = finishes.includes(item.id);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      disabled={needsLamination}
                      onClick={() => toggle(item.id)}
                      className={cn(
                        chip(on, needsLamination),
                        "gap-1 cursor-pointer"
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon className={cn("size-3.5 shrink-0", on ? "text-fpt-orange" : "text-fg-muted")} aria-hidden />
                          <span className="text-body-sm font-semibold text-fg truncate">{item.label}</span>
                        </div>
                        {on && (
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-white">
                            <Check className="size-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="text-caption text-fg-muted line-clamp-1">
                        {needsLamination ? "Cần cán màng" : item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

      <PaperCompareDialog
        open={showCompare}
        onClose={() => setShowCompare(false)}
        current={paper.theme}
        prices={prices.byPaper}
        onChoose={choose}
      />

    </>
  );
}
