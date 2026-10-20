"use client";

import type { BoxDimensions, CanvasElement } from "@wrapfit/shared";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import React from "react";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { CardTitle, PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, StudioCard } from "@/features/studio/components/studioUi";
import { clampDimension } from "@/features/studio/utils/dieline";
import { MATERIAL_FINISH_LABELS, PAPER_STOCKS } from "@/features/studio/utils/paperStocks";
import type { DimensionLimits } from "@/types/api";
import { cn } from "@/utils/helpers";

interface Step3PaperFinishProps {
  boxType: BoxStructureType;
  dimensions: BoxDimensions;
  onDimensionsChange(dimensions: BoxDimensions): void;
  activeMaterial: BoxMaterialTheme;
  onMaterialChange(theme: BoxMaterialTheme): void;
  limits?: DimensionLimits;
  elements: CanvasElement[];
  backgroundPatternSvg: string | null;
  formulaVersion?: number;
  onBack(): void;
  onNext(): void;
}

/** Step 3: the paper stock and its finish (`materialSpec` of the API), seen on the 3D box. */
export function Step3PaperFinish({
  boxType,
  dimensions,
  onDimensionsChange,
  activeMaterial,
  onMaterialChange,
  limits,
  elements,
  backgroundPatternSvg,
  formulaVersion,
  onBack,
  onNext,
}: Step3PaperFinishProps) {
  const paper = PAPER_STOCKS.find((item) => item.theme === activeMaterial) ?? PAPER_STOCKS[0];
  const t = dimensions.paperThickness;
  const range = limits?.paperThickness ?? { min: 0.3, max: 0.6 };

  const choose = (theme: BoxMaterialTheme) => {
    const stock = PAPER_STOCKS.find((item) => item.theme === theme) ?? PAPER_STOCKS[0];
    onMaterialChange(theme);
    onDimensionsChange({ ...dimensions, paperThickness: clampDimension(limits, "paperThickness", stock.spec.caliper) });
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6">
      <StepHeader
        title="Giấy & bề mặt"
        subtitle="Giấy quyết định màu nền, độ cứng và độ dày nếp gấp của hộp. Đổi giấy là khuôn bế tự cộng lại độ dày mới."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <StudioCard className="overflow-hidden lg:sticky lg:top-24 lg:self-start">
          <div className="relative h-[480px] bg-landing-canvas sm:h-[600px]">
            <div className="absolute inset-0">
              <Box3DView
                dimensions={dimensions}
                foldProgress={1}
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
                className="h-full w-full"
              />
            </div>
          </div>
        </StudioCard>

        <StudioCard as="aside" aria-labelledby="paper-title" className="p-5 sm:p-6">
          <CardTitle id="paper-title" action={<span className="text-caption text-fg-muted">{PAPER_STOCKS.length} loại giấy</span>}>
            Chọn giấy
          </CardTitle>

          {/* Paper tiles: a large swatch of the printed side over a strip of the inside, like a paper sample. */}
          <div role="radiogroup" aria-label="Giấy" className="mt-4 grid grid-cols-2 gap-3">
            {PAPER_STOCKS.map((stock) => {
              const active = stock.theme === activeMaterial;
              return (
                <button
                  key={stock.theme}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choose(stock.theme)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-panel border-2 bg-surface-raised text-left transition-[border-color,box-shadow,transform] motion-reduce:transition-none",
                    active
                      ? "border-fpt-orange-ink"
                      : "border-line hover:-translate-y-0.5 hover:border-fg hover:shadow-hard-sm",
                  )}
                >
                  <span aria-hidden className="relative block h-20 sm:h-24" style={{ backgroundColor: stock.swatch.outside }}>
                    <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.35),transparent_45%,rgba(0,0,0,0.08))]" />
                    <span className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundColor: stock.swatch.inside }} />
                  </span>
                  <span className="flex flex-1 flex-col px-3 py-2.5">
                    <span className="text-body-sm font-semibold text-fg">{stock.name}</span>
                    <span className="mt-0.5 text-caption text-fg-muted">
                      {stock.finishLabel} · <span className="whitespace-nowrap tabular-nums">{stock.spec.caliper.toFixed(2)} mm</span>
                    </span>
                  </span>
                  {active && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-fpt-orange-ink text-white shadow-sm">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* The chosen paper */}
          <section aria-label={`Thông số ${paper.name}`} className="mt-5 rounded-panel bg-surface-sunken p-4">
            <p className="font-landing-heading text-body font-bold text-fg">{paper.name}</p>
            <p className="mt-1 text-body-sm leading-6 text-fg-muted">{paper.description}</p>
            <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-control bg-surface-raised py-2.5 text-center">
              {[
                { label: "Định lượng", value: `${paper.spec.gsm} GSM` },
                { label: "Độ dày", value: `${t.toFixed(2)} mm` },
                { label: "Bề mặt", value: MATERIAL_FINISH_LABELS[paper.spec.finish] },
              ].map((item) => (
                <div key={item.label} className="min-w-0 px-2">
                  <dt className="text-caption text-fg-muted">{item.label}</dt>
                  <dd className="mt-0.5 truncate text-body-sm font-semibold tabular-nums text-fg">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-caption text-fg-muted">Hợp với</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {paper.bestFor.split(/,\s*/).map((use) => (
                <li key={use} className="rounded-full border border-line bg-surface-raised px-2.5 py-1 text-caption font-medium text-fg">
                  {use.charAt(0).toUpperCase() + use.slice(1)}
                </li>
              ))}
            </ul>
          </section>

          <label className="mt-5 block">
            <span className="flex items-center justify-between text-body-sm font-medium text-fg">
              Tinh chỉnh độ dày
              <span className="rounded-full bg-fpt-orange-light px-2.5 py-0.5 text-caption font-semibold tabular-nums text-fpt-orange-ink">{t.toFixed(2)} mm</span>
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
              <span>{range.min.toFixed(2)} mm</span>
              <span>{range.max.toFixed(2)} mm</span>
            </span>
          </label>

          <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-caption leading-5 text-fg-muted">
            <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
            Ép kim, dập nổi và phủ UV cục bộ được làm ở xưởng in; đánh dấu vị trí của chúng trong bước thiết kế.
          </p>
        </StudioCard>
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
            <span className="block text-xs">Giấy đã chọn</span>
            <span className="text-landing-ink">
              {paper.name} · t {t.toFixed(2)} mm
            </span>
          </>
        }
        next={
          <button type="button" data-tour="studio-next" onClick={onNext} className={PRIMARY_PILL}>
            Tiếp tục: thiết kế
            <ArrowRight className="size-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
}
