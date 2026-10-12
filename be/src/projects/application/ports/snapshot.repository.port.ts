import type { BoxDimensions, FitCheckReport } from '@wrapfit/shared';
import type { CanvasState, ProjectDetail, SnapshotSummary } from '../../domain/project.types';

export const SNAPSHOT_REPOSITORY = Symbol('SNAPSHOT_REPOSITORY');

export interface NewSnapshot {
  name: string;
  /** Storage key of the uploaded preview image. */
  previewKey: string | null;
  canvasState: CanvasState;
  dimensions: BoxDimensions;
  /** Formulas of the project at that moment. */
  formulaVersion: number;
}

export interface SnapshotContent {
  id: string;
  name: string;
  canvasState: CanvasState;
  dimensions: BoxDimensions;
  /** Null for snapshots taken before the column existed: a restore keeps the project's version. */
  formulaVersion: number | null;
}

export interface ISnapshotRepository {
  /** Newest first. */
  list(projectId: string): Promise<SnapshotSummary[]>;
  /** Manual snapshots only: automatic ones (export, restore backups) do not count against the limit. */
  countManual(projectId: string): Promise<number>;
  create(projectId: string, snapshot: NewSnapshot): Promise<SnapshotSummary>;
  /** `null` when the snapshot does not exist or belongs to another project. */
  findContent(projectId: string, snapshotId: string): Promise<SnapshotContent | null>;
  /** Returns false when nothing was deleted. */
  delete(projectId: string, snapshotId: string): Promise<boolean>;
  /**
   * In one transaction: saves `backup` (the current state, automatic), then copies the snapshot into the project
   * (with its formula version when it has one) and the FitCheck of the restored design.
   */
  restore(
    projectId: string,
    snapshot: SnapshotContent,
    backup: NewSnapshot,
    fitCheck: FitCheckReport | null,
  ): Promise<{ project: ProjectDetail; backup: SnapshotSummary }>;
  /**
   * In one transaction, only while the project is still at `expectedVersion` (else null): moves the project to the
   * formulas `formulaVersion` with the FitCheck computed for them and saves `backup` (automatic).
   */
  upgradeFormula(
    projectId: string,
    expectedVersion: number,
    formulaVersion: number,
    backup: NewSnapshot,
    fitCheck: FitCheckReport | null,
  ): Promise<{ project: ProjectDetail; backup: SnapshotSummary } | null>;
}
