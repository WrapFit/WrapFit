import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPurpose } from '@prisma/client';
import { PAYMENT_TERMS_VERSION, XU_CUSTOM } from '@wrapfit/shared';
import { Equals, IsEnum, IsInt, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentPurpose, description: 'Gói lượt xuất, gói xu, Pro 30 ngày hoặc đơn in mẫu' })
  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @ApiPropertyOptional({ description: 'Đơn in mẫu cần thanh toán: bắt buộc khi purpose = SAMPLE_ORDER, cấm với mục khác' })
  @ValidateIf((dto: CreatePaymentDto) => dto.purpose === PaymentPurpose.SAMPLE_ORDER || dto.orderId !== undefined)
  @IsUUID(7)
  orderId?: string;

  @ApiPropertyOptional({
    description: `Số xu muốn nạp: bắt buộc khi purpose = XU_CUSTOM (${XU_CUSTOM.min}–${XU_CUSTOM.max}, bội số của ${XU_CUSTOM.step}), cấm với mục khác`,
  })
  @ValidateIf((dto: CreatePaymentDto) => dto.purpose === PaymentPurpose.XU_CUSTOM || dto.xu !== undefined)
  @IsInt({ message: 'Số xu phải là số nguyên.' })
  @Min(XU_CUSTOM.min, { message: `Nạp tối thiểu ${XU_CUSTOM.min} xu.` })
  @Max(XU_CUSTOM.max, { message: `Nạp tối đa ${XU_CUSTOM.max} xu mỗi lần.` })
  xu?: number;

  @ApiProperty({
    example: PAYMENT_TERMS_VERSION,
    description: 'Phiên bản điều khoản thanh toán người dùng đã đọc và đồng ý (bắt buộc, phải là bản hiện hành)',
  })
  @Equals(PAYMENT_TERMS_VERSION, {
    message: 'Bạn cần đọc và đồng ý điều khoản thanh toán hiện hành trước khi thanh toán.',
  })
  termsVersion!: string;
}
