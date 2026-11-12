import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type BoxDimensions, dimensionRuleErrors, type MaterialSpecification } from '@wrapfit/shared';
import { disallowedFileContents, fileUrlNotAllowed, storedCanvasKeys, toStoredCanvas } from '../../storage';
import { paginate, Paginated, toSkipTake } from '../../common';
import {
  canDeletePermanently,
  canEdit,
  findDimensionViolations,
  readDimensionLimits,
} from '../domain/project.policy';
import { fitCheckOf } from '../domain/project-fitcheck';
import { changeStatus, duplicateTitle, purgeCutoff } from '../domain/project-lifecycle';
import {
  DEFAULT_MATERIAL,
  EMPTY_CANVAS,
  MAX_TITLE_LENGTH,
  ProjectDetail,
  ProjectStatus,
  ProjectSummary,
  ProjectVisibility,
} from '../domain/project.types';
import { CreateProjectDto } from '../presentation/dto/create-project.dto';
import { BoxDimensionsDto } from '../presentation/dto/project-spec.dto';
import { NO_COLLECTION, QueryProjectsDto } from '../presentation/dto/query-projects.dto';
import { RecordProjectEventDto } from '../presentation/dto/record-project-event.dto';
import { UpdateProjectDto } from '../presentation/dto/update-project.dto';
import { IProjectEvents, PROJECT_EVENTS, ProjectSource } from './ports/project-events.port';
import { IProjectFiles, PROJECT_FILES } from './ports/project-files.port';
import { IProjectRepository, PROJECT_REPOSITORY, ProjectChanges } from './ports/project.repository.port';

/** Projects permanently deleted per trash purge run. */
const PURGE_BATCH = 500;
/** Projects checked per query by the FitCheck backfill. */
const BACKFILL_BATCH = 200;
/** Uploads a project thumbnail may use. */
const THUMBNAIL_PURPOSES = ['THUMBNAIL' as const, 'IMAGE' as const];

