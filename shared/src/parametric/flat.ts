/**
 * Parametric Dieline Engine — flat products (docs/23 S18), formula version 3: hang tag, folded card and belly band.
 * Owned by IT 2 (Packaging Math)
 *
 * Hang tag (Thẻ treo) and folded card (Thiệp gấp đôi) are L wide and H tall (W is not used); their back, or the inside
 * of the card, prints as the inside of the sheet (canvas/inside.ts). The belly band (Đai giấy bọc hộp) wraps around a
 * box whose outside is L × W × H: over the top, down both ends and under the bottom, B wide along W, its ends glued
 * under the left segment. Creases sit on the paper mid-plane with 0.5 mm of play, so it slides on.
 */

import { BoxDimensions, DielineGeometry, DielineOpening, PanelFace } from "../types/dieline";
import { cutOpening } from "./openings";
import { segmentWriter } from "./segments";

/** Flat products: no height (hang tag, card) or no inside (belly band); used by the studio to label the sizes. */
export const FLAT_STRUCTURES = ["hang-tag", "folded-card", "belly-band"] as const;
/** Flat products sized by L × H only. */
export const SHEET_ONLY_STRUCTURES: readonly string[] = ["hang-tag", "folded-card"];

/** String hole of a hang tag: diameter and distance of its centre from the top, mm. */
export const TAG_HOLE = { diameter: 5, top: 9 };

export function generateHangTagDieline(dimensions: BoxDimensions): DielineGeometry {
  const { length: L, height: H } = dimensions;
  const corner = Math.min(12, L * 0.22, H * 0.2);
  const outline = [
    { x: corner, y: 0 },
    { x: L - corner, y: 0 },
    { x: L, y: corner },
    { x: L, y: H },
    { x: 0, y: H },
    { x: 0, y: corner },
  ];
  const panels: PanelFace[] = [{ id: "tag_front", name: "Mặt thẻ", bounds: { x: 0, y: 0, width: L, height: H }, outline }];
  const writer = segmentWriter();
  writer.path("cut_outline", "cut", [...outline, outline[0]]);
  const r = TAG_HOLE.diameter / 2;
  const hole: DielineOpening = { kind: "hole", panelId: "tag_front", x: L / 2 - r, y: TAG_HOLE.top - r, width: 2 * r, height: 2 * r, radius: r };
  cutOpening(writer, "cut_hole", hole);
  return {
    structureType: "hang-tag",
    dimensions,
    totalBoundingBox: { width: L, height: H },
    panels,
    segments: writer.segments,
    glueAreas: [],
    openings: [hole],
    orientation: { up: "-y", front: "-z" },
  };
}

/** Fold of the card cover: a hair under 180° so the two pages of the 3D model do not overlap. */
const CARD_FOLD = 178;

export function generateFoldedCardDieline(dimensions: BoxDimensions): DielineGeometry {
  const { length: L, height: H } = dimensions;
  // Outside of the sheet: back cover | front cover. The front folds over onto the back, its print outwards.
  const panels: PanelFace[] = [
    { id: "card_back", name: "Bìa sau", bounds: { x: 0, y: 0, width: L, height: H } },
    { id: "card_front", name: "Bìa trước", bounds: { x: L, y: 0, width: L, height: H }, fold: { parent: "card_back", edge: "left", angle: CARD_FOLD } },
  ];
  const { segments, line, path } = segmentWriter();
  line("crease_spine", "crease", { x: L, y: 0 }, { x: L, y: H });
  path("cut_outline", "cut", [
    { x: 0, y: 0 },
    { x: 2 * L, y: 0 },
    { x: 2 * L, y: H },
    { x: 0, y: H },
    { x: 0, y: 0 },
  ]);
  return {
    structureType: "folded-card",
    dimensions,
    totalBoundingBox: { width: 2 * L, height: H },
    panels,
    segments,
    glueAreas: [],
    orientation: { up: "-y", front: "+z" },
  };
}

/** Sizes of a belly band around a box whose outside is L × W × H. */
export function bellyBandSizesOf({ length, width, height, paperThickness: t }: BoxDimensions) {
  const top = length + t + 0.5;
  const side = height + t + 0.5;
  return {
    top,
    side,
    breadth: Math.min(width, Math.max(20, Math.min(80, width * 0.4))),
    glue: Math.min(15, side - 2),
  };
}

export function generateBellyBandDieline(dimensions: BoxDimensions): DielineGeometry {
  const { top, side, breadth: B, glue } = bellyBandSizesOf(dimensions);
  // Sheet: left end | top | right end | bottom | glue flap (folded up under the left end).
  const xTop = side;
  const xRight = xTop + top;
  const xBottom = xRight + side;
  const xGlue = xBottom + top;
  const xEnd = xGlue + glue;
  const panels: PanelFace[] = [
    { id: "band_top", name: "Đai mặt trên", bounds: { x: xTop, y: 0, width: top, height: B } },
    { id: "band_left", name: "Đai đầu trái", bounds: { x: 0, y: 0, width: side, height: B }, fold: { parent: "band_top", edge: "right", angle: 90 } },
    { id: "band_right", name: "Đai đầu phải", bounds: { x: xRight, y: 0, width: side, height: B }, fold: { parent: "band_top", edge: "left", angle: 90 } },
    { id: "band_bottom", name: "Đai mặt đáy", bounds: { x: xBottom, y: 0, width: top, height: B }, fold: { parent: "band_right", edge: "left", angle: 90 } },
  ];
  const { segments, line, path } = segmentWriter();
  for (const [id, x] of [["crease_top_left", xTop], ["crease_top_right", xRight], ["crease_bottom", xBottom], ["crease_glue", xGlue]] as const) {
    line(id, "crease", { x, y: 0 }, { x, y: B });
  }
  const taper = Math.min(3, glue / 3, B / 4);
  path("cut_outline", "cut", [
    { x: 0, y: 0 },
    { x: xGlue, y: 0 },
    { x: xEnd, y: taper },
    { x: xEnd, y: B - taper },
    { x: xGlue, y: B },
    { x: 0, y: B },
    { x: 0, y: 0 },
  ]);
  return {
    structureType: "belly-band",
    dimensions,
    totalBoundingBox: { width: xEnd, height: B },
    panels,
    segments,
    glueAreas: [{ x: xGlue, y: 0, width: glue, height: B }],
    orientation: { up: "-z", front: "+y" },
  };
}
