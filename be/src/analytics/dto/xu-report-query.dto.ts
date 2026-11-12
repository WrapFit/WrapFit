import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class XuReportQueryDto {
  @ApiPropertyOptional({
    example: '2026-11',
    description: 'Calendar month in Vietnam time; omitted = this month',
  })
  @IsOptional()
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/, { message: 'month must be yyyy-mm' })
  month?: string;
}
