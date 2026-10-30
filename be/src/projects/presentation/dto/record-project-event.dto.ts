import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_STUDIO_HEARTBEAT_SECONDS } from '@wrapfit/shared';
import { IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';

/** Events only the studio knows about; the API records the others itself (project created, exports). */
export const CLIENT_EVENT_TYPES = ['AUTO_FIX_APPLIED', 'STUDIO_ACTIVE'] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export class RecordProjectEventDto {
  @ApiProperty({ enum: CLIENT_EVENT_TYPES })
  @IsIn(CLIENT_EVENT_TYPES)
  type: ClientEventType;

  @ApiPropertyOptional({ minimum: 1, maximum: 500, description: 'AUTO_FIX_APPLIED: FitCheck violations Auto-Fix repaired' })
  @ValidateIf((dto: RecordProjectEventDto) => dto.type === 'AUTO_FIX_APPLIED')
  @IsInt()
  @Min(1)
  @Max(500)
  fixed?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_STUDIO_HEARTBEAT_SECONDS,
    description: 'STUDIO_ACTIVE: seconds of activity since the previous heartbeat (breaks over 2 minutes left out)',
  })
  @ValidateIf((dto: RecordProjectEventDto) => dto.type === 'STUDIO_ACTIVE')
  @IsInt()
  @Min(1)
  @Max(MAX_STUDIO_HEARTBEAT_SECONDS)
  seconds?: number;
}
