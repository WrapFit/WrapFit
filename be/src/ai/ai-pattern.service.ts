import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { XU_PATTERN_COST } from '@wrapfit/shared';
import { XuWalletService } from '../billing';
import { PrismaService } from '../shared/prisma';
import { AiCostGuard } from './ai-cost.guard';
import { GeneratePatternDto } from './dto/generate-pattern.dto';
import { renderPatternSvg } from './pattern/pattern-svg';
import type { GeneratedPattern, PatternGenerator } from './pattern/pattern.types';
import { ProceduralPatternGenerator } from './pattern/procedural-pattern.generator';

/** The AI generator, or null when ANTHROPIC_API_KEY is empty. */
export const AI_PATTERN_GENERATOR = Symbol('AI_PATTERN_GENERATOR');

export type PatternSource = 'ai' | 'procedural';

/** An AI_PATTERN debit still without its ai_generations row after this long lost its request: it is refunded. */
export const ORPHANED_PATTERN_DEBIT_AFTER_MS = 10 * 60 * 1000;
/**
 * How far back the refund of orphaned debits looks, which bounds its scan of credit_debits (index reason, created_at).
 * A debit is checked every 5 minutes from its 10th minute on, so only a reconcile stopped for a week misses one.
 */
const ORPHANED_PATTERN_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const ORPHAN_BATCH = 100;

/**
 * Pattern & palette generator (IT3-09), paid with xu (docs/16 S3, flow of docs/14 §4.3). Uses Claude when configured
 * and the monthly cost fuse of WrapFit (AiCostGuard) is not blown; each AI call costs XU_PATTERN_COST[quality] xu,
 * debited before the call and refunded when it fails. The built-in procedural generator (free, unlimited) answers
 * when AI is off, the budget is spent or the call fails, so the user always gets a pattern.
 *
 * A generation is paid for once its ai_generations row holds the debit's operation id. A debit left without that row
 * (the process died after the debit, or the refund of a failed call failed too) is refunded by `refundOrphanedDebits`,
 * which AiImageReconcileTask runs every 5 minutes.
 */
@Injectable()
export class AiPatternService {
  private readonly logger = new Logger(AiPatternService.name);
  private readonly procedural = new ProceduralPatternGenerator();

  constructor(
    private readonly prisma: PrismaService,
    private readonly costGuard: AiCostGuard,
    private readonly xuWallet: XuWalletService,
    @Inject(AI_PATTERN_GENERATOR) private readonly ai: PatternGenerator | null,
  ) {}

  async generate(userId: string, dto: GeneratePatternDto) {
    const quality = dto.quality ?? 'fast';
    const request = {
      theme: dto.theme,
      preferredColors: dto.preferredColors ?? [],
      quality,
    };
    const cost = XU_PATTERN_COST[quality];

    let source: PatternSource = 'procedural';
    let result: GeneratedPattern | undefined;
    let charged = 0;
    let balance: number | null = null;
    // AI off or budget spent: procedural for everyone, without spending xu.
    if (this.ai && !(await this.costGuard.budgetReached())) {
      // Not enough xu: 402 INSUFFICIENT_CREDITS { kind: 'XU', balance, cost } before any call.
      const debit = await this.prisma.$transaction((tx) =>
        this.xuWallet.spend(userId, { quantity: cost, reason: 'AI_PATTERN' }, tx),
      );
      balance = debit.balance;
      try {
        const generated = await this.ai.generate(request);
        const paid = await this.recordGeneration(userId, dto.theme, cost, debit.operationId, generated);
        result = generated;
        source = 'ai';
        if (paid) charged = cost;
        else balance = (await this.xuWallet.wallet(userId)).balance;
      } catch (error) {
        // Never leave the user empty-handed: give the xu back and fall back to the procedural pattern.
        this.logger.warn(`AI pattern failed, using the procedural generator: ${(error as Error).message}`);
        balance += await this.refundNow(debit.operationId);
      }
      if (result?.usage) {
        const { model, inputTokens, outputTokens } = result.usage;
        // The generation is stored and paid: a failure of the cached monthly sum must not lose the user's pattern.
        await this.costGuard
          .record(model, inputTokens, outputTokens)
          .catch((error: Error) => this.logger.warn(`AI cost not added to the monthly sum: ${error.message}`));
      }
    }
    result ??= await this.procedural.generate(request);

    const { design } = result;
    return {
      source,
      themeName: design.themeName,
      description: design.description,
      palette: design.palette,
      tile: { size: design.tile.size, svg: renderPatternSvg(design) },
      /** Xu spent on this pattern and what is left; null when AI is off (nothing to spend). */
      usage: balance === null ? null : { charged, balance },
    };
  }

