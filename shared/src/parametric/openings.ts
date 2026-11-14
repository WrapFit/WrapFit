/**
 * Holes cut inside a panel (docs/23 S17): display windows and hand holes, as rounded rectangles.
 * Owned by IT 2 (Packaging Math)
 */

import { DielineOpening, PanelFace } from "../types/dieline";
import { segmentWriter } from "./segments";

/** Smallest window side worth cutting, mm: below it the box is too small for a window and gets none. */
export const MIN_WINDOW_MM = 20;
/** PET film glued behind a window overlaps the cut by this much on every side, mm (kept free of glue-repelling ink). */
export const WINDOW_FILM_OVERLAP_MM = 8;

/**
 * Display window centred on a panel: at least 10 mm (18 % of the shorter side) from its folds, so the frame stays
 * stiff and the film has room to be glued. Null when the panel is too small.
 */
export function windowIn(panel: PanelFace): DielineOpening | null {
  const { x, y, width, height } = panel.bounds;
  const margin = Math.max(10, 0.18 * Math.min(width, height));
  const w = width - 2 * margin;
  const h = height - 2 * margin;
  if (w < MIN_WINDOW_MM || h < MIN_WINDOW_MM) return null;
  return { kind: "window", panelId: panel.id, x: x + margin, y: y + margin, width: w, height: h, radius: Math.min(4, w / 4, h / 4) };
}

/** Cut line of an opening: four sides and four rounded corners (a stadium when the radius is half the height). */
export function cutOpening(writer: ReturnType<typeof segmentWriter>, id: string, { x, y, width, height, radius: r }: DielineOpening) {
  const { line, curve } = writer;
  const x1 = x + width;
  const y1 = y + height;
  const side = (n: string, a: { x: number; y: number }, b: { x: number; y: number }) => {
    if (Math.hypot(b.x - a.x, b.y - a.y) > 0.01) line(`${id}_${n}`, "cut", a, b);
  };
  side("top", { x: x + r, y }, { x: x1 - r, y });
  curve(`${id}_corner_tr`, "cut", { x: x1 - r, y }, { x: x1, y }, { x: x1, y: y + r });
  side("right", { x: x1, y: y + r }, { x: x1, y: y1 - r });
  curve(`${id}_corner_br`, "cut", { x: x1, y: y1 - r }, { x: x1, y: y1 }, { x: x1 - r, y: y1 });
  side("bottom", { x: x1 - r, y: y1 }, { x: x + r, y: y1 });
  curve(`${id}_corner_bl`, "cut", { x: x + r, y: y1 }, { x, y: y1 }, { x, y: y1 - r });
  side("left", { x, y: y1 - r }, { x, y: y + r });
  curve(`${id}_corner_tl`, "cut", { x, y: y + r }, { x, y }, { x: x + r, y });
}

/** Does a rectangle on the sheet overlap an opening? */
export function overlapsOpening(rect: { x: number; y: number; width: number; height: number }, opening: DielineOpening): boolean {
  return rect.x < opening.x + opening.width && opening.x < rect.x + rect.width && rect.y < opening.y + opening.height && opening.y < rect.y + rect.height;
}
