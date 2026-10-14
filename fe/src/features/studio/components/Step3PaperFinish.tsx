"use client";

import type { BoxDimensions, CanvasElement } from "@wrapfit/shared";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import React from "react";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, StudioCard } from "@/features/studio/components/studioUi";
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
        step="Bước 3 / 6 · Chất liệu"
        title="Giấy & bề mặt"
        subtitle="Giấy quyết định màu nền, độ cứng và độ dày nếp gấp của hộp. Đổi giấy là khuôn bế tự cộng lại độ dày mới."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <StudioCard className="relative overflow-hidden lg:sticky lg:top-24 lg:self-start">
          <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-landing-ink shadow-sm">
            <span aria-hidden className="size-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: paper.swatch.outside }} />
            {paper.name}
          </span>
          <div className="relative h-[440px] bg-landing-canvas sm:h-[560px]">
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
                className="h-full w-full"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm text-landing-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-4 rounded ring-1 ring-black/15" style={{ backgroundColor: paper.swatch.outside }} />
              Mặt in
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="size-4 rounded ring-1 ring-black/15" style={{ backgroundColor: paper.swatch.inside }} />
              Mặt trong
            </span>
            <span>Kéo để xoay hộp</span>
          </div>
        </StudioCard>

        <StudioCard as="aside" aria-label="Chọn giấy" className="bg-landing-green-night p-5 text-white sm:p-6">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="size-20 shrink-0 rounded-full shadow-[inset_-8px_-10px_18px_rgba(0,0,0,0.25),inset_6px_6px_14px_rgba(255,255,255,0.35)]"
              style={{ backgroundColor: paper.swatch.outside }}
            />
            <div className="min-w-0">
              <p className="font-landing-heading text-2xl font-bold">{paper.name}</p>
              <p className="text-sm text-landing-lime-mist/80">{paper.finishLabel}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-landing-lime-mist/80">{paper.description}</p>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "Định lượng", value: `${paper.spec.gsm} GSM` },
              { label: "Độ dày t", value: `${t.toFixed(2)} mm` },
              { label: "Bề mặt", value: MATERIAL_FINISH_LABELS[paper.spec.finish] },
              { label: "Hợp với", value: paper.bestFor },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/[0.07] px-3 py-2.5">
                <dt className="text-xs text-landing-lime-mist/60">{item.label}</dt>
                <dd className="mt-0.5 truncate font-semibold" title={item.value}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-xs font-medium text-landing-lime-mist/60">Chọn giấy</p>
          <div role="radiogroup" aria-label="Giấy" className="mt-2 flex flex-col gap-2">
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
                    "flex items-center gap-3 rounded-2xl p-3 text-left transition-colors",
                    active ? "bg-landing-lime text-landing-green-night" : "bg-white/[0.07] text-white hover:bg-white/[0.12]",
                  )}
                >
                  <span aria-hidden className="size-10 shrink-0 rounded-xl ring-1 ring-black/15" style={{ backgroundColor: stock.swatch.outside }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{stock.name}</span>
                    <span className={cn("block truncate text-xs", active ? "text-landing-green-night/70" : "text-landing-lime-mist/60")}>
                      {stock.finishLabel} · t {stock.spec.caliper.toFixed(2)} mm
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden />}
                </button>
              );
            })}
          </div>

          <label className="mt-5 block text-sm">
            <span className="flex items-center justify-between">
              Tinh chỉnh độ dày
              <span className="font-mono text-xs text-landing-lime">{t.toFixed(2)} mm</span>
            </span>
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={0.01}
              value={t}
              onChange={(e) => onDimensionsChange({ ...dimensions, paperThickness: clampDimension(limits, "paperThickness", Number(Number(e.target.value).toFixed(2))) })}
              className="mt-2 w-full cursor-pointer accent-landing-lime"
            />
          </label>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-landing-lime-mist/60">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
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
          <button type="button" onClick={onNext} className={PRIMARY_PILL}>
            Tiếp tục: thiết kế
            <ArrowRight className="size-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
}
