import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { trim } from '../../common';

/** Largest grant by hand, in xu (1 xu = 100đ, so 100.000 xu = 10 triệu đồng of AI). */
export const GRANT_LIMIT_XU = 100_000;

export class GrantCreditsDto {
  /** Only xu: export credits are no longer granted, sold or spent (docs/25 item 7). Kept for older admin clients. */
  @ApiPropertyOptional({ enum: [CreditKind.XU], default: CreditKind.XU, description: 'Xu Wrap (export credits: 400)' })
  @IsOptional()
  @IsIn([CreditKind.XU], { message: 'Lượt xuất đã ngừng: chỉ cấp được xu Wrap' })
  kind?: CreditKind;

  @ApiProperty({ example: 500, description: 'Xu to add: 1-100000' })
  @IsInt()
  @Min(1)
  @Max(GRANT_LIMIT_XU)
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
