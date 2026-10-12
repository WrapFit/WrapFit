/**
 * Parametric Dieline Engine — Pillow Box (Hộp gối), formula version 3.
 * Owned by IT 2 (Packaging Math)
 *
 * Two faces bowed into arcs and closed at both ends by lens-shaped flaps that fold in along curved creases:
 *
 *          ╭─cut─╮╭─cut─╮
 *    ┌glue┐ ╰crease╯╰crease╯       (top end; the bottom end is the mirror image)
 *    │    │  front   back  │
 *
 * L × W × H is the inside: L along the axis (measured on the centre line, between the curved creases), W across, H the
 * thickness in the middle. The closed section is a lens of chord W + t and two arcs of sagitta (H + t) / 2 on the paper
 * mid-plane, so each face is as wide as one arc (`pillowShapeOf`). The curved creases dip `endDepth` = the sagitta into
 * each face (the end flaps then fold in at 45°), so the body is L + 2 × endDepth from tip to tip. Each curve is a
 * quadratic Bézier; the cut mirrors the crease, which makes each end flap a lens.
 */

import { BoxDimensions, DielineGeometry, PanelFace } from "../types/dieline";
import { segmentWriter } from "./segments";

export interface PillowShape {
  /** Width of one face on the sheet: the length of one arc of the section, mm. */
  faceWidth: number;
  /** Chord and sagitta of the arcs of the section (paper mid-plane), mm. */
  chord: number;
  sagitta: number;
  /** How far the curved creases dip into the faces, mm. */
  endDepth: number;
  /** Tip-to-tip length of the body (where the two faces meet the side creases), mm. */
  bodyLength: number;
}

/** Section and end shape of a pillow box, shared by the dieline and the 3D model. */
export function pillowShapeOf({ length, width, height, paperThickness: t }: BoxDimensions): PillowShape {
  const chord = width + t;
  const sagitta = (height + t) / 2;
  // Arc of chord c and sagitta s: it turns through 2α with tan(α / 2) = 2s / c, radius c / (2 sin α).
  const halfAngle = 2 * Math.atan2(2 * sagitta, chord);
  const faceWidth = halfAngle > 1e-9 ? (chord / Math.sin(halfAngle)) * halfAngle : chord;
  return { faceWidth, chord, sagitta, endDepth: sagitta, bodyLength: length + 2 * sagitta };
}

export function generatePillowBoxDieline(dimensions: BoxDimensions): DielineGeometry {
  const { faceWidth: F, endDepth: d, bodyLength } = pillowShapeOf(dimensions);
  const L = dimensions.length;
  const glue = Math.min(12, Math.max(8, F * 0.1));
  const glueCorner = Math.min(4, glue / 2);

  const xFront = glue;
  const xBack = glue + F;
  const xEnd = glue + 2 * F;
  const yTip = d; // top tips: where the end flaps meet the side creases
  const yTipEnd = d + bodyLength; // bottom tips
  const yEnd = yTipEnd + d;

  // Printable faces: the rectangle between the lowest point of the top creases and the highest of the bottom ones.
  const panels: PanelFace[] = [
    { id: "pillow_front", name: "Mặt trước", bounds: { x: xFront, y: 2 * d, width: F, height: L } },
    { id: "pillow_back", name: "Mặt sau", bounds: { x: xBack, y: 2 * d, width: F, height: L } },
  ];

  const { segments, line, path, curve } = segmentWriter();
  const mid = (x: number) => x + F / 2;

  line("crease_glue", "crease", { x: xFront, y: yTip }, { x: xFront, y: yTipEnd });
  line("crease_side", "crease", { x: xBack, y: yTip }, { x: xBack, y: yTipEnd });
  // A quadratic Bézier reaches half its control offset: control at 2d puts the crease d deep.
  for (const [name, x] of [["front", xFront], ["back", xBack]] as const) {
    curve(`crease_top_${name}`, "crease", { x, y: yTip }, { x: mid(x), y: yTip + 2 * d }, { x: x + F, y: yTip });
    curve(`crease_bottom_${name}`, "crease", { x, y: yTipEnd }, { x: mid(x), y: yTipEnd - 2 * d }, { x: x + F, y: yTipEnd });
  }

  // Cut outline in one direction, so the print export joins it into one closed line (curves are only walked forwards).
  path("cut_glue", "cut", [
    { x: xFront, y: yTipEnd },
    { x: 0, y: yTipEnd - glueCorner },
    { x: 0, y: yTip + glueCorner },
    { x: xFront, y: yTip },
  ]);
  curve("cut_top_front", "cut", { x: xFront, y: yTip }, { x: mid(xFront), y: yTip - 2 * d }, { x: xBack, y: yTip });
  curve("cut_top_back", "cut", { x: xBack, y: yTip }, { x: mid(xBack), y: yTip - 2 * d }, { x: xEnd, y: yTip });
  line("cut_side", "cut", { x: xEnd, y: yTip }, { x: xEnd, y: yTipEnd });
  curve("cut_bottom_back", "cut", { x: xEnd, y: yTipEnd }, { x: mid(xBack), y: yTipEnd + 2 * d }, { x: xBack, y: yTipEnd });
  curve("cut_bottom_front", "cut", { x: xBack, y: yTipEnd }, { x: mid(xFront), y: yTipEnd + 2 * d }, { x: xFront, y: yTipEnd });

  return {
    structureType: "pillow",
    dimensions,
    totalBoundingBox: { width: xEnd, height: yEnd },
    panels,
    segments,
  };
}
