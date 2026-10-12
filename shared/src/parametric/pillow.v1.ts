/**
 * Parametric Dieline Engine — Pillow Box (Hộp gối), formula versions 1 and 2 (frozen).
 * Kept only for projects pinned to them (see registry.ts): no cut lines, the face width W + 0.4H is a guess and the faces
 * reach a quarter of the curve depth into the end flaps. New projects use generatePillowBoxDieline (pillow.ts). Never change this
 * file.
 * Elliptical curved creasing for accessories and small jewelry
 * Owned by IT 2 (Packaging Math)
 */

import { BoxDimensions, DielineGeometry, DielineSegment, PanelFace } from "../types/dieline";

export function generatePillowBoxDielineV1(dimensions: BoxDimensions): DielineGeometry {
  const { length: L, width: W, height: H } = dimensions;

  // Flattened width is roughly (W + H * 0.5) per side
  const faceWidth = W + (H * 0.4);
  const glueFlap = Math.min(12, Math.max(8, faceWidth * 0.1));
  const arcDepth = Math.min(25, Math.max(12, L * 0.12)); // Depth of the curved ends

  const panels: PanelFace[] = [
    { id: "pillow_front", name: "Mặt trước", bounds: { x: glueFlap, y: arcDepth, width: faceWidth, height: L } },
    { id: "pillow_back", name: "Mặt sau", bounds: { x: glueFlap + faceWidth, y: arcDepth, width: faceWidth, height: L } },
  ];

  const segments: DielineSegment[] = [
    // Center crease dividing front and back
    {
      id: "pillow_center_crease",
      type: "crease",
      start: { x: glueFlap + faceWidth, y: arcDepth },
      end: { x: glueFlap + faceWidth, y: arcDepth + L }
    },
    // Glue flap crease
    {
      id: "pillow_glue_crease",
      type: "crease",
      start: { x: glueFlap, y: arcDepth },
      end: { x: glueFlap, y: arcDepth + L }
    },
    // Top curved crease front
    {
      id: "pillow_arc_top_f",
      type: "crease",
      start: { x: glueFlap, y: arcDepth },
      end: { x: glueFlap + faceWidth, y: arcDepth },
      pathString: `M ${glueFlap} ${arcDepth} Q ${glueFlap + (faceWidth / 2)} ${arcDepth + (arcDepth * 0.5)} ${glueFlap + faceWidth} ${arcDepth}`
    },
    // Bottom curved crease front
    {
      id: "pillow_arc_bottom_f",
      type: "crease",
      start: { x: glueFlap, y: arcDepth + L },
      end: { x: glueFlap + faceWidth, y: arcDepth + L },
      pathString: `M ${glueFlap} ${arcDepth + L} Q ${glueFlap + (faceWidth / 2)} ${arcDepth + L - (arcDepth * 0.5)} ${glueFlap + faceWidth} ${arcDepth + L}`
    }
  ];

  return {
    structureType: "pillow",
    dimensions,
    totalBoundingBox: {
      width: glueFlap + (2 * faceWidth),
      height: L + (2 * arcDepth)
    },
    panels,
    segments
  };
}
