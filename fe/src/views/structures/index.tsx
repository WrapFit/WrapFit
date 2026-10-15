"use client";

/**
 * `/structures/[id]`: one box structure in the style of pacdora.com's dieline pages. Names and size limits come from
 * `GET /templates/structures`; the dieline, its panels and the sheet figures from the formulas of `@wrapfit/shared`.
 * The flat dieline downloads as an SVG; "Thiết kế hộp này" opens /editor/new with the chosen size.
 */

import { CURRENT_FORMULA_VERSION, generateDielinePieces, type BoxDimensions, type BoxStructureType } from "@wrapfit/shared";
import { ArrowRight, Box, Download, Grid3x3 } from "lucide-react";
import Link from "next/link";
import React, { useMemo, useRef, useState } from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { MainFooter, MainHeader } from "@/components/layout";
import { outlineButton, primaryButton } from "@/components/library";
import { WorkspaceError } from "@/components/workspace";
import { ROUTES } from "@/constants";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import { creaseCount, formatNumber, innerVolumeMl, sheetFits } from "@/features/studio/utils/boxMetrics";
import { PAPER_STOCKS } from "@/features/studio/utils/paperStocks";
import { BoxPreview, DielineSketch, useBoxStructures } from "@/features/templates";
import type { DimensionRange } from "@/types/api";
import { cn } from "@/utils/helpers";
import { Breadcrumb } from "@/components/ui";

const SIDES = [
  { field: "length", label: "Dài", letter: "L" },
  { field: "width", label: "Rộng", letter: "W" },
  { field: "height", label: "Cao", letter: "H" },
] as const;

export default function StructureDetailPage({ id }: { id: string }) {
  const structures = useBoxStructures();
  const structure = structures.data?.find((item) => item.id === id);
  const presentation = BOX_STRUCTURES.find((item) => item.id === id);

  return (
    <>
      <MainHeader />
      <div className={`${landingFontVariables} min-h-screen bg-white pt-16 font-landing-heading text-library-text`}>
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-10">
          <nav aria-label="Vị trí" className="text-sm text-library-muted">
            <Link href={ROUTES.templates} className="hover:text-library-ink hover:underline">
              Thư viện mẫu
            </Link>
            <span className="mx-2">/</span>
            <span>Cấu trúc hộp</span>
            {structure && (
              <>
                <span className="mx-2">/</span>
                <span className="text-library-ink">{structure.name}</span>
              </>
            )}
          </nav>
          {structures.isError ? (
            <WorkspaceError className="mt-6" error={structures.error} title="Không tải được cấu trúc hộp" onRetry={() => void structures.refetch()} retrying={structures.isFetching} />
          ) : !structures.data ? (
            <div aria-busy="true" className="mt-6 h-[560px] animate-pulse rounded-squircle-md bg-library-tile motion-reduce:animate-none" />
          ) : !structure ? (
            <div className="mt-10 rounded-2xl bg-library-panel p-10 text-center">
              <h1 className="text-2xl font-medium text-library-ink">Không có cấu trúc hộp này</h1>
              <Link href={ROUTES.templates} className={cn(primaryButton, "mt-5")}>
                Xem thư viện mẫu
              </Link>
            </div>
          ) : (
            <StructureDetail
              key={structure.id}
              id={structure.id}
              name={structure.name}
              description={structure.description ?? presentation?.description ?? ""}
              category={structure.category}
              limits={structure.dimensionLimits}
              defaults={presentation?.defaultDims}
              others={structures.data.filter((item) => item.id !== structure.id).map((item) => ({ id: item.id, name: item.name }))}
            />
          )}
        </div>
      </div>
      <MainFooter />
    </>
  );
}

interface StructureDetailProps {
  id: BoxStructureType;
  name: string;
  description: string;
  category: string;
  limits: { length: DimensionRange; width: DimensionRange; height: DimensionRange; paperThickness?: DimensionRange };
  defaults?: BoxDimensions;
  others: { id: BoxStructureType; name: string }[];
}

