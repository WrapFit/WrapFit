/**
 * Parametric Dieline Engine — Tuck Top Box (Hộp nắp gài), formula version 2 (frozen).
 * Kept only for projects pinned to formulaVersion 2 (see registry.ts): panels are exactly L × W × H, the paper thickness
 * is not added. New projects use generateTuckTopDieline (tuck-top.ts, version 3). Never change this file.
 * Owned by IT 2 (Packaging Math)
 *
 * Flat layout, x from the glue flap, y from the top tuck flap (mm):
 *
 *            ┌ tuck flap ┐
 *            │  top lid  │ ┌dust┐           ┌dust┐
 *   ┌glue┐   │   back    │ │left│   front   │right│
 *   └────┘   │  bottom   │ └dust┘           └dust┘
 *            └ tuck flap ┘
 *
 * The lid and the bottom hinge on the back panel and are L × W (they close the L × W opening); their tuck flaps fold
 * into the front panel; the dust flaps on the side panels fold under them. The bottom is a tuck closure, the simple
 * form of the crash-lock bottom. Panel sizes are the same as version 1, so FitCheck scores do not change.
 */

import { BoxDimensions, DielineGeometry, DielineSegment, PanelFace, Point2D } from "../types/dieline";

export function generateTuckTopDielineV2(dimensions: BoxDimensions): DielineGeometry {
  const { length: L, width: W, height: H } = dimensions;

  const glue = Math.min(15, Math.max(10, W * 0.2)); // glue flap width
  const tuck = Math.min(20, Math.max(12, L * 0.15)); // tuck flap height
  const dust = Math.max(8, W * 0.45); // dust flap height, < W so it stays under the lid
  const tuckCorner = Math.min(5, tuck / 2); // 45° corners of the tuck flaps
  const dustCorner = Math.min(5, dust / 2, W / 4); // slanted sides of the dust flaps
  const glueCorner = Math.min(5, glue / 2, H / 4); // taper of the glue flap

  // Columns: glue | back L | left W | front L | right W
  const xBack = glue;
  const xLeft = xBack + L;
  const xFront = xLeft + W;
  const xRight = xFront + L;
  const xEnd = xRight + W;
  // Rows: tuck | lid W | body H | bottom W | tuck
  const yLid = tuck;
  const yBody = yLid + W;
  const yBodyEnd = yBody + H;
  const yBottomEnd = yBodyEnd + W;
  const yEnd = yBottomEnd + tuck;

  const panels: PanelFace[] = [
    { id: "panel_back", name: "Mặt sau (Back)", bounds: { x: xBack, y: yBody, width: L, height: H } },
    { id: "panel_left", name: "Mặt hông trái (Left)", bounds: { x: xLeft, y: yBody, width: W, height: H } },
    { id: "panel_front", name: "Mặt trước (Front)", bounds: { x: xFront, y: yBody, width: L, height: H } },
    { id: "panel_right", name: "Mặt hông phải (Right)", bounds: { x: xRight, y: yBody, width: W, height: H } },
    { id: "panel_top_lid", name: "Nắp trên (Top Lid)", bounds: { x: xBack, y: yLid, width: L, height: W } },
    { id: "panel_bottom", name: "Đáy hộp (Bottom)", bounds: { x: xBack, y: yBodyEnd, width: L, height: W } },
  ];

  const segments: DielineSegment[] = [];
  const line = (id: string, type: "cut" | "crease", start: Point2D, end: Point2D) =>
    segments.push({ id, type, start, end });
  /** Consecutive cut lines through the points. */
  const cutPath = (id: string, points: Point2D[]) =>
    points.slice(1).forEach((end, i) => line(`${id}_${i + 1}`, "cut", points[i], end));

  // Creases: the four body folds, the lid / bottom hinges, their tuck flaps, the dust flaps
  line("crease_glue", "crease", { x: xBack, y: yBody }, { x: xBack, y: yBodyEnd });
  line("crease_v1", "crease", { x: xLeft, y: yBody }, { x: xLeft, y: yBodyEnd });
  line("crease_v2", "crease", { x: xFront, y: yBody }, { x: xFront, y: yBodyEnd });
  line("crease_v3", "crease", { x: xRight, y: yBody }, { x: xRight, y: yBodyEnd });
  line("crease_lid", "crease", { x: xBack, y: yBody }, { x: xLeft, y: yBody });
  line("crease_lid_tuck", "crease", { x: xBack, y: yLid }, { x: xLeft, y: yLid });
  line("crease_bottom", "crease", { x: xBack, y: yBodyEnd }, { x: xLeft, y: yBodyEnd });
  line("crease_bottom_tuck", "crease", { x: xBack, y: yBottomEnd }, { x: xLeft, y: yBottomEnd });
  line("crease_dust_top_left", "crease", { x: xLeft, y: yBody }, { x: xFront, y: yBody });
  line("crease_dust_top_right", "crease", { x: xRight, y: yBody }, { x: xEnd, y: yBody });
  line("crease_dust_bottom_left", "crease", { x: xLeft, y: yBodyEnd }, { x: xFront, y: yBodyEnd });
  line("crease_dust_bottom_right", "crease", { x: xRight, y: yBodyEnd }, { x: xEnd, y: yBodyEnd });

  // Cut lines: the outline of the blank, flap by flap
  cutPath("cut_top_tuck", [
    { x: xBack, y: yBody },
    { x: xBack, y: tuckCorner },
    { x: xBack + tuckCorner, y: 0 },
    { x: xLeft - tuckCorner, y: 0 },
    { x: xLeft, y: tuckCorner },
    { x: xLeft, y: yBody },
  ]);
  const dustFlap = (id: string, x0: number, x1: number, hinge: number, edge: number) =>
    cutPath(id, [
      { x: x0, y: hinge },
      { x: x0 + dustCorner, y: edge },
      { x: x1 - dustCorner, y: edge },
      { x: x1, y: hinge },
    ]);
  dustFlap("cut_dust_top_left", xLeft, xFront, yBody, yBody - dust);
  dustFlap("cut_dust_top_right", xRight, xEnd, yBody, yBody - dust);
  dustFlap("cut_dust_bottom_left", xLeft, xFront, yBodyEnd, yBodyEnd + dust);
  dustFlap("cut_dust_bottom_right", xRight, xEnd, yBodyEnd, yBodyEnd + dust);
  line("cut_front_top", "cut", { x: xFront, y: yBody }, { x: xRight, y: yBody });
  line("cut_front_bottom", "cut", { x: xFront, y: yBodyEnd }, { x: xRight, y: yBodyEnd });
  line("cut_right_edge", "cut", { x: xEnd, y: yBody }, { x: xEnd, y: yBodyEnd });
  cutPath("cut_glue", [
    { x: xBack, y: yBody },
    { x: 0, y: yBody + glueCorner },
    { x: 0, y: yBodyEnd - glueCorner },
    { x: xBack, y: yBodyEnd },
  ]);
  cutPath("cut_bottom_tuck", [
    { x: xBack, y: yBodyEnd },
    { x: xBack, y: yEnd - tuckCorner },
    { x: xBack + tuckCorner, y: yEnd },
    { x: xLeft - tuckCorner, y: yEnd },
    { x: xLeft, y: yEnd - tuckCorner },
    { x: xLeft, y: yBodyEnd },
  ]);

  return {
    structureType: "tuck-top",
    dimensions,
    totalBoundingBox: { width: xEnd, height: yEnd },
    panels,
    segments,
  };
}