  /**
   * Refunds the AI_PATTERN debits of requests that never finished: older than ORPHANED_PATTERN_DEBIT_AFTER_MS, not
   * refunded, and without an ai_generations row. Returns how many debits were refunded. Safe to run twice or on
   * several instances: CreditsService.refund gives a debit back once, and a debit with a generation row is never
   * refunded (both sides lock the debit rows first, see `recordGeneration`).
   */
  async refundOrphanedDebits(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - ORPHANED_PATTERN_DEBIT_AFTER_MS);
    const since = new Date(now.getTime() - ORPHANED_PATTERN_LOOKBACK_MS);
    // The reason is a literal so Postgres reads it as the enum, not as a text parameter.
    const orphans = await this.prisma.$queryRaw<{ operation_id: string }[]>`
      SELECT DISTINCT d.operation_id FROM credit_debits d
      WHERE d.reason = 'AI_PATTERN' AND d.refunded_at IS NULL
        AND d.created_at >= ${since.toISOString()}::timestamptz AND d.created_at < ${cutoff.toISOString()}::timestamptz
        AND NOT EXISTS (SELECT 1 FROM ai_generations g WHERE g.debit_operation_id = d.operation_id)
      LIMIT ${ORPHAN_BATCH}`;

    let refunded = 0;
    for (const { operation_id: operationId } of orphans) {
      const xu = await this.prisma.$transaction(async (tx) => {
        // Same lock as recordGeneration, then a fresh read: a generation stored meanwhile keeps its xu.
        await lockDebit(tx, operationId);
        const done = await tx.aiGeneration.findFirst({ where: { debitOperationId: operationId }, select: { id: true } });
        return done ? 0 : this.xuWallet.refund(operationId, tx);
      });
      if (xu > 0) {
        refunded += 1;
        this.logger.warn(`ai_pattern.orphan_refunded op=${operationId} xu=${xu}`);
      }
    }
    return refunded;
  }

  /**
   * Stores the generation with its debit in one transaction that first locks the debit rows, like the refund of
   * orphans. Returns false when that refund came first (a call longer than ORPHANED_PATTERN_DEBIT_AFTER_MS): the row
   * is then stored with 0 xu and the user keeps the pattern for free.
   */
  private recordGeneration(
    userId: string,
    theme: string,
    cost: number,
    operationId: string,
    { usage }: GeneratedPattern,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const debits = await lockDebit(tx, operationId);
      const paid = debits.length > 0 && debits.every((debit) => debit.refunded_at === null);
      await tx.aiGeneration.create({
        data: {
          userId,
          theme,
          model: usage?.model ?? 'unknown',
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          credits: paid ? cost : 0,
          debitOperationId: operationId,
        },
      });
      return paid;
    });
  }

  /** Refunds a failed call now; when that fails too, `refundOrphanedDebits` refunds it later (it has no generation row). */
  private async refundNow(operationId: string): Promise<number> {
    try {
      return await this.xuWallet.refund(operationId);
    } catch (error) {
      this.logger.error(`AI pattern refund failed, left to the reconcile task: op=${operationId} ${(error as Error).message}`);
      return 0;
    }
  }

  /** `GET /ai/usage`: whether AI patterns run, their price in xu and the wallet that pays for them. */
  async usage(userId: string) {
    const [wallet, budgetReached] = await Promise.all([
      this.xuWallet.wallet(userId),
      this.ai ? this.costGuard.budgetReached() : false,
    ]);
    return {
      aiEnabled: this.ai !== null,
      budgetReached,
      patternCost: {
        fast: XU_PATTERN_COST.fast,
        premium: XU_PATTERN_COST.premium,
      },
      xu: { balance: wallet.balance, allowance: wallet.allowance },
    };
  }
}

/** Locks the rows of one debit operation (one per lot), in a fixed order. */
function lockDebit(tx: Prisma.TransactionClient, operationId: string) {
  return tx.$queryRaw<{ refunded_at: Date | null }[]>`
    SELECT refunded_at FROM credit_debits WHERE operation_id = ${operationId}::uuid ORDER BY lot_id FOR UPDATE`;
}
