import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Industry, Occasion } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { trim } from '../../../common';
import { MAX_TITLE_LENGTH } from '../../domain/project.types';
import { BoxDimensionsDto, CanvasStateDto, MaterialSpecDto } from './project-spec.dto';

/** Tags are stored trimmed, lower-case and without duplicates so tag search is exact. */
export const normalizeTags = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? [...new Set(value.map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : tag)))]
    : value;

export class CreateProjectDto {
  @ApiProperty({ example: 'tuck-top', description: 'Id of an active box template: tuck-top, sleeve-drawer, lid-base, pillow, mailer, gable, insert, hang-tag, folded-card, belly-band' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  templateId: string;

  @ApiProperty({ example: 'Hộp nến thơm Tết' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TITLE_LENGTH)
  title: string;

  @ApiProperty({ type: BoxDimensionsDto })
  @ValidateNested()
  @Type(() => BoxDimensionsDto)
  dimensions: BoxDimensionsDto;

  @ApiPropertyOptional({ type: MaterialSpecDto, description: 'Defaults to ivory 300 gsm, 0.35 mm, matte' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialSpecDto)
  materialSpec?: MaterialSpecDto;

  @ApiPropertyOptional({ type: CanvasStateDto, description: 'Defaults to an empty canvas' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CanvasStateDto)
  canvasState?: CanvasStateDto;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Curated design of the template hub; fills materialSpec and canvasState when they are omitted',
  })
  @IsOptional()
  @IsUUID()
  designTemplateId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'One of your collections' })
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional({ type: [String], example: ['tet', 'nen-thom'] })
  @IsOptional()
  @Transform(normalizeTags)
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: Occasion, nullable: true, description: 'Template hub filter (UC-12)' })
  @IsOptional()
  @IsEnum(Occasion)
  occasion?: Occasion | null;

  @ApiPropertyOptional({ enum: Industry, nullable: true, description: 'Template hub filter (UC-12)' })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry | null;
}
