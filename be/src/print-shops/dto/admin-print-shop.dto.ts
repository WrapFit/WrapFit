import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PrintShopStatus } from '@prisma/client';
import { LAMINATIONS, PROVINCE_CODES } from '@wrapfit/shared';

const METHODS = ['digital', 'offset'];
const PAPERS = ['ivory', 'kraft', 'duplex', 'rigid'];
const FINISHES = [...LAMINATIONS, 'foil', 'spot-uv', 'emboss'];

export class SheetSizeDto {
  @ApiProperty() @IsInt() @Min(100) @Max(2000) width!: number;
  @ApiProperty() @IsInt() @Min(100) @Max(2000) height!: number;
}

/** Fields an admin edits on a shop (docs/19 B.1). Every field optional: PATCH changes only what it sends. */
export class UpdatePrintShopDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) legalName?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[0-9]{10}(-[0-9]{3})?$/, { message: 'Mã số thuế gồm 10 số (hoặc 10 số - 3 số)' }) taxCode?: string;
  @ApiPropertyOptional({ enum: PROVINCE_CODES }) @IsOptional() @IsIn(PROVINCE_CODES as string[]) provinceCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(8) @Max(24) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(102) @Max(110) longitude?: number;
  @ApiPropertyOptional({ description: 'Nhãn khổ máy, ví dụ "B1 · 1020 × 720 mm"' }) @IsOptional() @IsString() @MaxLength(60) sheet?: string;
  @ApiPropertyOptional({ type: SheetSizeDto }) @IsOptional() @ValidateNested() @Type(() => SheetSizeDto) maxSheetMm?: SheetSizeDto;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) services?: string[];
  @ApiPropertyOptional({ enum: METHODS, isArray: true }) @IsOptional() @IsArray() @IsIn(METHODS, { each: true }) methods?: string[];
  @ApiPropertyOptional({ enum: PAPERS, isArray: true }) @IsOptional() @IsArray() @IsIn(PAPERS, { each: true }) papers?: string[];
  @ApiPropertyOptional({ enum: FINISHES, isArray: true }) @IsOptional() @IsArray() @IsIn(FINISHES, { each: true }) finishes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() windowPatching?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) minQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(1_000_000) maxQuantity?: number;
  @ApiPropertyOptional({ description: 'Nhãn thời gian làm hiện cho khách' }) @IsOptional() @IsString() @MaxLength(80) leadTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(60) leadTimeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(30) sampleLeadTimeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10_000) dailyCapacity?: number;
  @ApiPropertyOptional({ description: 'Tỉnh giao được; rỗng = toàn quốc' })
  @IsOptional()
  @IsArray()
  @IsIn(PROVINCE_CODES as string[], { each: true })
  serviceProvinces?: string[];
  @ApiPropertyOptional({ enum: PrintShopStatus }) @IsOptional() @IsEnum(PrintShopStatus) status?: PrintShopStatus;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsISO8601() pausedUntil?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsISO8601() probationUntil?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(5) rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) zalo?: string;
  @ApiPropertyOptional({ description: 'Phí nền tảng theo hợp đồng, phần vạn (1500 = 15 %). Đơn cũ giữ tỷ lệ lúc đặt' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5000)
  platformFeeBps?: number;
}

export class CreatePrintShopDto extends PartialType(UpdatePrintShopDto) {
  @ApiProperty({ description: 'Mã xưởng, ví dụ ps-hn-05' })
  @Matches(/^ps-[a-z]{2,4}-[0-9]{2,3}$/, { message: 'Mã xưởng có dạng ps-<vùng>-<số>, ví dụ ps-hn-05' })
  id!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) declare name: string;
  @ApiProperty({ enum: PROVINCE_CODES }) @IsIn(PROVINCE_CODES as string[]) declare provinceCode: string;
  @ApiProperty() @IsString() @MaxLength(80) declare city: string;
  @ApiProperty() @IsString() @MaxLength(300) declare address: string;
  @ApiProperty() @IsNumber() @Min(8) @Max(24) declare latitude: number;
  @ApiProperty() @IsNumber() @Min(102) @Max(110) declare longitude: number;
  @ApiProperty() @IsString() @MaxLength(60) declare sheet: string;
  @ApiProperty({ type: SheetSizeDto }) @ValidateNested() @Type(() => SheetSizeDto) declare maxSheetMm: SheetSizeDto;
  @ApiProperty() @IsString() @MaxLength(80) declare leadTime: string;
  @ApiProperty() @IsInt() @Min(0) @Max(60) declare leadTimeDays: number;
  @ApiProperty() @IsInt() @Min(0) @Max(30) declare sampleLeadTimeDays: number;
  @ApiProperty() @IsEmail() declare contactEmail: string;
  @ApiProperty() @IsString() @MaxLength(30) declare phone: string;
}
