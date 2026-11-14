/**
 * Parametric Dieline Engine — Cup carrier (Khay xách ly / vỏ bìa xách ly), formula version 3.
 * Owned by IT 2 (Packaging Math)
 *
 * One strip of board, open at both ends, that hangs take-away cups from their rims and carries them by a double-wall
 * handle (the carrier of coffee and milk-tea shops). From top to bottom of the sheet:
 *
 *   ┌───── front handle (hand hole) ─────┐
 *   │          front shoulder            │   folds in by CARRIER_SHOULDER_ANGLE
 *   │            front wall              │
 *   │   base:  ( cup )   ( cup )         │   cup holes, rows × cols
 *   │             back wall              │
 *   │           back shoulder            │
 *   └───── back handle (hand hole) ──────┘
 *
 * The walls fold up from the base, the shoulders fold in until the handles meet back to back, one paper thickness
 * apart, and the handles are glued together on their unprinted sides (no ink on any glued face, so no glue area): the
 * hand holes are cut in register. The cups drop through the holes of the base and hang from their rims; the walls keep
 * the lids from tipping.
 *
 * L × W × H: L is the length of the row of cups (the strip is L wide, its ends stay open), W the inside depth between
 * the walls, H the height of the walls (from the base to the shoulder crease). Creases sit on the paper mid-plane, so
 * the base is W + t deep and the walls H + t high. `cells` sets the cups: rows along W × columns along L, default
 * 1 × 2.
 */

import { BoxDimensions, DielineGeometry, DielineOpening, PanelFace, Point2D } from "../types/dieline";
import { cutOpening } from "./openings";
import { segmentWriter } from "./segments";

/** Fold of the shoulders from upright, degrees. */
export const CARRIER_SHOULDER_ANGLE = 50;
/** Height of each handle panel, mm. */
export const CARRIER_HANDLE_MM = 55;
/** Hand hole: height and distance from the free edge of the handle, mm. */
export const CARRIER_HAND_HOLE = { height: 24, top: 12 };
/** Board left around each cup hole (to the creases and between holes), mm. */
export const CARRIER_CUP_MARGIN_MM = 5;
/** Smallest cup hole worth cutting, mm. */
export const CARRIER_MIN_CUP_MM = 30;
export const DEFAULT_CUPS = { rows: 1, cols: 2 };
export const MAX_CUPS = { rows: 2, cols: 4 };

/** Sizes of the carrier derived from the inside L × W × H (exported for the tests and the studio). */
export function cupCarrierSizesOf({ length, width, height, paperThickness: t, cells }: BoxDimensions) {
  const L = length;
  const W = width + t;
  const H = height + t;
  const angle = (CARRIER_SHOULDER_ANGLE * Math.PI) / 180;
  // The two shoulders end one thickness apart, so the handles stand back to back.
  const shoulder = (W - t) / (2 * Math.sin(angle));
  const rise = shoulder * Math.cos(angle);
  const rows = Math.min(MAX_CUPS.rows, Math.max(1, Math.round(cells?.rows ?? DEFAULT_CUPS.rows)));
  const cols = Math.min(MAX_CUPS.cols, Math.max(1, Math.round(cells?.cols ?? DEFAULT_CUPS.cols)));
  const cupDiameter = Math.max(0, Math.min(L / cols, W / rows) - 2 * CARRIER_CUP_MARGIN_MM);
  return {
    L,
    W,
    H,
    shoulder,
    rise,
    handle: CARRIER_HANDLE_MM,
    holeWidth: Math.max(CARRIER_HAND_HOLE.height + 4, Math.min(90, L * 0.5, L - 20)),
    rows,
    cols,
    /** Diameter of each cup hole (0: too small to cut, the base stays whole). */
    cupDiameter: cupDiameter >= CARRIER_MIN_CUP_MM ? cupDiameter : 0,
  };
}

