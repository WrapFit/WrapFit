// Checks of a file an admin imports into the shared library. Plain functions (no DI) so they are tested on their own.
import { PRINT_DPI } from '@wrapfit/shared';
import sharp, { type Metadata } from 'sharp';

/** Licences that allow printing the asset on a product that is sold. `attribution`: the credit line is required. */
export const LIBRARY_LICENSES = [
  { id: 'CC0-1.0', name: 'CC0 / Public Domain Dedication', attribution: false },
  { id: 'PUBLIC-DOMAIN', name: 'Public domain (hết bảo hộ)', attribution: false },
  { id: 'OFL-1.1', name: 'SIL Open Font License 1.1', attribution: false },
  { id: 'MIT', name: 'MIT', attribution: false },
  { id: 'ISC', name: 'ISC', attribution: false },
  { id: 'APACHE-2.0', name: 'Apache 2.0', attribution: false },
  { id: 'CC-BY-4.0', name: 'CC BY 4.0 (ghi nguồn)', attribution: true },
  { id: 'OWN-WORK', name: 'WrapFit tự thiết kế', attribution: false },
  { id: 'COMMERCIAL', name: 'Đã mua bản quyền thương mại', attribution: false },
] as const;
export const LIBRARY_LICENSE_IDS = LIBRARY_LICENSES.map((license) => license.id);

/** A raster must print at PRINT_DPI over at least this long side (mm): smaller files are useless on a box. */
export const MIN_RASTER_PRINT_MM = 50;

const SVG_RULES: [RegExp, string][] = [
  [/<script[\s>]/i, 'chứa <script>'],
  [/\son[a-z]+\s*=/i, 'chứa thuộc tính sự kiện (onload, onclick…)'],
  [/<foreignObject[\s>]/i, 'chứa <foreignObject>'],
  [/javascript:/i, 'chứa liên kết javascript:'],
  [/<!ENTITY/i, 'khai báo ENTITY'],
  [/<(iframe|embed|object)[\s>]/i, 'nhúng iframe / embed / object'],
  // Every reference must stay inside the file (#id) or be an embedded image (data:image/…).
  [/(?:xlink:)?href\s*=\s*["'](?!#|data:image\/)/i, 'liên kết ra file bên ngoài'],
  [/url\(\s*["']?(?!#|data:image\/)[a-z]+:/i, 'url() trỏ ra ngoài'],
];

/** Reasons an SVG is refused (empty when it is safe to show to every user and to rasterise in the export worker). */
export function svgProblems(svg: string): string[] {
  if (!/<svg[\s>]/i.test(svg)) return ['không phải file SVG'];
  return SVG_RULES.filter(([rule]) => rule.test(svg)).map(([, reason]) => reason);
}

export interface InspectedLibraryFile {
  isVector: boolean;
  widthPx: number | null;
  heightPx: number | null;
  /** Longest side printable at PRINT_DPI, mm; null for vectors. */
  maxPrintMm: number | null;
}

export class LibraryFileError extends Error {}

/** Reads the file of a library asset; throws LibraryFileError with the reason in Vietnamese when it is refused. */
export async function inspectLibraryFile(file: { body: Buffer; contentType: string }): Promise<InspectedLibraryFile> {
  const head = file.body.subarray(0, 512).toString('utf8');
  const isSvg = file.contentType.includes('svg') || /^\s*(<\?xml|<svg)/i.test(head);
  if (isSvg) {
    const problems = svgProblems(file.body.toString('utf8'));
    if (problems.length) throw new LibraryFileError(`SVG không an toàn: ${problems.join(', ')}.`);
    return { isVector: true, widthPx: null, heightPx: null, maxPrintMm: null };
  }
  let meta: Metadata;
  try {
    meta = await sharp(file.body).metadata();
  } catch {
    throw new LibraryFileError('Không đọc được ảnh (chỉ nhận PNG, JPEG, WebP hoặc SVG).');
  }
  const width = meta.autoOrient?.width ?? meta.width ?? 0;
  const height = meta.autoOrient?.height ?? meta.height ?? 0;
  const maxPrintMm = Math.round((Math.max(width, height) / PRINT_DPI) * 25.4 * 10) / 10;
  if (maxPrintMm < MIN_RASTER_PRINT_MM) {
    throw new LibraryFileError(
      `Ảnh ${width} × ${height} px chỉ in được ${maxPrintMm} mm ở ${PRINT_DPI} DPI; thư viện cần tối thiểu ${MIN_RASTER_PRINT_MM} mm (cạnh dài ≥ ${Math.ceil((MIN_RASTER_PRINT_MM / 25.4) * PRINT_DPI)} px).`,
    );
  }
  return { isVector: false, widthPx: width, heightPx: height, maxPrintMm };
}
