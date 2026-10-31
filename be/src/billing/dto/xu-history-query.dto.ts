import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';
import { XU_HISTORY_MAX_LIMIT } from '../xu-wallet.service';

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
}
