import type { CreditsService } from '../billing';
import type { PrismaService } from '../shared/prisma';
import { ExportCreditRefunds } from './export-credits';

describe('ExportCreditRefunds (docs/16 §5.3)', () => {
  const unlock = { id: 'unlock-1', debitOperationId: 'op-1', refundedAt: null as Date | null };
  let prisma: {
    exportJob: { findUnique: jest.Mock; count: jest.Mock };
    exportUnlock: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let credits: { refund: jest.Mock };
  let refunds: ExportCreditRefunds;

  beforeEach(() => {
    prisma = {
      exportJob: { findUnique: jest.fn().mockResolvedValue({ status: 'FAILED', unlock }), count: jest.fn().mockResolvedValue(0) },
      exportUnlock: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    credits = { refund: jest.fn().mockResolvedValue(1) };
    refunds = new ExportCreditRefunds(prisma as unknown as PrismaService, credits as unknown as CreditsService);
    jest.spyOn(refunds['logger'], 'log').mockImplementation(() => undefined);
  });

  it('refunds the debit of an unlock nothing was delivered with, and marks the unlock refunded', async () => {
    await expect(refunds.refundFailed('job-1')).resolves.toBe(1);
    expect(prisma.exportJob.count).toHaveBeenCalledWith({
      where: { unlockId: 'unlock-1', status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] } },
    });
    expect(prisma.exportUnlock.updateMany).toHaveBeenCalledWith({
      where: { id: 'unlock-1', refundedAt: null },
      data: { refundedAt: expect.any(Date) },
    });
    expect(credits.refund).toHaveBeenCalledWith('op-1', prisma);
  });

  it('keeps the credit when another job of the unlock completed or may still complete', async () => {
    prisma.exportJob.count.mockResolvedValue(1);
    await expect(refunds.refundFailed('job-1')).resolves.toBe(0);
    expect(credits.refund).not.toHaveBeenCalled();
  });

  it('does nothing for a job that paid nothing, is not FAILED, or whose unlock was already refunded', async () => {
    prisma.exportJob.findUnique.mockResolvedValueOnce({ status: 'FAILED', unlock: null });
    prisma.exportJob.findUnique.mockResolvedValueOnce({ status: 'COMPLETED', unlock });
    prisma.exportJob.findUnique.mockResolvedValueOnce({ status: 'FAILED', unlock: { ...unlock, refundedAt: new Date() } });
    for (let i = 0; i < 3; i++) await expect(refunds.refundFailed('job-1')).resolves.toBe(0);
    // A concurrent refund marked the unlock first.
    prisma.exportUnlock.updateMany.mockResolvedValue({ count: 0 });
    await expect(refunds.refundFailed('job-1')).resolves.toBe(0);
    expect(credits.refund).not.toHaveBeenCalled();
  });
});
