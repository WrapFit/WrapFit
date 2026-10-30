import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFileType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class CreateExportDto {
  @ApiProperty({
    enum: ExportFileType,
    description:
      'PDF_CMYK = print shop, PDF_A4_PRINT = home printing with crop marks, SVG = Cricut / laser cutter, ' +
      'DXF = CNC die-cutting machine, PRINT_PACKAGE = ZIP for the print shop (.ai source, PDF, JPG proof, SVG, DXF, checklist)',
  })
  @IsEnum(ExportFileType)
  fileType: ExportFileType;

  @ApiPropertyOptional({
    description:
      'Spend one export credit to unlock every clean format of this design version (docs/16 §5.2). Without it a ' +
      'design that is not unlocked gets the A4 PDF with a watermark, and 402 EXPORT_CREDIT_REQUIRED for other formats',
  })
  @IsOptional()
  @IsBoolean()
  useCredit?: boolean;
}
