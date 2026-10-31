import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AI_IMAGE_MODELS, type AiImageAspectRatio, type AiImageModelKey } from '@wrapfit/shared';
import { trim } from '../../../common';

export const ASPECT_RATIOS: AiImageAspectRatio[] = ['1:1', '4:3', '3:4', '3:2', '2:3', '16:9', '9:16'];

export class CreateAiImageDto {
  @ApiProperty({ example: 'Hoa đào và bao lì xì đỏ, phong cách màu nước, nền kem' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt: string;

  @ApiProperty({ enum: AI_IMAGE_MODELS.map((model) => model.key), example: 'seedream-4.5' })
  @IsIn(AI_IMAGE_MODELS.map((model) => model.key))
  modelKey: AiImageModelKey;

  @ApiProperty({ enum: ASPECT_RATIOS, description: 'Closest to the box face (nearestAspectRatio), among the ratios of the model' })
  @IsIn(ASPECT_RATIOS)
  aspectRatio: AiImageAspectRatio;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 4, description: 'Images to draw; the price is per image' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  numImages?: number;

  @ApiPropertyOptional({ default: false, description: 'Let the model draw lettering (models with supportsText only)' })
  @IsOptional()
  @IsBoolean()
  allowText?: boolean;

  @ApiPropertyOptional({ description: 'Made once per click by the client: sending it again returns the same job, not a new charge' })
  @IsOptional()
  @IsUUID()
  clientRequestId?: string;
}
