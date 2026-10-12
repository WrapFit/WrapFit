import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uploadKeyOf } from '../../storage';
import { fitCheckOf } from '../domain/project-fitcheck';
import { canEdit } from '../domain/project.policy';
import {
  formulaUpgradeSnapshotName,
  MAX_TITLE_LENGTH,
  ProjectDetail,
  SnapshotSummary,
} from '../domain/project.types';
import { CreateSnapshotDto } from '../presentation/dto/create-snapshot.dto';
import { IProjectFiles, PROJECT_FILES } from './ports/project-files.port';
import { ISnapshotRepository, SNAPSHOT_REPOSITORY } from './ports/snapshot.repository.port';
import { ProjectsService, versionConflict } from './projects.service';

/**
 * Manual save points per project. Automatic snapshots (export, restore backups) are not counted against it: the newest
 * MAX_AUTOMATIC_SNAPSHOTS of them are kept (infrastructure/snapshot-retention.ts).
 */
export const MAX_SNAPSHOTS_PER_PROJECT = 50;

/** Uploads a version preview may use. */
const PREVIEW_PURPOSES = ['THUMBNAIL' as const, 'IMAGE' as const];

/** Version history of a project (UC-07). Ownership is checked before by ProjectOwnerGuard. */
@Injectable()
export class SnapshotsService {
  constructor(
    private readonly projects: ProjectsService,
    @Inject(SNAPSHOT_REPOSITORY) private readonly snapshots: ISnapshotRepository,
    @Inject(PROJECT_FILES) private readonly files: IProjectFiles,
  ) {}

  list(projectId: string): Promise<SnapshotSummary[]> {
    return this.snapshots.list(projectId);
  }

  /** Saves the current canvas and dimensions under a name. */
  async create(projectId: string, userId: string, dto: CreateSnapshotDto): Promise<SnapshotSummary> {
    const project = await this.editableProject(projectId);
    if ((await this.snapshots.countManual(projectId)) >= MAX_SNAPSHOTS_PER_PROJECT) {
      throw new ConflictException(
        `A project keeps at most ${MAX_SNAPSHOTS_PER_PROJECT} manual snapshots; delete old ones first`,
      );
    }
    return this.snapshots.create(projectId, {
      name: dto.name,
      previewKey: dto.previewUrl ? await this.files.resolveUpload(dto.previewUrl, userId, PREVIEW_PURPOSES) : null,
      canvasState: project.canvasState,
      dimensions: project.dimensions,
      formulaVersion: project.formulaVersion,
    });
  }

  /**
   * Puts the snapshot's canvas, dimensions and formula version back into the project. The current state is saved
   * first as a new snapshot (`backup`), so a restore can always be undone.
   */
  async restore(
    projectId: string,
    snapshotId: string,
  ): Promise<{ project: ProjectDetail; backup: SnapshotSummary }> {
    const project = await this.editableProject(projectId);
    const snapshot = await this.snapshots.findContent(projectId, snapshotId);
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    return this.snapshots.restore(
      projectId,
      snapshot,
      {
        name: `Trước khi khôi phục: ${snapshot.name}`.slice(0, MAX_TITLE_LENGTH),
        previewKey: project.thumbnailUrl ? uploadKeyOf(project.thumbnailUrl) : null,
        canvasState: project.canvasState,
        dimensions: project.dimensions,
        formulaVersion: project.formulaVersion,
      },
      fitCheckOf(
        project.template.id,
        snapshot.dimensions,
        snapshot.canvasState.elements,
        snapshot.formulaVersion ?? project.formulaVersion,
      ),
    );
  }

  /**
   * Moves a project to the current formulas of its box structure (docs/12 Phase 8, 8.10b). The current state is saved
   * first as an automatic snapshot that keeps the old formula version, so restoring it undoes the upgrade. `version`
   * guards against overwriting a newer save, like PATCH; a project already on the current formulas is returned as is.
   */
  async upgradeFormula(
    projectId: string,
    version: number,
  ): Promise<{ project: ProjectDetail; backup: SnapshotSummary | null }> {
    const project = await this.editableProject(projectId);
    if (project.version !== version) throw versionConflict(project.version);
    const target = project.latestFormulaVersion;
    if (project.formulaVersion >= target) return { project, backup: null };

    const result = await this.snapshots.upgradeFormula(
      projectId,
      version,
      target,
      {
        name: formulaUpgradeSnapshotName(project.formulaVersion, target),
        previewKey: project.thumbnailUrl ? uploadKeyOf(project.thumbnailUrl) : null,
        canvasState: project.canvasState,
        dimensions: project.dimensions,
        formulaVersion: project.formulaVersion,
      },
      fitCheckOf(project.template.id, project.dimensions, project.canvasState.elements, target),
    );
    if (!result) throw versionConflict((await this.projects.findOne(projectId)).version);
    return result;
  }

  async remove(projectId: string, snapshotId: string): Promise<void> {
    if (!(await this.snapshots.delete(projectId, snapshotId))) {
      throw new NotFoundException('Snapshot not found');
    }
  }

  private async editableProject(projectId: string): Promise<ProjectDetail> {
    const project = await this.projects.findOne(projectId);
    if (!canEdit(project.status)) {
      throw new ConflictException('Restore the project from the trash before editing it');
    }
    return project;
  }
}
