import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { XU_HISTORY_MAX_LIMIT, XU_HISTORY_TYPES, type XuHistoryType } from '../xu-wallet.service';

export class XuHistoryQueryDto {
  @ApiPropertyOptional({ description: '`nextBefore` of the previous page; omitted = from now' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  @ApiPropertyOptional({ default: 30, maximum: XU_HISTORY_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(XU_HISTORY_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({
    enum: XU_HISTORY_TYPES,
    description: '`grant` plan allowance and purchases, `spend` AI and export spends, `adjust` administrator changes; omitted = all',
  })
  @IsOptional()
  @IsIn(XU_HISTORY_TYPES)
  type?: XuHistoryType;

  @ApiPropertyOptional({ description: 'Entries created at or after this instant (ISO 8601)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Entries created at or before this instant (ISO 8601)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
