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

export type CanvasElementType = "text" | "logo" | "image" | "pattern" | "barcode";

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  panelId: string; // Target panel: 'front', 'top_lid', etc.
  x: number; // mm relative to panel
  y: number; // mm relative to panel
  width: number; // mm
  height: number; // mm
  rotation: number; // degrees
  content: string; // text string or image URL
  style?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    fillColor?: string;
    opacity?: number;
  };
  dpi?: number; // for raster images
}

/**
 * Content of a project's `canvas_state` (PATCH /api/projects/:id). Besides the elements, the editor keeps how the box
 * looks on screen. These are preset ids, never raw SVG or CSS: the backend accepts `[a-z0-9_-]{1,40}` only.
 */
export interface CanvasState {
  elements: CanvasElement[];
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
