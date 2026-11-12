import { Role } from '@prisma/client';
import { IsBoolean, IsEnum } from 'class-validator';
import { IsOptionalNotNull } from '../../common';

export class AdminUpdateUserDto {
  @IsOptionalNotNull()
  @IsEnum(Role)
  role?: Role;

  @IsOptionalNotNull()
  @IsBoolean()
  isActive?: boolean;

  /** Demo accounts pay through the VNPay sandbox instead of a real bank transfer (docs/21 D3). */
  @IsOptionalNotNull()
  @IsBoolean()
  isDemo?: boolean;
}
