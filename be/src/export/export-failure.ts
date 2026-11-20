import type { ExportStatus } from '@prisma/client';
import { lockProjectForRefs, syncProjectFileRefs } from '../projects';
import type { PrismaService } from '../shared/prisma';
import { UNFINISHED_EXPORT } from './export.constants';

/**
 * Marks an export FAILED when it is still in one of `from`, and recomputes the file refs of its project in the same
 * transaction: the files only its frozen design kept alive (docs-old/30 item 1) are released at once, not at a next save
 * that may never come. Every path to FAILED goes through here: the worker's last attempt, a refused queue, and
 * ExportReconcileTask. Returns whether the row changed.
 */
export async function failExport(
  prisma: PrismaService,
  exportJobId: string,
  errorLog: string,
  from: ExportStatus[] = UNFINISHED_EXPORT.in,
): Promise<boolean> {
  const job = await prisma.exportJob.findUnique({ where: { id: exportJobId }, select: { projectId: true } });
  if (!job) return false;
  return prisma.$transaction(async (tx) => {
    // The project row before the job row, as the completion of a job does: two failures of one project then
    // recompute its refs one after the other (project-file-refs.ts).
    await lockProjectForRefs(tx, job.projectId);
    const { count } = await tx.exportJob.updateMany({
      where: { id: exportJobId, status: { in: from } },
      data: { status: 'FAILED', errorLog: errorLog.slice(0, 2000) },
    });
    if (!count) return false;
    await syncProjectFileRefs(tx, job.projectId);
    return true;
  });
}
