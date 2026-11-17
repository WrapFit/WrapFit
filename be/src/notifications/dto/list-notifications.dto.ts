import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsPageCursor } from '../../common/utils/page-cursor.util';
import { NOTIFICATION_PAGE_DEFAULT, NOTIFICATION_PAGE_MAX } from '../notifications.constants';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ description: '`nextBefore` of the previous page (opaque); omitted = from the newest' })
  @IsOptional()
  @IsString()
  @IsPageCursor()
  before?: string;

  @ApiPropertyOptional({ default: NOTIFICATION_PAGE_DEFAULT, maximum: NOTIFICATION_PAGE_MAX })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(NOTIFICATION_PAGE_MAX)
  limit?: number;
}
