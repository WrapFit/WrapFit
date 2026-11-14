/**
 * Parametric Dieline Engine — Divider insert (Khay chia ngăn), formula version 3 (docs/23 S18).
 * Owned by IT 2 (Packaging Math)
 *
 * Two pieces: an open tray (tray.ts, the base of the lid & base box) and a set of slotted partitions that cross like
 * an egg crate. `cells` (rows along W × columns along L, default 2 × 3) splits the inside of the tray; a single row or
 * column needs no partition in that direction.
 *
 * L × W × H is the inside of the tray, the size the user measures inside the box the insert goes into, minus a little
 * play. Partitions are one paper thickness thick and their mid-planes sit on the cell boundaries:
 * - long partitions run along L between the rows, slotted from the top at every column boundary;
 * - cross partitions run along W between the columns, slotted from the bottom at every row boundary;
 * both are H − 2 mm high (they stay under the lid) and 0.5 mm shorter than the inside they span.
 */

import { BoxDimensions, DielineGeometry, PanelFace } from "../types/dieline";
import { segmentWriter } from "./segments";
import { generateTray } from "./tray";

export const DEFAULT_CELLS = { rows: 2, cols: 3 };
export const MAX_CELLS = { rows: 4, cols: 6 };
/** Gap between the partitions on their sheet, mm. */
const STRIP_GAP_MM = 4;

/** Grid of an insert: cell size and the centre lines of the partitions, in the inside of the tray (mm from its corner). */
export function insertLayoutOf({ length: L, width: W, height: H, paperThickness: t, cells }: BoxDimensions) {
  const rows = Math.min(MAX_CELLS.rows, Math.max(1, Math.round(cells?.rows ?? DEFAULT_CELLS.rows)));
  const cols = Math.min(MAX_CELLS.cols, Math.max(1, Math.round(cells?.cols ?? DEFAULT_CELLS.cols)));
  const cellL = (L - (cols - 1) * t) / cols;
  const cellW = (W - (rows - 1) * t) / rows;
  return {
    rows,
    cols,
    cellL,
    cellW,
    /** Along L: centre of the cross partition after column j (1 … cols − 1). */
    colLines: Array.from({ length: cols - 1 }, (_, j) => (j + 1) * cellL + j * t + t / 2),
    /** Along W: centre of the long partition after row i (1 … rows − 1). */
    rowLines: Array.from({ length: rows - 1 }, (_, i) => (i + 1) * cellW + i * t + t / 2),
    stripHeight: Math.max(5, H - 2),
    longLength: L - 0.5,
    crossLength: W - 0.5,
    slotWidth: t + 0.3,
  };
}

export function generateInsertDieline(dimensions: BoxDimensions): { tray: DielineGeometry; dividers: DielineGeometry | null } {
  const { length, width, height, paperThickness: t } = dimensions;
  const tray = generateTray({
    structureType: "insert",
    dimensions,
    length: length + 3 * t,
    width: width + t,
    wall: height + t / 2,
    up: "+z",
    panels: {
      bottom: { id: "insert_bottom", name: "Đáy khay" },
      front: { id: "insert_front", name: "Thành trước" },
      back: { id: "insert_back", name: "Thành sau" },
      left: { id: "insert_left", name: "Thành trái" },
      right: { id: "insert_right", name: "Thành phải" },
    },
  });

  const g = insertLayoutOf(dimensions);
  if (g.rows === 1 && g.cols === 1) return { tray, dividers: null };
  const h = g.stripHeight;
  const slot = h / 2;
  const { segments, path } = segmentWriter();
  const panels: PanelFace[] = [];
  let y = STRIP_GAP_MM;
  const x0 = STRIP_GAP_MM;

  // One partition: its outline with slots from the top (long) or the bottom (cross) at the given positions.
  const strip = (id: string, name: string, span: number, slots: number[], fromTop: boolean) => {
    // Positions are measured from the inside corner; the strip is centred, 0.25 mm short at each end.
    const at = (p: number) => x0 + p - 0.25;
    const top = y;
    const bottom = y + h;
    const points = [{ x: x0, y: top }];
    const half = g.slotWidth / 2;
    if (fromTop) {
      for (const p of slots) points.push({ x: at(p) - half, y: top }, { x: at(p) - half, y: top + slot }, { x: at(p) + half, y: top + slot }, { x: at(p) + half, y: top });
    }
    points.push({ x: x0 + span, y: top }, { x: x0 + span, y: bottom });
    if (!fromTop) {
      for (const p of [...slots].reverse()) points.push({ x: at(p) + half, y: bottom }, { x: at(p) + half, y: bottom - slot }, { x: at(p) - half, y: bottom - slot }, { x: at(p) - half, y: bottom });
    }
    points.push({ x: x0, y: bottom }, { x: x0, y: top });
    path(`cut_${id}`, "cut", points);
    panels.push({ id, name, bounds: { x: x0, y: top, width: span, height: h } });
    y = bottom + STRIP_GAP_MM;
  };

  g.rowLines.forEach((_, i) => strip(`divider_long_${i + 1}`, `Vách dọc ${i + 1}`, g.longLength, g.colLines, true));
  // Cross partitions are slotted at the row lines (positions along W).
  g.colLines.forEach((_, j) => strip(`divider_cross_${j + 1}`, `Vách ngang ${j + 1}`, g.crossLength, g.rowLines, false));

  const sheetWidth = x0 + Math.max(g.rows > 1 ? g.longLength : 0, g.cols > 1 ? g.crossLength : 0) + STRIP_GAP_MM;
  const dividers: DielineGeometry = {
    structureType: "insert",
    dimensions,
    totalBoundingBox: { width: sheetWidth, height: y },
    panels,
    segments,
    glueAreas: [],
  };
  return { tray, dividers };
}
