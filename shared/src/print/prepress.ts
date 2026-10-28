/**
 * Prepress rules of the print files (checklist of the print shop): one place for the export worker, the offline export
 * of the editor and FitCheck, so the numbers the user reads are the ones the files are made with.
 *
 * 1. Colour: artwork in CMYK (texts, logos, images, patterns); dielines are spot colours (CutContour / Crease).
 * 2. Fonts: every text is drawn as vector outlines, no font is needed to open the file.
 * 3. Images: at least 300 DPI at their printed size, embedded in the file.
 * 4. Bleed 2–3 mm past the cut line; content at least 5 mm inside the cut line (3 mm from a fold).
 * 5. Lines and strokes at least 0.15 mm.
 * 6. Barcodes and QR codes in plain black K100 on white.
 * 7. Delivery: the editable source (AI, PDF compatible) with a PDF and a JPG proof.
 */

/** Text, logos, images and barcodes stay this far inside a cut line (the die can drift), mm. */
export const SAFE_MARGIN_CUT_MM = 5;
/** ...and this far from a fold (the crease cracks the ink), mm. */
export const SAFE_MARGIN_CREASE_MM = 3;
/** Backgrounds that reach a cut line run at least this far past it, mm. */
export const BLEED_MM = 2;
/** Bleed the print file keeps around the dielines (PDF BleedBox) and the 1-click fix extends backgrounds to, mm. */
export const BLEED_BOX_MM = 3;
/** Raster images print sharp from this resolution at their printed size. */
export const PRINT_DPI = 300;
/** Below this the image prints visibly blurry: FitCheck blocks the export. */
export const HARD_MIN_DPI = 150;
/** Thinnest line or stroke the ink still holds on paper, mm. */
export const MIN_LINE_MM = 0.15;

/** CMYK percentages (0-100). */
export type Cmyk = [number, number, number, number];

/** Plain black: barcodes, QR codes and small text (one plate, never out of register). */
export const K100: Cmyk = [0, 0, 0, 100];
/**
 * Rich black for large dark areas: K100 alone prints dark grey there. Total ink 240 %, under the 300 % most shops
 * accept; ask the shop for its own mix before a large run.
 */
export const RICH_BLACK: Cmyk = [60, 40, 40, 100];
/** Texts from this size (pt) are large areas: black prints as rich black; smaller texts stay K100. */
export const RICH_BLACK_MIN_FONT_PT = 36;

/** Naive RGB (0-255) -> CMYK (0-100) with full black generation; the print shop does the final colour management. */
export function rgbToCmyk(r: number, g: number, b: number): Cmyk {
  const max = Math.max(r, g, b) / 255;
  if (max === 0) return [...K100];
  const k = 1 - max;
  const c = (value: number) => Math.round(((1 - value / 255 - k) / (1 - k)) * 100);
  return [c(r), c(g), c(b), Math.round(k * 100)];
}

/** `#RRGGBB` (or `#RGB`) -> CMYK; anything else is black. */
export function hexToCmyk(hex: string): Cmyk {
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  const long = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  const parts = long ? long.slice(1) : short ? short.slice(1).map((h) => h + h) : null;
  if (!parts) return [...K100];
  const [r, g, b] = parts.map((h) => parseInt(h, 16));
  return rgbToCmyk(r, g, b);
}

/** A colour that would print as (almost) plain K: no C, M, Y and at least 95 % K. */
const isNearBlack = ([c, m, y, k]: Cmyk) => k >= 95 && c + m + y <= 5;

/** Ink of a text colour: black becomes rich black on large texts only. */
export function textCmyk(hex: string, fontSizePt: number): Cmyk {
  const cmyk = hexToCmyk(hex);
  return fontSizePt >= RICH_BLACK_MIN_FONT_PT && isNearBlack(cmyk) ? [...RICH_BLACK] : cmyk;
}

/**
 * RGBA pixels -> CMYK pixels (4 bytes each, 0-255) and the alpha channel (null when the image is opaque).
 * `richBlack`: near-black pixels print as RICH_BLACK (photos and backgrounds); off for logos, whose small black text
 * must stay on one plate.
 */
export function rgbaToCmyk(
  rgba: ArrayLike<number>,
  options: { richBlack?: boolean } = {}
): { cmyk: Uint8Array; alpha: Uint8Array | null } {
  const count = Math.floor(rgba.length / 4);
  const cmyk = new Uint8Array(count * 4);
  const alpha = new Uint8Array(count);
  let opaque = true;
  const rich = RICH_BLACK.map((v) => Math.round((v / 100) * 255));
  for (let i = 0; i < count; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3];
    alpha[i] = a;
    if (a !== 255) opaque = false;
    const max = Math.max(r, g, b);
    if (options.richBlack && max <= 13) {
      cmyk.set(rich, i * 4);
      continue;
    }
    if (max === 0) {
      cmyk[i * 4 + 3] = 255;
      continue;
    }
    // Same formula as rgbToCmyk, kept in 0-255 for speed.
    cmyk[i * 4] = Math.round(((max - r) / max) * 255);
    cmyk[i * 4 + 1] = Math.round(((max - g) / max) * 255);
    cmyk[i * 4 + 2] = Math.round(((max - b) / max) * 255);
    cmyk[i * 4 + 3] = 255 - max;
  }
  return { cmyk, alpha: opaque ? null : alpha };
}

/** Pixels an image needs to print at PRINT_DPI over `mm`. */
export const pixelsFor = (mm: number, dpi = PRINT_DPI) => Math.ceil((mm / 25.4) * dpi);

/** Effective resolution of an image of `pixels` printed over `mm`. */
export const effectiveDpi = (pixels: number, mm: number) => (mm > 0 ? Math.round(pixels / (mm / 25.4)) : 0);
