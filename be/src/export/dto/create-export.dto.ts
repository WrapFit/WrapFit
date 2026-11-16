import { ApiProperty } from '@nestjs/swagger';
import { ExportFileType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateExportDto {
  @ApiProperty({
    enum: ExportFileType,
    description:
      'PDF_CMYK = print shop, PDF_A4_PRINT = home printing with crop marks, SVG = Cricut / laser cutter, ' +
      'DXF = CNC die-cutting machine, PRINT_PACKAGE = ZIP for the print shop (.ai source, PDF, JPG proof, SVG, DXF, checklist)',
  })
  @IsEnum(ExportFileType)
  fileType: ExportFileType;
}
