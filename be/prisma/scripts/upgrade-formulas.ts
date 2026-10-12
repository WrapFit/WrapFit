// Moves every project that was never exported for print to the current dieline formulas of its box structure
// (docs/12 Phase 8, 8.10a). Exported projects keep their formulas: someone may hold their print files; their owners
// upgrade from the studio (POST /projects/:id/formula-upgrade), with undo.
//
//   npm --workspace=be run db:upgrade-formulas -- [--dry-run] [--project=<id>]
//
// Run it by hand once after a new formula version is released (after `db:seed` gave it to the box templates), never
// at container start. Each project gets, in one transaction, an automatic snapshot that keeps its old formula version
// (restoring it undoes the upgrade), its new version, a new FitCheck and `version + 1` (open editors reload). Running
// it again changes nothing. Trashed projects are upgraded too; projects saved during the run are skipped.
import { Prisma, PrismaClient } from '@prisma/client';
import {
  type BoxDimensions,
  type CanvasElement,
  checkBox,
  type FitCheckReport,
  generateDielinePieces,
  UnsupportedStructureError,
} from '@wrapfit/shared';

/** FitCheck score a design needs to stay in the community template hub (MIN_COMMUNITY_FITCHECK_SCORE of the API). */
const COMMUNITY_SCORE = 90;

export interface UpgradeCandidate {
  formulaVersion: number;
  /** Current formulas of the box structure (box_templates.formula_version). */
  latestFormulaVersion: number;
  hasCompletedExport: boolean;
}

/** A project moves when its structure has newer formulas and no print file of it was ever produced. */
export function needsUpgrade(project: UpgradeCandidate): boolean {
  return project.formulaVersion < project.latestFormulaVersion && !project.hasCompletedExport;
}

/** Same name as `formulaUpgradeSnapshotName` of the API (src/projects/domain/project.types.ts). */
export function upgradeSnapshotName(from: number, to: number): string {
  return `Trước khi cập nhật công thức (bản ${from} → ${to})`;
}

/** FitCheck with the given formulas, null for a structure without a dieline generator (like the API). */
export function fitCheckWith(
  structure: string,
  dimensions: BoxDimensions,
  elements: CanvasElement[],
  formulaVersion: number,
): FitCheckReport | null {
  try {
    return checkBox(generateDielinePieces(structure, dimensions, formulaVersion), elements);
  } catch (error) {
    if (error instanceof UnsupportedStructureError) return null;
    throw error;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  // One project only (support, tests).
  const only = process.argv.find((arg) => arg.startsWith('--project='))?.slice('--project='.length);
  const prisma = new PrismaClient();
  try {
    const templates = new Map(
      (await prisma.boxTemplate.findMany({ select: { id: true, formulaVersion: true } })).map((t) => [t.id, t.formulaVersion]),
    );
    const projects = await prisma.packagingProject.findMany({
      where: only ? { id: only } : undefined,
      select: {
        id: true,
        title: true,
        status: true,
        visibility: true,
        templateId: true,
        formulaVersion: true,
        version: true,
        dimensions: true,
        canvasState: true,
        thumbnailKey: true,
        fitcheckScore: true,
        exportJobs: { where: { status: 'COMPLETED' }, select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });

    const rows: string[][] = [];
    let upgraded = 0;
    let keptExported = 0;
    for (const project of projects) {
      const latest = templates.get(project.templateId) ?? project.formulaVersion;
      const candidate = {
        formulaVersion: project.formulaVersion,
        latestFormulaVersion: latest,
        hasCompletedExport: project.exportJobs.length > 0,
      };
      if (!needsUpgrade(candidate)) {
        if (candidate.formulaVersion < latest) keptExported++;
        continue;
      }
      const canvas = project.canvasState as unknown as { elements?: CanvasElement[] };
      const fitCheck = fitCheckWith(
        project.templateId,
        project.dimensions as unknown as BoxDimensions,
        canvas.elements ?? [],
        latest,
      );
      const after = fitCheck?.score ?? null;
      const warning = project.visibility === 'PUBLIC' && after !== null && after < COMMUNITY_SCORE ? '⚠ rớt khỏi thư viện cộng đồng' : '';

      let note = dryRun ? 'chưa ghi (--dry-run)' : 'đã cập nhật';
      if (!dryRun) {
        const done = await prisma.$transaction(async (tx) => {
          const { count } = await tx.packagingProject.updateMany({
            where: { id: project.id, version: project.version },
            data: {
              formulaVersion: latest,
              fitcheckState: fitCheck ? (JSON.parse(JSON.stringify(fitCheck)) as Prisma.InputJsonObject) : Prisma.DbNull,
              fitcheckScore: after,
              version: { increment: 1 },
            },
          });
          if (count === 0) return false;
          await tx.projectSnapshot.create({
            data: {
              projectId: project.id,
              name: upgradeSnapshotName(project.formulaVersion, latest),
              canvasState: project.canvasState as object,
              dimensions: project.dimensions as object,
              previewKey: project.thumbnailKey,
              formulaVersion: project.formulaVersion,
              isAutomatic: true,
            },
          });
          return true;
        });
        if (done) upgraded++;
        else note = 'bỏ qua: dự án vừa được lưu, chạy lại script';
      }
      rows.push([
        project.title.slice(0, 40),
        project.id,
        project.status,
        `${project.formulaVersion} → ${latest}`,
        `${project.fitcheckScore ?? '—'} → ${after ?? '—'}`,
        [note, warning].filter(Boolean).join(' · '),
      ]);
    }

    console.log(`| Dự án | id | Trạng thái | Công thức | FitCheck | Ghi chú |\n|---|---|---|---|---|---|`);
    for (const row of rows) console.log(`| ${row.join(' | ')} |`);
    console.log(
      `\n${projects.length} dự án; ${rows.length} cần cập nhật` +
        (dryRun ? ' (--dry-run: chưa ghi gì)' : `, ${upgraded} đã cập nhật`) +
        `; ${keptExported} dự án đã xuất file in giữ công thức cũ.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
