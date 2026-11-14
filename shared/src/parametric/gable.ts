/**
 * Parametric Dieline Engine — Gable box (Hộp quai xách), formula version 3.
 * Owned by IT 2 (Packaging Math)
 *
 * A tuck-top body whose front and back walls carry a sloped roof and a handle with a hand hole; the ends are pentagons
 * (the side wall and its gable in one face). One glue seam, like the tuck-top box:
 *
 *            ┌ handle ┐       ┌ handle ┐
 *            │  roof  │  /\   │  roof  │  /\        (support tabs on the gable edges)
 *   ┌glue┐   │  back  │ left  │ front  │ right
 *            │ bottom │ dust  └────────┘ dust
 *            └ tuck  ┘
 *
 * L × W × H is the inside of the body (the gift stands on the bottom, under the roof); creases sit on the paper
 * mid-plane, so the body panels are L + t and W + t wide and H + t high, as in tuck-top.ts.
 * The roofs fold in by GABLE_ROOF_ANGLE and meet one paper thickness apart, the handles fold back up and stand back to
 * back, their hand holes in register. The support tabs on the gable edges fold in under the roofs (no glue needed; a
 * dot of hand glue holds them for heavy gifts). The bottom is the straight tuck end of the tuck-top box.
 */

import { BoxDimensions, DielineGeometry, DielineOpening, PanelFace, Point2D } from "../types/dieline";
import { cutOpening } from "./openings";
import { segmentWriter } from "./segments";

/** Fold of the roofs from upright, degrees. */
export const GABLE_ROOF_ANGLE = 35;
/** Height of the handle above the ridge, mm. */
export const GABLE_HANDLE_MM = 45;
/** Hand hole: height and distance from the top of the handle, mm. */
export const GABLE_HAND_HOLE = { height: 22, top: 9 };

/** Sizes of the gable box derived from the inside L × W × H (exported for the tests). */
export function gableSizesOf({ length, width, height, paperThickness: t }: BoxDimensions) {
  const L = length + t;
  const W = width + t;
  const H = height + t;
  const angle = (GABLE_ROOF_ANGLE * Math.PI) / 180;
  // The two roofs end one thickness apart, so the handles stand back to back.
  const roof = (W - t) / (2 * Math.sin(angle));
  const rise = roof * Math.cos(angle);
  const holeWidth = Math.max(GABLE_HAND_HOLE.height + 4, Math.min(90, L * 0.6, L - 16));
  return {
    L,
    W,
    H,
    roof,
    rise,
    handle: GABLE_HANDLE_MM,
    holeWidth,
    glue: Math.min(15, Math.max(10, W * 0.2), W - 2),
    tuck: Math.min(20, Math.max(12, L * 0.15), H / 2),
    dust: Math.min(Math.max(8, W * 0.45), L / 2 - t),
  };
}

