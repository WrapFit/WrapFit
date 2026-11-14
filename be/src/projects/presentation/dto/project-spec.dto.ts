// Request DTOs for the JSON columns of a project. They implement the contracts of `@wrapfit/shared`,
// so a change in the shared types breaks this file at compile time instead of silently in production.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  CanvasElementStyle,
  CanvasElementType,
  ElementFinish,
  ElementFit,
  ElementRole,
  ImageMask,
  PrintSide,
  ShapeKind,
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
const ELEMENT_TYPES = Object.keys({ text: true, logo: true, image: true, pattern: true, barcode: true, shape: true } satisfies Record<
  CanvasElementType,
  true
>);

export const MAX_CANVAS_ELEMENTS = 300;

/** Grid of a divider insert (docs/23 S18). */
export class CellsDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(4)
  rows: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(6)
  cols: number;
}

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

  @ApiPropertyOptional({ type: () => CellsDto, description: 'Cells of a divider insert: rows along W × columns along L (default 2 × 3)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CellsDto)
  cells?: CellsDto;

  @ApiPropertyOptional({ description: 'Display window with a PET film: front of a tuck-top box, top of a lid & base lid', example: true })
  @IsOptional()
  @IsBoolean()
  window?: boolean;
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

const keysOf = <T extends string>(record: Record<T, true>) => Object.keys(record) as T[];
const ROLES = keysOf<ElementRole>({ artwork: true, background: true });
const SIDES = keysOf<PrintSide>({ outside: true, inside: true });
const FINISHES = keysOf<ElementFinish>({
  foil_gold: true,
  foil_silver: true,
  foil_rose: true,
  spot_uv: true,
  emboss: true,
  deboss: true,
});
const SHAPE_KINDS = keysOf<ShapeKind>({ rect: true, ellipse: true, line: true, arrow: true, star: true, polygon: true, frame: true });
const FITS = keysOf<ElementFit>({ fill: true, fit: true, tile: true });
const MASKS = keysOf<ImageMask>({ rect: true, rounded: true, circle: true, arch: true });
const ANCHOR_H = ['left', 'center', 'right', 'stretch'] as const;
const ANCHOR_V = ['top', 'middle', 'bottom', 'stretch'] as const;

type Style = CanvasElementStyle;

export class GradientStopDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  offset: number;

  @Matches(HEX_COLOR, { message: HEX_COLOR_MESSAGE })
  color: string;
}

export class GradientDto implements NonNullable<Style['gradient']> {
  @IsIn(['linear', 'radial'])
  type: 'linear' | 'radial';

  @IsOptional()
  @IsNumber()
  @Min(-360)
  @Max(360)
  angle?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => GradientStopDto)
  stops: GradientStopDto[];
}

/** One colour of an SVG logo swapped for another (docs/23 S14). */
export class ColorSwapDto {
  @Matches(HEX_COLOR, { message: HEX_COLOR_MESSAGE })
  from: string;

  @Matches(HEX_COLOR, { message: HEX_COLOR_MESSAGE })
  to: string;
}

export class ImageFiltersDto implements NonNullable<Style['filters']> {
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  brightness?: number;

  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  contrast?: number;

  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  saturation?: number;
}

export class CanvasElementStyleDto implements Style {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(FONT_FAMILY, { message: '$property must be a list of font names' })
  fontFamily?: string;

  /** Uploaded font file of the text (docs/23 S13): an upload of WrapFit, checked by ProjectsService. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  fontUrl?: string;

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

  @IsOptional()
  @IsIn([400, 700])
  fontWeight?: 400 | 700;

  @IsOptional()
  @IsIn(['normal', 'italic'])
  fontStyle?: 'normal' | 'italic';

  @IsOptional()
  @IsIn(['none', 'underline'])
  textDecoration?: 'none' | 'underline';

  @IsOptional()
  @IsIn(['left', 'center', 'right'])
  textAlign?: 'left' | 'center' | 'right';

  @IsOptional()
  @IsNumber()
  @Min(0.8)
  @Max(3)
  lineHeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(-200)
  @Max(1000)
  letterSpacing?: number;

  @IsOptional()
  @IsIn(['none', 'uppercase', 'lowercase'])
  textTransform?: 'none' | 'uppercase' | 'lowercase';

  @IsOptional()
  @IsNumber()
  @Min(-360)
  @Max(360)
  curve?: number;

  @IsOptional()
  @Matches(HEX_COLOR, { message: HEX_COLOR_MESSAGE })
  strokeColor?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  strokeWidth?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => GradientDto)
  gradient?: GradientDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImageFiltersDto)
  filters?: ImageFiltersDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  cmyk?: [number, number, number, number];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[\p{L}\p{N} ._-]*$/u, { message: '$property must be a short Pantone reference' })
  pantoneNote?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @ValidateNested({ each: true })
  @Type(() => ColorSwapDto)
  colorMap?: ColorSwapDto[];
}

export class ElementAnchorDto implements NonNullable<CanvasElement['anchor']> {
  @IsIn(ANCHOR_H)
  h: (typeof ANCHOR_H)[number];

  @IsIn(ANCHOR_V)
  v: (typeof ANCHOR_V)[number];
}

export class ElementCropDto implements NonNullable<CanvasElement['crop']> {
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  width: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  height: number;
}

export class ElementShapeDto implements NonNullable<CanvasElement['shape']> {
  @IsIn(SHAPE_KINDS)
  kind: ShapeKind;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  cornerRadius?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(12)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  innerRatio?: number;
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
   * sticker label; "" for a shape. URLs of other sites and data URLs are refused (400 FILE_URL_NOT_ALLOWED,
   * ProjectsService).
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

  @IsOptional()
  @IsIn(SIDES)
  side?: PrintSide;

  @IsOptional()
  @IsIn(ROLES)
  role?: ElementRole;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  groupId?: string | null;

  @IsOptional()
  @IsBoolean()
  flipX?: boolean;

  @IsOptional()
  @IsBoolean()
  flipY?: boolean;

  @IsOptional()
  @IsIn(FINISHES)
  finish?: ElementFinish | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ElementAnchorDto)
  anchor?: ElementAnchorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ElementCropDto)
  crop?: ElementCropDto;

  @IsOptional()
  @IsIn(MASKS)
  mask?: ImageMask | null;

  @IsOptional()
  @IsIn(FITS)
  fit?: ElementFit;

  @IsOptional()
  @ValidateNested()
  @Type(() => ElementShapeDto)
  shape?: ElementShapeDto;
}

export class CustomFontDto {
  @IsString()
  @MaxLength(60)
  @Matches(FONT_FAMILY, { message: '$property must be a font name' })
  family: string;

  @IsString()
  @MaxLength(2048)
  url: string;
}

export class CanvasStateDto implements CanvasState {
  @ApiPropertyOptional({ type: [Object], description: 'Fonts uploaded for the design (docs/23 S13)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomFontDto)
  customFonts?: CustomFontDto[];

  @ApiPropertyOptional({ example: 2, description: "Version of the canvas format (CANVAS_SCHEMA_VERSION)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  schemaVersion?: number;

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
  @IsIn(['matte-lamination', 'gloss-lamination', 'soft-touch-lamination', 'foil', 'spot-uv', 'emboss'], { each: true })
  finishes?: string[];
}
