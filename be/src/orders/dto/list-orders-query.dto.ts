import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Filters of `GET /orders` (ADMIN, PRINT_SHOP). A print shop account always sees its own shop only. */
export class ListOrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Lọc theo xưởng (chỉ ADMIN; PRINT_SHOP luôn là xưởng của mình)' })
  @IsOptional()
  @IsString()
  printShopId?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}
