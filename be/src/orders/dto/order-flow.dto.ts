import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { ORDER_MESSAGE_MAX_LENGTH } from '@wrapfit/shared';

/** The shop refuses a paid order it has not taken (docs/19 AF-A2); the admin moves it to another shop. */
export class RejectOrderDto {
  @ApiProperty({ minLength: 5, maxLength: 300, description: 'Lý do từ chối, hiện cho admin' })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  reason!: string;
}

/** ADMIN moves a paid order no shop has taken to another shop. */
export class ReassignOrderDto {
  @ApiProperty({ description: 'Xưởng mới (phải nhận được đơn: POST /orders/sample/match)' })
  @IsString()
  printShopId!: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class OrderMessageDto {
  @ApiProperty({ minLength: 1, maxLength: ORDER_MESSAGE_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(ORDER_MESSAGE_MAX_LENGTH)
  body!: string;
}

/** What a shop's OWNER may change from the portal (docs/19 B.1, BR-G11); the contract stays with the admin. */
export class UpdatePartnerShopDto {
  @ApiPropertyOptional({ nullable: true, description: 'Tạm nghỉ đến lúc này (ISO); null để mở lại' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  pausedUntil?: string | null;

  @ApiPropertyOptional({ description: 'Số đơn bắt đầu mỗi ngày làm việc' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  dailyCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[0-9 +().-]{8,20}$/, { message: 'Số điện thoại chưa đúng' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zalo?: string;
}
