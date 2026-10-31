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
    description: 'Price in xu: `fast` 1, `premium` (stronger model) 65 (XU_PATTERN_COST, docs/19). Not enough xu: 402',
  })
  @IsOptional()
  @IsIn(['fast', 'premium'])
  quality?: AiQuality;
}
