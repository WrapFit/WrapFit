import { Inject, Injectable, Logger } from '@nestjs/common';
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

/**
 * Pattern & palette generator (IT3-09), paid with xu (docs/19 S3, flow of docs/16 §4.3). Uses Claude when configured
 * and the monthly cost fuse of WrapFit (AiCostGuard) is not blown; each AI call costs XU_PATTERN_COST[quality] xu,
 * debited before the call and refunded when it fails. The built-in procedural generator (free, unlimited) answers
 * when AI is off, the budget is spent or the call fails, so the user always gets a pattern.
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
        result = await this.ai.generate(request);
        source = 'ai';
        charged = cost;
      } catch (error) {
        // Never leave the user empty-handed: give the xu back and fall back to the procedural pattern.
        this.logger.warn(`AI pattern failed, using the procedural generator: ${(error as Error).message}`);
        balance += await this.xuWallet.refund(debit.operationId);
      }
      if (result?.usage) {
        const { model, inputTokens, outputTokens } = result.usage;
        await this.prisma.aiGeneration.create({
          data: {
            userId,
            theme: dto.theme,
            model,
            inputTokens,
            outputTokens,
            credits: cost,
            debitOperationId: debit.operationId,
          },
        });
        await this.costGuard.record(model, inputTokens, outputTokens);
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
