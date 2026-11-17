import { Injectable } from '@nestjs/common';
import type { FitCheckReport } from '@wrapfit/shared';
import { PrismaService } from '../../shared/prisma';
import { toStoredCanvas } from '../../storage';
import type {
  ISnapshotRepository,
  NewSnapshot,
  SnapshotContent,
} from '../application/ports/snapshot.repository.port';
import type { ProjectDetail, SnapshotSummary } from '../domain/project.types';
import { syncProjectFileRefs } from './project-file-refs';
import { pruneAutomaticSnapshots } from './snapshot-retention';
import { detailSelect, json, nullableJson, snapshotSummarySelect, toDetail, toSnapshotSummary } from './project.select';

@Injectable()
export class PrismaSnapshotRepository implements ISnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string): Promise<SnapshotSummary[]> {
    const rows = await this.prisma.projectSnapshot.findMany({
      where: { projectId },
      select: snapshotSummarySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toSnapshotSummary);
  }

  countManual(projectId: string): Promise<number> {
    return this.prisma.projectSnapshot.count({ where: { projectId, isAutomatic: false } });
  }

  /**
   * The snapshot copies the canvas the service read a moment before: a save in between may have dropped some of its
   * files from the project, so the refs are recomputed with it.
   */
  async create(projectId: string, snapshot: NewSnapshot): Promise<SnapshotSummary> {
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectSnapshot.create({
        data: this.toData(projectId, snapshot),
        select: snapshotSummarySelect,
      });
      await syncProjectFileRefs(tx, projectId);
      return created;
    });
    return toSnapshotSummary(row);
  }

  async findContent(projectId: string, snapshotId: string): Promise<SnapshotContent | null> {
    const row = await this.prisma.projectSnapshot.findFirst({
      where: { id: snapshotId, projectId },
      select: { id: true, name: true, canvasState: true, dimensions: true, formulaVersion: true },
    });
    return row as unknown as SnapshotContent | null;
  }

  async delete(projectId: string, snapshotId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.projectSnapshot.deleteMany({ where: { id: snapshotId, projectId } });
      if (count) await syncProjectFileRefs(tx, projectId); // the images only this version showed are released
      return count > 0;
    });
  }

  async restore(
    projectId: string,
    snapshot: SnapshotContent,
    backup: NewSnapshot,
    fitCheck: FitCheckReport | null,
  ): Promise<{ project: ProjectDetail; backup: SnapshotSummary }> {
    const canvasState = json(toStoredCanvas(snapshot.canvasState));
    const dimensions = json(snapshot.dimensions);
    const [backupRow, projectRow] = await this.prisma.$transaction(async (tx) => {
      // Restoring the design the project already has (e.g. the snapshot of the last export) keeps its version, so
      // print files paid for and a print approval stay valid (decision Q3). Row locked: no save slips in between.
      // jsonb equality ignores key order.
      const [current] = await tx.$queryRaw<{ same: boolean }[]>`
        SELECT canvas_state = ${JSON.stringify(canvasState)}::jsonb
          AND dimensions = ${JSON.stringify(dimensions)}::jsonb
          AND (${snapshot.formulaVersion}::int IS NULL OR formula_version = ${snapshot.formulaVersion}::int) AS same
        FROM packaging_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
      const backupRow = await tx.projectSnapshot.create({
        data: { ...this.toData(projectId, backup), isAutomatic: true },
        select: snapshotSummarySelect,
      });
      const projectRow = await tx.packagingProject.update({
        where: { id: projectId },
        data: {
          canvasState,
          dimensions,
          // Restoring the backup of a formula upgrade undoes it; older snapshots keep the current formulas.
          ...(snapshot.formulaVersion !== null && { formulaVersion: snapshot.formulaVersion }),
          fitcheckState: nullableJson(fitCheck),
          fitcheckScore: fitCheck?.score ?? null,
          // An editor still showing the old design must reload, not save over it.
          ...(!current?.same && { version: { increment: 1 } }),
        },
        select: detailSelect,
      });
      await syncProjectFileRefs(tx, projectId);
      await pruneAutomaticSnapshots(tx, projectId); // the backup is an automatic snapshot
      return [backupRow, projectRow] as const;
    });
    return { project: toDetail(projectRow), backup: toSnapshotSummary(backupRow) };
  }

  async upgradeFormula(
    projectId: string,
    expectedVersion: number,
    formulaVersion: number,
    backup: NewSnapshot,
    fitCheck: FitCheckReport | null,
  ): Promise<{ project: ProjectDetail; backup: SnapshotSummary } | null> {
    return this.prisma.$transaction(async (tx) => {
      // Guarded write first: after a save of another tab it matches nothing, and nothing is written.
      const { count } = await tx.packagingProject.updateMany({
        where: { id: projectId, version: expectedVersion },
        data: {
          formulaVersion,
          fitcheckState: nullableJson(fitCheck),
          fitcheckScore: fitCheck?.score ?? null,
          version: { increment: 1 }, // open editors reload the project with its new dieline
        },
      });
      if (count === 0) return null;
      const backupRow = await tx.projectSnapshot.create({
        data: { ...this.toData(projectId, backup), isAutomatic: true },
        select: snapshotSummarySelect,
      });
      await syncProjectFileRefs(tx, projectId);
      await pruneAutomaticSnapshots(tx, projectId); // the backup is an automatic snapshot
      const projectRow = await tx.packagingProject.findUniqueOrThrow({ where: { id: projectId }, select: detailSelect });
      return { project: toDetail(projectRow), backup: toSnapshotSummary(backupRow) };
    });
  }

  private toData(projectId: string, snapshot: NewSnapshot) {
    return {
      projectId,
      name: snapshot.name,
      previewKey: snapshot.previewKey,
      canvasState: json(toStoredCanvas(snapshot.canvasState)),
      dimensions: json(snapshot.dimensions),
      formulaVersion: snapshot.formulaVersion,
    };
  }
}
