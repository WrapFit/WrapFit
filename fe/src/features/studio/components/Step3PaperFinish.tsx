"use client";
/* ds-artwork: paper swatches draw the colour of real paper stocks (docs/15_DESIGN_SYSTEM.md §2). */

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
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, Columns3, Info, PackageOpen, Sparkles } from "lucide-react";
import React, { useMemo, useState } from "react";
import { formatVnd } from "@/features/pricing";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { CardTitle, PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, stageBarButton, StudioCard } from "@/features/studio/components/studioUi";
import { continueTo, studioStep } from "@/features/studio/components/StudioStepper";
import { clampDimension } from "@/features/studio/utils/dieline";
import { PAPER_STOCKS, paperAdvice, paperStockOf, type PaperStock } from "@/features/studio/utils/paperStocks";
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
const FINISH_NOTES: Record<QuoteFinish, string> = {
  "matte-lamination": "Mịn, không bóng, chống trầy",
  "gloss-lamination": "Bóng, màu đậm hơn",
  "soft-touch-lamination": "Êm như nhung, sang tay",
  foil: "Ánh kim trên chữ, logo",
  "spot-uv": "Bóng nổi từng chi tiết",
  emboss: "Nổi hoặc chìm trên giấy, không mực",
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
  backgroundPatternSvg: string | null;
  formulaVersion?: number;
  onBack(): void;
  onNext(): void;
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
function PaperSwatch({ paper }: { paper: PaperStock }) {
  const { outside, inside } = paper.swatch;
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0 rounded-control" aria-hidden>
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

/** The four stocks side by side on what tells them apart; a column header picks that stock. */
function PaperCompare({ current, prices, onChoose }: { current: BoxMaterialTheme; prices: Record<string, number>; onChoose(stock: PaperStock): void }) {
  const rows: { label: string; cell(stock: PaperStock): React.ReactNode }[] = [
    { label: "Màu in", cell: (stock) => <Meter value={stock.ratings.color} label="Màu in" /> },
    { label: "Độ cứng", cell: (stock) => <Meter value={stock.stiffness} label="Độ cứng" /> },
    { label: "Cảm giác cao cấp", cell: (stock) => <Meter value={stock.ratings.premium} label="Cảm giác cao cấp" /> },
    { label: "Thân thiện môi trường", cell: (stock) => <Meter value={stock.ratings.eco} label="Thân thiện môi trường" /> },
    {
      label: "Mặt trong",
      cell: (stock) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm ring-1 ring-fg/15" style={{ backgroundColor: stock.swatch.inside }} />
          {stock.theme === "duplex" ? "Xám" : stock.theme === "kraft" ? "Nâu" : stock.theme === "rigid" ? "Xám carton" : "Trắng"}
        </span>
      ),
    },
    { label: "Độ dày", cell: (stock) => <span className="tabular-nums">{stock.spec.caliper.toFixed(2).replace(".", ",")} mm</span> },
    { label: `Giá/hộp (${PRICE_QUANTITY} hộp)`, cell: (stock) => <span className="font-semibold tabular-nums">{formatVnd(prices[stock.theme])}</span> },
  ];
  return (
    <details className="group mt-3 rounded-panel border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-body-sm font-semibold text-fg">
        <span className="inline-flex items-center gap-2">
          <Columns3 className="size-4 text-fpt-orange" aria-hidden />
          So sánh {PAPER_STOCKS.length} loại giấy
        </span>
        <ChevronDown className="size-4 text-fg-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[520px] text-left text-caption">
          <thead>
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-fg-muted">
                <span className="sr-only">Tiêu chí</span>
              </th>
              {PAPER_STOCKS.map((stock) => (
                <th key={stock.theme} scope="col" className={cn("px-2 py-2", stock.theme === current && "bg-fpt-orange-light")}>
                  <button type="button" onClick={() => onChoose(stock)} aria-pressed={stock.theme === current} className="text-left font-semibold text-fg hover:underline">
                    {stock.name.replace(" GSM", "")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line/60">
                <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium text-fg-muted">
                  {row.label}
                </th>
                {PAPER_STOCKS.map((stock) => (
                  <td key={stock.theme} className={cn("px-2 py-2 text-fg", stock.theme === current && "bg-fpt-orange-light")}>
                    {row.cell(stock)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
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
  backgroundPatternSvg,
  formulaVersion,
  onBack,
  onNext,
}: Step3PaperFinishProps) {
  const paper = paperStockOf(activeMaterial);
  const [showInside, setShowInside] = useState(false);
  const t = dimensions.paperThickness;
  const range = limits?.paperThickness ?? { min: 0.3, max: 0.6 };
  const advice = useMemo(() => paperAdvice(boxType, dimensions), [boxType, dimensions]);
  const lamination = finishes.find((f) => LAMINATIONS.includes(f)) ?? null;
  const lightCount = useMemo(() => (paper.theme === "kraft" ? lightOnKraft(elements) : 0), [paper.theme, elements]);

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
    onDimensionsChange({ ...dimensions, paperThickness: clampDimension(limits, "paperThickness", stock.spec.caliper) });
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
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6">
      <StepHeader
        title={studioStep(3).title}
        subtitle="Giá mỗi hộp đổi ngay khi bạn chọn."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <StudioCard className="overflow-hidden lg:sticky lg:top-24 lg:self-start">
          <div className="relative h-[420px] bg-landing-canvas sm:h-[560px]">
            <div className="absolute inset-0">
              <Box3DView
                dimensions={dimensions}
                foldProgress={1}
                faceLabels
                interactiveOpenState={showInside}
                boxType={boxType}
                theme={activeMaterial}
                elements={elements}
                backgroundPatternSvg={backgroundPatternSvg}
                formulaVersion={formulaVersion}
                showHud={false}
                showStatusBar={false}
                frameless
                minHeight={false}
                chrome="bar"
                barStart={
                  <>
                    <span className="font-semibold text-fg">{paper.name}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="size-3 rounded-sm ring-1 ring-fg/15" style={{ backgroundColor: paper.swatch.outside }} />
                      Mặt in
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="size-3 rounded-sm ring-1 ring-fg/15" style={{ backgroundColor: paper.swatch.inside }} />
                      Mặt trong
                    </span>
                  </>
                }
                barEnd={
                  <>
                    {/* The inside is what tells the stocks apart once the box is open (white, grey, brown). */}
                    <button type="button" onClick={() => setShowInside((v) => !v)} aria-pressed={showInside} className={stageBarButton(showInside)}>
                      <PackageOpen className="size-3.5" aria-hidden />
                      {showInside ? "Đóng nắp" : "Mở xem mặt trong"}
                    </button>
                    <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
                  </>
                }
                className="h-full w-full"
              />
            </div>
          </div>
        </StudioCard>

        <div className="flex flex-col gap-4">
          <StudioCard as="section" aria-labelledby="paper-title" className="p-5 sm:p-6">
            <CardTitle id="paper-title" action={<span className="text-caption text-fg-muted">Giá / hộp, in {PRICE_QUANTITY} hộp</span>}>
              Giấy
            </CardTitle>
            <p className="mt-1 flex items-start gap-1.5 text-body-sm text-fg-muted">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-fpt-orange" aria-hidden />
              <span>
                Đề xuất <strong className="font-semibold text-fg">{paperStockOf(advice.recommended).name}</strong>: {advice.reason}
              </span>
            </p>

            <div role="radiogroup" aria-label="Giấy" className="mt-4 flex flex-col gap-2">
              {PAPER_STOCKS.map((stock) => {
                const active = stock.theme === paper.theme;
                const soft = advice.tooSoft[stock.theme];
                return (
                  <button
                    key={stock.theme}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choose(stock)}
                    className={cn(
                      "relative flex items-center gap-3 rounded-panel border-2 bg-surface-raised p-2.5 pr-3 text-left transition-[border-color,box-shadow] motion-reduce:transition-none",
                      active ? "border-fpt-orange-ink" : "border-line hover:border-fg hover:shadow-hard-sm"
                    )}
                  >
                    <PaperSwatch paper={stock} />
                    <span className={cn("min-w-0 flex-1", soft && !active && "opacity-70")}>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-body-sm font-semibold text-fg">{stock.name}</span>
                        {stock.theme === advice.recommended && (
                          <span className="rounded-full bg-success-bg px-2 py-0.5 text-label-sm font-semibold text-success-fg">Đề xuất</span>
                        )}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {stock.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-surface-sunken px-2 py-0.5 text-label-sm font-medium text-fg">
                            {tag}
                          </span>
                        ))}
                      </span>
                      {soft && (
                        <span className="mt-1 flex items-start gap-1 text-caption text-warning-fg">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {soft}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-body-sm font-semibold tabular-nums text-fg">{formatVnd(prices.byPaper[stock.theme])}</span>
                      <span className="block text-caption text-fg-muted">/ hộp</span>
                    </span>
                    {active && (
                      <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-fpt-orange-ink text-white shadow-sm">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <PaperIdentity paper={paper} />
            <PaperCompare current={paper.theme} prices={prices.byPaper} onChoose={choose} />
            {(paper.printNote || lightCount > 0) && (
              <p role="note" className="mt-3 flex items-start gap-2 rounded-control bg-warning-bg px-3 py-2 text-body-sm text-warning-fg">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {paper.printNote}
                  {lightCount > 0 && ` Thiết kế có ${lightCount} chữ hoặc hình màu sáng: đổi sang bảng màu đậm ở bước Thiết kế.`}
                </span>
              </p>
            )}
          </StudioCard>

          <StudioCard as="section" aria-labelledby="finish-title" className="p-5 sm:p-6">
            <CardTitle id="finish-title">
              Hoàn thiện
            </CardTitle>

            <p className="mt-3 text-label font-semibold text-fg">Cán màng</p>
            <div role="radiogroup" aria-label="Cán màng" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[null, ...LAMINATIONS].map((finish) => (
                <button key={finish ?? "none"} type="button" role="radio" aria-checked={lamination === finish} onClick={() => setLamination(finish)} className={chip(lamination === finish)}>
                  <span className="text-body-sm font-semibold text-fg">{finish ? LAMINATION_SHORT[finish] : "Không cán"}</span>
                  <span className="text-caption tabular-nums text-fg-muted">{finish ? `+${formatVnd(prices.extra(finish))}` : "Giấy để mộc"}</span>
                </button>
              ))}
            </div>
            {lamination && <p className="mt-1.5 text-caption text-fg-muted">{FINISH_NOTES[lamination]}.</p>}

            <p className="mt-4 text-label font-semibold text-fg">Thêm</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXTRAS.map((finish) => {
                const needsLamination = finish === "spot-uv" && !lamination;
                const on = finishes.includes(finish);
                return (
                  <button
                    key={finish}
                    type="button"
                    aria-pressed={on}
                    disabled={needsLamination}
                    onClick={() => toggle(finish)}
                    className={chip(on, needsLamination)}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="text-body-sm font-semibold text-fg">{FINISH_LABELS[finish]}</span>
                      <span className="text-caption tabular-nums text-fg-muted">+{formatVnd(prices.extra(finish))}</span>
                    </span>
                    <span className="text-caption text-fg-muted">{needsLamination ? "Cần cán màng trước" : FINISH_NOTES[finish]}</span>
                  </button>
                );
              })}
            </div>
            {finishes.some((f) => EXTRAS.includes(f)) && (
              <p className="mt-2 flex items-start gap-2 text-caption leading-5 text-fg-muted">
                <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
                In càng nhiều, phí ép kim và UV mỗi hộp càng giảm.
              </p>
            )}

            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer text-body-sm font-medium text-fg">Tinh chỉnh độ dày giấy (nâng cao)</summary>
              <label className="mt-3 block">
                <span className="flex items-center justify-between text-body-sm text-fg-muted">
                  Độ dày đo thực tế
                  <span className="rounded-full bg-fpt-orange-light px-2.5 py-0.5 text-caption font-semibold tabular-nums text-fpt-orange-ink">{t.toFixed(2).replace(".", ",")} mm</span>
                </span>
                <input
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={0.01}
                  value={t}
                  onChange={(e) => onDimensionsChange({ ...dimensions, paperThickness: clampDimension(limits, "paperThickness", Number(Number(e.target.value).toFixed(2))) })}
                  className="mt-2 w-full cursor-pointer accent-fpt-orange"
                />
                <span className="flex justify-between text-caption tabular-nums text-fg-muted">
                  <span>{range.min.toFixed(2).replace(".", ",")} mm</span>
                  <span>{range.max.toFixed(2).replace(".", ",")} mm</span>
                </span>
              </label>
            </details>
          </StudioCard>
        </div>
      </div>

      <StepActionBar
        back={
          <button type="button" onClick={onBack} className={SECONDARY_PILL}>
            <ArrowLeft className="size-4" aria-hidden />
            Kích thước
          </button>
        }
        summary={
          <>
            <span className="block text-xs">
              {paper.name}
              {finishes.length > 0 && ` · ${finishes.map((f) => FINISH_LABELS[f]).join(", ")}`}
            </span>
            <span className="tabular-nums text-landing-ink">
              ≈ {formatVnd(prices.current)}/hộp khi in {PRICE_QUANTITY} hộp
            </span>
          </>
        }
        next={
          <button type="button" data-tour="studio-next" onClick={onNext} className={PRIMARY_PILL}>
            {continueTo(4)}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
}
