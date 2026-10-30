import type { ConfigService } from '../common';
import type { PrismaService } from '../shared/prisma';
import { AiCostGuard, vietnamMonthStart } from './ai-cost.guard';

describe('vietnamMonthStart', () => {
  it('starts the month at midnight Vietnam time (17:00 UTC the day before)', () => {
    expect(vietnamMonthStart(new Date('2026-11-15T08:00:00Z')).toISOString()).toBe('2026-10-31T17:00:00.000Z');
    // 2026-10-31 18:00 UTC is already 1 November in Vietnam.
    expect(vietnamMonthStart(new Date('2026-10-31T18:00:00Z')).toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(vietnamMonthStart(new Date('2026-10-31T16:59:00Z')).toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(vietnamMonthStart(new Date('2027-01-01T00:00:00Z')).toISOString()).toBe('2026-12-31T17:00:00.000Z');
  });
});

describe('AiCostGuard', () => {
  let groupBy: jest.Mock;
  const now = new Date('2026-11-10T03:00:00Z');
  const guard = (budget: number | null) => {
    const g = new AiCostGuard(
      { aiGeneration: { groupBy } } as unknown as PrismaService,
      { get: () => budget } as unknown as ConfigService,
    );
    jest.spyOn(g['logger'], 'error').mockImplementation(() => undefined);
    return g;
  };
  // $1.00 of Opus 5.5 output and $0.05 of Haiku 5.5 input.
  const rows = [
    { model: 'claude-opus-5-5', _sum: { inputTokens: 0, outputTokens: 50_000 } },
    { model: 'claude-haiku-5-5', _sum: { inputTokens: 500_000, outputTokens: 0 } },
  ];

  beforeEach(() => {
    groupBy = jest.fn().mockResolvedValue(rows);
  });

  it('never limits nor queries without a budget', async () => {
    expect(await guard(null).budgetReached(now)).toBe(false);
    expect(groupBy).not.toHaveBeenCalled();
  });

  it('sums the estimated cost of this Vietnam month and compares it to the budget', async () => {
    expect(await guard(2).budgetReached(now)).toBe(false);
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: { gte: new Date('2026-10-31T17:00:00Z') } } }),
    );
    expect(await guard(1.05).budgetReached(now)).toBe(true);
  });

  it('logs an error when the budget is reached', async () => {
    const g = guard(1);
    await g.budgetReached(now);
    expect(g['logger'].error).toHaveBeenCalledWith(expect.stringMatching(/budget reached: ~\$1\.05 of \$1/));
  });

  it('caches the sum for 5 minutes and adds the generations recorded meanwhile', async () => {
    const g = guard(1.06);
    expect(await g.budgetReached(now)).toBe(false);
    await g.record('claude-opus-5-5', 0, 1_000, now); // +$0.02
    expect(await g.budgetReached(new Date(now.getTime() + 60_000))).toBe(true);
    expect(groupBy).toHaveBeenCalledTimes(1);

    groupBy.mockResolvedValue([]);
    expect(await g.budgetReached(new Date(now.getTime() + 5 * 60_000 + 1))).toBe(false);
    expect(groupBy).toHaveBeenCalledTimes(2);
  });

  it('starts over when the month changes', async () => {
    const g = guard(1);
    expect(await g.budgetReached(now)).toBe(true);
    groupBy.mockResolvedValue([]);
    expect(await g.budgetReached(new Date('2026-11-30T17:00:00Z'))).toBe(false);
  });

  it('runs one query for concurrent requests and retries after a failed one', async () => {
    const g = guard(5);
    await Promise.all([g.budgetReached(now), g.budgetReached(now)]);
    expect(groupBy).toHaveBeenCalledTimes(1);

    const h = guard(5);
    groupBy.mockRejectedValueOnce(new Error('db down'));
    await expect(h.budgetReached(now)).rejects.toThrow('db down');
    expect(await h.budgetReached(now)).toBe(false);
  });
});
