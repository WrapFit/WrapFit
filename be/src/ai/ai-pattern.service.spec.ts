import { XU_PATTERN_COST } from '@wrapfit/shared';
import { insufficientCredits, type XuWalletService } from '../billing';
import type { PrismaService } from '../shared/prisma';
import type { AiCostGuard } from './ai-cost.guard';
import { AiPatternService } from './ai-pattern.service';
import type { PatternGenerator } from './pattern/pattern.types';
import { ProceduralPatternGenerator } from './pattern/procedural-pattern.generator';

describe('AiPatternService', () => {
  const aiDesign = new ProceduralPatternGenerator().design({
    theme: 'valentine',
    preferredColors: [],
  });
  let tx: { $queryRaw: jest.Mock; aiGeneration: { create: jest.Mock; findFirst: jest.Mock } };
  let prisma: { $transaction: jest.Mock; $queryRaw: jest.Mock };
  let ai: { generate: jest.Mock };
  let costGuard: { budgetReached: jest.Mock; record: jest.Mock };
  let xuWallet: { spend: jest.Mock; refund: jest.Mock; wallet: jest.Mock };

  beforeEach(() => {
    // The debit rows locked by recordGeneration / refundOrphanedDebits: not refunded.
    tx = { $queryRaw: jest.fn().mockResolvedValue([{ refunded_at: null }]), aiGeneration: { create: jest.fn(), findFirst: jest.fn() } };
    prisma = {
      $transaction: jest.fn((run: (db: typeof tx) => unknown) => run(tx)),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    costGuard = {
      budgetReached: jest.fn().mockResolvedValue(false),
      record: jest.fn().mockResolvedValue(undefined),
    };
    xuWallet = {
      spend: jest.fn().mockResolvedValue({ operationId: 'op-1', balance: 49 }),
      refund: jest.fn().mockResolvedValue(1),
      wallet: jest.fn().mockResolvedValue({
        balance: 50,
        lots: [],
        allowance: {
          perPeriod: 50,
          periodKey: 'FREE:2026-10',
          resetsAt: new Date('2026-10-31T17:00:00Z'),
        },
      }),
    };
    ai = {
      generate: jest.fn().mockResolvedValue({
        design: aiDesign,
        usage: {
          model: 'claude-haiku-5-5',
          inputTokens: 900,
          outputTokens: 400,
        },
      }),
    };
  });
  const service = (generator: PatternGenerator | null) =>
    new AiPatternService(
      prisma as unknown as PrismaService,
      costGuard as unknown as AiCostGuard,
      xuWallet as unknown as XuWalletService,
      generator,
    );

  it('uses the procedural generator when no AI is configured, without spending xu', async () => {
    const result = await service(null).generate('u-1', {
      theme: 'Tết hoa đào',
    });
    expect(result).toMatchObject({
      source: 'procedural',
      themeName: 'Xuân Lộc Đỏ Son',
      usage: null,
    });
    expect(result.tile.svg).toMatch(/^<svg /);
    expect(xuWallet.spend).not.toHaveBeenCalled();
    expect(tx.aiGeneration.create).not.toHaveBeenCalled();
  });

  it('spends the xu of the quality before the call and records the generation with its debit', async () => {
    const result = await service(ai).generate('u-1', {
      theme: 'valentine',
      preferredColors: ['#E11D48'],
    });
    expect(result).toMatchObject({
      source: 'ai',
      usage: { charged: XU_PATTERN_COST.fast, balance: 49 },
    });
    expect(xuWallet.spend).toHaveBeenCalledWith('u-1', { quantity: XU_PATTERN_COST.fast, reason: 'AI_PATTERN' }, tx);
    expect(xuWallet.spend.mock.invocationCallOrder[0]).toBeLessThan(ai.generate.mock.invocationCallOrder[0]);
    expect(ai.generate).toHaveBeenCalledWith({
      theme: 'valentine',
      preferredColors: ['#E11D48'],
      quality: 'fast',
    });
    expect(tx.aiGeneration.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        theme: 'valentine',
        model: 'claude-haiku-5-5',
        inputTokens: 900,
        outputTokens: 400,
        credits: XU_PATTERN_COST.fast,
        debitOperationId: 'op-1',
      },
    });
    expect(costGuard.record).toHaveBeenCalledWith('claude-haiku-5-5', 900, 400);
  });

  it('charges premium quality its own price on any plan', async () => {
    xuWallet.spend.mockResolvedValueOnce({ operationId: 'op-2', balance: 935 });
    const result = await service(ai).generate('u-1', {
      theme: 'Tết',
      quality: 'premium',
    });
    expect(xuWallet.spend.mock.calls[0][1]).toEqual({
      quantity: XU_PATTERN_COST.premium,
      reason: 'AI_PATTERN',
    });
    expect(ai.generate).toHaveBeenCalledWith(expect.objectContaining({ quality: 'premium' }));
    expect(result.usage).toEqual({
      charged: XU_PATTERN_COST.premium,
      balance: 935,
    });
  });

  it('refunds the xu and falls back to the procedural pattern when the AI fails', async () => {
    ai.generate.mockRejectedValueOnce(new Error('timeout'));
    const svc = service(ai);
    jest.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);

    const result = await svc.generate('u-1', { theme: 'Tết' });
    expect(result).toMatchObject({
      source: 'procedural',
      usage: { charged: 0, balance: 50 },
    });
    expect(xuWallet.refund).toHaveBeenCalledWith('op-1');
    expect(tx.aiGeneration.create).not.toHaveBeenCalled();
    expect(costGuard.record).not.toHaveBeenCalled();
  });

  it('refunds once and falls back when storing the generation fails after the call', async () => {
    tx.aiGeneration.create.mockRejectedValueOnce(new Error('connection lost'));
    const svc = service(ai);
    jest.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);

    const result = await svc.generate('u-1', { theme: 'Tết' });
    expect(result).toMatchObject({ source: 'procedural', usage: { charged: 0, balance: 50 } });
    expect(xuWallet.refund).toHaveBeenCalledTimes(1);
    expect(xuWallet.refund).toHaveBeenCalledWith('op-1');
    expect(costGuard.record).not.toHaveBeenCalled();
  });

  it('still answers when the refund fails too, leaving the debit to the reconcile task', async () => {
    ai.generate.mockRejectedValueOnce(new Error('timeout'));
    xuWallet.refund.mockRejectedValueOnce(new Error('database down'));
    const svc = service(ai);
    jest.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(svc['logger'], 'error').mockImplementation(() => undefined);

    const result = await svc.generate('u-1', { theme: 'Tết' });
    expect(result).toMatchObject({ source: 'procedural', usage: { charged: 0, balance: 49 } });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('op=op-1'));
  });

  it('locks the debit before storing the generation, and keeps the pattern free when the reconcile refunded it first', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ refunded_at: new Date() }]);
    const result = await service(ai).generate('u-1', { theme: 'Tết' });
    expect(result).toMatchObject({ source: 'ai', usage: { charged: 0, balance: 50 } });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.aiGeneration.create.mock.invocationCallOrder[0]);
    expect(tx.aiGeneration.create).toHaveBeenCalledWith({ data: expect.objectContaining({ credits: 0, debitOperationId: 'op-1' }) });
    expect(xuWallet.refund).not.toHaveBeenCalled();
  });

  describe('refundOrphanedDebits', () => {
    const now = new Date('2026-11-16T10:00:00Z');

    it('looks for AI_PATTERN debits older than 10 minutes without a generation row', async () => {
      await service(ai).refundOrphanedDebits(now);
      const [strings, since, cutoff] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray, string, string];
      const sql = strings.join('?');
      expect(sql).toContain("d.reason = 'AI_PATTERN' AND d.refunded_at IS NULL");
      expect(sql).toContain('NOT EXISTS (SELECT 1 FROM ai_generations g WHERE g.debit_operation_id = d.operation_id)');
      expect(cutoff).toBe('2026-11-16T09:50:00.000Z');
      expect(since).toBe('2026-11-09T10:00:00.000Z');
    });

    it('refunds an orphan under the debit lock, and skips one whose generation was stored meanwhile', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ operation_id: 'op-orphan' }, { operation_id: 'op-done' }]);
      tx.aiGeneration.findFirst.mockImplementation(async ({ where }: { where: { debitOperationId: string } }) =>
        where.debitOperationId === 'op-done' ? { id: 'gen-1' } : null,
      );
      const svc = service(ai);
      jest.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);

      expect(await svc.refundOrphanedDebits(now)).toBe(1);
      expect(xuWallet.refund).toHaveBeenCalledTimes(1);
      expect(xuWallet.refund).toHaveBeenCalledWith('op-orphan', tx);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.aiGeneration.findFirst.mock.invocationCallOrder[0]);
    });

    it('counts nothing when the debit was already refunded (CreditsService.refund returns 0)', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ operation_id: 'op-orphan' }]);
      tx.aiGeneration.findFirst.mockResolvedValue(null);
      xuWallet.refund.mockResolvedValueOnce(0);
      expect(await service(ai).refundOrphanedDebits(now)).toBe(0);
    });
  });

  it('answers 402 without calling the AI when the wallet is short', async () => {
    xuWallet.spend.mockRejectedValueOnce(insufficientCredits(0, 'XU', XU_PATTERN_COST.premium));
    const error = await service(ai)
      .generate('u-1', { theme: 'Tết', quality: 'premium' })
      .catch((e) => e);
    expect(error.getStatus()).toBe(402);
    expect(error.getResponse()).toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
      kind: 'XU',
      cost: 65,
    });
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('uses the procedural generator without spending once the monthly budget is spent', async () => {
    costGuard.budgetReached.mockResolvedValue(true);
    const result = await service(ai).generate('u-1', { theme: 'Tết' });
    expect(result).toMatchObject({ source: 'procedural', usage: null });
    expect(xuWallet.spend).not.toHaveBeenCalled();
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('reports prices, the wallet and the budget, and never checks the budget when AI is off', async () => {
    costGuard.budgetReached.mockResolvedValue(true);
    expect(await service(ai).usage('u-1')).toEqual({
      aiEnabled: true,
      budgetReached: true,
      patternCost: { fast: 1, premium: 65 },
      xu: {
        balance: 50,
        allowance: {
          perPeriod: 50,
          periodKey: 'FREE:2026-10',
          resetsAt: new Date('2026-10-31T17:00:00Z'),
        },
      },
    });
    expect(await service(null).usage('u-1')).toMatchObject({
      aiEnabled: false,
      budgetReached: false,
    });
    expect(costGuard.budgetReached).toHaveBeenCalledTimes(1);
  });
});
