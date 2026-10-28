"use client";
/* ds-artwork: template previews show printed artwork and paper colours (docs/15_DESIGN_SYSTEM.md §2). */

import React, { useMemo, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";
import {
  generatedTemplates,
  LIBRARY_OCCASIONS,
  type GeneratedTemplate,
  type LibraryOccasion,
  type TemplateIndustry,
} from "@wrapfit/shared";
import { buttonClass } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { useBoxFonts } from "./canvas/boxText";
import { FacePreview } from "./library/FacePreview";
import { StudioCard } from "./studioUi";

const PRODUCTS: { id: TemplateIndustry; label: string }[] = [
  { id: "CANDLES", label: "Nến thơm" },
  { id: "COSMETICS", label: "Mỹ phẩm" },
  { id: "BAKERY", label: "Bánh ngọt" },
  { id: "JEWELRY", label: "Trang sức" },
  { id: "TEA_AGRI", label: "Trà & nông sản" },
];
const PAPER_FILL: Record<string, string> = { ivory: "#FAF6EE", kraft: "#D9B897", duplex: "#F4F1EA" };
const STRUCTURE_NAMES: Record<string, string> = {
  "tuck-top": "Hộp nắp gài",
  "sleeve-drawer": "Hộp bao diêm",
  "lid-base": "Hộp âm dương",
  pillow: "Hộp gối",
};

/**
 * Step 1, "Bắt đầu nhanh": an occasion and a product give three finished designs (templates generated from the style
 * kits, each passing FitCheck); picking one dresses the box and moves on to its size.
 */
export function QuickStart({ onPick }: { onPick: (template: GeneratedTemplate) => void }) {
  const [occasion, setOccasion] = useState<LibraryOccasion>("TET");
  const [product, setProduct] = useState<TemplateIndustry>("CANDLES");
  const all = useMemo(() => generatedTemplates(), []);
  const picks = useMemo(() => {
    // The occasion always wins (its own product first); another occasion only fills up an empty one.
    const ofOccasion = all.filter((t) => t.occasion === occasion);
    // Each kit and product comes in two layouts with the same title: one of them is enough here.
    const ranked = [
      ...ofOccasion.filter((t) => t.industry === product),
      ...ofOccasion.filter((t) => t.industry !== product),
      ...all.filter((t) => t.occasion !== occasion && t.industry === product),
    ].filter((t, i, list) => list.findIndex((x) => x.title === t.title) === i);
    // One template per style kit first, so the three choices look different.
    const out: GeneratedTemplate[] = [];
    const kits = new Set<string>();
    for (const t of ranked.filter((x) => !ofOccasion.length || x.occasion === occasion)) {
      if (out.length < 3 && !kits.has(t.kitId)) (kits.add(t.kitId), out.push(t));
    }
    for (const t of ranked) if (out.length < 3 && !out.includes(t)) out.push(t);
    return out;
  }, [all, occasion, product]);
  useBoxFonts(picks.flatMap((t) => t.canvasState.elements));

  const chip = (on: boolean) => buttonClass({ variant: on ? "dark" : "secondary", size: "md", className: "min-h-11 shrink-0" });

  return (
    <StudioCard aria-labelledby="quick-start-title" className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="quick-start-title" className="flex items-center gap-2 font-landing-heading text-title font-bold text-fg">
            <Zap className="size-5 text-fpt-orange" aria-hidden />
            Bắt đầu nhanh
          </h2>
          <p className="mt-1 text-body-sm text-fg-muted">Chọn dịp và sản phẩm: ba mẫu đã thiết kế sẵn, đạt FitCheck, chỉnh kích thước ở bước sau.</p>
        </div>
        <span className="text-caption text-fg-muted">hoặc chọn một cấu trúc trống bên dưới</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div role="radiogroup" aria-label="Dịp" className="flex gap-1.5 overflow-x-auto pb-1">
          {LIBRARY_OCCASIONS.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={occasion === o.id} onClick={() => setOccasion(o.id)} className={chip(occasion === o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Sản phẩm" className="flex gap-1.5 overflow-x-auto pb-1">
          {PRODUCTS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={product === p.id} onClick={() => setProduct(p.id)} className={chip(product === p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {picks.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onPick(template)}
              className="group flex w-full flex-col overflow-hidden rounded-panel border border-line bg-surface-raised text-left transition hover:-translate-y-0.5 hover:border-fg hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 motion-reduce:transition-none"
            >
              <span className={cn("flex h-40 items-center justify-center bg-canvas p-3")}>
                <span className="block h-full w-full">
                  <FacePreview
                    structure={template.structure}
                    dimensions={template.dimensions}
                    elements={template.canvasState.elements}
                    paper={PAPER_FILL[template.materialSpec.type] ?? PAPER_FILL.ivory}
                    className="h-full w-full"
                  />
                </span>
              </span>
              <span className="flex flex-col gap-0.5 px-3 py-2.5">
                <span className="line-clamp-1 text-body-sm font-semibold text-fg">{template.title}</span>
                <span className="text-caption tabular-nums text-fg-muted">
                  {STRUCTURE_NAMES[template.structure] ?? template.structure} · {template.dimensions.length} × {template.dimensions.width} × {template.dimensions.height} mm
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-label-sm font-semibold text-accent group-hover:underline">
                  Dùng mẫu này <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </StudioCard>
  );
}
