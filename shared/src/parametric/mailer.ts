/**
 * Parametric Dieline Engine — Mailer box (Hộp nắp cài, FEFCO 0427 roll end tuck front), formula version 3.
 * Owned by IT 2 (Packaging Math)
 *
 * One sheet, no glue: the front and side walls are double (the outer wall rolls over its rim into an inner wall), the
 * inner side walls lock into slots of the bottom, the ears at the ends of the front and back walls fold in between the
 * two layers of the side walls, and the lid hinges on the back wall, its tuck flap closing inside the front wall.
 *
 *            ┌──── front inner ────┐
 *       ┌ear│     front outer     │ear┐
 *  ┤inner│outer│     bottom      │outer│inner├   (lock tabs on the inner side walls)
 *       └ear│        back         │ear┘
 *      ┌dust│         lid         │dust┐
 *             └──── tuck flap ────┘
 *
 * The front sits above the bottom on the sheet so it reads upright on the closed box, and so does the lid seen from
 * the front. L × W × H is the inside of the box (between the inner walls, under the lid); every crease sits on the
 * paper mid-plane:
 * - along L the bottom carries the inner and outer side walls on both sides: L + 3t;
 * - along W the front is double and the back single: W + 2t;
 * - the back wall reaches the lid mid-plane: H + t; the outer walls reach the rim of the roll: H + t/2; the inner walls
 *   stop 1 mm above the bottom so the roll closes without forcing.
 * Simplified from the FEFCO drawing: the lid is as long as the bottom and its dust flaps slip inside the side walls.
 */

import { BoxDimensions, DielineGeometry, PanelFace, Point2D } from "../types/dieline";
import { segmentWriter } from "./segments";

/** Gap left under the inner walls, mm. */
export const MAILER_INNER_CLEARANCE_MM = 1;
/** Fold of the inner walls on the rim: slightly under 180° so the two layers of the 3D model do not overlap. */
const ROLL_ANGLE = 178;

/** Sizes of the mailer box derived from the inside L × W × H (exported for the tests and FitCheck). */
export function mailerSizesOf({ length, width, height, paperThickness: t }: BoxDimensions) {
  const bottomL = length + 3 * t;
  const bottomW = width + 2 * t;
  const outer = height + t / 2;
  const inner = Math.max(5, height - MAILER_INNER_CLEARANCE_MM);
  const back = height + t;
  return {
    bottomL,
    bottomW,
    outer,
    inner,
    back,
    /** The inner walls are shorter than the outer ones at both ends, so they clear the walls they meet. */
    inset: 2 * t + 1,
    /** Tuck flap of the lid, folded inside the front wall. */
    tuck: Math.min(inner - 2, Math.max(12, width * 0.2), 30),
    /** Ears at the ends of the front and back walls, folded between the layers of the side walls. */
    ear: Math.max(5, Math.min(bottomW / 2 - 2, height - 2)),
    /** Dust flaps of the lid, folded down inside the side walls. */
    dust: Math.max(5, Math.min(inner - 2, bottomL / 3)),
    /** Lock tabs of the inner side walls: width and how far they enter the bottom. */
    lockWidth: Math.min(20, bottomW / 4),
    lockDepth: 2 * t + 2,
  };
}

