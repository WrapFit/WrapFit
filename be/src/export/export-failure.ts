import type { ExportStatus } from '@prisma/client';
import { syncProjectFileRefs } from '../projects';
import type { PrismaService } from '../shared/prisma';
import { UNFINISHED_EXPORT } from './export.constants';

/**
 * Marks an export FAILED when it is still in one of `from`, and recomputes the file refs of its project in the same
 * transaction: the files only its frozen design kept alive (docs/30 item 1) are released at once, not at a next save
 * that may never come. Every path to FAILED goes through here: the worker's last attempt, a refused queue, and
 * ExportReconcileTask. Returns whether the row changed.
 */
export function failExport(
  prisma: PrismaService,
  exportJobId: string,
  errorLog: string,
  from: ExportStatus[] = UNFINISHED_EXPORT.in,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const [job] = await tx.exportJob.updateManyAndReturn({
      where: { id: exportJobId, status: { in: from } },
      data: { status: 'FAILED', errorLog: errorLog.slice(0, 2000) },
      select: { projectId: true },
    });
    if (!job) return false;
    await syncProjectFileRefs(tx, job.projectId);
    return true;
  });
}
