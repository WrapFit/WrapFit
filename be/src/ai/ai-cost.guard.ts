import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../common';
import { PrismaService } from '../shared/prisma';
import { estimateCostUsd } from './ai-pricing';

const CACHE_MS = 5 * 60 * 1000;
/** Vietnam is UTC+7 all year (no daylight saving time). */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** First instant of the current calendar month in Vietnam time. */
export function vietnamMonthStart(now: Date): Date {
  const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - VIETNAM_OFFSET_MS);
}

interface MonthSpend {
  monthStart: number;
  usd: number;
  expiresAt: number;
}

/**
 * System-wide cost fuse of the AI pattern generator (docs/16 §4.4): sums the estimated cost of this month's
 * `ai_generations` and reports when it reaches AI_MONTHLY_BUDGET_USD, so every request falls back to the free
 * procedural generator until the next month. The sum is cached 5 minutes per process; generations made in this
 * process are added to it at once, others (a second API instance) show up at the next refresh.
 */
@Injectable()
export class AiCostGuard {
  private readonly logger = new Logger(AiCostGuard.name);
  private readonly budgetUsd: number | null;
  private spend: Promise<MonthSpend> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.budgetUsd = config.get('ai.monthlyBudgetUsd');
  }

  async budgetReached(now = new Date()): Promise<boolean> {
    if (this.budgetUsd === null) return false;
    return (await this.monthSpend(now)).usd >= this.budgetUsd;
  }

  /** Adds a generation that was just recorded to the cached sum. */
  async record(model: string, inputTokens: number, outputTokens: number, now = new Date()): Promise<void> {
    if (this.budgetUsd === null || !this.spend) return;
    const spend = await this.spend.catch(() => null);
    if (spend?.monthStart === vietnamMonthStart(now).getTime()) spend.usd += estimateCostUsd(model, inputTokens, outputTokens);
  }

  private async monthSpend(now: Date): Promise<MonthSpend> {
    const monthStart = vietnamMonthStart(now).getTime();
    if (this.spend) {
      const cached = await this.spend.catch(() => null);
      if (cached && cached.expiresAt > now.getTime() && cached.monthStart === monthStart) return cached;
    }
    // One query for all concurrent requests; a failed query is retried by the next request.
    this.spend = this.load(monthStart, now.getTime());
    return this.spend;
  }

  private async load(monthStart: number, now: number): Promise<MonthSpend> {
    const rows = await this.prisma.aiGeneration.groupBy({
      by: ['model'],
      where: { createdAt: { gte: new Date(monthStart) } },
      _sum: { inputTokens: true, outputTokens: true },
    });
    const usd = rows.reduce(
      (sum, row) => sum + estimateCostUsd(row.model, row._sum.inputTokens ?? 0, row._sum.outputTokens ?? 0),
      0,
    );
    if (this.budgetUsd !== null && usd >= this.budgetUsd) {
      // Once per cache period: admins see it in the error logs, users still get procedural patterns.
      this.logger.error(
        `AI monthly budget reached: ~$${usd.toFixed(2)} of $${this.budgetUsd} spent since ${new Date(monthStart).toISOString()}; using the procedural generator`,
      );
    }
    return { monthStart, usd, expiresAt: now + CACHE_MS };
  }
}
