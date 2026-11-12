import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPurpose } from '@prisma/client';
import { PAYMENT_TERMS_VERSION } from '@wrapfit/shared';
import { Equals, IsEnum, IsUUID, ValidateIf } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentPurpose, description: 'Gói lượt xuất, gói xu, Pro 30 ngày hoặc đơn in mẫu' })
  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @ApiPropertyOptional({ description: 'Đơn in mẫu cần thanh toán: bắt buộc khi purpose = SAMPLE_ORDER, cấm với mục khác' })
  @ValidateIf((dto: CreatePaymentDto) => dto.purpose === PaymentPurpose.SAMPLE_ORDER || dto.orderId !== undefined)
  @IsUUID(7)
  orderId?: string;

  @ApiProperty({
    example: PAYMENT_TERMS_VERSION,
    description: 'Phiên bản điều khoản thanh toán người dùng đã đọc và đồng ý (bắt buộc, phải là bản hiện hành)',
  })
  @Equals(PAYMENT_TERMS_VERSION, {
    message: 'Bạn cần đọc và đồng ý điều khoản thanh toán hiện hành trước khi thanh toán.',
  })
  termsVersion!: string;
}
