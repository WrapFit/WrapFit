import { Module } from '@nestjs/common';
import { ConfigService } from '../common';
import { AiController } from './ai.controller';
import { AiCostGuard } from './ai-cost.guard';
import { AI_PATTERN_GENERATOR, AiPatternService } from './ai-pattern.service';
import { ClaudePatternGenerator } from './pattern/claude-pattern.generator';

/** AI pattern & palette generator (UC: "Sinh hoa văn AI"). Claude is optional: no key = procedural patterns. */
@Module({
  controllers: [AiController],
  providers: [
    AiPatternService,
    AiCostGuard,
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
  ],
})
export class AiModule {}
