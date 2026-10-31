import type { PrismaService } from '../shared/prisma';
import type { CreditsService } from './credits.service';
import type { PlanService } from './plan.service';
import { XuWalletService } from './xu-wallet.service';

// Granting once per period under concurrency relies on the unique index: see test/e2e/billing.e2e-spec.ts.
describe('XuWalletService', () => {
  const now = new Date('2026-11-05T03:00:00Z');
  let db: {
    subscription: { findFirst: jest.Mock };
    creditLot: { createMany: jest.Mock; findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let credits: { debit: jest.Mock; refund: jest.Mock; lots: jest.Mock };
  let plans: { sync: jest.Mock };
  let wallet: XuWalletService;

  beforeEach(() => {
    db = {
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
      creditLot: { createMany: jest.fn().mockResolvedValue({ count: 1 }), findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    credits = {
      debit: jest.fn().mockResolvedValue({ operationId: 'op-1', balance: 40 }),
      refund: jest.fn().mockResolvedValue(10),
      lots: jest.fn().mockResolvedValue([]),
    };
    plans = { sync: jest.fn().mockResolvedValue('FREE') };
    wallet = new XuWalletService(
      db as unknown as PrismaService,
      credits as unknown as CreditsService,
      plans as unknown as PlanService,
    );
  });

  it('grants the allowance of the current period without failing when it exists already', async () => {
    const period = await wallet.ensureAllowance('user-1', db as never, now);

    expect(plans.sync).toHaveBeenCalledWith('user-1', db, now);
    expect(period.periodKey).toBe('FREE:2026-11');
    expect(db.creditLot.createMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        kind: 'XU',
        source: 'PLAN_ALLOWANCE',
        quantity: 50,
        remaining: 50,
        periodKey: 'FREE:2026-11',
        expiresAt: new Date('2026-12-31T17:00:00Z'),
      }),
      skipDuplicates: true,
    });
  });

  it('uses the period of the live subscription of a paid plan', async () => {
    plans.sync.mockResolvedValue('STARTER');
    db.subscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      currentPeriodStart: new Date('2026-11-01T00:00:00Z'),
      currentPeriodEnd: new Date('2026-12-01T00:00:00Z'),
    });
    const period = await wallet.ensureAllowance('user-1', db as never, now);
    expect(period).toMatchObject({ periodKey: 'sub:sub-1:0', quantity: 1_000 });
  });

  it('grants the allowance before spending from the XU ledger in the transaction of the caller', async () => {
    const tx = db as never;
    const result = await wallet.spend('user-1', { quantity: 10, reason: 'AI_IMAGE', refId: 'job-1' }, tx);

    expect(result).toEqual({ operationId: 'op-1', balance: 40 });
    expect(db.creditLot.createMany).toHaveBeenCalled();
    expect(credits.debit).toHaveBeenCalledWith('user-1', { kind: 'XU', quantity: 10, reason: 'AI_IMAGE', refId: 'job-1' }, tx);
    expect(db.creditLot.createMany.mock.invocationCallOrder[0]).toBeLessThan(credits.debit.mock.invocationCallOrder[0]);
  });

  it('sums the lots of the XU ledger for the wallet', async () => {
    credits.lots.mockResolvedValue([{ remaining: 30 }, { remaining: 500 }]);
    const view = await wallet.wallet('user-1', now);

    expect(credits.lots).toHaveBeenCalledWith('user-1', db, { kind: 'XU', now });
    expect(view).toMatchObject({
      balance: 530,
      allowance: { perPeriod: 50, periodKey: 'FREE:2026-11', resetsAt: new Date('2026-11-30T17:00:00Z') },
    });
  });

  it('merges grants and spends newest first and continues when a page is full', async () => {
    db.creditLot.findMany.mockResolvedValue([
      { id: 'lot-1', source: 'PLAN_ALLOWANCE', quantity: 50, expiresAt: null, createdAt: new Date('2026-11-01Z') },
    ]);
    db.$queryRaw.mockResolvedValue([
      {
        id: 'op-1',
        reason: 'AI_IMAGE',
        ref_id: 'job-1',
        refunded_at: null,
        created_at: new Date('2026-11-03Z'),
        quantity: 10,
      },
    ]);

    const page = await wallet.history('user-1', { limit: 1 });
    expect(page.entries).toEqual([expect.objectContaining({ type: 'SPEND', id: 'op-1', quantity: -10 })]);
    expect(page.nextBefore).toBe('2026-11-03T00:00:00.000Z');

    const all = await wallet.history('user-1', { limit: 5 });
    expect(all.entries.map((entry) => entry.id)).toEqual(['op-1', 'lot-1']);
    expect(all.nextBefore).toBeNull();
  });
});
