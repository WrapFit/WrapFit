import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankTxStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const BANK_TX_MAX_LIMIT = 100;

export class BankTransactionsQueryDto {
  @ApiPropertyOptional({ enum: BankTxStatus, description: 'Omitted = all statuses' })
  @IsOptional()
  @IsEnum(BankTxStatus)
  status?: BankTxStatus;

  @ApiPropertyOptional({ description: '`nextBefore` of the previous page; omitted = from now' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  @ApiPropertyOptional({ default: 30, maximum: BANK_TX_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BANK_TX_MAX_LIMIT)
  limit?: number;
}

export const RESOLVE_ACTIONS = ['assign', 'ignore'] as const;

const trimmed = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** `action: 'assign'` needs `paymentReference`, `action: 'ignore'` needs `note`. */
export class ResolveBankTransactionDto {
  @ApiProperty({ enum: RESOLVE_ACTIONS })
  @IsIn(RESOLVE_ACTIONS)
  action!: (typeof RESOLVE_ACTIONS)[number];

  @ApiPropertyOptional({ description: 'assign: reference `WF…` of the payment this transfer pays for' })
  @ValidateIf((dto: ResolveBankTransactionDto) => dto.action === 'assign')
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^WF[A-HJ-NP-Z2-9]{6}$/, { message: 'paymentReference must look like WFXXXXXX' })
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'ignore: why (required); assign: optional remark' })
  @ValidateIf((dto: ResolveBankTransactionDto) => dto.action === 'ignore' || dto.note !== undefined)
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty({ message: 'note must not be empty' })
  @MaxLength(500)
  note?: string;
}
