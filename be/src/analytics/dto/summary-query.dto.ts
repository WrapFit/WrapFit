import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type AnalyticsScope,
} from '@wrapfit/shared';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class SummaryQueryDto {
  @ApiPropertyOptional({
    enum: ['me', 'global'],
    default: 'me',
    description: 'global = anonymous totals of WrapFit',
  })
  @IsOptional()
  @IsIn(['me', 'global'])
  scope: AnalyticsScope = 'me';

  @ApiPropertyOptional({
    enum: ANALYTICS_PERIODS,
    default: 30,
    description: 'Last N days in Vietnam time, today included',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(ANALYTICS_PERIODS)
  days: AnalyticsPeriod = 30;
}
