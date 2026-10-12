import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class FormulaUpgradeDto {
  @ApiProperty({
    description: 'Version of the project the editor shows (ProjectDetail.version); a newer save answers 409.',
    example: 7,
  })
  @IsInt()
  @Min(1)
  version: number;
}