/** Upload keys shown by a canvas (client form with URLs, or stored form with keys). */
const canvasKeys = (canvas: { elements?: { type: string; content: string }[] } | undefined) =>
  canvas ? storedCanvasKeys(toStoredCanvas(canvas)) : [];

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: IProjectRepository,
    @Inject(PROJECT_FILES) private readonly files: IProjectFiles,
    @Inject(PROJECT_EVENTS) private readonly events: IProjectEvents,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectDetail> {
    const template = await this.projects.findTemplateRules(dto.templateId);
    if (!template?.isActive) {
      throw new BadRequestException(`Unknown or inactive template: ${dto.templateId}`);
    }
    if (dto.collectionId) await this.assertCollectionOwner(dto.collectionId, userId);

    // Template hub (UC-13): the curated design provides the material and canvas the client did not send
    // (a client that resized the design sends its own scaled canvas).
    const design = dto.designTemplateId ? await this.projects.findDesignTemplate(dto.designTemplateId) : null;
    if (dto.designTemplateId) {
      if (!design?.isActive) throw new BadRequestException('Unknown or inactive design template');
      if (design.boxTemplateId !== template.id) {
        throw new BadRequestException(`templateId must be ${design.boxTemplateId} for this design template`);
      }
    }

    const materialSpec = dto.materialSpec ?? design?.materialSpec ?? DEFAULT_MATERIAL;
    const dimensions = this.completeDimensions(dto.dimensions, materialSpec);
    this.assertDimensionsFit(template.id, dimensions, template.formulaSchema);
    const canvasState = dto.canvasState ?? design?.canvasState ?? EMPTY_CANVAS;
    // A client that resized a curated design sends it back with the design's own images.
    if (dto.canvasState) {
      assertOwnFileContents(dto.canvasState, design?.canvasState);
      await this.files.assertCanvasUploads(canvasKeys(dto.canvasState), userId, canvasKeys(design?.canvasState));
    }

    const project = await this.projects.create({
      userId,
      templateId: template.id,
      formulaVersion: template.formulaVersion,
      collectionId: dto.collectionId ?? null,
      title: dto.title,
      dimensions,
      materialSpec,
      canvasState,
      fitCheck: fitCheckOf(template.id, dimensions, canvasState.elements, template.formulaVersion),
      tags: dto.tags ?? [],
      occasion: dto.occasion ?? null,
      industry: dto.industry ?? null,
    });
    if (design) await this.projects.countTemplateUse(design.id);
    await this.recordCreated(project.id, userId, template.id, 'new');
    return project;
  }

  async list(userId: string, query: QueryProjectsDto): Promise<Paginated<ProjectSummary>> {
    const { items, total } = await this.projects.list({
      userId,
      status: query.status,
      templateId: query.templateId,
      collectionId: query.collectionId === NO_COLLECTION ? null : query.collectionId,
      search: query.q || undefined,
      sortBy: query.sortBy,
      order: query.order,
      ...toSkipTake(query),
    });
    return paginate(items, total, query);
  }

  /** Ownership is checked before by ProjectOwnerGuard. */
  async findOne(projectId: string): Promise<ProjectDetail> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * Saves the design. The write only succeeds if nobody saved in between (compare-and-set on `version`), so an older
   * tab cannot overwrite a newer save and the stored FitCheck always matches the stored canvas and dimensions.
   */
  async update(projectId: string, userId: string, dto: UpdateProjectDto): Promise<ProjectDetail> {
    const project = await this.findOne(projectId);
    if (!canEdit(project.status)) {
      throw new ConflictException('Restore the project from the trash before editing it');
    }
    if (dto.version !== undefined && dto.version !== project.version) throw versionConflict(project.version);
    if (dto.collectionId) await this.assertCollectionOwner(dto.collectionId, userId);
    if (dto.canvasState) {
      assertOwnFileContents(dto.canvasState, project.canvasState);
      await this.files.assertCanvasUploads(canvasKeys(dto.canvasState), userId, canvasKeys(project.canvasState));
    }

    const changes: ProjectChanges = {
      title: dto.title,
      collectionId: dto.collectionId,
      materialSpec: dto.materialSpec,
      canvasState: dto.canvasState,
      tags: dto.tags,
      occasion: dto.occasion,
      industry: dto.industry,
    };

    if (dto.thumbnailUrl !== undefined) {
      changes.thumbnailKey =
        dto.thumbnailUrl === null ? null : await this.files.resolveUpload(dto.thumbnailUrl, userId, THUMBNAIL_PURPOSES);
    }
    if (dto.dimensions) {
      const template = await this.projects.findTemplateRules(project.template.id);
      changes.dimensions = this.completeDimensions(dto.dimensions, dto.materialSpec ?? project.materialSpec);
      this.assertDimensionsFit(project.template.id, changes.dimensions, template?.formulaSchema);
    }
    // The FitCheck score on the dashboard and in the template hub always matches the saved design.
    if (changes.canvasState || changes.dimensions) {
      changes.fitCheck = fitCheckOf(
        project.template.id,
        changes.dimensions ?? project.dimensions,
        (changes.canvasState ?? project.canvasState).elements,
        project.formulaVersion,
      );
    }

    const saved = await this.projects.updateContent(projectId, changes, project.version);
    if (!saved) {
      // Another save landed between our read and our write.
      throw versionConflict((await this.findOne(projectId)).version);
    }
    return saved;
  }

  /** Archive, move to the trash or restore. Setting the current status again changes nothing. */
  async changeStatus(projectId: string, status: ProjectStatus): Promise<ProjectDetail> {
    const project = await this.findOne(projectId);
    const next = changeStatus(project, status, new Date());
    return next ? this.projects.setLifecycle(projectId, next) : project;
  }

  /** Privacy (UC-08): PRIVATE / UNLISTED (secret link) / PUBLIC, and whether others may remix it. */
  async changeVisibility(
    projectId: string,
    change: { visibility?: ProjectVisibility; allowFork?: boolean },
  ): Promise<ProjectDetail> {
    const project = await this.findOne(projectId);
    if (!canEdit(project.status)) {
      throw new ConflictException('Restore the project from the trash before sharing it');
    }
    return this.projects.update(projectId, { visibility: change.visibility, allowFork: change.allowFork });
  }

  /** Independent copy in the owner's workspace (UC-06), titled `[Bản sao] <title>`. */
  async duplicate(projectId: string, userId: string): Promise<ProjectDetail> {
    const source = await this.findOne(projectId);
    if (!canEdit(source.status)) {
      throw new ConflictException('Restore the project from the trash before duplicating it');
    }
    return this.copy(source, userId, {
      title: duplicateTitle(source.title, MAX_TITLE_LENGTH),
      collectionId: source.collection?.id ?? null,
      forkedFromId: null,
    });
  }

  /**
   * Remix of someone else's shared project (UC-11): a copy in the remixer's workspace, outside any collection,
   * linked to the original by `forkedFromId`. Who may fork what is decided by the caller (public showcase).
   */
  async fork(sourceId: string, userId: string): Promise<ProjectDetail> {
    const source = await this.findOne(sourceId);
    return this.copy(source, userId, { title: source.title, collectionId: null, forkedFromId: source.id });
  }

  /**
   * Same template, dimensions, material, canvas, FitCheck result and tags; new id and slug. The copy starts ACTIVE
   * and PRIVATE; the thumbnail is not shared (its file belongs to the source project).
   */
  private async copy(
    source: ProjectDetail,
    userId: string,
    target: { title: string; collectionId: string | null; forkedFromId: string | null },
  ): Promise<ProjectDetail> {
    const project = await this.projects.create({
      userId,
      templateId: source.template.id,
      // A copy keeps the formulas of its source: same cut lines, same FitCheck result.
      formulaVersion: source.formulaVersion,
      dimensions: source.dimensions,
      materialSpec: source.materialSpec,
      canvasState: source.canvasState,
      fitCheck: source.fitcheckState,
      tags: source.tags,
      occasion: source.occasion,
      industry: source.industry,
      ...target,
    });
    await this.recordCreated(project.id, userId, source.template.id, target.forkedFromId ? 'fork' : 'duplicate');
    return project;
  }

  /**
   * Studio events of the analytics dashboard (docs/17 S7): Auto-Fix repairs and active-time heartbeats. Ownership is
   * checked before by ProjectOwnerGuard.
   */
  async recordEvent(projectId: string, userId: string, dto: RecordProjectEventDto): Promise<void> {
    if (dto.type === 'STUDIO_ACTIVE') {
      await this.events.recordStudioActivity(userId, projectId, dto.seconds!);
    } else {
      await this.events.record('AUTO_FIX_APPLIED', { userId, projectId, payload: { fixed: dto.fixed! } });
    }
  }

  /** Analytics dashboard: every new project counts as a box created (docs/17 S7). */
  private recordCreated(projectId: string, userId: string, templateId: string, source: ProjectSource): Promise<void> {
    return this.events.record('PROJECT_CREATED', { userId, projectId, payload: { templateId, source } });
  }

  /**
   * Called by TrashPurgeTask: permanently deletes projects that stayed in the trash for 30 days, then their files
   * in object storage. Works in batches; what is left is handled by the next run.
   */
  async purgeExpiredTrash(now = new Date()): Promise<number> {
    const cutoff = purgeCutoff(now);
    const candidates = await this.projects.findTrashedBefore(cutoff, PURGE_BATCH);
    if (!candidates.length) return 0;

    await this.files.detachSharedFiles(candidates);
    const files = await this.files.listProjectFiles(candidates);
    const deleted = new Set(await this.projects.deleteTrashed(candidates, cutoff));
    await this.files.deleteObjects(files.filter((file) => deleted.has(file.projectId)).map((file) => file.key));
    return deleted.size;
  }

  /**
   * Called once at startup by FitCheckBackfillTask: computes the FitCheck of projects saved before scores were stored
   * (they would otherwise stay out of the community hub). Returns how many projects were checked.
   */
  async backfillFitChecks(): Promise<number> {
    let checked = 0;
    let afterId: string | null = null;
    for (;;) {
      const batch = await this.projects.findUnchecked(afterId, BACKFILL_BATCH);
      if (!batch.length) return checked;
      for (const project of batch) {
        const fitCheck = fitCheckOf(
          project.templateId,
          project.dimensions,
          project.canvasState.elements ?? [],
          project.formulaVersion,
        );
        if (fitCheck) {
          await this.projects.saveFitCheck(project.id, fitCheck);
          checked++;
        }
      }
      afterId = batch[batch.length - 1].id;
    }
  }

  async remove(projectId: string): Promise<void> {
    const project = await this.findOne(projectId);
    if (!canDeletePermanently(project.status)) {
      throw new ConflictException('Move the project to the trash before deleting it permanently');
    }
    await this.files.detachSharedFiles([projectId]);
    const files = await this.files.listProjectFiles([projectId]);
    await this.projects.delete(projectId);
    await this.files.deleteObjects(files.map((file) => file.key));
  }

  /** Throws 404 when the project does not exist or belongs to someone else (no information leak). */
  async assertOwner(projectId: string, userId: string): Promise<void> {
    const ownerId = await this.projects.findOwnerId(projectId);
    if (ownerId !== userId) throw new NotFoundException('Project not found');
  }

  private async assertCollectionOwner(collectionId: string, userId: string): Promise<void> {
    if (!(await this.projects.isCollectionOwnedBy(collectionId, userId))) {
      throw new BadRequestException('collectionId must be one of your collections');
    }
  }

  /** The paper thickness defaults to the caliper of the chosen material. */
  private completeDimensions(dto: BoxDimensionsDto, material: MaterialSpecification): BoxDimensions {
    return {
      length: dto.length,
      width: dto.width,
      height: dto.height,
      paperThickness: dto.paperThickness ?? material.caliper,
      ...(dto.giftWeight !== undefined && { giftWeight: dto.giftWeight }),
      ...(dto.bottomType !== undefined && { bottomType: dto.bottomType }),
    };
  }

  private assertDimensionsFit(structure: string, dimensions: BoxDimensions, formulaSchema: unknown): void {
    const violations = [
      ...findDimensionViolations(dimensions, readDimensionLimits(formulaSchema)),
      // Proportions the structure needs (e.g. a pillow box at most half as thick as wide).
      ...dimensionRuleErrors(structure, dimensions).map((rule) => rule.message),
    ];
    if (violations.length) throw new BadRequestException(violations);
  }
}

/**
 * Logos, images and patterns must be files of WrapFit (uploads, frontend assets): a URL of another site would be
 * loaded by every visitor of the public pages. `current` keeps what the saved design already shows.
 */
function assertOwnFileContents(
  canvas: { elements?: { type: string; content: string }[] },
  current: { elements?: { type: string; content: string }[] } | undefined,
): void {
  if (disallowedFileContents(canvas, current).length) throw fileUrlNotAllowed();
}

/** 409 with a stable code: the editor reloads the project (or offers to) instead of overwriting the newer save. */
export function versionConflict(currentVersion: number): ConflictException {
  return new ConflictException({
    code: 'PROJECT_VERSION_CONFLICT',
    message: 'The project was saved from somewhere else in the meantime; reload it before saving again',
    currentVersion,
  });
}