export function generateMailerDieline(dimensions: BoxDimensions): DielineGeometry {
  const t = dimensions.paperThickness;
  const s = mailerSizesOf(dimensions);
  const { bottomL: L, bottomW: W, outer: Ho, inner: Hi, back: Hb, inset, tuck, ear, dust, lockWidth, lockDepth } = s;

  // Columns: lock | left inner | left outer | bottom | right outer | right inner | lock
  const xLeftInner = lockDepth;
  const xLeftOuter = xLeftInner + Hi;
  const x0 = xLeftOuter + Ho;
  const x1 = x0 + L;
  const xRightInner = x1 + Ho;
  const xEnd = xRightInner + Hi + lockDepth;

  // Rows: front inner | front outer | bottom | back | lid | tuck
  const yFront = Hi;
  const yBottom = yFront + Ho;
  const yBack = yBottom + W;
  const yLid = yBack + Hb;
  const yTuck = yLid + W;
  const yEnd = yTuck + tuck;

  const panels: PanelFace[] = [
    { id: "mailer_bottom", name: "Đáy hộp", bounds: { x: x0, y: yBottom, width: L, height: W } },
    {
      id: "mailer_front",
      name: "Mặt trước",
      bounds: { x: x0, y: yFront, width: L, height: Ho },
      fold: { parent: "mailer_bottom", edge: "bottom", angle: 90 },
    },
    {
      id: "mailer_front_inner",
      name: "Mặt trước (lớp trong)",
      bounds: { x: x0 + inset, y: 0, width: L - 2 * inset, height: Hi },
      fold: { parent: "mailer_front", edge: "bottom", angle: ROLL_ANGLE },
    },
    {
      id: "mailer_back",
      name: "Mặt sau",
      bounds: { x: x0, y: yBack, width: L, height: Hb },
      fold: { parent: "mailer_bottom", edge: "top", angle: 90 },
    },
    {
      id: "mailer_lid",
      name: "Nắp hộp",
      bounds: { x: x0, y: yLid, width: L, height: W },
      fold: { parent: "mailer_back", edge: "top", angle: 90 },
    },
    {
      id: "mailer_left",
      name: "Hông trái",
      bounds: { x: xLeftOuter, y: yBottom, width: Ho, height: W },
      fold: { parent: "mailer_bottom", edge: "right", angle: 90 },
    },
    {
      id: "mailer_left_inner",
      name: "Hông trái (lớp trong)",
      bounds: { x: xLeftInner, y: yBottom + inset, width: Hi, height: W - 2 * inset },
      fold: { parent: "mailer_left", edge: "right", angle: ROLL_ANGLE },
    },
    {
      id: "mailer_right",
      name: "Hông phải",
      bounds: { x: x1, y: yBottom, width: Ho, height: W },
      fold: { parent: "mailer_bottom", edge: "left", angle: 90 },
    },
    {
      id: "mailer_right_inner",
      name: "Hông phải (lớp trong)",
      bounds: { x: xRightInner, y: yBottom + inset, width: Hi, height: W - 2 * inset },
      fold: { parent: "mailer_right", edge: "left", angle: ROLL_ANGLE },
    },
  ];

  const { segments, line, path } = segmentWriter();

  // Creases: the bottom, the rolls, the ears, the lid and its flaps.
  line("crease_front", "crease", { x: x0, y: yBottom }, { x: x1, y: yBottom });
  line("crease_back", "crease", { x: x0, y: yBack }, { x: x1, y: yBack });
  line("crease_left", "crease", { x: x0, y: yBottom }, { x: x0, y: yBack });
  line("crease_right", "crease", { x: x1, y: yBottom }, { x: x1, y: yBack });
  line("crease_front_roll", "crease", { x: x0 + inset, y: yFront }, { x: x1 - inset, y: yFront });
  line("crease_left_roll", "crease", { x: xLeftOuter, y: yBottom + inset }, { x: xLeftOuter, y: yBack - inset });
  line("crease_right_roll", "crease", { x: xRightInner, y: yBottom + inset }, { x: xRightInner, y: yBack - inset });
  line("crease_ear_front_left", "crease", { x: x0, y: yFront }, { x: x0, y: yBottom });
  line("crease_ear_front_right", "crease", { x: x1, y: yFront }, { x: x1, y: yBottom });
  line("crease_ear_back_left", "crease", { x: x0, y: yBack }, { x: x0, y: yLid });
  line("crease_ear_back_right", "crease", { x: x1, y: yBack }, { x: x1, y: yLid });
  line("crease_lid", "crease", { x: x0, y: yLid }, { x: x1, y: yLid });
  line("crease_dust_left", "crease", { x: x0, y: yLid }, { x: x0, y: yTuck });
  line("crease_dust_right", "crease", { x: x1, y: yLid }, { x: x1, y: yTuck });
  line("crease_tuck", "crease", { x: x0, y: yTuck }, { x: x1, y: yTuck });

  // Lock slots in the bottom, on the side creases, where the tabs of the inner walls enter.
  const lockCentres = [yBottom + W / 4, yBack - W / 4];
  const slotWidth = t + 1;
  lockCentres.forEach((cy, i) => {
    const y0 = cy - lockWidth / 2 - 0.5;
    const y1 = cy + lockWidth / 2 + 0.5;
    path(`cut_slot_left_${i + 1}`, "cut", [
      { x: x0, y: y0 },
      { x: x0 + slotWidth, y: y0 },
      { x: x0 + slotWidth, y: y1 },
      { x: x0, y: y1 },
    ]);
    path(`cut_slot_right_${i + 1}`, "cut", [
      { x: x1, y: y0 },
      { x: x1 - slotWidth, y: y0 },
      { x: x1 - slotWidth, y: y1 },
      { x: x1, y: y1 },
    ]);
  });

  // Outline, clockwise from the top-left corner of the front inner wall.
  const earTaper = Math.min(3, Ho / 4);
  const dustCorner = Math.min(5, dust / 2, W / 4);
  const tuckCorner = Math.min(5, tuck / 2);
  const lockEdge = (x: number, outward: 1 | -1, from: number, to: number): Point2D[] => {
    // Free edge of an inner side wall from y = from to y = to, with the two lock tabs.
    const dir = Math.sign(to - from);
    const centres = dir > 0 ? lockCentres : [...lockCentres].reverse();
    const points: Point2D[] = [{ x, y: from }];
    for (const cy of centres) {
      const a = cy - (dir * lockWidth) / 2;
      const b = cy + (dir * lockWidth) / 2;
      const tip = x + outward * lockDepth;
      points.push({ x, y: a }, { x: tip, y: a + dir * 1 }, { x: tip, y: b - dir * 1 }, { x, y: b });
    }
    points.push({ x, y: to });
    return points;
  };

  path("cut_outline", "cut", [
    { x: x0 + inset, y: 0 },
    { x: x1 - inset, y: 0 },
    { x: x1 - inset, y: yFront },
    { x: x1, y: yFront },
    // right ear of the front wall
    { x: x1 + ear, y: yFront + earTaper },
    { x: x1 + ear, y: yBottom - 1 },
    { x: x1, y: yBottom },
    // right side walls
    { x: xRightInner, y: yBottom },
    { x: xRightInner, y: yBottom + inset },
    ...lockEdge(xRightInner + Hi, 1, yBottom + inset, yBack - inset),
    { x: xRightInner, y: yBack - inset },
    { x: xRightInner, y: yBack },
    { x: x1, y: yBack },
    // right ear of the back wall
    { x: x1 + ear, y: yBack + 1 },
    { x: x1 + ear, y: yLid - earTaper },
    { x: x1, y: yLid },
    // right dust flap of the lid
    { x: x1 + dust, y: yLid + dustCorner },
    { x: x1 + dust, y: yTuck - dustCorner },
    { x: x1, y: yTuck },
    // tuck flap
    { x: x1, y: yEnd - tuckCorner },
    { x: x1 - tuckCorner, y: yEnd },
    { x: x0 + tuckCorner, y: yEnd },
    { x: x0, y: yEnd - tuckCorner },
    { x: x0, y: yTuck },
    // left dust flap
    { x: x0 - dust, y: yTuck - dustCorner },
    { x: x0 - dust, y: yLid + dustCorner },
    { x: x0, y: yLid },
    // left ear of the back wall
    { x: x0 - ear, y: yLid - earTaper },
    { x: x0 - ear, y: yBack + 1 },
    { x: x0, y: yBack },
    // left side walls
    { x: xLeftOuter, y: yBack },
    { x: xLeftOuter, y: yBack - inset },
    ...lockEdge(xLeftInner, -1, yBack - inset, yBottom + inset),
    { x: xLeftOuter, y: yBottom + inset },
    { x: xLeftOuter, y: yBottom },
    { x: x0, y: yBottom },
    // left ear of the front wall
    { x: x0 - ear, y: yBottom - 1 },
    { x: x0 - ear, y: yFront + earTaper },
    { x: x0, y: yFront },
    { x: x0 + inset, y: yFront },
    { x: x0 + inset, y: 0 },
  ]);

  return {
    structureType: "mailer",
    dimensions,
    totalBoundingBox: { width: xEnd, height: yEnd },
    panels,
    segments,
    glueAreas: [],
    orientation: { up: "+z", front: "-y" },
  };
}