export function generateGableDieline(dimensions: BoxDimensions): DielineGeometry {
  const s = gableSizesOf(dimensions);
  const { L, W, H, roof, rise, handle, glue, tuck, dust } = s;
  const tuckCorner = Math.min(5, tuck / 2);
  const dustCorner = Math.min(5, dust / 2, W / 4);
  const glueCorner = Math.min(5, glue / 2, H / 4);
  const handleCorner = 5;

  // Columns: glue | back L | left W | front L | right W
  const xBack = glue;
  const xLeft = xBack + L;
  const xFront = xLeft + W;
  const xRight = xFront + L;
  const xEnd = xRight + W;
  // Rows: handle | roof | body H | bottom W | tuck
  const yRoof = handle;
  const yBody = yRoof + roof;
  const yBodyEnd = yBody + H;
  const yBottomEnd = yBodyEnd + W;
  const yEnd = yBottomEnd + tuck;

  const end = (x: number): Point2D[] => [
    { x, y: yBodyEnd },
    { x, y: yBody },
    { x: x + W / 2, y: yBody - rise },
    { x: x + W, y: yBody },
    { x: x + W, y: yBodyEnd },
  ];
  const roofFold = GABLE_ROOF_ANGLE;
  const panels: PanelFace[] = [
    { id: "gable_back", name: "Mặt sau", bounds: { x: xBack, y: yBody, width: L, height: H } },
    {
      id: "gable_left",
      name: "Hông trái",
      bounds: { x: xLeft, y: yBody - rise, width: W, height: H + rise },
      fold: { parent: "gable_back", edge: "left", angle: 90 },
      outline: end(xLeft),
    },
    {
      id: "gable_front",
      name: "Mặt trước",
      bounds: { x: xFront, y: yBody, width: L, height: H },
      fold: { parent: "gable_left", edge: "left", angle: 90 },
    },
    {
      id: "gable_right",
      name: "Hông phải",
      bounds: { x: xRight, y: yBody - rise, width: W, height: H + rise },
      fold: { parent: "gable_front", edge: "left", angle: 90 },
      outline: end(xRight),
    },
    {
      id: "gable_roof_back",
      name: "Mái sau",
      bounds: { x: xBack, y: yRoof, width: L, height: roof },
      fold: { parent: "gable_back", edge: "bottom", angle: roofFold },
    },
    {
      id: "gable_handle_back",
      name: "Quai sau",
      bounds: { x: xBack, y: 0, width: L, height: handle },
      fold: { parent: "gable_roof_back", edge: "bottom", angle: -roofFold },
    },
    {
      id: "gable_roof_front",
      name: "Mái trước",
      bounds: { x: xFront, y: yRoof, width: L, height: roof },
      fold: { parent: "gable_front", edge: "bottom", angle: roofFold },
    },
    {
      id: "gable_handle_front",
      name: "Quai trước",
      bounds: { x: xFront, y: 0, width: L, height: handle },
      fold: { parent: "gable_roof_front", edge: "bottom", angle: -roofFold },
    },
    {
      id: "gable_bottom",
      name: "Đáy hộp",
      bounds: { x: xBack, y: yBodyEnd, width: L, height: W },
      fold: { parent: "gable_back", edge: "top", angle: 90 },
    },
  ];

  const writer = segmentWriter();
  const { segments, line, path } = writer;

  // Creases: the body, the roofs and handles, the bottom and its flaps.
  line("crease_glue", "crease", { x: xBack, y: yBody }, { x: xBack, y: yBodyEnd });
  line("crease_v1", "crease", { x: xLeft, y: yBody }, { x: xLeft, y: yBodyEnd });
  line("crease_v2", "crease", { x: xFront, y: yBody }, { x: xFront, y: yBodyEnd });
  line("crease_v3", "crease", { x: xRight, y: yBody }, { x: xRight, y: yBodyEnd });
  line("crease_roof_back", "crease", { x: xBack, y: yBody }, { x: xLeft, y: yBody });
  line("crease_roof_front", "crease", { x: xFront, y: yBody }, { x: xRight, y: yBody });
  line("crease_handle_back", "crease", { x: xBack, y: yRoof }, { x: xLeft, y: yRoof });
  line("crease_handle_front", "crease", { x: xFront, y: yRoof }, { x: xRight, y: yRoof });
  line("crease_bottom", "crease", { x: xBack, y: yBodyEnd }, { x: xLeft, y: yBodyEnd });
  line("crease_bottom_tuck", "crease", { x: xBack, y: yBottomEnd }, { x: xLeft, y: yBottomEnd });
  line("crease_dust_bottom_left", "crease", { x: xLeft, y: yBodyEnd }, { x: xFront, y: yBodyEnd });
  line("crease_dust_bottom_right", "crease", { x: xRight, y: yBodyEnd }, { x: xEnd, y: yBodyEnd });

  // Gable of an end wall starting at x, with a support tab on each sloped edge (they fold in under the roofs). The
  // tabs are tapered at 45° and start where they clear the roof column next to them; too small a gable gets none.
  const gable = (x: number, id: string): Point2D[] => {
    const apex = { x: x + W / 2, y: yBody - rise };
    const edge = Math.hypot(W / 2, rise);
    const e = { x: W / 2 / edge, y: -rise / edge }; // along the left slope, upwards
    const n = { x: -rise / edge, y: -W / 2 / edge }; // outwards from the gable
    const depth = Math.min(12, edge * 0.2);
    const from = (1 + depth * rise / edge) / e.x - depth;
    const to = edge - 2;
    const at = (a: number, off = 0, along = 0): Point2D => ({
      x: x + (a + along) * e.x + off * n.x,
      y: yBody + (a + along) * e.y + off * n.y,
    });
    const mirror = (p: Point2D): Point2D => ({ x: 2 * apex.x - p.x, y: p.y });
    if (to - from < 2 * depth + 5) return [{ x, y: yBody }, apex, { x: x + W, y: yBody }];
    const tab = [at(from), at(from, depth, depth), at(to, depth, -depth), at(to)];
    line(`crease_${id}_tab_left`, "crease", tab[0], tab[3]);
    line(`crease_${id}_tab_right`, "crease", mirror(tab[3]), mirror(tab[0]));
    return [{ x, y: yBody }, ...tab, apex, ...[...tab].reverse().map(mirror), { x: x + W, y: yBody }];
  };

  // Outline, clockwise from the top-left corner of the back handle.
  const handleTop = (x0: number, x1: number): Point2D[] => [
    { x: x0, y: handleCorner },
    { x: x0 + handleCorner, y: 0 },
    { x: x1 - handleCorner, y: 0 },
    { x: x1, y: handleCorner },
  ];
  const dustFlap = (x0: number, x1: number): Point2D[] => [
    { x: x1 - dustCorner, y: yBodyEnd + dust },
    { x: x0 + dustCorner, y: yBodyEnd + dust },
    { x: x0, y: yBodyEnd },
  ];
  path("cut_outline", "cut", [
    ...handleTop(xBack, xLeft),
    ...gable(xLeft, "left"),
    ...handleTop(xFront, xRight),
    ...gable(xRight, "right"),
    { x: xEnd, y: yBodyEnd },
    ...dustFlap(xRight, xEnd),
    { x: xFront, y: yBodyEnd },
    ...dustFlap(xLeft, xFront),
    { x: xLeft, y: yEnd - tuckCorner },
    { x: xLeft - tuckCorner, y: yEnd },
    { x: xBack + tuckCorner, y: yEnd },
    { x: xBack, y: yEnd - tuckCorner },
    { x: xBack, y: yBodyEnd },
    { x: 0, y: yBodyEnd - glueCorner },
    { x: 0, y: yBody + glueCorner },
    { x: xBack, y: yBody },
    { x: xBack, y: handleCorner },
  ]);

  // Hand holes, in register once the handles stand back to back.
  const holeX = (x0: number) => x0 + (L - s.holeWidth) / 2;
  const openings: DielineOpening[] = ["back", "front"].map((side) => ({
    kind: "handle",
    panelId: `gable_handle_${side}`,
    x: holeX(side === "back" ? xBack : xFront),
    y: GABLE_HAND_HOLE.top,
    width: s.holeWidth,
    height: GABLE_HAND_HOLE.height,
    radius: GABLE_HAND_HOLE.height / 2,
  }));
  openings.forEach((opening, i) => cutOpening(writer, `cut_hand_hole_${i ? "front" : "back"}`, opening));

  return {
    structureType: "gable",
    dimensions,
    totalBoundingBox: { width: xEnd, height: yEnd },
    panels,
    segments,
    glueAreas: [{ x: 0, y: yBody, width: glue, height: H }],
    openings,
    orientation: { up: "-y", front: "+z" },
  };
}
