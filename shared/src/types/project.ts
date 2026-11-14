/**
 * Project State & Customization Types
 * Shared Contract between IT 1 (Editor UI), IT 2 (Export/Validation) & IT 3 (DB/API)
 */

import { BoxDimensions, BoxStructureType } from "./dieline";

export type MaterialType = "ivory" | "kraft" | "duplex";

export interface MaterialSpecification {
  type: MaterialType;
  gsm: number; // e.g. 250, 300, 350
  caliper: number; // thickness in mm
  finish: "matte" | "glossy" | "raw";
}

export type CanvasElementType = "text" | "logo" | "image" | "pattern" | "barcode" | "shape";

/**
 * What an element is to its face (docs/23 §4, D4). A background covers its face plus the bleed, sits under the artwork,
 * cannot be dragged and is refitted when the box size changes. Default: "background" for patterns, "artwork" otherwise.
 */
export type ElementRole = "artwork" | "background";
/** Which side of the sheet an element prints on. Default "outside"; "inside" prints on the back of the sheet (D7). */
export type PrintSide = "outside" | "inside";
/** Print finish of one element, exported as its own spot layer (D8). */
export type ElementFinish = "foil_gold" | "foil_silver" | "foil_rose" | "spot_uv" | "emboss" | "deboss";
/** Kinds of the vector shapes of the "Hình khối" rail (type "shape"). */
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow" | "star" | "polygon" | "frame";
/** How a background or framed image fills its box. */
export type ElementFit = "fill" | "fit" | "tile";
export type ImageMask = "rect" | "rounded" | "circle" | "arch";

export interface CanvasElementStyle {
  fontFamily?: string;
  /**
   * File of a font the user uploaded (docs/23 S13): the text measures and prints with it. One face per file (no
   * bold / italic variants); `fontFamily` holds its family name for the screen.
   */
  fontUrl?: string;
  /** Points. */
  fontSize?: number;
  /** Text color, or the stroke color of a line / frame shape. */
  color?: string;
  /** Fill of a shape. */
  fillColor?: string;
  /** 0..1. */
  opacity?: number;
  /** Text weight: 400 regular or 700 bold (the default, the weight the print files have always used). */
  fontWeight?: 400 | 700;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";
  /** Line height as a multiple of the font size (default TEXT_LINE_HEIGHT). */
  lineHeight?: number;
  /** Extra space between letters, thousandths of an em (S9). */
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  /** Arc of a curved text, degrees (-360..360, S9). */
  curve?: number;
  /** Outline of a text, or the border of a shape. */
  strokeColor?: string;
  /** mm. */
  strokeWidth?: number;
  gradient?: { type: "linear" | "radial"; angle?: number; stops: { offset: number; color: string }[] };
  /** Photo adjustments, -100..100 (S10). */
  filters?: { brightness?: number; contrast?: number; saturation?: number };
  /** CMYK the user typed (0..100 each), kept with the hex color it displays as (S7). */
  cmyk?: [number, number, number, number];
  /** Pantone reference for the print shop only; WrapFit ships no Pantone library (D9). */
  pantoneNote?: string;
  /** Colours of an SVG logo swapped for others, #RRGGBB (S14, print/svg-colors). */
  colorMap?: { from: string; to: string }[];
}

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  panelId: string; // Target panel: 'front', 'top_lid', etc.
  x: number; // mm relative to panel
  y: number; // mm relative to panel
  width: number; // mm
  height: number; // mm
  rotation: number; // degrees
  content: string; // text string or image URL ("" for a shape)
  style?: CanvasElementStyle;
  dpi?: number; // for raster images
  side?: PrintSide;
  role?: ElementRole;
  /** Layer name chosen by the user. */
  name?: string;
  /** Cannot be moved, resized or deleted from the canvas; still selectable from the layers panel. */
  locked?: boolean;
  /** Not drawn in 2D / 3D and not printed. */
  hidden?: boolean;
  groupId?: string | null;
  flipX?: boolean;
  flipY?: boolean;
  finish?: ElementFinish | null;
  /** Where the element stays on its face when the box size changes (S20). */
  anchor?: { h: "left" | "center" | "right" | "stretch"; v: "top" | "middle" | "bottom" | "stretch" };
  /** Part of the source image shown, fractions 0..1 of the image (S10). */
  crop?: { x: number; y: number; width: number; height: number };
  mask?: ImageMask | null;
  fit?: ElementFit;
  shape?: { kind: ShapeKind; cornerRadius?: number; points?: number; innerRatio?: number };
}

/** A font file the user uploaded (storage purpose FONT), checked for the Vietnamese letters. */
export interface CustomFont {
  family: string;
  url: string;
}

/** Current version of `CanvasState`; `normalizeCanvas` upgrades older states when a project opens. */
export const CANVAS_SCHEMA_VERSION = 2;

/**
 * Content of a project's `canvas_state` (PATCH /api/projects/:id). Besides the elements, the editor keeps how the box
 * looks on screen. These are preset ids, never raw SVG or CSS: the backend accepts `[a-z0-9_-]{1,40}` only.
 */
export interface CanvasState {
  schemaVersion?: number;
  elements: CanvasElement[];
  /** Fonts the user uploaded for this design (docs/23 S13), offered in the font menu. */
  customFonts?: CustomFont[];
  /** Seamless pattern preset behind the artwork, e.g. "tet"; null = none. */
  backgroundPattern?: string | null;
  /** Curated color palette of the editor, e.g. "earthy_olive". */
  backgroundTheme?: string | null;
  /** Paper look of the editor ("ivory" | "kraft" | "forest" | "gold_foil"); the printable stock is `materialSpec`. */
  materialTheme?: string | null;
  /** Finishes of the print shop (`QuoteFinish`: lamination, foil, spot UV), priced by the quote. */
  finishes?: string[];
}

/**
 * Brand identity of a handmade shop (UC-02), stored in `users.brand_kit`.
 * Shown in the editor toolbox to apply the logo, colors and fonts to a box in one click.
 */
export interface BrandKit {
  logoUrl: string | null; // uploaded logo (storage purpose LOGO)
  colors: string[]; // 3 to 5 hex colors #RRGGBB: primary, accent, background, then extras
  fonts: string[]; // font family names, headings first
  slogan: string | null;
}

export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type ProjectVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export interface ProjectCollection {
  id: string;
  userId: string;
  title: string;
  description?: string;
  colorTag?: string;
  projectsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoxTemplateItem {
  id: string;
  name: string;
  category: "retail" | "luxury" | "food" | "accessories";
  description?: string;
  structureType: BoxStructureType;
  dimensions: BoxDimensions;
  isCurated: boolean;
  preview3dUrl?: string;
  tags?: string[];
  usageCount?: number;
}

export interface PackagingProject {
  id: string;
  userId: string;
  collectionId?: string | null;
  title: string;
  slug?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  allowFork?: boolean;
  forkedFromId?: string | null;
  structureType: BoxStructureType;
  dimensions: BoxDimensions;
  material: MaterialSpecification;
  elements: CanvasElement[];
  thumbnailUrl?: string;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  createdAt: string;
  updatedAt: string;
}
