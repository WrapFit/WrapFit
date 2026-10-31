import { Injectable } from '@nestjs/common';
import { CreditDebitReason, CreditSource, Prisma } from '@prisma/client';
import { PLAN_LABELS, xuAllowancePeriod, type XuAllowancePeriod } from '@wrapfit/shared';
import { PrismaService } from '../shared/prisma';
import { CreditsService, type CreditLotView } from './credits.service';
import { PlanService } from './plan.service';

type Db = PrismaService | Prisma.TransactionClient;

/** What xu pay for. */
export type XuDebitReason = Extract<CreditDebitReason, 'AI_IMAGE' | 'AI_PATTERN' | 'AI_TOOL'>;

export interface XuWalletView {
  balance: number;
  /** Lots not expired, the ones spent first on top. */
  lots: CreditLotView[];
  /** Allowance of the plan: xu per period and when the next period starts. */
  allowance: { perPeriod: number; periodKey: string; resetsAt: Date };
}

export interface XuSpendInput {
  quantity: number;
  reason: XuDebitReason;
  /** What the xu paid for, e.g. the ai_image_jobs id. */
  refId?: string;
  /** Pass one to record the operation elsewhere first; generated otherwise. */
  operationId?: string;
}

/** One line of "Lịch sử xu": a lot granted (positive) or a spend operation (negative), newest first. */
export interface XuHistoryEntry {
  type: 'GRANT' | 'SPEND';
  /** Lot id for a grant, debit operation id for a spend. */
  id: string;
  quantity: number;
  source: CreditSource | null;
  reason: CreditDebitReason | null;
  refId: string | null;
  /** Set when the xu of a spend came back (the job failed on our side). */
  refundedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export const XU_HISTORY_MAX_LIMIT = 100;

interface SpendRow {
  id: string;
  reason: CreditDebitReason;
  ref_id: string | null;
  refunded_at: Date | null;
  created_at: Date;
  quantity: number;
}

/**
 * The xu wallet (docs/19): the XU ledger of CreditsService plus the plan allowance. The allowance of a period is
 * granted lazily, the first time the wallet is read or spent in that period (no cron), and lives until the end of the
 * next period: unspent xu roll over once. Spending takes the lot that expires first, so last period's leftover goes
 * before this period's allowance and both go before a purchased pack.
 */
@Injectable()
export class XuWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly plans: PlanService,
  ) {}

  /** Grants the allowance lot of the current period unless it exists; returns that period. */
  async ensureAllowance(userId: string, db: Db = this.prisma, now = new Date()): Promise<XuAllowancePeriod> {
    const tier = await this.plans.sync(userId, db, now);
    const subscription = await db.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
    });
    const period = xuAllowancePeriod(tier, subscription, now);
    // The unique (user_id, kind, source, period_key) makes a second or concurrent grant of one period a no-op.
    await db.creditLot.createMany({
      data: {
        userId,
        kind: 'XU',
        source: 'PLAN_ALLOWANCE',
        quantity: period.quantity,
        remaining: period.quantity,
        expiresAt: period.expiresAt,
        periodKey: period.periodKey,
        note: `Xu gói ${PLAN_LABELS[tier]}`,
      },
      skipDuplicates: true,
    });
    return period;
  }

  /**
   * Spends xu inside the transaction of the caller, which commits the debit together with what it pays for. Not
   * enough xu: 402 INSUFFICIENT_CREDITS { kind: 'XU', balance, cost } and nothing is written.
   */
  async spend(
    userId: string,
    input: XuSpendInput,
    tx: Prisma.TransactionClient,
  ): Promise<{ operationId: string; balance: number }> {
    await this.ensureAllowance(userId, tx);
    return this.credits.debit(userId, { ...input, kind: 'XU' }, tx);
  }

  /** Gives back the xu of one spend, once (docs/19 D3: the job failed on our side). Returns how many came back. */
  refund(operationId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.credits.refund(operationId, tx);
  }

  async wallet(userId: string, now = new Date()): Promise<XuWalletView> {
    const period = await this.ensureAllowance(userId, this.prisma, now);
    const lots = await this.credits.lots(userId, this.prisma, { kind: 'XU', now });
    return {
      balance: lots.reduce((sum, lot) => sum + lot.remaining, 0),
      lots,
      allowance: { perPeriod: period.quantity, periodKey: period.periodKey, resetsAt: period.endsAt },
    };
  }

  /**
   * Grants and spends older than `before`, newest first. `nextBefore` continues the list; it is null on the last page.
   * Entries made in the same millisecond as the last one of a page may be skipped by the next page.
   */
  async history(
    userId: string,
    { before = new Date(), limit = 30 }: { before?: Date; limit?: number } = {},
  ): Promise<{ entries: XuHistoryEntry[]; nextBefore: string | null }> {
    const take = Math.min(Math.max(limit, 1), XU_HISTORY_MAX_LIMIT);
    const [lots, spends] = await Promise.all([
      this.prisma.creditLot.findMany({
        where: { userId, kind: 'XU', createdAt: { lt: before } },
        select: { id: true, source: true, quantity: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.$queryRaw<SpendRow[]>`
        SELECT d.operation_id AS id, d.reason, d.ref_id, max(d.refunded_at) AS refunded_at,
               min(d.created_at) AS created_at, sum(d.quantity)::int AS quantity
        FROM credit_debits d JOIN credit_lots l ON l.id = d.lot_id
        WHERE d.user_id = ${userId}::uuid AND l.kind = 'XU' AND d.created_at < ${before}
        GROUP BY d.operation_id, d.reason, d.ref_id
        ORDER BY created_at DESC
        LIMIT ${take}`,
    ]);

    const entries: XuHistoryEntry[] = [
      ...lots.map((lot) => ({
        type: 'GRANT' as const,
        id: lot.id,
        quantity: lot.quantity,
        source: lot.source,
        reason: null,
        refId: null,
        refundedAt: null,
        expiresAt: lot.expiresAt,
        createdAt: lot.createdAt,
      })),
      ...spends.map((row) => ({
        type: 'SPEND' as const,
        id: row.id,
        quantity: -row.quantity,
        source: null,
        reason: row.reason,
        refId: row.ref_id,
        refundedAt: row.refunded_at,
        expiresAt: null,
        createdAt: row.created_at,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);

    // More entries exist when either query was cut by `take`, or when the merge left some of them out.
    const more = lots.length === take || spends.length === take || lots.length + spends.length > take;
    return { entries, nextBefore: more ? entries[entries.length - 1].createdAt.toISOString() : null };
  }
}
