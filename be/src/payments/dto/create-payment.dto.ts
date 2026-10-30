import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPurpose } from '@prisma/client';
import { IsEnum, IsUUID, ValidateIf } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentPurpose, description: 'Gói lượt xuất, Pro 30 ngày hoặc đơn in mẫu' })
  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @ApiPropertyOptional({ description: 'Đơn in mẫu cần thanh toán: bắt buộc khi purpose = SAMPLE_ORDER, cấm với mục khác' })
  @ValidateIf((dto: CreatePaymentDto) => dto.purpose === PaymentPurpose.SAMPLE_ORDER || dto.orderId !== undefined)
  @IsUUID(7)
  orderId?: string;
}
