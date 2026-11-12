import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { OmitType } from '@nestjs/swagger';
import { CreateSampleOrderDto } from './create-sample-order.dto';

/** One design of a bundle: its own box count and paper, the recipient and the bill are shared by the bundle. */
export class SampleBundleLineDto {
  @ApiProperty({ description: 'ID dự án hộp cần in mẫu thử' })
  @IsUUID(7)
  projectId!: string;

  @ApiProperty({ required: false, default: 1, minimum: 1, maximum: 10, description: 'Số hộp mẫu thử của thiết kế này' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  quantity?: number;

  @ApiProperty({ required: false, description: 'Chất liệu giấy của thiết kế này' })
  @IsOptional()
  @IsString()
  paperStock?: string;
}

/** Several designs ordered together: one order, one bill, paid once. */
export class CreateSampleBundleDto extends OmitType(CreateSampleOrderDto, ['projectId', 'quantity', 'paperStock'] as const) {
  @ApiProperty({ type: [SampleBundleLineDto], description: 'Các thiết kế trong đơn (1–20)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SampleBundleLineDto)
  items!: SampleBundleLineDto[];
}
