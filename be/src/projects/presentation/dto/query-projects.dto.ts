import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';
import { PaginationQueryDto, trim } from '../../../common';

/** Value of `collectionId` that selects the projects outside any collection. */
export const NO_COLLECTION = 'none';

export class QueryProjectsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.ACTIVE, description: 'DELETED = trash' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status: ProjectStatus = ProjectStatus.ACTIVE;

  @ApiPropertyOptional({ example: 'tuck-top', description: 'Box structure: tuck-top, sleeve-drawer, lid-base, pillow, mailer, gable, insert, hang-tag, folded-card, belly-band' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,64}$/)
  templateId?: string;

  @ApiPropertyOptional({ description: `A collection id, or "${NO_COLLECTION}" for projects outside any collection` })
  @IsOptional()
  @ValidateIf((query: QueryProjectsDto) => query.collectionId !== NO_COLLECTION)
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional({ description: 'Search in the title (contains, case-insensitive) or an exact tag' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ['updatedAt', 'createdAt', 'title'], default: 'updatedAt' })
  @IsOptional()
  @IsIn(['updatedAt', 'createdAt', 'title'])
  sortBy: 'updatedAt' | 'createdAt' | 'title' = 'updatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
