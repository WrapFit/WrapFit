/**
 * Parametric Dieline Engine — Sleeve & Drawer Box (Hộp bao diêm), formula versions 1 and 2 (frozen).
 * Kept only for projects pinned to them (see registry.ts): no cut lines, no corner glue tabs on the drawer, and the sleeve
 * wraps around the L × H section, so the drawer would slide out along W. New projects use generateSleeveDrawerDieline
 * (sleeve-drawer.ts). Never change this file.
 * Consists of 2 parts: Outer Sleeve (Vỏ bao ngoài) + Inner Sliding Tray (Khay kéo)
 * Owned by IT 2 (Packaging Math)
 */

import { BoxDimensions, DielineGeometry, DielineSegment, PanelFace } from "../types/dieline";

export function generateSleeveDrawerDielineV1(dimensions: BoxDimensions): {
  sleeve: DielineGeometry;
  drawer: DielineGeometry;
} {
  const { length: L, width: W, height: H, paperThickness: t } = dimensions;

  // Sleeve needs +2t clearance so drawer can slide freely
  const sleeveL = L + (2 * t) + 1.0;
  const sleeveW = W + (2 * t) + 1.0;
  const sleeveH = H + (2 * t) + 1.0;
  const glueFlap = Math.min(15, Math.max(10, sleeveH * 0.4));

  // 1. Outer Sleeve (4 wrapping sides + 1 glue flap)
  const sleevePanels: PanelFace[] = [
    { id: "sleeve_top", name: "Vỏ trên (Top)", bounds: { x: glueFlap, y: 0, width: sleeveL, height: sleeveW } },
    { id: "sleeve_right", name: "Vỏ hông phải", bounds: { x: glueFlap + sleeveL, y: 0, width: sleeveH, height: sleeveW } },
    { id: "sleeve_bottom", name: "Vỏ đáy (Bottom)", bounds: { x: glueFlap + sleeveL + sleeveH, y: 0, width: sleeveL, height: sleeveW } },
    { id: "sleeve_left", name: "Vỏ hông trái", bounds: { x: glueFlap + sleeveL + sleeveH + sleeveL, y: 0, width: sleeveH, height: sleeveW } },
  ];

  const sleeveSegments: DielineSegment[] = [
    { id: "sleeve_c1", type: "crease", start: { x: glueFlap, y: 0 }, end: { x: glueFlap, y: sleeveW } },
    { id: "sleeve_c2", type: "crease", start: { x: glueFlap + sleeveL, y: 0 }, end: { x: glueFlap + sleeveL, y: sleeveW } },
    { id: "sleeve_c3", type: "crease", start: { x: glueFlap + sleeveL + sleeveH, y: 0 }, end: { x: glueFlap + sleeveL + sleeveH, y: sleeveW } },
    { id: "sleeve_c4", type: "crease", start: { x: glueFlap + sleeveL + sleeveH + sleeveL, y: 0 }, end: { x: glueFlap + sleeveL + sleeveH + sleeveL, y: sleeveW } },
  ];

  const sleeve: DielineGeometry = {
    structureType: "sleeve-drawer",
    dimensions,
    totalBoundingBox: {
      width: glueFlap + (2 * sleeveL) + (2 * sleeveH),
      height: sleeveW
    },
    panels: sleevePanels,
    segments: sleeveSegments
  };

  // 2. Inner Sliding Drawer (Base + 4 wall flaps + 4 corner tabs)
  const drawerPanels: PanelFace[] = [
    { id: "drawer_base", name: "Đáy khay (Base)", bounds: { x: H, y: H, width: L, height: W } },
    { id: "drawer_front", name: "Thành trước", bounds: { x: H, y: 0, width: L, height: H } },
    { id: "drawer_back", name: "Thành sau", bounds: { x: H, y: H + W, width: L, height: H } },
    { id: "drawer_left", name: "Thành trái", bounds: { x: 0, y: H, width: H, height: W } },
    { id: "drawer_right", name: "Thành phải", bounds: { x: H + L, y: H, width: H, height: W } },
  ];

  const drawerSegments: DielineSegment[] = [
    { id: "drawer_c_top", type: "crease", start: { x: H, y: H }, end: { x: H + L, y: H } },
    { id: "drawer_c_bottom", type: "crease", start: { x: H, y: H + W }, end: { x: H + L, y: H + W } },
    { id: "drawer_c_left", type: "crease", start: { x: H, y: H }, end: { x: H, y: H + W } },
    { id: "drawer_c_right", type: "crease", start: { x: H + L, y: H }, end: { x: H + L, y: H + W } },
  ];

  const drawer: DielineGeometry = {
    structureType: "sleeve-drawer",
    dimensions,
    totalBoundingBox: {
      width: L + (2 * H),
      height: W + (2 * H)
    },
    panels: drawerPanels,
    segments: drawerSegments
  };

  return { sleeve, drawer };
}
