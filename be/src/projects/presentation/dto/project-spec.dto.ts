// Request DTOs for the JSON columns of a project. They implement the contracts of `@wrapfit/shared`,
// so a change in the shared types breaks this file at compile time instead of silently in production.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CanvasElement,
  CanvasElementType,
  MaterialSpecification,
  MaterialType,
} from '@wrapfit/shared';
import type { CanvasState } from '../../domain/project.types';

/** Editor presets (pattern, palette, paper look) are ids, never raw SVG / CSS that a public page would render. */
const PRESET_ID = /^[a-z0-9_-]{1,40}$/;
const PRESET_ID_MESSAGE = '$property must be a preset id (a-z, 0-9, _ and -, at most 40 characters)';

// `satisfies Record<Union, true>` makes the compiler fail when IT2 adds a value to the shared union.
const MATERIAL_TYPES = Object.keys({ ivory: true, kraft: true, duplex: true } satisfies Record<MaterialType, true>);
const MATERIAL_FINISHES = Object.keys({ matte: true, glossy: true, raw: true } satisfies Record<
  MaterialSpecification['finish'],
  true
>);
const ELEMENT_TYPES = Object.keys({ text: true, logo: true, image: true, pattern: true, barcode: true } satisfies Record<
  CanvasElementType,
  true
>);

export const MAX_CANVAS_ELEMENTS = 300;

/** Static bounds only; the exact range per box type comes from the template (`formula_schema.params`). */
export class BoxDimensionsDto {
  @ApiProperty({ description: 'Length L (mm)', example: 120 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(2000)
  length: number;

  @ApiProperty({ description: 'Width W (mm)', example: 80 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(2000)
  width: number;

  @ApiProperty({ description: 'Height H (mm)', example: 60 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(2000)
  height: number;

  @ApiPropertyOptional({ description: 'Paper thickness t (mm). Defaults to materialSpec.caliper', example: 0.35 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.05)
  @Max(5)
  paperThickness?: number;

  @ApiPropertyOptional({ description: 'Gift weight (g). Above 300 g a tuck-top box gets a crash-lock bottom (FEFCO 0215)', example: 350 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(20000)
  giftWeight?: number;

  @ApiPropertyOptional({ enum: ['tuck', 'lock'], description: 'Bottom of a tuck-top box; overrides the choice made from giftWeight' })
  @IsOptional()
  @IsIn(['tuck', 'lock'])
  bottomType?: 'tuck' | 'lock';
}

export class MaterialSpecDto implements MaterialSpecification {
  @ApiProperty({ enum: MATERIAL_TYPES, example: 'kraft' })
  @IsIn(MATERIAL_TYPES)
  type: MaterialType;

  @ApiProperty({ example: 300 })
  @IsInt()
  @Min(100)
  @Max(1000)
  gsm: number;

  @ApiProperty({ description: 'Thickness (mm)', example: 0.4 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.05)
  @Max(5)
  caliper: number;

  @ApiProperty({ enum: MATERIAL_FINISHES, example: 'matte' })
  @IsIn(MATERIAL_FINISHES)
  finish: MaterialSpecification['finish'];
}

/** `#RGB`, `#RRGGBB` or `#RRGGBBAA`: a public page or a print file never receives CSS / SVG syntax as a color. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const HEX_COLOR_MESSAGE = '$property must be a #RGB, #RRGGBB or #RRGGBBAA color';
/** A CSS font-family list (`'Big Shoulders Display', sans-serif`): names, commas and quotes only. */
const FONT_FAMILY = /^[\p{L}\p{N} ,'"_-]+$/u;

export class CanvasElementStyleDto implements NonNullable<CanvasElement['style']> {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(FONT_FAMILY, { message: '$property must be a list of font names' })
  fontFamily?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  fontSize?: number;

  @IsOptional()
  @Matches(HEX_COLOR, { message: HEX_COLOR_MESSAGE })
  color?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: HEX_COLOR_MESSAGE })
  fillColor?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;
}

export class CanvasElementDto implements CanvasElement {
  @IsString()
  @MaxLength(64)
  id: string;

  @IsIn(ELEMENT_TYPES)
  type: CanvasElementType;

  @IsString()
  @MaxLength(64)
  panelId: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  x: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  y: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  width: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  height: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  rotation: number;

  /**
   * Text, or for a logo / image / pattern the URL of a file uploaded to WrapFit, a path of the frontend or a built-in
   * sticker label. URLs of other sites and data URLs are refused (400 FILE_URL_NOT_ALLOWED, ProjectsService).
   */
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CanvasElementStyleDto)
  style?: CanvasElementStyleDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2400)
  dpi?: number;
}

export class CanvasStateDto implements CanvasState {
  @ApiProperty({ type: [Object], description: 'CanvasElement[] from @wrapfit/shared', example: [] })
  @IsArray()
  @ArrayMaxSize(MAX_CANVAS_ELEMENTS)
  @ValidateNested({ each: true })
  @Type(() => CanvasElementDto)
  elements: CanvasElementDto[];

  @ApiPropertyOptional({ nullable: true, example: 'tet', description: 'Seamless pattern preset behind the artwork' })
  @IsOptional()
  @Matches(PRESET_ID, { message: PRESET_ID_MESSAGE })
  backgroundPattern?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'earthy_olive', description: 'Color palette of the editor' })
  @IsOptional()
  @Matches(PRESET_ID, { message: PRESET_ID_MESSAGE })
  backgroundTheme?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'forest',
    description: 'Paper look of the editor; the printable stock is `materialSpec`',
  })
  @IsOptional()
  @Matches(PRESET_ID, { message: PRESET_ID_MESSAGE })
  materialTheme?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['matte-lamination', 'foil'], description: 'Finishes of the print shop (QuoteFinish)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(['matte-lamination', 'gloss-lamination', 'soft-touch-lamination', 'foil', 'spot-uv'], { each: true })
  finishes?: string[];
}
