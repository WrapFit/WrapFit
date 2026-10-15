import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../shared/prisma';
import { GeneratePatternDto } from './dto/generate-pattern.dto';
import { renderPatternSvg } from './pattern/pattern-svg';
import type { GeneratedPattern, PatternGenerator } from './pattern/pattern.types';
import { ProceduralPatternGenerator } from './pattern/procedural-pattern.generator';

/** The AI generator, or null when ANTHROPIC_API_KEY is empty. */
export const AI_PATTERN_GENERATOR = Symbol('AI_PATTERN_GENERATOR');

/** AI generations per user in any rolling 24 hours. */
export const DAILY_AI_LIMIT: Record<SubscriptionTier, number> = {
  FREE: 10,
  PAY_PER_EXPORT: 25,
  STARTER: 50,
  PRO_BUSINESS: 300,
};
const DAY_MS = 24 * 60 * 60 * 1000;

export type PatternSource = 'ai' | 'procedural';

/**
 * Pattern & palette generator (IT3-09). Uses Claude when configured, within a daily quota per subscription tier;
 * falls back to the built-in procedural generator (free, unlimited) when AI is off or fails.
 */
@Injectable()
export class AiPatternService {
  private readonly logger = new Logger(AiPatternService.name);
  private readonly procedural = new ProceduralPatternGenerator();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PATTERN_GENERATOR) private readonly ai: PatternGenerator | null,
  ) {}

  async generate(userId: string, dto: GeneratePatternDto) {
    const request = { theme: dto.theme, preferredColors: dto.preferredColors ?? [] };
    const quota = await this.quota(userId);

    let source: PatternSource = 'procedural';
    let result: GeneratedPattern | undefined;
    if (this.ai) {
      if (quota.used >= quota.limit) {
        throw new HttpException(
          `Daily AI limit reached (${quota.limit} per 24 h on the ${quota.tier} plan)`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      try {
        result = await this.ai.generate(request);
        source = 'ai';
      } catch (error) {
        // Never leave the user empty-handed: log and fall back to the procedural pattern.
        this.logger.warn(`AI pattern failed, using the procedural generator: ${(error as Error).message}`);
      }
    }
    result ??= await this.procedural.generate(request);

    if (result.usage) {
      await this.prisma.aiGeneration.create({ data: { userId, theme: dto.theme, ...result.usage } });
      quota.used += 1;
    }

    const { design } = result;
    return {
      source,
      themeName: design.themeName,
      description: design.description,
      palette: design.palette,
      tile: { size: design.tile.size, svg: renderPatternSvg(design) },
      usage: this.ai ? { used: quota.used, limit: quota.limit } : null,
    };
  }

  async quota(userId: string) {
    const [user, used] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { subscriptionTier: true } }),
      this.prisma.aiGeneration.count({ where: { userId, createdAt: { gt: new Date(Date.now() - DAY_MS) } } }),
    ]);
    return { tier: user.subscriptionTier, used, limit: DAILY_AI_LIMIT[user.subscriptionTier], aiEnabled: this.ai !== null };
  }
}
