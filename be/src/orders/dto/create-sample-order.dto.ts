import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateSampleOrderDto {
  @ApiProperty({ description: 'ID dự án hộp cần in mẫu thử' })
  @IsUUID(7)
  projectId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10, description: 'Số lượng hộp mẫu thử cần sản xuất' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  quantity?: number;

  @ApiProperty({ description: 'Họ tên người nhận' })
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @ApiPropertyOptional({ description: 'Số điện thoại người nhận' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại người nhận (alias FE)' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiProperty({ description: 'Địa chỉ giao hàng nhận hộp mẫu' })
  @IsString()
  @IsNotEmpty()
  shippingAddress!: string;

  @ApiPropertyOptional({ description: 'Chất liệu giấy yêu cầu (Ivory 300g, Kraft 350g, Duplex...)' })
  @IsOptional()
  @IsString()
  paperStock?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm cho xưởng in (cán mờ, ép kim...)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID xưởng in đối tác được chọn' })
  @IsOptional()
  @IsString()
  printShopId?: string;
}
