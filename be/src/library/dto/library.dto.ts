import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { LibraryAssetCategory, Occasion } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto, trim } from '../../common';
import { LIBRARY_LICENSE_IDS } from '../library-file.rules';

export class QueryLibraryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LibraryAssetCategory })
  @IsOptional()
  @IsEnum(LibraryAssetCategory)
  category?: LibraryAssetCategory;

  @ApiPropertyOptional({ enum: Occasion })
  @IsOptional()
  @IsEnum(Occasion)
  occasion?: Occasion;

  @ApiPropertyOptional({ description: 'Search in the title (contains) or an exact tag' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class CreateLibraryAssetDto {
  @ApiProperty({ description: 'URL of a file the admin uploaded (purpose LOGO or IMAGE): SVG, PNG, JPEG or WebP' })
  @IsString()
  @MaxLength(2000)
  fileUrl: string;

  @ApiProperty({ example: 'Tem hoa sen vàng' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @ApiProperty({ enum: LibraryAssetCategory })
  @IsEnum(LibraryAssetCategory)
  category: LibraryAssetCategory;

  @ApiProperty({ enum: LIBRARY_LICENSE_IDS, description: 'Licence allowing commercial printing' })
  @IsIn(LIBRARY_LICENSE_IDS)
  license: string;

  @ApiPropertyOptional({ example: 'https://www.biodiversitylibrary.org/…' })
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(500)
  sourceUrl?: string;

  @ApiPropertyOptional({ description: 'Credit line (required by CC-BY licences)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  attribution?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: Occasion, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Occasion, { each: true })
  occasions?: Occasion[];
}

export class UpdateLibraryAssetDto extends PartialType(OmitType(CreateLibraryAssetDto, ['fileUrl'] as const)) {
  @ApiPropertyOptional({ description: 'false hides the asset from the studio (canvases that show it keep it)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
