// Domain layer: plain TypeScript only (no @nestjs/*, no @prisma/client) — see docs 08, section 1.1.
import { type BoxDimensions, caliperOf, type CanvasState, type FitCheckReport, type MaterialSpecification } from '@wrapfit/shared';

/** Same values as the Prisma enums, declared here so the domain does not depend on Prisma. */
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type ProjectVisibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
export type Occasion = 'TET' | 'CHRISTMAS' | 'WEDDING' | 'VALENTINE' | 'BIRTHDAY' | 'MINIMAL';
export type Industry = 'COSMETICS' | 'CANDLES' | 'BAKERY' | 'JEWELRY' | 'TEA_AGRI';

/** Content of the `canvas_state` column: elements + editor look (contract of `@wrapfit/shared`). */
export type { CanvasState };

/** One card on the dashboard (no canvas, which can be large). */
export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  template: { id: string; name: string };
  collection: { id: string; title: string; colorTag: string | null } | null;
  dimensions: BoxDimensions;
  /** Paper type and GSM shown on the dashboard card (UC-03). */
  materialSpec: MaterialSpecification;
  /** Print readiness 0-100 from the last server-side FitCheck; null until the design is checked. */
  fitcheckScore: number | null;
  thumbnailUrl: string | null;
  tags: string[];
  /** Template hub filters (UC-12), set when the project is shared with the community. */
  occasion: Occasion | null;
  industry: Industry | null;
  viewsCount: number;
  likesCount: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Everything the editor needs to open a project. */
export interface ProjectDetail extends ProjectSummary {
  /** Increases on every content change; sent back by the editor so a stale save answers 409 (see UpdateProjectDto). */
  version: number;
  /** Dieline formulas the project is pinned to (`@wrapfit/shared` generateDielinePieces). */
  formulaVersion: number;
  /** Current formulas of its box structure: when higher, POST /projects/:id/formula-upgrade can move the project. */
  latestFormulaVersion: number;
  allowFork: boolean;
  forkedFromId: string | null;
  canvasState: CanvasState;
  /** Report of the last server-side FitCheck (recomputed whenever the canvas or the dimensions change). */
  fitcheckState: FitCheckReport | null;
}

export const MAX_TITLE_LENGTH = 120;

/**
 * Name of the automatic snapshot saved before a project moves to newer dieline formulas (studio button and
 * prisma/scripts/upgrade-formulas.ts, which repeats it): restoring it undoes the upgrade.
 */
export function formulaUpgradeSnapshotName(from: number, to: number): string {
  return `Trước khi cập nhật công thức (bản ${from} → ${to})`;
}

/** One entry of the version history (the canvas itself is not listed). */
export interface SnapshotSummary {
  id: string;
  name: string;
  previewUrl: string | null;
  dimensions: BoxDimensions;
  /** Formulas of the project when the snapshot was taken; restoring puts them back. Null for older snapshots. */
  formulaVersion: number | null;
  createdAt: Date;
}

export const DEFAULT_MATERIAL: MaterialSpecification = {
  type: 'ivory',
  gsm: 300,
  caliper: caliperOf(300),
  finish: 'matte',
};

export const EMPTY_CANVAS: CanvasState = { elements: [] };
