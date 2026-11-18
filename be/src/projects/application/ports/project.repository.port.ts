import type { BoxDimensions, CanvasElement, FitCheckReport, MaterialSpecification } from '@wrapfit/shared';
import type { LifecycleState } from '../../domain/project-lifecycle';
import type {
  CanvasState,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
  ProjectVisibility,
  Industry,
  Occasion,
} from '../../domain/project.types';

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface TemplateRules {
  id: string;
  isActive: boolean;
  formulaSchema: unknown;
  /** Formula version given to new projects of this structure. */
  formulaVersion: number;
}

export interface NewProject {
  userId: string;
  templateId: string;
  /** Dieline formulas the project is pinned to (never changes afterwards). */
  formulaVersion: number;
  collectionId: string | null;
  title: string;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification;
  canvasState: CanvasState;
  tags: string[];
  occasion?: Occasion | null;
  industry?: Industry | null;
  /** Server-side FitCheck of the new canvas (copied by duplicate / fork). Stored with its score. */
  fitCheck: FitCheckReport | null;
  /** Set by a remix (fork) of a public project. */
  forkedFromId?: string | null;
}

/** `undefined` = leave unchanged, `null` = clear. */
export interface ProjectChanges {
  title?: string;
  collectionId?: string | null;
  dimensions?: BoxDimensions;
  materialSpec?: MaterialSpecification;
  canvasState?: CanvasState;
  /** Set together with a new canvas or new dimensions. */
  fitCheck?: FitCheckReport | null;
  /** Storage key of the uploaded preview image. */
  thumbnailKey?: string | null;
  tags?: string[];
  occasion?: Occasion | null;
  industry?: Industry | null;
  visibility?: ProjectVisibility;
  allowFork?: boolean;
}

export interface ProjectListQuery {
  userId: string;
  status: ProjectStatus;
  /** `null` = only projects outside any collection. */
  collectionId?: string | null;
  search?: string;
  /** Box structure (template id), e.g. `tuck-top`. */
  templateId?: string;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  order: 'asc' | 'desc';
  skip: number;
  take: number;
}

/** A curated design of the template hub that a new project starts from (UC-13). */
export interface DesignTemplateSource {
  id: string;
  boxTemplateId: string;
  isActive: boolean;
  materialSpec: MaterialSpecification;
  canvasState: CanvasState;
}

/** A project whose FitCheck score is missing (saved before scores were stored). */
export interface UncheckedProject {
  id: string;
  templateId: string;
  formulaVersion: number;
  dimensions: BoxDimensions;
  canvasState: { elements?: CanvasElement[] };
}

export interface IProjectRepository {
  findTemplateRules(templateId: string): Promise<TemplateRules | null>;
  findDesignTemplate(designTemplateId: string): Promise<DesignTemplateSource | null>;
  /** Usage counter of a curated design (template hub). */
  countTemplateUse(designTemplateId: string): Promise<void>;
  isCollectionOwnedBy(collectionId: string, userId: string): Promise<boolean>;
  /** Minimal lookup used by ProjectOwnerGuard. */
  findOwnerId(projectId: string): Promise<string | null>;
  findById(projectId: string): Promise<ProjectDetail | null>;
  list(query: ProjectListQuery): Promise<{ items: ProjectSummary[]; total: number }>;
  create(project: NewProject): Promise<ProjectDetail>;
  /** Settings that do not touch the design (visibility, remix permission): the version stays the same. */
  update(projectId: string, changes: ProjectChanges): Promise<ProjectDetail>;
  /**
   * Saves the changes only if the project is still at `expectedVersion`. The version increases only when `changes`
   * holds a canvas, dimensions or a material (pass only values that differ from the saved ones).
   * Returns `null` when another save got there first.
   */
  updateContent(projectId: string, changes: ProjectChanges, expectedVersion: number): Promise<ProjectDetail | null>;
  setLifecycle(projectId: string, state: LifecycleState): Promise<ProjectDetail>;
  /**
   * Permanently deletes the project unless an order still holds its design (ORDER_STATUSES_HOLDING_DESIGN, checked in
   * the same statement). Returns false when nothing was deleted.
   */
  delete(projectId: string): Promise<boolean>;
  /** Code of the oldest order that still holds the design of the project (ORDER_STATUSES_HOLDING_DESIGN), or null. */
  findOrderHoldingDesign(projectId: string): Promise<string | null>;
  /**
   * Ids of projects moved to the trash before `cutoff` (at most `limit`), leaving out those an order still holds:
   * they would fill every batch and stop the purge.
   */
  findTrashedBefore(cutoff: Date, limit: number): Promise<string[]>;
  /**
   * Permanently deletes those of `projectIds` that are still in the trash since before `cutoff` (one may have
   * been restored meanwhile) and that no order holds (one may have been ordered meanwhile), and returns the ids
   * actually deleted.
   */
  deleteTrashed(projectIds: string[], cutoff: Date): Promise<string[]>;
  /** Projects without a FitCheck score, by ascending id after `afterId` (at most `limit`). */
  findUnchecked(afterId: string | null, limit: number): Promise<UncheckedProject[]>;
  /** Stores a FitCheck result without touching `updatedAt` (the dashboard order). */
  saveFitCheck(projectId: string, fitCheck: FitCheckReport): Promise<void>;
}
