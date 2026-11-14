"use client";
/* ds-artwork: swatches show the logo's own printed colours (docs/15_DESIGN_SYSTEM.md §2). */

import React, { useEffect, useState } from "react";
import { ART_PALETTES, cleanColorMap, paletteColorMap, type CanvasElement } from "@wrapfit/shared";
import { buttonClass } from "@/components/ui";
import { svgColorsOfUrl } from "../../utils/svgRecolor";

/**
 * Colours of an SVG logo (docs/23 S14): each colour of the file can be swapped for another, or the whole logo dressed
 * in a palette of the library. Swaps live in `style.colorMap`; the file itself never changes. Hidden for other files.
 */
export function SvgColors({ element, onChange }: { element: CanvasElement; onChange(element: CanvasElement): void }) {
  const [colors, setColors] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setColors(null);
    void svgColorsOfUrl(element.content).then((found) => {
      if (!cancelled) setColors(found);
    });
    return () => {
      cancelled = true;
    };
  }, [element.content]);
  if (!colors?.length) return null;

  const map = cleanColorMap(element.style?.colorMap);
  const shown = colors.slice(0, 8);
  const current = (from: string) => map.find((swap) => swap.from === from)?.to ?? from;
  const save = (next: { from: string; to: string }[]) => {
    const clean = cleanColorMap(next);
    onChange({ ...element, style: { ...element.style, colorMap: clean.length ? clean : undefined } });
  };
  const swap = (from: string, to: string) => save([...map.filter((s) => s.from !== from), { from, to: to.toUpperCase() }]);

  return (
    <fieldset className="space-y-3 rounded-panel bg-surface-raised p-3 ring-1 ring-inset ring-line">
      <legend className="px-1 text-label font-semibold text-fg">Màu của logo</legend>
      <ul className="grid grid-cols-4 gap-2">
        {shown.map((from) => (
          <li key={from}>
            <label className="flex flex-col items-center gap-1" title={`${from} → ${current(from)}`}>
              <input
                type="color"
                value={current(from)}
                onChange={(e) => swap(from, e.target.value)}
                aria-label={`Đổi màu ${from}`}
                className="size-11 cursor-pointer rounded-control border border-line-strong bg-surface-raised p-1"
              />
              <span className="font-mono text-[11px] uppercase tabular-nums text-fg-muted">{current(from)}</span>
            </label>
          </li>
        ))}
      </ul>
      {colors.length > shown.length && <p className="text-caption text-fg-muted">Logo có {colors.length} màu; đổi được 8 màu dùng nhiều nhất.</p>}
      <div role="group" aria-label="Đổi theo bảng màu" className="flex flex-wrap gap-1.5">
        {ART_PALETTES.map((palette) => (
          <button
            key={palette.id}
            type="button"
            aria-label={`Theo bảng màu ${palette.name}`}
            title={palette.name}
            onClick={() => save(paletteColorMap(colors, palette))}
            className="size-8 overflow-hidden rounded-full ring-1 ring-line hover:ring-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
            style={{ background: `linear-gradient(135deg, ${palette.base} 0 50%, ${palette.accent} 50% 100%)` }}
          />
        ))}
      </div>
      {map.length > 0 && (
        <button type="button" className={buttonClass({ variant: "link", className: "text-caption" })} onClick={() => save([])}>
          Về màu gốc của file
        </button>
      )}
      <p className="text-caption leading-5 text-fg-muted">Màu đổi được in đúng như trên màn hình (file SVG gốc giữ nguyên).</p>
    </fieldset>
  );
}
