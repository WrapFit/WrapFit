import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
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

export class AiUploadToolParams {
  @ApiProperty({ enum: TOOLS })
  @IsIn(TOOLS)
  tool: AiImageTool;
}

/** An image the user uploaded, as the canvas shows it (its URL) or its storage key (docs/23 S20). */
export class AiUploadToolDto extends AiImageToolDto {
  @ApiProperty({ description: 'URL or storage key of one of my uploaded images (PNG, JPEG, WebP)' })
  @IsString()
  @MaxLength(1000)
  content: string;
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
