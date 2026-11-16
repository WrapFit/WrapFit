/**
 * Prepress rules of the print files (checklist of the print shop): one place for the export worker, the offline export
 * of the editor and FitCheck, so the numbers the user reads are the ones the files are made with.
 *
 * 1. Colour: artwork in CMYK (texts, logos, images, patterns), large dark areas in rich black; dielines are spot
 *    colours (CutContour / Crease).
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

/**
 * A dark neutral the eye reads as black (#000, #161616, warm #1C1917): at least 85 % K and little C, M, Y. On a large
 * area K alone prints dark grey, so these print as rich black there.
 */
const isDarkNeutral = ([c, m, y, k]: Cmyk) => k >= 85 && Math.max(c, m, y) <= 25;

/** Ink of a text colour: black becomes rich black on large texts only. */
export function textCmyk(hex: string, fontSizePt: number): Cmyk {
  const cmyk = hexToCmyk(hex);
  return fontSizePt >= RICH_BLACK_MIN_FONT_PT && isDarkNeutral(cmyk) ? [...RICH_BLACK] : cmyk;
}

/** Vector fills from this size (bounding box, mm²) are large areas: 2 × 2 cm, about a 36 pt letter. */
export const RICH_BLACK_MIN_AREA_MM2 = 400;

/**
 * Ink of a vector fill (library backgrounds, stickers, shapes) covering `areaMm2`: a near-black fill becomes rich
 * black on a large area (a black carrier, a dark background), small ones stay as they are (one plate, no register).
 */
export function areaCmyk(hex: string, areaMm2: number): Cmyk {
  const cmyk = hexToCmyk(hex);
  return areaMm2 >= RICH_BLACK_MIN_AREA_MM2 && isDarkNeutral(cmyk) ? [...RICH_BLACK] : cmyk;
}

/**
 * Area of the bounding box of absolute SVG path data (M L H V C Q Z), mm², control points included. 0 for anything
 * else (relative or arc commands): such a fill keeps its plain ink.
 */
export function pathBoxArea(d: string): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let x = 0;
  let y = 0;
  for (const [, command, args] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const n = (args.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    if (command === "Z") continue;
    if (command === "H") n.forEach((v) => (x = v));
    else if (command === "V") n.forEach((v) => (y = v));
    else if ("MLCQ".includes(command)) {
      for (let i = 0; i + 1 < n.length; i += 2) {
        [x, y] = [n[i], n[i + 1]];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      continue;
    } else return 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return maxX > minX && maxY > minY ? (maxX - minX) * (maxY - minY) : 0;
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

/** Fold marks of a home-printed sheet: a tick this far past the end of each crease, this long, mm. */
export const FOLD_TICK_MM = { gap: 1.5, length: 5 };

const inside = ([px, py]: [number, number], polygon: [number, number][]) => {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

/**
 * Fold marks for a sheet printed at home: the fold lines themselves would print across the artwork (dashed lines on the
 * finished box), so each crease that ends on the cut outline gets a short tick in the margin, in line with it, instead.
 * Lines [x1, y1, x2, y2] in sheet mm.
 */
export function foldTicks(strokes: readonly { type: "cut" | "crease"; points: [number, number][]; closed: boolean }[]): [number, number, number, number][] {
  const outlines = strokes.filter((s) => s.type === "cut" && s.closed && s.points.length >= 3).map((s) => s.points);
  const outside = (p: [number, number]) => !outlines.some((polygon) => inside(p, polygon));
  const ticks: [number, number, number, number][] = [];
  for (const crease of strokes.filter((s) => s.type === "crease" && s.points.length >= 2)) {
    const pts = crease.points;
    for (const [end, before] of [
      [pts[0], pts[1]],
      [pts[pts.length - 1], pts[pts.length - 2]],
    ] as const) {
      const len = Math.hypot(end[0] - before[0], end[1] - before[1]);
      if (len < 1e-6) continue;
      const ux = (end[0] - before[0]) / len;
      const uy = (end[1] - before[1]) / len;
      const from: [number, number] = [end[0] + ux * FOLD_TICK_MM.gap, end[1] + uy * FOLD_TICK_MM.gap];
      const to: [number, number] = [from[0] + ux * FOLD_TICK_MM.length, from[1] + uy * FOLD_TICK_MM.length];
      if (outside(from) && outside(to)) ticks.push([from[0], from[1], to[0], to[1]]);
    }
  }
  return ticks;
}

/** Pixels an image needs to print at PRINT_DPI over `mm`. */
export const pixelsFor = (mm: number, dpi = PRINT_DPI) => Math.ceil((mm / 25.4) * dpi);

/** Effective resolution of an image of `pixels` printed over `mm`. */
export const effectiveDpi = (pixels: number, mm: number) => (mm > 0 ? Math.round(pixels / (mm / 25.4)) : 0);
