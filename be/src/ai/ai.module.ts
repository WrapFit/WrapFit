import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingCoreModule } from '../billing';
import { ConfigService } from '../common';
import { AiController } from './ai.controller';
import { AiCostGuard } from './ai-cost.guard';
import { AI_PATTERN_GENERATOR, AiPatternService } from './ai-pattern.service';
import { AiImageController } from './image/ai-image.controller';
import { AiImageReconcileTask } from './image/ai-image-reconcile.task';
import { AiImageRefunds } from './image/ai-image-refunds';
import { AI_IMAGE_QUEUE } from './image/ai-image.constants';
import { AiImageService, PROMPT_REWRITER } from './image/ai-image.service';
import { ClaudePromptRewriter, PlainPromptRewriter, type PromptRewriter } from './image/prompt-rewriter';
import { ClaudePatternGenerator } from './pattern/claude-pattern.generator';

/**
 * AI paid with xu (docs/19), API side: the pattern & palette generator (UC: "Sinh hoa văn AI") and AI images, whose
 * jobs run in the worker (AiImageWorkerModule). Claude is optional: no key = procedural patterns, prompts as typed.
 */
@Module({
  imports: [BillingCoreModule, BullModule.registerQueue({ name: AI_IMAGE_QUEUE })],
  controllers: [AiController, AiImageController],
  providers: [
    AiPatternService,
    AiCostGuard,
    AiImageService,
    AiImageRefunds,
    AiImageReconcileTask,
    {
      provide: AI_PATTERN_GENERATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get('ai.anthropicApiKey');
        return apiKey
          ? new ClaudePatternGenerator({
              apiKey,
              models: config.get('ai.models'),
              timeoutMs: config.get('ai.timeoutMs'),
            })
          : null;
      },
    },
    {
      provide: PROMPT_REWRITER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PromptRewriter => {
        const apiKey = config.get('ai.anthropicApiKey');
        return apiKey
          ? new ClaudePromptRewriter(apiKey, config.get('ai.models').fast, config.get('ai.timeoutMs'))
          : new PlainPromptRewriter();
      },
    },
  ],
})
export class AiModule {}
