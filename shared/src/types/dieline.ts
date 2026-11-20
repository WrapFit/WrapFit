/**
 * Core Dieline Geometry & Physics Types
 * Owned by IT 2 (Math & Geometry) & consumed by IT 1 (2D Canvas & 3D Web)
 */

export type BoxStructureType =
  | "tuck-top"
  | "sleeve-drawer"
  | "lid-base"
  | "pillow"
  | "mailer"
  | "gable"
  | "cup-carrier"
  | "insert"
  | "hang-tag"
  | "folded-card"
  | "belly-band"
  | "sticker-label";

/**
 * Size of a box. L × W × H is the inside of the closed box (the gift must fit); since formula version 3 the dieline
 * adds the paper thickness `t` itself (see shared/README.md, "Quy ước kích thước").
 * Supports giftWeight (grams) and bottomType ("tuck" = straight tuck end vs "lock" = crash-lock / FEFCO 0215 for >300g gifts).
 */
export interface BoxDimensions {
  length: number; // L (mm)
  width: number;  // W (mm)
  height: number; // H (mm)
  paperThickness: number; // t (mm): GSM × 0.0014, e.g. 0.42 mm for 300 GSM
  giftWeight?: number; // Khối lượng quà tặng (g) — quà > 300g khuyến nghị đáy khóa (lock bottom)
  bottomType?: "tuck" | "lock"; // "tuck": Đáy gài thường (STE); "lock": Đáy khóa chịu lực (FEFCO 0215)
  /** Display window (docs-old/23 S17): a cut-out in the front of a tuck-top box or the top of a lid & base lid, backed by a PET film. */
  window?: boolean;
  /** Cells of a divider insert (docs-old/23 S18): rows along W × columns along L, default 2 × 3. Cups of a cup carrier, default 1 × 2. */
  cells?: { rows: number; cols: number };
  /** Place 350ml takeaway cups into cup carrier in 3D preview */
  showCups?: boolean;
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
  /**
   * Outline of a panel that is not a rectangle (the pentagon end of a gable box), on the sheet, inside `bounds`. The
   * 3D model draws this shape and FitCheck keeps artwork inside it.
   */
  outline?: Point2D[];
}

/**
 * A flap of the sheet that is not a face of the box (docs/21 S6): a tuck flap, a dust flap, the glue flap or a flap of a
 * crash-lock bottom. Only the 3D model folds them. They are kept out of `panels`, so artwork, FitCheck and the print
 * file ignore them; their cut and crease lines are in `segments` as before. `outline` is the flap on the sheet, inside
 * `bounds`; `fold` hinges it on its parent panel exactly like a panel's.
 */
export interface FlapFace extends PanelFace {
  kind: "tuck" | "dust" | "glue" | "lock";
  fold: NonNullable<PanelFace["fold"]>;
  outline: Point2D[];
}

/**
 * A hole cut inside a panel (docs-old/23 S17, S18): a display window (backed by a PET film), the hand hole of a handle,
 * the string hole of a hang tag or the hole a cup hangs in (cup carrier). A
 * rounded rectangle on the sheet; whatever is printed there is cut away.
 */
export interface DielineOpening {
  kind: "window" | "handle" | "hole" | "cup";
  panelId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
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
  /** Flaps the 3D model folds with the panels (docs/21 S6); formulas that do not list them leave the flaps out of 3D. */
  flaps?: FlapFace[];
  segments: DielineSegment[];
  /**
   * Glue flaps and glue tabs (bounding rectangles on the sheet): their printed side is glued, so it must stay free of
   * ink (FitCheck GLUE_CONTAMINATED). Formula version 3 and later.
   */
  glueAreas?: { x: number; y: number; width: number; height: number }[];
  /** Windows and hand holes; their cut lines are in `segments` too. */
  openings?: DielineOpening[];
  /** Sheet axes that point up and to the front of the closed piece (3D), when its panels have `fold`. */
  orientation?: { up: SheetAxis; front: SheetAxis };
}
