import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { trim } from '../../common';
import type { AiQuality } from '../pattern/pattern.types';

export class GeneratePatternDto {
  @ApiProperty({ example: 'Tết Bính Ngọ, hoa đào, sang trọng' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  theme: string;

  @ApiPropertyOptional({ type: [String], example: ['#C0392B', '#D4AF37'], description: 'Brand colors to build on' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @Matches(/^#[0-9a-fA-F]{6}$/, { each: true, message: 'preferredColors must be #RRGGBB colors' })
  preferredColors?: string[];

  @ApiPropertyOptional({
    enum: ['fast', 'premium'],
    default: 'fast',
    description: '`premium` = stronger model, paid plans only (403 PLAN_FEATURE_REQUIRED on Free)',
  })
  @IsOptional()
  @IsIn(['fast', 'premium'])
  quality?: AiQuality;
}
