import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, description: 'Trạng thái mới; chỉ nhận bước chuyển hợp lệ (409 nếu không)' })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ maxLength: 500, description: 'Ghi chú lưu vào lịch sử đơn (mã vận đơn, lý do hủy...)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
