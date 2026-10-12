/**
 * Parametric Dieline Engine — Sleeve & Drawer Box (Hộp bao diêm), formula version 3.
 * Owned by IT 2 (Packaging Math)
 *
 * A drawer (tray.ts) that slides along L inside a sleeve open at both L ends. L × W × H is the inside of the drawer.
 *
 * Sleeve layout, y from the glue flap (mm); the sleeve wraps around the W × H section of the drawer:
 *
 *   ┌──── glue flap ────┐
 *   │    top   L × W    │
 *   │   right  L × H    │
 *   │   bottom L × W    │
 *   │   left   L × H    │   (the glue flap is glued inside the left panel; the right panel faces the front)
 *   └───────────────────┘
 *
 * Paper thickness t: the drawer is sized like the base of the lid & base box (bottom L + 3t by W + t, walls H + t/2);
 * the sleeve is the outside of the drawer plus SLIDE_CLEARANCE on W and H, plus t for its own creases, and as long as
 * the drawer. Version 1 wrapped the sleeve around the L × H section, so the drawer slid out along W.
 */

import { BoxDimensions, DielineGeometry, PanelFace } from "../types/dieline";
import { segmentWriter } from "./segments";
import { generateTray } from "./tray";

/** Gap between the outside of the drawer and the inside of the sleeve, on W and on H, mm. */
export const SLIDE_CLEARANCE_MM = 1;

export function generateSleeveDrawerDieline(dimensions: BoxDimensions): {
  sleeve: DielineGeometry;
  drawer: DielineGeometry;
} {
  const { length, width, height, paperThickness: t } = dimensions;
  const drawerL = length + 3 * t;
  const drawerW = width + t;
  const drawerH = height + t / 2;

  const drawer = generateTray({
    structureType: "sleeve-drawer",
    dimensions,
    length: drawerL,
    width: drawerW,
    wall: drawerH,
    up: "+z",
    panels: {
      bottom: { id: "drawer_base", name: "Đáy khay (Base)" },
      front: { id: "drawer_front", name: "Thành trước" },
      back: { id: "drawer_back", name: "Thành sau" },
      left: { id: "drawer_left", name: "Thành trái" },
      right: { id: "drawer_right", name: "Thành phải" },
    },
  });

  // Outside of the drawer: + t across the walls, + t/2 under the bottom.
  const L = drawerL + t;
  const W = drawerW + t + SLIDE_CLEARANCE_MM + t;
  const H = drawerH + t / 2 + SLIDE_CLEARANCE_MM + t;
  const glue = Math.min(15, Math.max(10, H * 0.4), H - 2);
  const glueCorner = Math.min(5, glue / 2, L / 4);

  const yTop = glue;
  const yRight = yTop + W;
  const yBottom = yRight + H;
  const yLeft = yBottom + W;
  const yEnd = yLeft + H;

  const panels: PanelFace[] = [
    { id: "sleeve_top", name: "Vỏ trên (Top)", bounds: { x: 0, y: yTop, width: L, height: W } },
    {
      id: "sleeve_right",
      name: "Vỏ hông phải",
      bounds: { x: 0, y: yRight, width: L, height: H },
      fold: { parent: "sleeve_top", edge: "top", angle: 90 },
    },
    {
      id: "sleeve_bottom",
      name: "Vỏ đáy (Bottom)",
      bounds: { x: 0, y: yBottom, width: L, height: W },
      fold: { parent: "sleeve_right", edge: "top", angle: 90 },
    },
    {
      id: "sleeve_left",
      name: "Vỏ hông trái",
      bounds: { x: 0, y: yLeft, width: L, height: H },
      fold: { parent: "sleeve_bottom", edge: "top", angle: 90 },
    },
  ];

  const { segments, line, path } = segmentWriter();
  line("crease_glue", "crease", { x: 0, y: yTop }, { x: L, y: yTop });
  line("crease_right", "crease", { x: 0, y: yRight }, { x: L, y: yRight });
  line("crease_bottom", "crease", { x: 0, y: yBottom }, { x: L, y: yBottom });
  line("crease_left", "crease", { x: 0, y: yLeft }, { x: L, y: yLeft });
  path("cut_outline", "cut", [
    { x: 0, y: yTop },
    { x: glueCorner, y: 0 },
    { x: L - glueCorner, y: 0 },
    { x: L, y: yTop },
    { x: L, y: yEnd },
    { x: 0, y: yEnd },
    { x: 0, y: yTop },
  ]);

  const sleeve: DielineGeometry = {
    structureType: "sleeve-drawer",
    dimensions,
    totalBoundingBox: { width: L, height: yEnd },
    panels,
    segments,
    glueAreas: [{ x: 0, y: 0, width: L, height: glue }],
    orientation: { up: "-z", front: "+y" },
  };

  return { sleeve, drawer };
}
