import { HttpStatus } from '@nestjs/common';
import type { PrismaService } from '../shared/prisma';
import { CreditsService } from './credits.service';

// The row locking itself needs PostgreSQL: see test/e2e/billing.e2e-spec.ts (two debits racing for one credit).
describe('CreditsService', () => {
  let tx: { $queryRaw: jest.Mock; creditLot: { update: jest.Mock }; creditDebit: { createMany: jest.Mock } };
  let service: CreditsService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      creditLot: { update: jest.fn() },
      creditDebit: { createMany: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((run: (db: typeof tx) => unknown) => run(tx)) };
    service = new CreditsService(prisma as unknown as PrismaService);
  });

  it('refuses a debit larger than the balance with 402 and writes nothing', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'lot-1', remaining: 1 }]);
    const error = await service.debit('user-1', { quantity: 2, reason: 'EXPORT_UNLOCK' }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: HttpStatus.PAYMENT_REQUIRED, response: { code: 'INSUFFICIENT_CREDITS', balance: 1 } });
    expect(tx.creditLot.update).not.toHaveBeenCalled();
    expect(tx.creditDebit.createMany).not.toHaveBeenCalled();
  });

  it('spends only from the ledger of its kind and says which one is short', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'xu-lot', remaining: 5 }]);
    const error = await service
      .debit('user-1', { kind: 'XU', quantity: 30, reason: 'AI_IMAGE' })
      .catch((e: unknown) => e);

    const [, ...values] = tx.$queryRaw.mock.calls[0];
    expect(values).toContain('XU');
    expect(error).toMatchObject({ status: 402, response: { code: 'INSUFFICIENT_CREDITS', kind: 'XU', balance: 5, cost: 30 } });
  });

  it('refuses a debit when no lot is left', async () => {
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.debit('user-1', { reason: 'EXPORT_UNLOCK' })).rejects.toMatchObject({ status: 402 });
  });

  it('spends the lots in the order the query returns them (expiring first) and shares one operation id', async () => {
    tx.$queryRaw.mockResolvedValueOnce([
      { id: 'lot-soon', remaining: 1 },
      { id: 'lot-later', remaining: 5 },
    ]);
    const result = await service.debit('user-1', { quantity: 3, reason: 'EXPORT_UNLOCK', refId: 'unlock-1' });

    expect(result.balance).toBe(3);
    expect(tx.creditLot.update.mock.calls.map(([arg]) => [arg.where.id, arg.data.remaining.decrement])).toEqual([
      ['lot-soon', 1],
      ['lot-later', 2],
    ]);
    const [{ data }] = tx.creditDebit.createMany.mock.calls[0];
    expect(data).toEqual([
      expect.objectContaining({ lotId: 'lot-soon', quantity: 1, operationId: result.operationId, refId: 'unlock-1' }),
      expect.objectContaining({ lotId: 'lot-later', quantity: 2, operationId: result.operationId }),
    ]);
  });

  it('runs inside the transaction of the caller when one is given', async () => {
    const callerTx = { ...tx, $queryRaw: jest.fn().mockResolvedValue([{ id: 'lot-1', remaining: 1 }]) };
    await service.debit('user-1', { reason: 'EXPORT_UNLOCK', operationId: 'op-1' }, callerTx as never);
    expect(callerTx.$queryRaw).toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('refunds an operation once', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ lot_id: 'lot-1', quantity: 1 }]).mockResolvedValueOnce([]);
    await expect(service.refund('op-1')).resolves.toBe(1);
    await expect(service.refund('op-1')).resolves.toBe(0);
    expect(tx.creditLot.update).toHaveBeenCalledTimes(1);
    expect(tx.creditLot.update).toHaveBeenCalledWith({ where: { id: 'lot-1' }, data: { remaining: { increment: 1 } } });
  });
});
