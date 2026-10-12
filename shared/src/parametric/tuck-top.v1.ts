/**
 * Parametric Dieline Engine — Tuck Top Box, formula version 1 (frozen).
 * Kept only for projects pinned to formulaVersion 1 (see registry.ts): the top lid starts at y = 0 with height W while
 * the body starts at y = H, so it overlaps the back panel when W > H, and there are no cut lines. New projects use
 * generateTuckTopDieline (tuck-top.ts, version 2). Never change this file.
 * Owned by IT 2 (Packaging Math)
 */

import { BoxDimensions, DielineGeometry, DielineSegment, PanelFace } from "../types/dieline";

export function generateTuckTopDielineV1(dimensions: BoxDimensions): DielineGeometry {
  const { length: L, width: W, height: H, paperThickness: t } = dimensions;

  // Tolerances based on paper thickness
  const clearance = t * 1.5;
  const glueFlapWidth = Math.min(15, Math.max(10, W * 0.2)); // 10-15mm glue tab
  const tuckFlapHeight = Math.min(20, Math.max(12, L * 0.15)); // tuck flap

  // Calculate panel dimensions
  const panels: PanelFace[] = [
    {
      id: "panel_back",
      name: "Mặt sau (Back)",
      bounds: { x: glueFlapWidth, y: H, width: L, height: H }
    },
    {
      id: "panel_left",
      name: "Mặt hông trái (Left)",
      bounds: { x: glueFlapWidth + L, y: H, width: W, height: H }
    },
    {
      id: "panel_front",
      name: "Mặt trước (Front)",
      bounds: { x: glueFlapWidth + L + W, y: H, width: L, height: H }
    },
    {
      id: "panel_right",
      name: "Mặt hông phải (Right)",
      bounds: { x: glueFlapWidth + L + W + L, y: H, width: W, height: H }
    },
    {
      id: "panel_top_lid",
      name: "Nắp trên (Top Lid)",
      bounds: { x: glueFlapWidth, y: 0, width: L, height: W }
    },
    {
      id: "panel_bottom",
      name: "Đáy hộp (Bottom)",
      bounds: { x: glueFlapWidth, y: H + H, width: L, height: W }
    }
  ];

  // Calculate segments (Crease and Cut lines)
  const segments: DielineSegment[] = [
    {
      id: "crease_v1",
      type: "crease",
      start: { x: glueFlapWidth + L, y: H },
      end: { x: glueFlapWidth + L, y: H + H }
    },
    {
      id: "crease_v2",
      type: "crease",
      start: { x: glueFlapWidth + L + W, y: H },
      end: { x: glueFlapWidth + L + W, y: H + H }
    },
    {
      id: "crease_v3",
      type: "crease",
      start: { x: glueFlapWidth + L + W + L, y: H },
      end: { x: glueFlapWidth + L + W + L, y: H + H }
    },
    {
      id: "crease_h_top",
      type: "crease",
      start: { x: glueFlapWidth, y: H },
      end: { x: glueFlapWidth + (2 * L) + (2 * W), y: H }
    },
    {
      id: "crease_h_bottom",
      type: "crease",
      start: { x: glueFlapWidth, y: H + H },
      end: { x: glueFlapWidth + (2 * L) + (2 * W), y: H + H }
    }
  ];

  const totalWidth = glueFlapWidth + (2 * L) + (2 * W);
  const totalHeight = W + H + W + tuckFlapHeight;

  return {
    structureType: "tuck-top",
    dimensions,
    totalBoundingBox: {
      width: totalWidth,
      height: totalHeight
    },
    panels,
    segments
  };
}
