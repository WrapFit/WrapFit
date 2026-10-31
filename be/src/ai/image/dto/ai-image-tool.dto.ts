import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { XU_TOOL_COST, type AiImageTool } from '@wrapfit/shared';

const TOOLS = Object.keys(XU_TOOL_COST) as AiImageTool[];

export class AiImageToolParams {
  @ApiProperty()
  @IsUUID()
  outputId: string;

  @ApiProperty({ enum: TOOLS })
  @IsIn(TOOLS)
  tool: AiImageTool;
}

export class AiImageToolDto {
  @ApiPropertyOptional({ description: 'Made once per click by the client: sending it again returns the same job' })
  @IsOptional()
  @IsUUID()
  clientRequestId?: string;
}

export const AI_GALLERY_MAX_LIMIT = 60;

export class AiGalleryQueryDto {
  @ApiPropertyOptional({ description: '`nextBefore` of the previous page; omitted = from now' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  @ApiPropertyOptional({ default: 30, maximum: AI_GALLERY_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AI_GALLERY_MAX_LIMIT)
  limit?: number;
}
