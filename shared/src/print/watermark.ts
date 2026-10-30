/**
 * Watermark of the free A4 PDF (docs/16 §5.4): one line of small grey text where it does not spoil the design. It sits
 * on a glue flap when the box has one (hidden once the box is glued), otherwise in a band at the bottom of the largest
 * panel, inside the safe margin. The print renderer draws it on the Artwork layer; it is not a CanvasElement, so
 * FitCheck never sees it.
 */
import type { DielineGeometry } from "../types/dieline";
import { PT_TO_MM } from "./text-layout";

export const WATERMARK_TEXT = "Thiết kế bằng WrapFit · wrapfit.vn";
export const WATERMARK_FONT_PT = 6;
/** `line-strong` of the design system: readable, light enough not to compete with the artwork. */
export const WATERMARK_COLOR = "#7C8BA1";
/** Distance kept from the edges of the panel in the fallback band, mm (docs/16 §5.4: the 3 mm safe margin). */
export const WATERMARK_SAFE_MM = 3;
/** Height of the fallback band, mm: one line of 6 pt with its accents and descenders. */
const BAND_MM = 3;
/** Kept free across a glue flap (its crease, its cut edge), mm. */
const GLUE_SIDE_INSET_MM = 1;
/** Kept free at both ends of a glue flap, where its corners are tapered (at most 5 mm in the formulas), mm. */
const GLUE_END_INSET_MM = 6;

/** A dieline piece placed on the sheet (mm, top-left corner), as the print layout has them. */
export interface WatermarkPiece {
  x: number;
  y: number;
  geometry: Pick<DielineGeometry, "panels" | "glueAreas">;
}

/**
 * Where the watermark goes, on the sheet (mm): an axis-aligned box the text line is centred in. `rotation` -90: the
 * text runs bottom to top along the height of the box (narrow, tall glue flaps).
 */
export interface WatermarkPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | -90;
  source: "glue" | "panel";
}

/** Box shrunk by `side` across its short side and `end` along its long side (never below zero). */
function inset(box: { x: number; y: number; width: number; height: number }, side: number, end: number) {
  const tall = box.height > box.width;
  const dx = Math.min(tall ? side : end, box.width / 2);
  const dy = Math.min(tall ? end : side, box.height / 2);
  return { x: box.x + dx, y: box.y + dy, width: box.width - 2 * dx, height: box.height - 2 * dy };
}

/**
 * Placement of the watermark for the pieces of a print sheet: the glue area with the longest run for the text, else a
 * band along the bottom of the largest panel. Null when the pieces have no panel at all.
 */
export function watermarkPlacement(pieces: readonly WatermarkPiece[]): WatermarkPlacement | null {
  const glue = pieces
    .flatMap((piece) =>
      (piece.geometry.glueAreas ?? []).map((area) =>
        inset({ x: piece.x + area.x, y: piece.y + area.y, width: area.width, height: area.height }, GLUE_SIDE_INSET_MM, GLUE_END_INSET_MM),
      ),
    )
    .filter((box) => box.width > 0 && box.height > 0)
    .sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height) || b.width * b.height - a.width * a.height)[0];
  if (glue) return { ...glue, rotation: glue.height > glue.width ? -90 : 0, source: "glue" };

  const panel = pieces
    .flatMap((piece) => piece.geometry.panels.map((p) => ({ ...p.bounds, x: piece.x + p.bounds.x, y: piece.y + p.bounds.y })))
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  if (!panel) return null;
  const width = Math.max(0, panel.width - 2 * WATERMARK_SAFE_MM);
  const height = Math.max(0, Math.min(BAND_MM, panel.height - 2 * WATERMARK_SAFE_MM));
  return {
    x: panel.x + WATERMARK_SAFE_MM,
    y: panel.y + panel.height - WATERMARK_SAFE_MM - height,
    width,
    height,
    rotation: 0,
    source: "panel",
  };
}

/**
 * Size and position of the watermark line in its placement: 6 pt, smaller when the text would not fit the run of the
 * box. `advanceAt` gives the width of the text (mm) at a font size (mm). Returns the start of the baseline on the sheet
 * and the rotation to draw the outlines with (degrees, y down: -90 turns the line to read bottom to top).
 */
export function fitWatermark(placement: WatermarkPlacement, advanceAt: (sizeMm: number) => number) {
  const vertical = placement.rotation === -90;
  const run = vertical ? placement.height : placement.width;
  const across = vertical ? placement.width : placement.height;
  // Accents above and descenders below take about 1.2 em: keep the line inside the box across it too.
  let sizeMm = Math.min(WATERMARK_FONT_PT * PT_TO_MM, across / 1.2);
  const advance = advanceAt(sizeMm);
  if (advance > run) sizeMm *= run / advance;
  const length = advanceAt(sizeMm);
  // The middle of the glyphs (between baseline and cap height) sits about 0.35 em above the baseline.
  const lift = 0.35 * sizeMm;
  const cx = placement.x + placement.width / 2;
  const cy = placement.y + placement.height / 2;
  return {
    sizeMm,
    length,
    rotation: placement.rotation,
    origin: vertical ? { x: cx + lift, y: cy + length / 2 } : { x: cx - length / 2, y: cy + lift },
  };
}
