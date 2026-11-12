import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** VAT invoice details. Every field may be empty (cleared); a filled tax code / email must be valid. */
export class BillingDetailsDto {
  @ApiProperty({ description: 'Tên đơn vị / hộ kinh doanh', maxLength: 200 })
  @Transform(trimmed)
  @IsString()
  @MaxLength(200)
  company!: string;

  @ApiProperty({ description: 'Mã số thuế: 10 số, hoặc 10 số - 3 số (chi nhánh)', example: '0312345678' })
  @Transform(trimmed)
  @IsString()
  @ValidateIf((dto: BillingDetailsDto) => dto.taxCode !== '')
  @Matches(/^\d{10}(-\d{3})?$/, { message: 'Mã số thuế gồm 10 số, hoặc 10 số - 3 số' })
  taxCode!: string;

  @ApiProperty({ description: 'Email nhận hoá đơn' })
  @Transform(trimmed)
  @IsString()
  @ValidateIf((dto: BillingDetailsDto) => dto.email !== '')
  @IsEmail({}, { message: 'Email nhận hoá đơn không hợp lệ' })
  @MaxLength(254)
  email!: string;
}

export interface BillingDetails {
  company: string;
  taxCode: string;
  email: string;
}
