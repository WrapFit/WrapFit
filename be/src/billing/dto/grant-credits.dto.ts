import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { trim } from '../../common';

/** Largest grant by hand: export credits, or xu (1 xu = 100đ, so 100.000 xu = 10 triệu đồng of AI). */
export const GRANT_LIMITS: Record<CreditKind, number> = { EXPORT: 100, XU: 100_000 };

export class GrantCreditsDto {
  @ApiPropertyOptional({ enum: CreditKind, default: CreditKind.EXPORT, description: 'Export credits or xu Wrap' })
  @IsOptional()
  @IsEnum(CreditKind)
  kind?: CreditKind;

  @ApiProperty({ example: 5, description: 'Credits to add: 1-100 export credits, or 1-100000 xu' })
  @IsInt()
  @Min(1)
  @Max(GRANT_LIMITS.XU)
  quantity: number;

  @ApiPropertyOptional({ example: 30, description: 'Days until the lot expires; omitted = never expires' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;

  @ApiPropertyOptional({ example: 'Tài khoản demo CP4' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  note?: string;
}
