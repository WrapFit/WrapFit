import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class InspectFontDto {
  @ApiProperty({ description: 'Public URL of a font uploaded with purpose FONT' })
  @IsString()
  @MaxLength(2048)
  url: string;
}
