/**
 * Parametric Dieline Engine — Lid & Base Box (Hộp âm dương), formula versions 1 and 2 (frozen).
 * Kept only for projects pinned to them (see registry.ts): no cut lines and no corner glue tabs, so the walls cannot be
 * glued together. New projects use generateLidBaseDieline (lid-base.ts). Never change this file.
 * Consists of 2 pieces: Bottom Base (Hộp dương) + Top Lid (Nắp âm)
 * Owned by IT 2 (Packaging Math)
 */

import { BoxDimensions, DielineGeometry, DielineSegment, PanelFace } from "../types/dieline";

export function generateLidBaseDielineV1(dimensions: BoxDimensions): {
  base: DielineGeometry;
  lid: DielineGeometry;
} {
  const { length: L, width: W, height: H, paperThickness: t } = dimensions;

  // Lid height is typically 50-70% of base height, with 1.5t clearance
  const lidH = Math.max(15, H * 0.6);
  const lidL = L + (2 * t) + 1.2;
  const lidW = W + (2 * t) + 1.2;

  // 1. Bottom Base (Đáy)
  const basePanels: PanelFace[] = [
    { id: "base_bottom", name: "Đáy hộp", bounds: { x: H, y: H, width: L, height: W } },
    { id: "base_front", name: "Thành trước", bounds: { x: H, y: 0, width: L, height: H } },
    { id: "base_back", name: "Thành sau", bounds: { x: H, y: H + W, width: L, height: H } },
    { id: "base_left", name: "Thành trái", bounds: { x: 0, y: H, width: H, height: W } },
    { id: "base_right", name: "Thành phải", bounds: { x: H + L, y: H, width: H, height: W } },
  ];

  const baseSegments: DielineSegment[] = [
    { id: "base_c1", type: "crease", start: { x: H, y: H }, end: { x: H + L, y: H } },
    { id: "base_c2", type: "crease", start: { x: H, y: H + W }, end: { x: H + L, y: H + W } },
    { id: "base_c3", type: "crease", start: { x: H, y: H }, end: { x: H, y: H + W } },
    { id: "base_c4", type: "crease", start: { x: H + L, y: H }, end: { x: H + L, y: H + W } },
  ];

  const base: DielineGeometry = {
    structureType: "lid-base",
    dimensions,
    totalBoundingBox: {
      width: L + (2 * H),
      height: W + (2 * H)
    },
    panels: basePanels,
    segments: baseSegments
  };

  // 2. Top Lid (Nắp)
  const lidPanels: PanelFace[] = [
    { id: "lid_top", name: "Mặt nắp", bounds: { x: lidH, y: lidH, width: lidL, height: lidW } },
    { id: "lid_front", name: "Vách nắp trước", bounds: { x: lidH, y: 0, width: lidL, height: lidH } },
    { id: "lid_back", name: "Vách nắp sau", bounds: { x: lidH, y: lidH + lidW, width: lidL, height: lidH } },
    { id: "lid_left", name: "Vách nắp trái", bounds: { x: 0, y: lidH, width: lidH, height: lidW } },
    { id: "lid_right", name: "Vách nắp phải", bounds: { x: lidH + lidL, y: lidH, width: lidH, height: lidW } },
  ];

  const lidSegments: DielineSegment[] = [
    { id: "lid_c1", type: "crease", start: { x: lidH, y: lidH }, end: { x: lidH + lidL, y: lidH } },
    { id: "lid_c2", type: "crease", start: { x: lidH, y: lidH + lidW }, end: { x: lidH + lidL, y: lidH + lidW } },
    { id: "lid_c3", type: "crease", start: { x: lidH, y: lidH }, end: { x: lidH, y: lidH + lidW } },
    { id: "lid_c4", type: "crease", start: { x: lidH + lidL, y: lidH }, end: { x: lidH + lidL, y: lidH + lidW } },
  ];

  const lid: DielineGeometry = {
    structureType: "lid-base",
    dimensions,
    totalBoundingBox: {
      width: lidL + (2 * lidH),
      height: lidW + (2 * lidH)
    },
    panels: lidPanels,
    segments: lidSegments
  };

  return { base, lid };
}
