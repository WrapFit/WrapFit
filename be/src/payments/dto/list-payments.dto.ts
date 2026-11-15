import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsPageCursor } from '../../common/utils/page-cursor.util';

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ description: '`nextBefore` of the previous page (opaque); omitted = from the newest' })
  @IsOptional()
  @IsString()
  @IsPageCursor()
  before?: string;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
