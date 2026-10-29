import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { trim } from '../../common';

export class GrantCreditsDto {
  @ApiProperty({ example: 5, description: 'Export credits to add (1-100)' })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiPropertyOptional({ example: 30, description: 'Days until the lot expires; omitted = never expires' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;

  @ApiPropertyOptional({ example: 'Tài khoản demo CP4' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  note?: string;
}
