import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FitCheckReport } from '@wrapfit/shared';
import { noOrderHoldsDesign, ORDER_STATUSES_HOLDING_DESIGN } from '../../orders/order-status';
import { PrismaService } from '../../shared/prisma';
import { StorageService, toStoredCanvas } from '../../storage';
import type {
  DesignTemplateSource,
  IProjectRepository,
  NewProject,
  PermanentDeletion,
  ProjectChanges,
  ProjectListQuery,
  TemplateRules,
  UncheckedProject,
} from '../application/ports/project.repository.port';
import type { LifecycleState } from '../domain/project-lifecycle';
import type { ProjectDetail, ProjectSummary } from '../domain/project.types';
import { syncProjectFileRefs } from './project-file-refs';
import { detailSelect, json, nullableJson, summarySelect, toDetail, toSummary } from './project.select';

/** A purge batch (up to PURGE_BATCH projects and their cascades) runs in one transaction. */
const PURGE_TRANSACTION_TIMEOUT_MS = 60_000;

/** Transactions a permanent deletion may take when a project receiving its shared files changes meanwhile. */
const DELETE_ATTEMPTS = 3;

/**
 * A deletion hands the shared files to another project without locking it. When that project is deleted at the same
 * moment (by hand, or by the other path), the hand-over fails on stored_files_project_id_fkey and the transaction rolls
 * back; two deletions handing files to each other's project may also deadlock. A new transaction reads the projects
 * and their heirs again (docs/30 review round 4).
 */
function heirChangedMeanwhile(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const sqlState = (error.meta as { code?: string } | undefined)?.code;
  return sqlState === '40P01' || error.message.includes('stored_files_project_id_fkey');
}

