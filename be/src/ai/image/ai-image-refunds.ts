import { Injectable, Logger } from '@nestjs/common';
import { XuWalletService } from '../../billing';
import { PrismaService } from '../../shared/prisma';
import { UNFINISHED_AI_IMAGE } from './ai-image.constants';

/**
 * Fails an AI image job and gives its xu back (docs/19 D3), from the API (queue down), the worker (last attempt,
 * refusal by the provider) and AiImageReconcileTask (worker lost). Both happen in one transaction, so a job is FAILED
 * exactly when its xu came back, and only once: a finished job is left alone.
 */
@Injectable()
export class AiImageRefunds {
  private readonly logger = new Logger(AiImageRefunds.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xuWallet: XuWalletService,
  ) {}

  /** Returns the xu given back; 0 when the job had already finished. */
  async fail(jobId: string, errorLog: string): Promise<number> {
    const refunded = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.aiImageJob.updateMany({
        where: { id: jobId, status: UNFINISHED_AI_IMAGE },
        data: { status: 'FAILED', errorLog: errorLog.slice(0, 2000) },
      });
      if (!count) return 0;
      const { debitOperationId } = await tx.aiImageJob.findUniqueOrThrow({
        where: { id: jobId },
        select: { debitOperationId: true },
      });
      return this.xuWallet.refund(debitOperationId, tx);
    });
    if (refunded) this.logger.log(`ai-image.refunded job=${jobId} xu=${refunded}`);
    return refunded;
  }
}
