/**
 * Core Dieline Geometry & Physics Types
 * Owned by IT 2 (Math & Geometry) & consumed by IT 1 (2D Canvas & 3D Web)
 */

export type BoxStructureType = "tuck-top" | "sleeve-drawer" | "lid-base" | "pillow";

/**
 * Size of a box. L × W × H is the inside of the closed box (the gift must fit); since formula version 3 the dieline
 * adds the paper thickness `t` itself (see shared/README.md, "Quy ước kích thước").
 */
export interface BoxDimensions {
  length: number; // L (mm)
  width: number;  // W (mm)
  height: number; // H (mm)
  paperThickness: number; // t (mm): GSM × 0.0014, e.g. 0.42 mm for 300 GSM
}

export type LineType = "cut" | "crease" | "bleed" | "safe-margin";

export interface Point2D {
  x: number;
  y: number;
}

export interface DielineSegment {
  id: string;
  type: LineType;
  start: Point2D;
  end: Point2D;
  pathString?: string; // For curved tabs / notches
}

export interface PanelFace {
  id: string;
  name: string; // e.g. "front", "back", "top_lid", "bottom", "left", "right"
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /**
   * How the panel folds onto its parent once the box is closed (3D model and folded-size checks, see fold.ts): `edge`
   * is the side of this panel on the shared crease, `angle` the fold in degrees towards the unprinted side. The root
   * panel of a piece, and panels that do not fold flat (pillow faces), have none.
   */
  fold?: { parent: string; edge: "top" | "bottom" | "left" | "right"; angle: number };
}

/** An axis of the flat sheet: x to the right, y down, z towards the unprinted side (away from the printed side). */
export type SheetAxis = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

export interface DielineGeometry {
  structureType: BoxStructureType;
  dimensions: BoxDimensions;
  totalBoundingBox: {
    width: number;  // Total flat paper sheet width
    height: number; // Total flat paper sheet height
  };
  panels: PanelFace[];
  segments: DielineSegment[];
  /**
   * Glue flaps and glue tabs (bounding rectangles on the sheet): their printed side is glued, so it must stay free of
   * ink (FitCheck GLUE_CONTAMINATED). Formula version 3 and later.
   */
  glueAreas?: { x: number; y: number; width: number; height: number }[];
  /** Sheet axes that point up and to the front of the closed piece (3D), when its panels have `fold`. */
  orientation?: { up: SheetAxis; front: SheetAxis };
}
