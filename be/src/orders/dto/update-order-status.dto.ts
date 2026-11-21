import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CARRIER_IDS } from '@wrapfit/shared';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, description: 'Trạng thái mới; chỉ nhận bước chuyển hợp lệ (409 nếu không)' })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ maxLength: 500, description: 'Ghi chú lưu vào lịch sử đơn; bắt buộc khi xưởng báo đã giao (bằng chứng giao)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ enum: CARRIER_IDS, description: 'SHIPPED: hãng vận chuyển (@wrapfit/shared CARRIERS)' })
  @IsOptional()
  @IsIn(CARRIER_IDS as string[])
  carrier?: string;

  @ApiPropertyOptional({ description: 'SHIPPED: mã vận đơn, bắt buộc với hãng vận chuyển' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  trackingCode?: string;
}
