import { Prisma } from '@prisma/client';
import { assetUrl, toClientCanvas } from '../../storage';
import type { ProjectDetail, ProjectSummary, SnapshotSummary } from '../domain/project.types';

export const summarySelect = {
  id: true,
  title: true,
  slug: true,
  status: true,
  visibility: true,
  template: { select: { id: true, name: true } },
  collection: { select: { id: true, title: true, colorTag: true } },
  dimensions: true,
  materialSpec: true,
  fitcheckScore: true,
  thumbnailKey: true,
  tags: true,
  occasion: true,
  industry: true,
  viewsCount: true,
  likesCount: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PackagingProjectSelect;

export const detailSelect = {
  ...summarySelect,
  template: { select: { id: true, name: true, formulaVersion: true } },
  version: true,
  formulaVersion: true,
  allowFork: true,
  forkedFromId: true,
  canvasState: true,
  fitcheckState: true,
} satisfies Prisma.PackagingProjectSelect;

export const snapshotSummarySelect = {
  id: true,
  name: true,
  previewKey: true,
  dimensions: true,
  formulaVersion: true,
  createdAt: true,
} satisfies Prisma.ProjectSnapshotSelect;

type SummaryRow = Prisma.PackagingProjectGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.PackagingProjectGetPayload<{ select: typeof detailSelect }>;
type SnapshotRow = Prisma.ProjectSnapshotGetPayload<{ select: typeof snapshotSummarySelect }>;

// JSON columns are only written through validated DTOs, so their shape is trusted when read back.
// Stored keys of uploads are returned as URLs (thumbnail, preview, canvas images).
export const toSummary = ({ thumbnailKey, ...row }: SummaryRow) =>
  ({ ...row, thumbnailUrl: assetUrl(thumbnailKey) }) as unknown as ProjectSummary;
export const toDetail = (row: DetailRow) => {
  const { template, ...summary } = toSummary(row) as unknown as DetailRow;
  return {
    ...summary,
    template: { id: template.id, name: template.name },
    latestFormulaVersion: template.formulaVersion,
    canvasState: toClientCanvas(row.canvasState as never),
  } as unknown as ProjectDetail;
};
export const toSnapshotSummary = ({ previewKey, ...row }: SnapshotRow) =>
  ({ ...row, previewUrl: assetUrl(previewKey) }) as unknown as SnapshotSummary;

/** DTO class instances -> plain JSON for Prisma. */
export const json = (value: object) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;

/** Optional JSON column: `null` must be written as `Prisma.DbNull`. */
export const nullableJson = (value: unknown) =>
  value === null || value === undefined ? Prisma.DbNull : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
