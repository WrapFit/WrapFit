import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FitCheckReport } from '@wrapfit/shared';
import { noOrderHoldsDesign, ORDER_STATUSES_HOLDING_DESIGN } from '../../orders/order-status';
import { PrismaService } from '../../shared/prisma';
import { toStoredCanvas } from '../../storage';
import type {
  DesignTemplateSource,
  IProjectRepository,
  NewProject,
  ProjectChanges,
  ProjectListQuery,
  TemplateRules,
  UncheckedProject,
} from '../application/ports/project.repository.port';
import type { LifecycleState } from '../domain/project-lifecycle';
import type { ProjectDetail, ProjectSummary } from '../domain/project.types';
import { syncProjectFileRefs } from './project-file-refs';
import { detailSelect, json, nullableJson, summarySelect, toDetail, toSummary } from './project.select';

@Injectable()
export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async delete(projectId: string): Promise<boolean> {
    // Snapshots, likes, files, exports... are removed by ON DELETE CASCADE.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      DELETE FROM packaging_projects p
      WHERE p.id = ${projectId}::uuid AND ${noOrderHoldsDesign(Prisma.sql`p.id`)}
      RETURNING p.id`;
    return rows.length > 0;
  }

  async findOrderHoldingDesign(projectId: string): Promise<string | null> {
    const item = await this.prisma.orderItem.findFirst({
      where: { projectId, order: { status: { in: [...ORDER_STATUSES_HOLDING_DESIGN] } } },
      select: { order: { select: { orderCode: true } } },
      orderBy: { order: { createdAt: 'asc' } },
    });
    return item?.order.orderCode ?? null;
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

  async deleteTrashed(projectIds: string[], cutoff: Date): Promise<string[]> {
    if (!projectIds.length) return [];
    // Snapshots, likes, files, exports... are removed by ON DELETE CASCADE.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      DELETE FROM packaging_projects p
      WHERE p.id = ANY(${projectIds}::uuid[]) AND p.status = 'DELETED'
        AND p.deleted_at < ${cutoff.toISOString()}::timestamptz
        AND ${noOrderHoldsDesign(Prisma.sql`p.id`)}
      RETURNING p.id`;
    return rows.map((row) => row.id);
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