function StructureDetail({ id, name, description, category, limits, defaults, others }: StructureDetailProps) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [fold, setFold] = useState(70);
  const [paperTheme, setPaperTheme] = useState(PAPER_STOCKS[0].theme);
  const paper = PAPER_STOCKS.find((item) => item.theme === paperTheme) ?? PAPER_STOCKS[0];
  const [dims, setDims] = useState<BoxDimensions>(() => ({ ...(defaults ?? { length: 120, width: 80, height: 60, paperThickness: 0.42 }), paperThickness: PAPER_STOCKS[0].spec.caliper }));
  const dimensions = { ...dims, paperThickness: paper.spec.caliper };
  const sketchRef = useRef<HTMLDivElement>(null);

  const pieces = useMemo(() => {
    try {
      return generateDielinePieces(id, dimensions, CURRENT_FORMULA_VERSION);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dimensions.length, dimensions.width, dimensions.height, dimensions.paperThickness]);
  const fits = sheetFits(pieces);

  const setSide = (field: "length" | "width" | "height", raw: number) => {
    const range = limits[field];
    if (!Number.isFinite(raw)) return;
    setDims((current) => ({ ...current, [field]: Math.max(range.min, Math.min(range.max, Math.round(raw))) }));
  };

  // The SVG on screen is the dieline of the print file: save it as is, in millimetres.
  const downloadSvg = () => {
    const svg = sketchRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const [, , w, h] = (clone.getAttribute("viewBox") ?? "0 0 0 0").split(" ").map(Number);
    clone.setAttribute("width", `${w}mm`);
    clone.setAttribute("height", `${h}mm`);
    clone.removeAttribute("class");
    clone.querySelectorAll("[data-preview]").forEach((node) => node.remove());
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wrapfit-${id}-${dimensions.length}x${dimensions.width}x${dimensions.height}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const editorHref = `${ROUTES.editorNew}?structure=${id}&l=${dimensions.length}&w=${dimensions.width}&h=${dimensions.height}&paper=${paper.theme}`;

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Stage */}
        <section aria-label="Xem trước" className="overflow-hidden rounded-squircle-md border-[1.5px] border-library-ink bg-library-tile shadow-hard">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-library-ink/15 px-4 py-3">
            <div role="tablist" aria-label="Chế độ xem" className="inline-flex rounded-lg border border-library-ink p-0.5">
              {(
                [
                  { value: "2d", label: "Khuôn bế 2D", icon: Grid3x3 },
                  { value: "3d", label: "Hộp 3D", icon: Box },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={view === option.value}
                  onClick={() => setView(option.value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                    view === option.value ? "bg-library-lime-ink text-white" : "text-library-ink hover:bg-library-panel",
                  )}
                >
                  <option.icon className="size-4" aria-hidden />
                  {option.label}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-library-sub">{fits.map((fit) => `${fit.width} × ${fit.height}`).join(" + ")} mm</span>
          </div>
          <div className={`relative h-[420px] sm:h-[560px] ${view === "2d" ? "bg-mist-150 bg-[radial-gradient(#D5DCCF_1px,transparent_1px)] [background-size:14px_14px]" : "bg-white"}`}>
            {view === "2d" ? (
              <div ref={sketchRef} className="absolute inset-0 flex items-center justify-center p-8">
                <DielineSketch structure={id} dimensions={dimensions} label={`Khuôn bế ${name}`} className="h-full w-full" />
              </div>
            ) : (
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={dimensions}
                  foldProgress={fold / 100}
                  boxType={id}
                  theme={paper.theme}
                  elements={[]}
                  showHud={false}
                  showStatusBar={false}
                  enableMacroZoom={false}
                  frameless
                  minHeight={false}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-library-ink/15 px-4 py-3 text-sm text-library-sub">
            {view === "3d" ? (
              <label className="flex w-full items-center gap-3 sm:w-auto">
                <span className="shrink-0 text-library-ink">Gấp hộp</span>
                <input type="range" min={0} max={100} value={fold} onChange={(e) => setFold(Number(e.target.value))} aria-label="Mức gấp hộp" className="w-full accent-library-accent sm:w-64" />
                <span className="w-10 font-mono text-xs">{fold}%</span>
              </label>
            ) : (
              <span className="flex flex-wrap gap-x-5 gap-y-1">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-0.5 w-6 bg-dieline-cut" />
                  Đường cắt
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="w-6 border-t-2 border-dashed border-dieline-crease" />
                  Đường gấp
                </span>
                <span>Kích thước thật theo mm, cùng công thức với file in</span>
              </span>
            )}
          </div>
        </section>

        {/* Settings */}
        <div className="flex flex-col gap-5">
          <div>
            <Breadcrumb className="mb-3" items={[{ label: "Trang chủ", href: "/" }, { label: "Thư viện mẫu", href: "/templates" }, { label: "Cấu trúc hộp" }, { label: name }]} />
            <span className="inline-flex h-6 items-center rounded-md bg-library-panel px-2 text-caption text-library-sub">{category === "rigid" ? "Hộp cứng" : "Hộp gấp"}</span>
            <h1 className="mt-2 text-heading-lg font-medium text-library-ink">{name}</h1>
            <p className="mt-2 text-base leading-[1.6] text-library-sub">{description}</p>
          </div>

          <div className="rounded-2xl border border-library-line p-5">
            <h2 className="text-base font-medium text-library-ink">Kích thước lọt lòng (mm)</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {SIDES.map((side) => (
                <label key={side.field} className="flex flex-col gap-1">
                  <span className="text-xs text-library-muted">
                    {side.label} ({side.letter}) · {limits[side.field].min}–{limits[side.field].max}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={limits[side.field].min}
                    max={limits[side.field].max}
                    defaultValue={dims[side.field]}
                    key={`${side.field}-${dims[side.field]}`}
                    onBlur={(e) => setSide(side.field, Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSide(side.field, Number((e.target as HTMLInputElement).value));
                    }}
                    className="h-11 w-full rounded-lg border border-library-line px-3 font-mono text-base text-library-ink outline-none focus:border-library-accent focus:ring-[3px] focus:ring-library-accent/20"
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 flex flex-col gap-1">
              <span className="text-xs text-library-muted">Giấy (độ dày t cộng vào mỗi nếp gấp)</span>
              <select
                value={paperTheme}
                onChange={(e) => setPaperTheme(e.target.value as typeof paperTheme)}
                className="h-11 w-full rounded-lg border border-library-line bg-white px-3 text-sm text-library-ink outline-none focus:border-library-accent focus:ring-[3px] focus:ring-library-accent/20"
              >
                {PAPER_STOCKS.map((stock) => (
                  <option key={stock.theme} value={stock.theme}>
                    {stock.name} · t {stock.spec.caliper.toFixed(2)} mm
                  </option>
                ))}
              </select>
            </label>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {[
              { label: "Khổ phôi trải phẳng", value: `${fits.map((fit) => `${fit.width} × ${fit.height}`).join(" + ")} mm` },
              { label: "Số hộp / tờ B1", value: fits.length ? `${Math.min(...fits.map((fit) => fit.perSheet))} hộp` : "–" },
              { label: "Thể tích lọt lòng", value: `${formatNumber(innerVolumeMl(dimensions))} ml` },
              { label: "Đường gấp", value: `${creaseCount(pieces)} nếp · ${pieces.length} mảnh` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-library-panel px-4 py-3">
                <dt className="text-xs text-library-muted">{item.label}</dt>
                <dd className="mt-0.5 font-mono text-sm text-library-ink">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={editorHref} className={cn(primaryButton, "h-12 flex-1")}>
              Thiết kế hộp này
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <button type="button" onClick={() => (view === "2d" ? downloadSvg() : (setView("2d"), window.setTimeout(downloadSvg, 50)))} className={cn(outlineButton, "h-12")}>
              <Download className="size-4" aria-hidden />
              Tải khuôn SVG
            </button>
          </div>
        </div>
      </div>

      {/* Anatomy */}
      <section aria-labelledby="anatomy" className="mt-12">
        <h2 id="anatomy" className="text-2xl font-medium text-library-ink">
          Các mặt của khuôn bế
        </h2>
        <p className="mt-1 text-base text-library-sub">Kích thước từng mặt tính từ L × W × H và độ dày giấy, đúng như trên file in.</p>
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          {pieces.map((piece) => (
            <div key={piece.name} className="rounded-2xl border border-library-line">
              <p className="border-b border-library-line px-5 py-3 text-base font-medium text-library-ink">
                {piece.name} · {Math.round(piece.geometry.totalBoundingBox.width)} × {Math.round(piece.geometry.totalBoundingBox.height)} mm
              </p>
              <ul className="divide-y divide-library-line">
                {piece.geometry.panels.map((panel) => (
                  <li key={panel.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="text-library-ink">{panel.name}</span>
                    <span className="font-mono text-xs text-library-sub">
                      {panel.bounds.width.toFixed(1)} × {panel.bounds.height.toFixed(1)} mm
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Other structures */}
      <section aria-labelledby="others" className="mt-12">
        <h2 id="others" className="text-2xl font-medium text-library-ink">
          Cấu trúc khác
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {others.map((other) => {
            const sample = BOX_STRUCTURES.find((item) => item.id === other.id)?.defaultDims ?? dims;
            return (
              <li key={other.id}>
                <Link href={`/structures/${other.id}`} className="group block">
                  <span className="relative block aspect-[321/201] overflow-hidden rounded-2xl border border-library-ink bg-library-tile transition-shadow group-hover:shadow-hard-sm">
                    <span className="absolute inset-0 grid grid-cols-2">
                      <span className="flex items-center justify-center p-4 pr-2">
                        <DielineSketch structure={other.id} dimensions={sample} className="max-h-full w-full" />
                      </span>
                      <span className="flex items-center justify-center p-3 pl-1">
                        <BoxPreview structure={other.id} dimensions={sample} className="h-full w-full" />
                      </span>
                    </span>
                  </span>
                  <span className="mt-3 block text-base text-library-ink">{other.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