export function generateCupCarrierDieline(dimensions: BoxDimensions): DielineGeometry {
  const s = cupCarrierSizesOf(dimensions);
  const { L, W, H, shoulder, handle } = s;
  const a = CARRIER_SHOULDER_ANGLE;
  const corner = Math.min(8, L / 6, handle / 4);

  // Rows: front handle | front shoulder | front wall | base | back wall | back shoulder | back handle
  const yShoulderFront = handle;
  const yWallFront = yShoulderFront + shoulder;
  const yBase = yWallFront + H;
  const yWallBack = yBase + W;
  const yShoulderBack = yWallBack + H;
  const yHandleBack = yShoulderBack + shoulder;
  const yEnd = yHandleBack + handle;

  const panel = (id: string, name: string, y: number, height: number, fold?: PanelFace["fold"]): PanelFace => ({
    id,
    name,
    bounds: { x: 0, y, width: L, height },
    ...(fold && { fold }),
  });
  const panels: PanelFace[] = [
    panel("carrier_base", "Đáy khay", yBase, W),
    panel("carrier_front", "Mặt trước", yWallFront, H, { parent: "carrier_base", edge: "bottom", angle: 90 }),
    panel("carrier_back", "Mặt sau", yWallBack, H, { parent: "carrier_base", edge: "top", angle: 90 }),
    panel("carrier_shoulder_front", "Vai trước", yShoulderFront, shoulder, { parent: "carrier_front", edge: "bottom", angle: a }),
    panel("carrier_shoulder_back", "Vai sau", yShoulderBack, shoulder, { parent: "carrier_back", edge: "top", angle: a }),
    panel("carrier_handle_front", "Quai trước", 0, handle, { parent: "carrier_shoulder_front", edge: "bottom", angle: -a }),
    panel("carrier_handle_back", "Quai sau", yHandleBack, handle, { parent: "carrier_shoulder_back", edge: "top", angle: -a }),
  ];

  const writer = segmentWriter();
  const { segments, line, path, curve } = writer;

  // Creases across the strip.
  const creases: [string, number][] = [
    ["handle_front", yShoulderFront],
    ["shoulder_front", yWallFront],
    ["wall_front", yBase],
    ["wall_back", yWallBack],
    ["shoulder_back", yShoulderBack],
    ["handle_back", yHandleBack],
  ];
  for (const [id, y] of creases) line(`crease_${id}`, "crease", { x: 0, y }, { x: L, y });

  // Outline: a strip with rounded corners at both free ends (the tops of the handles).
  const top: Point2D[] = [
    { x: 0, y: corner },
    { x: L, y: corner },
  ];
  curve("cut_corner_tl", "cut", { x: 0, y: corner }, { x: 0, y: 0 }, { x: corner, y: 0 });
  line("cut_top", "cut", { x: corner, y: 0 }, { x: L - corner, y: 0 });
  curve("cut_corner_tr", "cut", { x: L - corner, y: 0 }, { x: L, y: 0 }, top[1]);
  path("cut_right", "cut", [top[1], { x: L, y: yEnd - corner }]);
  curve("cut_corner_br", "cut", { x: L, y: yEnd - corner }, { x: L, y: yEnd }, { x: L - corner, y: yEnd });
  line("cut_bottom", "cut", { x: L - corner, y: yEnd }, { x: corner, y: yEnd });
  curve("cut_corner_bl", "cut", { x: corner, y: yEnd }, { x: 0, y: yEnd }, { x: 0, y: yEnd - corner });
  path("cut_left", "cut", [{ x: 0, y: yEnd - corner }, top[0]]);

  // Hand holes, in register once the handles stand back to back.
  const holeX = (L - s.holeWidth) / 2;
  const hand = (panelId: string, y: number): DielineOpening => ({
    kind: "handle",
    panelId,
    x: holeX,
    y,
    width: s.holeWidth,
    height: CARRIER_HAND_HOLE.height,
    radius: CARRIER_HAND_HOLE.height / 2,
  });
  const openings: DielineOpening[] = [
    hand("carrier_handle_front", CARRIER_HAND_HOLE.top),
    hand("carrier_handle_back", yEnd - CARRIER_HAND_HOLE.top - CARRIER_HAND_HOLE.height),
  ];

  // Cup holes, one in the middle of each cell of the base.
  const d = s.cupDiameter;
  if (d > 0) {
    for (let row = 0; row < s.rows; row++) {
      for (let col = 0; col < s.cols; col++) {
        const cx = ((col + 0.5) * L) / s.cols;
        const cy = yBase + ((row + 0.5) * W) / s.rows;
        openings.push({ kind: "cup", panelId: "carrier_base", x: cx - d / 2, y: cy - d / 2, width: d, height: d, radius: d / 2 });
      }
    }
  }
  // Hand holes first (front, back), then the cups.
  openings.forEach((opening, i) =>
    cutOpening(writer, opening.kind === "cup" ? `cut_cup_${i - 2}` : `cut_hand_hole_${i ? "back" : "front"}`, opening),
  );

  return {
    structureType: "cup-carrier",
    dimensions,
    totalBoundingBox: { width: L, height: yEnd },
    panels,
    segments,
    glueAreas: [],
    openings,
    orientation: { up: "+z", front: "-y" },
  };
}
