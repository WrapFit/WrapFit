import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { PROVINCE_CODES } from '@wrapfit/shared';
import { SampleBundleLineDto } from './create-sample-bundle.dto';

export class MatchLineDto extends PickType(SampleBundleLineDto, ['projectId', 'quantity'] as const) {}

/** The designs of a sample order and where it goes: which shops can print it, ranked (docs/19 G.3). */
export class MatchSampleShopsDto {
  @ApiPropertyOptional({ enum: PROVINCE_CODES, description: 'Tỉnh / thành nhận hàng; bỏ trống thì không xét khoảng cách' })
  @IsOptional()
  @IsIn(PROVINCE_CODES as string[])
  provinceCode?: string;

  @ApiProperty({ type: [MatchLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MatchLineDto)
  items!: MatchLineDto[];
}