@Injectable()
export class PrismaProjectRepository implements IProjectRepository {
  private readonly logger = new Logger(PrismaProjectRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  findTemplateRules(templateId: string): Promise<TemplateRules | null> {
    return this.prisma.boxTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, isActive: true, formulaSchema: true, formulaVersion: true },
    });
  }

  async findDesignTemplate(designTemplateId: string): Promise<DesignTemplateSource | null> {
    const row = await this.prisma.designTemplate.findUnique({
      where: { id: designTemplateId },
      select: { id: true, boxTemplateId: true, isActive: true, materialSpec: true, canvasState: true },
    });
    return row as unknown as DesignTemplateSource | null;
  }

  async countTemplateUse(designTemplateId: string): Promise<void> {
    await this.prisma.designTemplate.update({
      where: { id: designTemplateId },
      data: { usesCount: { increment: 1 } },
    });
  }

  async isCollectionOwnedBy(collectionId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.projectCollection.count({ where: { id: collectionId, userId } });
    return count > 0;
  }

  async findOwnerId(projectId: string): Promise<string | null> {
    const project = await this.prisma.packagingProject.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    return project?.userId ?? null;
  }

  async findById(projectId: string): Promise<ProjectDetail | null> {
    const row = await this.prisma.packagingProject.findUnique({
      where: { id: projectId },
      select: detailSelect,
    });
    return row && toDetail(row);
  }

  async list(query: ProjectListQuery): Promise<{ items: ProjectSummary[]; total: number }> {
    const where: Prisma.PackagingProjectWhereInput = {
      userId: query.userId,
      status: query.status,
      templateId: query.templateId,
      ...(query.collectionId !== undefined && { collectionId: query.collectionId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { tags: { has: query.search.toLowerCase() } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.packagingProject.findMany({
        where,
        select: summarySelect,
        // `id` as tie-breaker keeps pages stable when timestamps are equal.
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.packagingProject.count({ where }),
    ]);
    return { items: rows.map(toSummary), total };
  }

  async create(project: NewProject): Promise<ProjectDetail> {
    // A copy or a remix shows the images of its source: their refs keep the files alive.
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.packagingProject.create({
        data: {
          userId: project.userId,
          templateId: project.templateId,
          formulaVersion: project.formulaVersion,
          collectionId: project.collectionId,
          title: project.title,
          dimensions: json(project.dimensions),
          materialSpec: json(project.materialSpec),
          canvasState: json(toStoredCanvas(project.canvasState)),
          fitcheckState: nullableJson(project.fitCheck),
          fitcheckScore: project.fitCheck?.score ?? null,
          forkedFromId: project.forkedFromId ?? null,
          tags: project.tags,
          occasion: project.occasion ?? null,
          industry: project.industry ?? null,
        },
        select: detailSelect,
      });
      await syncProjectFileRefs(tx, created.id);
      return created;
    });
    return toDetail(row);
  }

  async update(projectId: string, changes: ProjectChanges): Promise<ProjectDetail> {
    const row = await this.prisma.packagingProject.update({
      where: { id: projectId },
      data: this.toData(changes),
      select: detailSelect,
    });
    return toDetail(row);
  }

  async updateContent(
    projectId: string,
    changes: ProjectChanges,
    expectedVersion: number,
  ): Promise<ProjectDetail | null> {
    // Compare-and-set on `version` for every save: one statement, so two saves can never both win. Only a new design
    // (canvas, dimensions, material) increases it (decision Q3): paid print files and print approvals keep their version.
    const contentChanged = !!(changes.canvasState || changes.dimensions || changes.materialSpec);
    const data = { ...this.toData(changes), ...(contentChanged && { version: { increment: 1 } }) };
    const where = { id: projectId, version: expectedVersion };
    // Nothing to write (a save equal to the stored design): Prisma would match no row, so only the version is checked.
    if (Object.values(data).every((value) => value === undefined)) {
      return (await this.prisma.packagingProject.count({ where })) ? this.findById(projectId) : null;
    }
    const count = await this.prisma.$transaction(async (tx) => {
      const result = await tx.packagingProject.updateMany({ where, data });
      if (result.count && changes.canvasState) await syncProjectFileRefs(tx, projectId);
      return result.count;
    });
    return count ? this.findById(projectId) : null;
  }

  async setLifecycle(projectId: string, state: LifecycleState): Promise<ProjectDetail> {
    const row = await this.prisma.packagingProject.update({
      where: { id: projectId },
      data: { status: state.status, deletedAt: state.deletedAt },
      select: detailSelect,
    });
    return toDetail(row);
  }

  async delete(projectId: string): Promise<PermanentDeletion> {
    return this.retryingHeirChange(() => this.deleteOnce(projectId));
  }

  private deleteOnce(projectId: string): Promise<PermanentDeletion> {
    return this.prisma.$transaction(async (tx) => {
      // Lock first (docs/30 item 4). The lock waits for a checkout writing an order line of this project (its foreign
      // key check holds the row) and for a restore from another tab. The statements below start after it, so they see
      // what those committed: a check inside the DELETE itself would read the database as it was before the wait.
      const [row] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status::text AS status FROM packaging_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
      if (!row) return { kind: 'NOT_FOUND' };
      if (row.status !== 'DELETED') return { kind: 'NOT_IN_TRASH' };
      const orderCode = await orderHoldingDesign(tx, projectId);
      if (orderCode) return { kind: 'IN_ORDER', orderCode };
      const keys = await this.releaseFiles(tx, [projectId]);
      // Snapshots, likes, files, exports... are removed by ON DELETE CASCADE.
      await tx.$executeRaw`DELETE FROM packaging_projects WHERE id = ${projectId}::uuid`;
      return { kind: 'DELETED', keys };
    });
  }

  findOrderHoldingDesign(projectId: string): Promise<string | null> {
    return orderHoldingDesign(this.prisma, projectId);
  }

  async findTrashedBefore(cutoff: Date, limit: number): Promise<string[]> {
    // Uses the (status, deleted_at) index.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM packaging_projects p
      WHERE p.status = 'DELETED' AND p.deleted_at < ${cutoff.toISOString()}::timestamptz
        AND ${noOrderHoldsDesign(Prisma.sql`p.id`)}
      ORDER BY p.deleted_at
      LIMIT ${limit}`;
    return rows.map((row) => row.id);
  }

  async deleteTrashed(projectIds: string[], cutoff: Date): Promise<{ deleted: string[]; keys: string[] }> {
    if (!projectIds.length) return { deleted: [], keys: [] };
    return this.retryingHeirChange(() => this.deleteTrashedOnce(projectIds, cutoff));
  }

  private deleteTrashedOnce(projectIds: string[], cutoff: Date): Promise<{ deleted: string[]; keys: string[] }> {
    return this.prisma.$transaction(
      async (tx) => {
        // Lock first, as `delete` does, but skip the rows another transaction holds (a checkout writing an order, a
        // restore): the next run retries them. The statements below then see the orders committed before the lock.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM packaging_projects
          WHERE id = ANY(${projectIds}::uuid[]) AND status = 'DELETED' AND deleted_at < ${cutoff.toISOString()}::timestamptz
          FOR UPDATE SKIP LOCKED`;
        if (!locked.length) return { deleted: [], keys: [] };
        // Exactly the projects that go: a skipped one (locked, or held by an order) can still receive a shared file.
        const going = (
          await tx.$queryRaw<{ id: string }[]>`
            SELECT p.id FROM packaging_projects p
            WHERE p.id = ANY(${locked.map((row) => row.id)}::uuid[]) AND ${noOrderHoldsDesign(Prisma.sql`p.id`)}`
        ).map((row) => row.id);
        if (!going.length) return { deleted: [], keys: [] };
        const keys = await this.releaseFiles(tx, going);
        // Snapshots, likes, files, exports... are removed by ON DELETE CASCADE.
        await tx.$executeRaw`DELETE FROM packaging_projects WHERE id = ANY(${going}::uuid[])`;
        return { deleted: going, keys };
      },
      { timeout: PURGE_TRANSACTION_TIMEOUT_MS },
    );
  }

  /** Runs a deleting transaction again, DELETE_ATTEMPTS times at most in all, when `heirChangedMeanwhile`. */
  private async retryingHeirChange<T>(transaction: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await transaction();
      } catch (error) {
        if (attempt >= DELETE_ATTEMPTS || !heirChangedMeanwhile(error)) throw error;
        this.logger.warn(`Permanent deletion tried again (${attempt + 1}/${DELETE_ATTEMPTS}): a project receiving shared files changed meanwhile`);
      }
    }
  }

  /**
   * In the deleting transaction, with the projects locked: hands the files other projects still show over to them,
   * then lists the keys of the files that go with these projects (docs/30 review round 3).
   */
  private async releaseFiles(tx: Prisma.TransactionClient, projectIds: string[]): Promise<string[]> {
    await this.storage.detachSharedFiles(projectIds, tx);
    return (await this.storage.listProjectFiles(projectIds, tx)).map((file) => file.key);
  }

  async findUnchecked(afterId: string | null, limit: number): Promise<UncheckedProject[]> {
    const rows = await this.prisma.packagingProject.findMany({
      where: { fitcheckScore: null, ...(afterId && { id: { gt: afterId } }) },
      select: { id: true, templateId: true, formulaVersion: true, dimensions: true, canvasState: true },
      orderBy: { id: 'asc' },
      take: limit,
    });
    return rows as unknown as UncheckedProject[];
  }

  async saveFitCheck(projectId: string, fitCheck: FitCheckReport): Promise<void> {
    // Raw SQL: a Prisma `update` would bump `updated_at` and reorder the owner's dashboard.
    await this.prisma.$executeRaw`
      UPDATE packaging_projects
      SET fitcheck_state = ${JSON.stringify(fitCheck)}::jsonb, fitcheck_score = ${fitCheck.score}
      WHERE id = ${projectId}::uuid`;
  }

  /** Prisma data of the changed fields (`undefined` = unchanged). */
  private toData(changes: ProjectChanges) {
    return {
      title: changes.title,
      collectionId: changes.collectionId,
      thumbnailKey: changes.thumbnailKey,
      tags: changes.tags,
      occasion: changes.occasion,
      industry: changes.industry,
      visibility: changes.visibility,
      allowFork: changes.allowFork,
      dimensions: changes.dimensions && json(changes.dimensions),
      materialSpec: changes.materialSpec && json(changes.materialSpec),
      canvasState: changes.canvasState && json(toStoredCanvas(changes.canvasState)),
      ...(changes.fitCheck !== undefined && {
        fitcheckState: nullableJson(changes.fitCheck),
        fitcheckScore: changes.fitCheck?.score ?? null,
      }),
    } satisfies Prisma.PackagingProjectUncheckedUpdateManyInput;
  }
}

/** Code of the oldest order that still holds the design of the project (ORDER_STATUSES_HOLDING_DESIGN), or null. */
async function orderHoldingDesign(db: Prisma.TransactionClient, projectId: string): Promise<string | null> {
  const item = await db.orderItem.findFirst({
    where: { projectId, order: { status: { in: [...ORDER_STATUSES_HOLDING_DESIGN] } } },
    select: { order: { select: { orderCode: true } } },
    orderBy: { order: { createdAt: 'asc' } },
  });
  return item?.order.orderCode ?? null;
}
