import { Injectable } from '@nestjs/common';
import { CreditDebitReason, CreditSource } from '@prisma/client';
import { XU_VALUE_VND } from '@wrapfit/shared';
import { estimateCostUsd } from '../ai';
import { ConfigService } from '../common';
import { PrismaService } from '../shared/prisma';

/** Vietnam is UTC+7 all year. */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface XuReport {
  /** `yyyy-mm`, calendar month in Vietnam time. */
  month: string;
  from: Date;
  to: Date;
  /** Rate the provider costs are converted at (USD_VND_RATE). */
  usdVndRate: number;
  /** Xu granted in the month, by lot source; `valueVnd` = money received for them (purchases only). */
  issued: {
    source: CreditSource;
    xu: number;
    lots: number;
    valueVnd: number;
  }[];
  /** Xu spent in the month and still spent (refunds left out), by what they paid for. */
  spent: {
    reason: CreditDebitReason;
    xu: number;
    operations: number;
    revenueVnd: number;
  }[];
  /** Xu of debits made in the month that came back (the job failed on our side). */
  refundedXu: number;
  /** Revenue recognised from spent xu: Σ quantity × value_vnd / lot quantity of each debit. */
  recognizedRevenueVnd: number;
  /** Xu whose lot expired in the month unspent, and the money of the purchased ones (breakage). */
  expired: { xu: number; valueVnd: number };
  /** Xu of purchased lots still spendable now, and the money WrapFit still owes for them (deferred revenue). */
  outstanding: { xu: number; valueVnd: number };
  /** Estimated provider cost of the month by model: images (fal, completed jobs) and AI patterns (Claude). */
  providerCost: {
    kind: 'IMAGE' | 'PATTERN';
    model: string;
    jobs: number;
    xu: number;
    costUsd: number;
    costVnd: number;
  }[];
  providerCostVnd: number;
  /** recognizedRevenueVnd − providerCostVnd; `grossMarginRate` null without revenue. */
  grossMarginVnd: number;
  grossMarginRate: number | null;
  /** List value of the xu spent (xu × XU_VALUE_VND), allowance xu included: what the usage would cost at list price. */
  spentListValueVnd: number;
}

