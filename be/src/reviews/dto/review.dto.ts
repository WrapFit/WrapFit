import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export const COMMENT_MAX_LENGTH = 1000;
export const REVIEWER_NAME_MAX_LENGTH = 60;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** A comment on the design, optionally pinned to a face at a point (mm on the face). */
export class CreateCommentDto {
  @ApiProperty({ maxLength: COMMENT_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(COMMENT_MAX_LENGTH)
  body: string;

  @ApiPropertyOptional({ description: 'Face of the box the comment is about (e.g. panel_front)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]{1,40}$/)
  panelId?: string;

  @ApiPropertyOptional({ description: 'Point on the face, mm from its top-left corner' })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-50)
  @Max(2000)
  x?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-50)
  @Max(2000)
  y?: number;
}

/** A comment through the review link: the reviewer gives a name (no account). */
export class GuestCommentDto extends CreateCommentDto {
  @ApiProperty({ maxLength: REVIEWER_NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(REVIEWER_NAME_MAX_LENGTH)
  authorName: string;
}

export class ResolveCommentDto {
  @ApiProperty()
  @IsBoolean()
  resolved: boolean;
}

/** "Duyệt in": who approves (a name, typed by the reviewer) and the design version they saw. */
export class ApproveDto {
  @ApiProperty({ maxLength: REVIEWER_NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(REVIEWER_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ description: 'Version of the design the reviewer approves (409 when it changed meanwhile)' })
  @IsInt()
  @Min(1)
  version: number;
}
