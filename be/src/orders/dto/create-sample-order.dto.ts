import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PROVINCE_CODES } from '@wrapfit/shared';

/**
 * There is no voucher field: vouchers were removed (docs-old/25 item 1). A body that still sends `promoCode` gets 400 from
 * the global ValidationPipe (forbidNonWhitelisted), so a client never believes a code was applied.
 */
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

  @ApiPropertyOptional({
    enum: PROVINCE_CODES,
    description: 'Tỉnh / thành nhận hàng (GET /print-shops/provinces): dùng để chọn xưởng gần và ước tính ngày nhận',
  })
  @IsOptional()
  @IsIn(PROVINCE_CODES as string[])
  recipientProvince?: string;

  @ApiPropertyOptional({ description: 'Chất liệu giấy yêu cầu (Ivory 300g, Kraft 350g, Duplex...)' })
  @IsOptional()
  @IsString()
  paperStock?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm cho xưởng in (cán mờ, ép kim...)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID xưởng in đối tác được chọn; bỏ trống thì WrapFit chọn xưởng được đề xuất (POST /orders/sample/match)' })
  @IsOptional()
  @IsString()
  printShopId?: string;
}
