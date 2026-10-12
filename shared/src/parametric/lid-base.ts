/**
 * Parametric Dieline Engine — Lid & Base Box (Hộp âm dương), formula version 3.
 * Owned by IT 2 (Packaging Math)
 *
 * Two trays (tray.ts): the base holds the gift, the lid slides over it. L × W × H is the inside of the base; with the
 * lid on, the gift has H of height (the lid rests on the rim of the base).
 *
 * Paper thickness t: creases sit on the paper mid-plane, so the base bottom is L + t by W + t, plus 2t along L for the
 * corner tabs glued inside the left and right walls; the walls are H + t/2 high (the bottom adds half a thickness).
 * The lid is sized on the outside of the base (base + t) plus LID_CLEARANCE, then the same allowances.
 */

import { BoxDimensions, DielineGeometry } from "../types/dieline";
import { generateTray } from "./tray";

/** Gap between the outside of the base and the inside of the lid, mm. */
export const LID_CLEARANCE_MM = 1;

/** Wall height of the lid, crease to rim (mm): about 60 % of the box, at least 15 mm, never more than the base. */
export function lidWallOf(height: number, paperThickness: number): number {
  return Math.min(height + paperThickness / 2, Math.max(15, height * 0.6));
}

export function generateLidBaseDieline(dimensions: BoxDimensions): {
  base: DielineGeometry;
  lid: DielineGeometry;
} {
  const { length, width, height, paperThickness: t } = dimensions;
  const baseL = length + 3 * t;
  const baseW = width + t;
  const outsideL = baseL + t;
  const outsideW = baseW + t;

  const base = generateTray({
    structureType: "lid-base",
    dimensions,
    length: baseL,
    width: baseW,
    wall: height + t / 2,
    up: "+z",
    panels: {
      bottom: { id: "base_bottom", name: "Đáy hộp" },
      front: { id: "base_front", name: "Thành trước" },
      back: { id: "base_back", name: "Thành sau" },
      left: { id: "base_left", name: "Thành trái" },
      right: { id: "base_right", name: "Thành phải" },
    },
  });

  const lid = generateTray({
    structureType: "lid-base",
    dimensions,
    length: outsideL + LID_CLEARANCE_MM + 3 * t,
    width: outsideW + LID_CLEARANCE_MM + t,
    wall: lidWallOf(height, t),
    up: "-z",
    frontAtTop: false,
    panels: {
      bottom: { id: "lid_top", name: "Mặt nắp" },
      front: { id: "lid_front", name: "Vách nắp trước" },
      back: { id: "lid_back", name: "Vách nắp sau" },
      left: { id: "lid_left", name: "Vách nắp trái" },
      right: { id: "lid_right", name: "Vách nắp phải" },
    },
  });

  return { base, lid };
}
