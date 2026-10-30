import { Injectable, Logger } from '@nestjs/common';
import { CreditsService } from '../billing';
import { PrismaService } from '../shared/prisma';

/**
 * Gives back the export credit of a failed job (docs/16 §5.3), from the worker (last attempt) and from
 * ExportReconcileTask (worker lost). Only when no other job of the same unlock completed or may still complete, and
 * only once: the unlock is marked refunded in the same transaction, so a later export of that version pays again.
 */
@Injectable()
export class ExportCreditRefunds {
  private readonly logger = new Logger(ExportCreditRefunds.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  /** Returns the number of credits given back (0 when the job paid nothing or its unlock was used). */
  async refundFailed(exportJobId: string): Promise<number> {
    const refunded = await this.prisma.$transaction(async (tx) => {
      const job = await tx.exportJob.findUnique({
        where: { id: exportJobId },
        select: { status: true, unlock: { select: { id: true, debitOperationId: true, refundedAt: true } } },
      });
      if (job?.status !== 'FAILED' || !job.unlock || job.unlock.refundedAt) return 0;
      const used = await tx.exportJob.count({
        where: { unlockId: job.unlock.id, status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] } },
      });
      if (used > 0) return 0;
      // A concurrent refund of the same unlock matches nothing here once this one committed.
      const { count } = await tx.exportUnlock.updateMany({
        where: { id: job.unlock.id, refundedAt: null },
        data: { refundedAt: new Date() },
      });
      return count ? this.credits.refund(job.unlock.debitOperationId, tx) : 0;
    });
    if (refunded) this.logger.log(`Refunded ${refunded} export credit(s) of failed export ${exportJobId}`);
    return refunded;
  }
}