/** `yyyy-mm` of `now` in Vietnam time. */
export function vietnamMonthOf(now: Date): string {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** First instant of a `yyyy-mm` month in Vietnam time, and of the next month. */
export function vietnamMonthRange(month: string): { from: Date; to: Date } {
  const [year, monthIndex] = month.split('-').map(Number);
  return {
    from: new Date(Date.UTC(year, monthIndex - 1, 1) - VIETNAM_OFFSET_MS),
    to: new Date(Date.UTC(year, monthIndex, 1) - VIETNAM_OFFSET_MS),
  };
}

const round = (value: number) => Math.round(value);

/**
 * Monthly xu report for admins (docs/19 S5): xu issued by source, spent and refunded, revenue recognised at the money
 * actually paid for each lot (allowance and gift xu are worth 0đ, docs/19 D6), breakage of expired purchased xu, the
 * deferred revenue of purchased xu still unspent, and the provider cost of the month for the gross margin.
 */
@Injectable()
export class XuReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async report(month: string, now = new Date()): Promise<XuReport> {
    const { from, to } = vietnamMonthRange(month);
    const expiredUntil = to < now ? to : now;
    const usdVndRate = this.config.get('ai.usdVndRate');

    const [issued, spent, refunded, expired, outstanding, images, patterns] =
      await Promise.all([
        this.prisma.$queryRaw<
          {
            source: CreditSource;
            xu: number;
            lots: number;
            value_vnd: number;
          }[]
        >`
        SELECT source, sum(quantity)::int AS xu, count(*)::int AS lots, sum(value_vnd)::bigint::float8 AS value_vnd
        FROM credit_lots
        WHERE kind = 'XU' AND created_at >= ${from} AND created_at < ${to}
        GROUP BY source ORDER BY source`,
        this.prisma.$queryRaw<
          {
            reason: CreditDebitReason;
            xu: number;
            operations: number;
            revenue_vnd: number;
          }[]
        >`
        SELECT d.reason, sum(d.quantity)::int AS xu, count(DISTINCT d.operation_id)::int AS operations,
               coalesce(sum(d.quantity::float8 * l.value_vnd / l.quantity), 0) AS revenue_vnd
        FROM credit_debits d JOIN credit_lots l ON l.id = d.lot_id
        WHERE l.kind = 'XU' AND d.refunded_at IS NULL AND d.created_at >= ${from} AND d.created_at < ${to}
        GROUP BY d.reason ORDER BY d.reason`,
        this.prisma.$queryRaw<{ xu: number }[]>`
        SELECT coalesce(sum(d.quantity), 0)::int AS xu
        FROM credit_debits d JOIN credit_lots l ON l.id = d.lot_id
        WHERE l.kind = 'XU' AND d.refunded_at IS NOT NULL AND d.created_at >= ${from} AND d.created_at < ${to}`,
        // A lot cannot be spent once expired, so its remaining is what expired.
        this.prisma.$queryRaw<{ xu: number; value_vnd: number }[]>`
        SELECT coalesce(sum(remaining), 0)::int AS xu,
               coalesce(sum(remaining::float8 * value_vnd / quantity), 0) AS value_vnd
        FROM credit_lots
        WHERE kind = 'XU' AND expires_at >= ${from} AND expires_at < ${expiredUntil}`,
        this.prisma.$queryRaw<{ xu: number; value_vnd: number }[]>`
        SELECT coalesce(sum(remaining), 0)::int AS xu,
               coalesce(sum(remaining::float8 * value_vnd / quantity), 0) AS value_vnd
        FROM credit_lots
        WHERE kind = 'XU' AND source = 'PURCHASE' AND remaining > 0 AND (expires_at IS NULL OR expires_at > ${now})`,
        this.prisma.$queryRaw<
          { model: string; jobs: number; xu: number; cost_usd: number }[]
        >`
        SELECT model_key AS model, count(*)::int AS jobs, sum(xu_cost)::int AS xu, sum(est_cost_usd)::float8 AS cost_usd
        FROM ai_image_jobs
        WHERE status = 'COMPLETED' AND created_at >= ${from} AND created_at < ${to}
        GROUP BY model_key ORDER BY cost_usd DESC`,
        this.prisma.aiGeneration.groupBy({
          by: ['model'],
          where: { createdAt: { gte: from, lt: to } },
          _count: { _all: true },
          _sum: { credits: true, inputTokens: true, outputTokens: true },
        }),
      ]);

    const providerCost = [
      ...images.map((row) => ({
        kind: 'IMAGE' as const,
        model: row.model,
        jobs: row.jobs,
        xu: row.xu,
        costUsd: row.cost_usd,
      })),
      ...patterns.map((row) => ({
        kind: 'PATTERN' as const,
        model: row.model,
        jobs: row._count._all,
        xu: row._sum.credits ?? 0,
        costUsd: estimateCostUsd(
          row.model,
          row._sum.inputTokens ?? 0,
          row._sum.outputTokens ?? 0,
        ),
      })),
    ].map((row) => ({
      ...row,
      costUsd: Math.round(row.costUsd * 10_000) / 10_000,
      costVnd: round(row.costUsd * usdVndRate),
    }));

    const spentRows = spent.map((row) => ({
      reason: row.reason,
      xu: row.xu,
      operations: row.operations,
      revenueVnd: round(row.revenue_vnd),
    }));
    const recognizedRevenueVnd = spentRows.reduce(
      (sum, row) => sum + row.revenueVnd,
      0,
    );
    const providerCostVnd = providerCost.reduce(
      (sum, row) => sum + row.costVnd,
      0,
    );
    const grossMarginVnd = recognizedRevenueVnd - providerCostVnd;

    return {
      month,
      from,
      to,
      usdVndRate,
      issued: issued.map((row) => ({
        source: row.source,
        xu: row.xu,
        lots: row.lots,
        valueVnd: round(row.value_vnd),
      })),
      spent: spentRows,
      refundedXu: refunded[0]?.xu ?? 0,
      recognizedRevenueVnd,
      expired: {
        xu: expired[0]?.xu ?? 0,
        valueVnd: round(expired[0]?.value_vnd ?? 0),
      },
      outstanding: {
        xu: outstanding[0]?.xu ?? 0,
        valueVnd: round(outstanding[0]?.value_vnd ?? 0),
      },
      providerCost,
      providerCostVnd,
      grossMarginVnd,
      grossMarginRate:
        recognizedRevenueVnd > 0
          ? Math.round((grossMarginVnd / recognizedRevenueVnd) * 1000) / 1000
          : null,
      spentListValueVnd:
        spentRows.reduce((sum, row) => sum + row.xu, 0) * XU_VALUE_VND,
    };
  }
}
