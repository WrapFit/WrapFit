// Print files from a PrintLayout. Units are mm everywhere. Line conventions follow AGENTS.md: cut = solid red,
// crease = dashed blue (4,4). In the PDF they are the spot colors `CutContour` and `Crease` (overprinted), each on its
// own layer, so the print shop's RIP and the die maker find them by name and they never print on the box.
// Prepress rules (`print/prepress.ts` of @wrapfit/shared): artwork in CMYK (images converted pixel by pixel, rich
// black on photos and patterns), every text as vector outlines (no font in the files), images embedded at their full
// resolution (up to 450 DPI), barcodes as vectors in K100 on white, a 3 mm BleedBox.
// Texts use the text model of the editor (`layoutTextBox` of `@wrapfit/shared`) with the same font files.
import {
  barcodeArt,
  BLEED_BOX_MM,
  effectiveDpi,
  ean13Digits,
  hexToCmyk,
  K100,
  layoutTextBox,
  outlineAdvanceMm,
  outlineText,
  pixelsFor,
  rgbaToCmyk,
  textCmyk,
  fitWatermark,
  FINISH_SPOTS,
  applyFilters,
  flipMatrix,
  gradientLine,
  imageDraw,
  isCropped,
  outlineTextOnArc,
  recolorSvg,
  type ImageDraw,
  fontPackagePath,
  underlineOf,
  WATERMARK_COLOR,
  WATERMARK_TEXT,
  watermarkPlacement,
  type Cmyk,
  type MeasureText,
  type OutlineFont,
  type PlacedBase,
  type PrintFontId,
  type TextFace,
} from '@wrapfit/shared';
import { create as createFont, openSync } from 'fontkit';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import sharp from 'sharp';
import type { PrintLayout } from './print-layout';

export { BLEED_BOX_MM, hexToCmyk };

const COLORS = { cut: '#E53E3E', crease: '#3182CE', info: '#64748B' };
/** Spot colors of the dielines with their CMYK alternates (0-100). */
export const SPOT_COLORS = {
  cut: { name: 'CutContour', cmyk: [0, 100, 0, 0] },
  crease: { name: 'Crease', cmyk: [100, 0, 0, 0] },
} as const;
const CMYK_INFO: Cmyk = [0, 0, 0, 60];
const PAPER: Cmyk = [0, 0, 0, 0];
const LINE_MM = 0.25;
const DASH_MM = 4;
const PT_PER_MM = 72 / 25.4;
const INFO_FONT_MM = 3.5;
/** Spec line of the box (name, structure, L x W x H, paper): 6 pt, printed in the margin on the Artwork layer. */
const SPEC_LINE_FONT_MM = 6 / PT_PER_MM;
/** Baseline of the spec line below the cut: its top stays at least 5 mm under the cut, clear of the 3 mm bleed. */
const SPEC_LINE_BELOW_CUT_MM = 5 + SPEC_LINE_FONT_MM;
/** Raster images are downsampled to this at their printed size (the print shop's RIP would do it anyway). */
const MAX_EMBED_DPI = 450;
/** Vector logos (SVG) are rasterised at this resolution for the PDF; the SVG export keeps them as vectors. */
const VECTOR_DPI = 600;
/** Layers of the PDF (Optional Content Groups) and the SVG, bottom to top. `Dimensions` is not printed. */
// No crease layer in the print files: the dashed fold lines printed on the box (docs: business rule CP4). Creases stay
// in the DXF for the die maker only.
export const PRINT_LAYERS = ['Artwork', 'Finish', 'CutContour', 'Dimensions'] as const;

/** Fonts that are not texts of the design: the spec line and dimensions (`info`) and the free-export watermark. */
const EXTRA_FONT_FILES = {
  info: require.resolve('@expo-google-fonts/be-vietnam-pro/400Regular/BeVietnamPro_400Regular.ttf'),
  watermark: require.resolve('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
};
type FontKey = PrintFontId | keyof typeof EXTRA_FONT_FILES;
const fonts = new Map<string, OutlineFont>();
/** A font file of the design (four faces per family, @expo-google-fonts) or one of the extra fonts. */
const fontOf = (id: FontKey, face: TextFace = 'bold'): OutlineFont => {
  const key = `${id}:${face}`;
  if (!fonts.has(key)) {
    const file = id === 'info' || id === 'watermark' ? EXTRA_FONT_FILES[id] : require.resolve(fontPackagePath(id, face));
    fonts.set(key, openSync(file));
  }
  return fonts.get(key)!;
};

const n = (value: number) => Number(value.toFixed(3)).toString();

/** Files of the layout images, by URL (the export worker loads them from storage). Missing URLs are not drawn. */
export type Artwork = Map<string, { body: Buffer; contentType: string }>;

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const specLine = (layout: PrintLayout) =>
  `WrapFit — ${layout.title} — ${layout.structure} ${layout.dimensions.length} x ${layout.dimensions.width} x ${layout.dimensions.height} mm, giấy ${layout.dimensions.paperThickness} mm`;

/** Text widths from the font files, with the shaping of the outlines. */
const measure: MeasureText = (text, font, fontSizeMm, face) => outlineAdvanceMm(fontOf(font, face), text, fontSizeMm);

/** Area of the dielines on the sheet (mm): the trim box of the print file. */
function trimArea(layout: PrintLayout) {
  const right = Math.max(...layout.pieces.map((p) => p.x + p.geometry.totalBoundingBox.width));
  const bottom = Math.max(...layout.pieces.map((p) => p.y + p.geometry.totalBoundingBox.height));
  const left = Math.min(...layout.pieces.map((p) => p.x));
  const top = Math.min(...layout.pieces.map((p) => p.y));
  return { left, top, right, bottom };
}

/** Width and height of every piece, drawn on the Dimensions layer: lines with end ticks and labels (mm). */
function dimensionMarks(layout: PrintLayout) {
  const lines: [number, number, number, number][] = [];
  const labels: { text: string; x: number; y: number; vertical: boolean }[] = [];
  const tick = 1.5;
  for (const piece of layout.pieces) {
    const { width, height } = piece.geometry.totalBoundingBox;
    const y = piece.y - 6;
    lines.push([piece.x, y, piece.x + width, y], [piece.x, y - tick, piece.x, y + tick], [piece.x + width, y - tick, piece.x + width, y + tick]);
    labels.push({ text: `${n(width)} mm`, x: piece.x + width / 2, y: y - 1.5, vertical: false });
    const x = piece.x - 6;
    lines.push([x, piece.y, x, piece.y + height], [x - tick, piece.y, x + tick, piece.y], [x - tick, piece.y + height, x + tick, piece.y + height]);
    labels.push({ text: `${n(height)} mm`, x: x - 1.5, y: piece.y + height / 2, vertical: true });
  }
  const info = { text: specLine(layout), x: layout.pieces[0].x, y: trimArea(layout).bottom + SPEC_LINE_BELOW_CUT_MM };
  return { lines, labels, info };
}

/** Outlines of a one-line label whose baseline starts (or, `centred`, is centred) at (x, y). */
function labelPath(text: string, x: number, y: number, sizeMm: number, centred: boolean, font: FontKey = 'info') {
  const left = centred ? x - outlineAdvanceMm(fontOf(font), text, sizeMm) / 2 : x;
  return outlineText(fontOf(font), text, left, y, sizeMm);
}

/**
 * Outlines of the watermark of the free A4 PDF (docs/16 §5.4), already turned and placed on the sheet (mm), so the
 * path coordinates are sheet coordinates. Null when the layout has nowhere to put it.
 */
export function watermarkOutline(layout: PrintLayout) {
  const placement = watermarkPlacement(layout.pieces);
  if (!placement) return null;
  const font = fontOf('watermark');
  const fit = fitWatermark(placement, (sizeMm) => outlineAdvanceMm(font, WATERMARK_TEXT, sizeMm));
  const { origin, rotation } = fit;
  // outlineText writes every point as "x y": turn each pair around the start of the baseline (-90: x' = y, y' = -x).
  const d = outlineText(font, WATERMARK_TEXT, 0, 0, fit.sizeMm).replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, px: string, py: string) => {
    const [x, y] = rotation === -90 ? [Number(py), -Number(px)] : [Number(px), Number(py)];
    return `${n(origin.x + x)} ${n(origin.y + y)}`;
  });
  return { d, placement, sizeMm: fit.sizeMm };
}

/** Uploaded fonts of a render (docs/23 S13), opened once from the files the worker loaded with the images. */
const uploadedFonts = new WeakMap<Artwork, Map<string, OutlineFont | null>>();
function uploadedFont(artwork: Artwork, url: string | null | undefined): OutlineFont | null {
  if (!url) return null;
  let fonts = uploadedFonts.get(artwork);
  if (!fonts) uploadedFonts.set(artwork, (fonts = new Map()));
  if (!fonts.has(url)) {
    const file = artwork.get(url);
    let font: OutlineFont | null = null;
    try {
      font = file ? createFont(file.body) : null;
    } catch {
      font = null; // not a font: the text falls back to its built-in print font
    }
    fonts.set(url, font);
  }
  return fonts.get(url) ?? null;
}

/** Every text element as outlines (one path per element, underlines included) with its print ink. */
function textOutlines(layout: PrintLayout, artwork: Artwork = new Map()) {
  const measureAny: MeasureText = (text, font, fontSizeMm, face, fontUrl) => {
    const custom = uploadedFont(artwork, fontUrl);
    return custom ? outlineAdvanceMm(custom, text, fontSizeMm) : measure(text, font, fontSizeMm, face);
  };
  return layout.texts.map((t) => {
    const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t.style }, measureAny);
    const font = uploadedFont(artwork, box.fontUrl) ?? fontOf(box.font, box.face);
    const lines = box.lines.filter((line) => line.text);
    const glyphs = lines.map((line) =>
      box.curve
        ? outlineTextOnArc(font, line.text, t.x + t.width / 2, t.y + line.baseline, box.fontSizeMm, box.spacingMm, box.curve)
        : outlineText(font, line.text, t.x + line.x, t.y + line.baseline, box.fontSizeMm, box.spacingMm),
    );
    const bars = box.underline
      ? lines.map((line) => {
          const u = underlineOf(line, box.fontSizeMm);
          const [x, y] = [t.x + u.x, t.y + u.y];
          return `M ${n(x)} ${n(y)} H ${n(x + u.width)} V ${n(y + u.height)} H ${n(x)} Z`;
        })
      : [];
    return { ...t, d: [...glyphs, ...bars].join(' '), cmyk: t.style.cmyk ?? textCmyk(t.color, t.fontSizePt), stroke: box.stroke };
  });
}

/** Every barcode element as vectors: white knockout box, black modules, digits as outlines. */
function barcodeVectors(layout: PrintLayout) {
  return layout.barcodes.flatMap((b) => {
    let qr = null;
    if (!ean13Digits(b.content)) {
      try {
        qr = QRCode.create(b.content, { errorCorrectionLevel: 'M' }).modules;
      } catch {
        return []; // content too long for a QR code: FitCheck shows the element, nothing to print
      }
    }
    const art = barcodeArt(b.content, b.width, b.height, qr);
    if (!art) return [];
    const bars = art.bars
      .map((bar) => {
        const [x, y] = [b.x + bar.x, b.y + bar.y];
        return `M ${n(x)} ${n(y)} H ${n(x + bar.width)} V ${n(y + bar.height)} H ${n(x)} Z`;
      })
      .join(' ');
    const digits = art.digits
      .map((digit) => labelPath(digit.text, b.x + digit.x, b.y + digit.baseline, digit.sizeMm, true, 'inter'))
      .join(' ');
    return [{ ...b, d: `${bars} ${digits}`.trim() }];
  });
}

/** Vector art (`layout.arts`: library art and shapes) with its texts outlined, in the coordinates of the element. */
function artVectors(layout: PrintLayout) {
  return layout.arts.map((a) => ({
    ...a,
    texts: a.art.texts.map((t) => ({ d: labelPath(t.text, t.x, t.baseline, t.size, t.anchor === 'middle', t.font), color: t.color })),
  }));
}

/** Everything of the artwork layer in paint order (the order of the layers in the editor, docs/23 D3). */
type DrawItem =
  | { kind: 'art'; item: ReturnType<typeof artVectors>[number] }
  | { kind: 'image'; item: PrintLayout['images'][number] }
  | { kind: 'text'; item: ReturnType<typeof textOutlines>[number] }
  | { kind: 'barcode'; item: ReturnType<typeof barcodeVectors>[number] };

function drawList(layout: PrintLayout, artwork: Artwork = new Map()): DrawItem[] {
  const items: DrawItem[] = [
    ...artVectors(layout).map((item) => ({ kind: 'art' as const, item })),
    ...layout.images.map((item) => ({ kind: 'image' as const, item })),
    ...textOutlines(layout, artwork).map((item) => ({ kind: 'text' as const, item })),
    ...barcodeVectors(layout).map((item) => ({ kind: 'barcode' as const, item })),
  ];
  return items.sort((a, b) => a.item.order - b.item.order);
}

const centreOf = (b: PlacedBase) => ({ cx: b.x + b.width / 2, cy: b.y + b.height / 2 });

/** SVG of vector art in sheet coordinates (the caller adds the clip, the turn and the mirror). */
let gradientCount = 0;
function artSvg(a: ReturnType<typeof artVectors>[number]): string {
  const defs: string[] = [];
  const fillOf = (s: (typeof a.art.shapes)[number]) => {
    if (!s.gradient) return escapeXml(s.fill ?? 'none');
    const id = `grad${++gradientCount}`;
    const line = gradientLine(s.gradient.angle, a.width, a.height);
    const stops = s.gradient.stops.map((stop) => `<stop offset="${n(stop.offset)}" stop-color="${escapeXml(stop.color)}"/>`).join('');
    defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(line.x1)}" y1="${n(line.y1)}" x2="${n(line.x2)}" y2="${n(line.y2)}">${stops}</linearGradient>`);
    return `url(#${id})`;
  };
  const shapes = a.art.shapes.map(
    (s) =>
      `<path d="${s.d}" fill="${fillOf(s)}"` +
      (s.stroke ? ` stroke="${escapeXml(s.stroke)}" stroke-width="${n(s.strokeWidth ?? LINE_MM)}"` : '') +
      (s.round ? ' stroke-linecap="round" stroke-linejoin="round"' : '') +
      '/>',
  );
  const texts = a.texts.filter((t) => t.d).map((t) => `<path d="${t.d}" fill="${escapeXml(t.color)}"/>`);
  const gradients = defs.length ? `<defs>${defs.join('')}</defs>` : '';
  return `<g transform="translate(${n(a.x)} ${n(a.y)})">${gradients}${shapes.join('')}${texts.join('')}</g>`;
}

/** Layered SVG (layers: artwork, crease, cut, dimensions) for cutting plotters such as Cricut or laser cutters. */
/** An image of the SVG file: its file (cropped and adjusted when needed) and where it lands in its box. */
export interface SvgImage {
  dataUri: string;
  draw: ImageDraw;
}

/** Prepares the images of the SVG print file (crop, fill, adjustments); renderSvg falls back to the plain file. */
export async function svgImages(layout: PrintLayout, artwork: Artwork): Promise<Map<PrintLayout['images'][number], SvgImage>> {
  const prepared = new Map<PrintLayout['images'][number], SvgImage>();
  for (const image of layout.images) {
    const stored = artwork.get(image.url);
    const file = stored && imageFileOf(stored, image);
    if (!file?.contentType.startsWith('image/') || (!isCropped(image) && !image.filters)) continue;
    const source = await sourceSize(file);
    if (!source || source.vector) continue;
    try {
      const draw = imageDraw(image, source);
      let pipeline = sharp(file.body).autoOrient();
      if (isCropped(image)) {
        pipeline = pipeline.extract({ left: Math.round(draw.sx), top: Math.round(draw.sy), width: Math.max(1, Math.round(draw.sw)), height: Math.max(1, Math.round(draw.sh)) });
      }
      const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      applyFilters(data, 4, image.filters ?? undefined);
      const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
      prepared.set(image, { dataUri: `data:image/png;base64,${png.toString('base64')}`, draw: { ...draw, sx: 0, sy: 0, sw: info.width, sh: info.height } });
    } catch {
      // The plain file is embedded instead.
    }
  }
  return prepared;
}

export function renderSvg(layout: PrintLayout, artwork: Artwork = new Map(), images: Map<PrintLayout['images'][number], SvgImage> = new Map()): string {
  let maskCount = 0;
  // Each element is cut to its face + bleed (one clip path per face), then turned and mirrored around its centre.
  const clips = new Map<string, { id: string; box: PlacedBase['clip'] }>();
  const clipId = (box: PlacedBase['clip']) => {
    const key = [box.x, box.y, box.width, box.height].map(n).join(',');
    if (!clips.has(key)) clips.set(key, { id: `face${clips.size + 1}`, box });
    return clips.get(key)!.id;
  };
  const placed = (b: PlacedBase, content: string) => {
    const { cx, cy } = centreOf(b);
    const flip = flipMatrix(b);
    const transform = [b.rotation ? `rotate(${n(b.rotation)} ${n(cx)} ${n(cy)})` : '', flip ? `matrix(${flip.map(n).join(' ')})` : '']
      .filter(Boolean)
      .join(' ');
    const inner = transform ? `<g transform="${transform}">${content}</g>` : content;
    return `<g clip-path="url(#${clipId(b.clip)})"${b.opacity < 1 ? ` opacity="${n(b.opacity)}"` : ''}>${inner}</g>`;
  };
  const artworkSvg = drawList(layout, artwork)
    .map(({ kind, item }) => {
      if (kind === 'art') return placed(item, artSvg(item));
      if (kind === 'text') {
        if (!item.d) return '';
        // The outline sits under the fill: twice its width, half of it hidden by the letters.
        const outline = item.stroke
          ? ` stroke="${escapeXml(item.stroke.color)}" stroke-width="${n(item.stroke.widthMm * 2)}" stroke-linejoin="round" paint-order="stroke"`
          : '';
        return placed(item, `<path d="${item.d}" fill="${escapeXml(item.color)}"${outline}/>`);
      }
      if (kind === 'barcode') {
        return placed(
          item,
          `<rect x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" fill="#FFFFFF"/>` +
            `<path d="${item.d}" fill="#000000"/>`,
        );
      }
      // Images are embedded as data URIs so the file works offline in Cricut Design Space / Illustrator.
      const stored = artwork.get(item.url);
      const file = stored && imageFileOf(stored, item);
      if (!file?.contentType.startsWith('image/')) return '';
      const ready = images.get(item);
      const picture = ready
        ? `<image x="${n(item.x + ready.draw.dx)}" y="${n(item.y + ready.draw.dy)}" width="${n(ready.draw.dw)}" height="${n(ready.draw.dh)}" preserveAspectRatio="none" href="${ready.dataUri}"/>`
        : `<image x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" preserveAspectRatio="xMidYMid meet"` +
          ` href="data:${escapeXml(file.contentType)};base64,${file.body.toString('base64')}"/>`;
      if (!item.mask) return placed(item, picture);
      // Frame of the photo (rounded, circle, arch): a clip path in the coordinates of its box.
      const id = `mask${++maskCount}`;
      return placed(
        item,
        `<clipPath id="${id}"><path transform="translate(${n(item.x)} ${n(item.y)})" d="${item.mask}"/></clipPath><g clip-path="url(#${id})">${picture}</g>`,
      );
    })
    .join('');
  // Finishes (docs/23 S6): the shapes of each foil / UV / embossed element in the colour of its spot, on their own layer.
  const finishSvg = drawList(layout, artwork)
    .filter(({ item }) => item.finish)
    .map(({ kind, item }) => {
      const colour = escapeXml(FINISH_SPOTS[item.finish!].display);
      const solid = { ...item, opacity: 1 };
      if (kind === 'art') {
        const shapes = item.art.shapes
          .map((sh) => `<path d="${sh.d}" fill="${sh.fill ? colour : 'none'}"${sh.stroke ? ` stroke="${colour}" stroke-width="${n(sh.strokeWidth ?? LINE_MM)}"` : ''}/>`)
          .join('');
        const texts = item.texts.filter((t) => t.d).map((t) => `<path d="${t.d}" fill="${colour}"/>`).join('');
        return placed(solid, `<g transform="translate(${n(item.x)} ${n(item.y)})">${shapes}${texts}</g>`);
      }
      if (kind === 'text' || kind === 'barcode') return item.d ? placed(solid, `<path d="${item.d}" fill="${colour}"/>`) : '';
      return placed(solid, `<rect x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" fill="${colour}"/>`);
    })
    .join('');
  const defs = clips.size
    ? `<defs>${[...clips.values()]
        .map(({ id, box }) => `<clipPath id="${id}"><rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}"/></clipPath>`)
        .join('')}</defs>`
    : '';
  const strokes = (type: 'cut' | 'crease') =>
    layout.strokes.filter((s) => s.type === type).map((s) => `<path d="${escapeXml(s.d)}"/>`).join('');
  const marks = dimensionMarks(layout);
  const layer = (id: string, label: string, attributes: string, content: string) =>
    `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}"${attributes}>${content}</g>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${n(layout.width)}mm" height="${n(layout.height)}mm" viewBox="0 0 ${n(layout.width)} ${n(layout.height)}">` + defs,
    layer(
      'artwork',
      'Artwork',
      '',
      artworkSvg +
        `<path fill="${COLORS.info}" d="${labelPath(marks.info.text, marks.info.x, marks.info.y, SPEC_LINE_FONT_MM, false)}"/>`,
    ),
    ...(finishSvg ? [layer('finish', 'Finish', '', finishSvg)] : []),
    layer('cut', 'CutContour', ` fill="none" stroke="${COLORS.cut}" stroke-width="${LINE_MM}"`, strokes('cut')),
    layer(
      'dimensions',
      'Dimensions',
      ` fill="${COLORS.info}" stroke="${COLORS.info}" stroke-width="0.15"`,
      marks.lines.map(([x1, y1, x2, y2]) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`).join('') +
        marks.labels
          .map(
            (label) =>
              `<path stroke="none" d="${labelPath(label.text, label.x, label.y, INFO_FONT_MM, true)}"` +
              (label.vertical ? ` transform="rotate(-90 ${n(label.x)} ${n(label.y)})"` : '') +
              '/>',
          )
          .join(''),
    ),
    '</svg>',
  ].join('\n');
}

/** An image of the layout ready for the PDF: CMYK pixels, alpha (null when opaque), resolution at its printed size. */
export interface PreparedImage {
  width: number;
  height: number;
  cmyk: Uint8Array;
  alpha: Uint8Array | null;
  /** Resolution of the source at its printed size (vector files: VECTOR_DPI). */
  dpi: number;
  /** Where the pixels land in the element box, mm. */
  draw: ImageDraw;
}

const isSvgFile = (file: { body: Buffer; contentType: string }) =>
  file.contentType.includes('svg') || /^\s*(<\?xml|<svg)/.test(file.body.subarray(0, 256).toString('utf8'));

/** The file an image prints from: an SVG logo with its colours swapped (docs/23 S14), any other file as it is. */
export function imageFileOf<F extends { body: Buffer; contentType: string }>(file: F, image: PrintLayout['images'][number]): F {
  if (!image.colorMap?.length || !isSvgFile(file)) return file;
  return { ...file, body: Buffer.from(recolorSvg(file.body.toString('utf8'), image.colorMap), 'utf8') };
}

/** Pixel size of an image (EXIF orientation applied) and whether it is a vector; null when it cannot be decoded. */
async function sourceSize(file: { body: Buffer; contentType: string }) {
  try {
    const meta = await sharp(file.body).metadata();
    const width = meta.autoOrient?.width ?? meta.width;
    const height = meta.autoOrient?.height ?? meta.height;
    return width && height ? { width, height, vector: isSvgFile(file) } : null;
  } catch {
    return null;
  }
}

/** Pixels of the source used and the printed width (mm) of an image in its box (crop and fit, docs/23 S10). */
const printedOf = (image: PrintLayout['images'][number], source: { width: number; height: number }) => {
  const draw = imageDraw(image, source);
  return { draw, sourceWidth: draw.sw, width: draw.dw };
};

/** Resolution of each image of the layout at its printed size (the print package lists them). */
export async function imageResolutions(layout: PrintLayout, artwork: Artwork) {
  const result: { url: string; dpi: number | null; vector: boolean }[] = [];
  for (const image of layout.images) {
    const file = artwork.get(image.url);
    const source = file && (await sourceSize(file));
    if (!source) result.push({ url: image.url, dpi: null, vector: false });
    else {
      const printed = printedOf(image, source);
      result.push({ url: image.url, dpi: source.vector ? null : effectiveDpi(printed.sourceWidth, printed.width), vector: source.vector });
    }
  }
  return result;
}

/**
 * Decodes an image of the layout (PNG, JPEG, WebP, GIF, TIFF, AVIF or SVG) and converts it to CMYK. Rasters keep their
 * resolution up to MAX_EMBED_DPI at the printed size (never upscaled), SVG logos are rasterised at VECTOR_DPI.
 */
export async function prepareImage(
  file: { body: Buffer; contentType: string },
  image: PrintLayout['images'][number],
): Promise<PreparedImage | null> {
  const source = await sourceSize(file);
  if (!source) return null;
  const { draw, sourceWidth, width: printedWidth } = printedOf(image, source);
  const region = { left: Math.round(draw.sx), top: Math.round(draw.sy), width: Math.max(1, Math.round(draw.sw)), height: Math.max(1, Math.round(draw.sh)) };
  try {
    let pipeline;
    if (source.vector) {
      // Rasterise the whole logo at VECTOR_DPI for its printed size, then cut the region at that scale.
      const scale = pixelsFor(printedWidth, VECTOR_DPI) / sourceWidth;
      const density = Math.min(2400, Math.max(1, 72 * scale));
      pipeline = sharp(file.body, { density });
      if (isCropped(image)) {
        const meta = await sharp(file.body, { density }).metadata();
        const k = (meta.width ?? source.width) / source.width;
        pipeline = pipeline.extract({ left: Math.round(region.left * k), top: Math.round(region.top * k), width: Math.max(1, Math.round(region.width * k)), height: Math.max(1, Math.round(region.height * k)) });
      }
    } else {
      const target = Math.min(region.width, pixelsFor(printedWidth, MAX_EMBED_DPI));
      pipeline = sharp(file.body).autoOrient();
      if (isCropped(image)) pipeline = pipeline.extract(region);
      if (target < region.width) pipeline = pipeline.resize({ width: target });
    }
    const { data, info } = await pipeline.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4 || data.length !== info.width * info.height * 4) return null;
    // Photo adjustments baked into the printed pixels, the same formulas as the editor (docs/23 S10).
    applyFilters(data, 4, image.filters ?? undefined);
    // Rich black on photos and patterns; logos (often small black lettering) stay on the K plate.
    const { cmyk, alpha } = rgbaToCmyk(data, { richBlack: image.type !== 'logo' });
    return {
      width: info.width,
      height: info.height,
      cmyk,
      alpha,
      dpi: source.vector ? VECTOR_DPI : effectiveDpi(sourceWidth, printedWidth),
      draw,
    };
  } catch {
    return null;
  }
}

// PDFKit has no API for optional content, overprint or CMYK images: these write the PDF objects directly.
type RawRef = { end(data?: Uint8Array): void };
type Raw = { ref(data: object): RawRef; _root: { data: Record<string, unknown> }; page: RawPage };
type RawPage = {
  resources: { data: Record<string, unknown> };
  dictionary: { data: Record<string, unknown> };
  ext_gstates: Record<string, unknown>;
  xobjects: Record<string, unknown>;
};

export interface PdfRenderOptions {
  withCropMarks?: boolean;
  paperSize?: 'A4' | 'A3';
  /** Free A4 export without an export credit: draws the WrapFit watermark on a glue flap (docs/16 §5.4). */
  watermarked?: boolean;
}

/**
 * Vector PDF 1.6 at true size (1 mm = 2.8346 pt): CMYK artwork with every text outlined (no font in the file),
 * images embedded as DeviceCMYK, barcodes in K100 on white, dielines in the spot colors CutContour / Crease
 * (overprint), four layers (Dimensions does not print), TrimBox = dielines, BleedBox +3 mm.
 * Home Print mode: the sheet centred on A4/A3 with crop marks and a 50 mm ruler, for DIY crafters.
 */
export async function renderPdf(layout: PrintLayout, artwork: Artwork = new Map(), options?: PdfRenderOptions): Promise<Buffer> {
  const isA4Print = !!options?.withCropMarks;
  let pageWidth = layout.width;
  let pageHeight = layout.height;
  let offsetX = 0;
  let offsetY = 0;

  if (isA4Print) {
    // A4: 210 x 297 mm, A3: 297 x 420 mm
    const margin = 15;
    const reqW = layout.width + margin * 2;
    const reqH = layout.height + margin * 2;
    const formats: [number, number][] = [[210, 297], [297, 210], [297, 420], [420, 297]];
    const chosen = formats.find(([w, h]) => reqW <= w && reqH <= h);
    [pageWidth, pageHeight] = chosen ?? [reqW + 10, reqH + 10];
    offsetX = (pageWidth - layout.width) / 2;
    offsetY = (pageHeight - layout.height) / 2;
  }

  const doc = new PDFDocument({
    size: [pageWidth * PT_PER_MM, pageHeight * PT_PER_MM],
    margin: 0,
    pdfVersion: '1.6',
    info: { Title: layout.title, Creator: 'WrapFit', Subject: specLine(layout) },
  });
  const raw = doc as unknown as Raw;
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Layers (shared by the pages).
  const groups = PRINT_LAYERS.map((name) => {
    const printed = name !== 'Dimensions';
    const group = raw.ref({
      Type: 'OCG',
      Name: new String(name),
      ...(printed ? {} : { Usage: { Print: { PrintState: 'OFF' }, View: { ViewState: 'ON' } } }),
    });
    group.end();
    return group;
  });
  raw._root.data.OCProperties = {
    OCGs: groups,
    D: {
      Name: new String('WrapFit'),
      Order: groups,
      ON: groups,
      AS: [{ Event: 'Print', Category: ['Print'], OCGs: groups }],
    },
  };
  const beginLayer = (name: (typeof PRINT_LAYERS)[number]) => doc.addContent(`/OC /L${PRINT_LAYERS.indexOf(name)} BDC`);
  const endLayer = () => doc.addContent('EMC');

  // Overprint for the dielines, and their spot colors.
  const overprint = raw.ref({ Type: 'ExtGState', OP: true, op: true, OPM: 1 });
  overprint.end();
  const spot = doc as unknown as { addSpotColor(name: string, c: number, m: number, y: number, k: number): void };
  for (const { name, cmyk } of [...Object.values(SPOT_COLORS), ...Object.values(FINISH_SPOTS)]) spot.addSpotColor(name, cmyk[0], cmyk[1], cmyk[2], cmyk[3]);

  /** A CMYK image XObject (with its alpha as a soft mask), registered on the page. */
  let imageCount = 0;
  const embedImage = (image: PreparedImage) => {
    const common = { Type: 'XObject', Subtype: 'Image', Width: image.width, Height: image.height, BitsPerComponent: 8 };
    let smask: RawRef | undefined;
    if (image.alpha) {
      smask = raw.ref({ ...common, ColorSpace: 'DeviceGray' });
      smask.end(image.alpha);
    }
    const ref = raw.ref({ ...common, ColorSpace: 'DeviceCMYK', ...(smask ? { SMask: smask } : {}) });
    ref.end(image.cmyk);
    const label = `ImC${++imageCount}`;
    raw.page.xobjects[label] = ref;
    return label;
  };
  const turned = (deg: number, cx: number, cy: number, draw: () => void) => {
    doc.save();
    if (deg) doc.rotate(deg, { origin: [cx, cy] });
    draw();
    doc.restore();
  };
  /** An element: cut to its face + bleed, with its opacity, turned and mirrored around its centre (like the canvas). */
  const placed = (b: PlacedBase, draw: () => void) => {
    const { cx, cy } = centreOf(b);
    doc.save();
    doc.rect(b.clip.x, b.clip.y, b.clip.width, b.clip.height).clip();
    if (b.opacity < 1) doc.opacity(b.opacity);
    if (b.rotation) doc.rotate(b.rotation, { origin: [cx, cy] });
    const flip = flipMatrix(b);
    if (flip) doc.transform(...flip);
    draw();
    doc.restore();
  };

  /** One sheet on the current page: page boxes, layers, artwork, finishes, cut, dimensions, home-print marks. */
  const drawSheet = async (layout: PrintLayout) => {
  // Page boxes, in points from the bottom-left corner.
  const area = trimArea(layout);
  const box = (grow: number) =>
    [offsetX + area.left - grow, pageHeight - (offsetY + area.bottom) - grow, offsetX + area.right + grow, pageHeight - (offsetY + area.top) + grow].map(
      (mm) => Number((mm * PT_PER_MM).toFixed(3)),
    );
  raw.page.dictionary.data.TrimBox = box(0);
  raw.page.dictionary.data.BleedBox = box(BLEED_BOX_MM);
  raw.page.resources.data.Properties = Object.fromEntries(groups.map((group, index) => [`L${index}`, group]));
  raw.page.ext_gstates.GsOverprint = overprint;

  doc.save();
  doc.scale(PT_PER_MM); // draw in mm from here on
  if (offsetX !== 0 || offsetY !== 0) doc.translate(offsetX, offsetY);

  /** Library art in CMYK: shapes (fill and / or stroke), then its outlined texts. */
  const drawArt = (a: ReturnType<typeof artVectors>[number]) =>
    placed(a, () => {
      doc.translate(a.x, a.y);
      for (const shape of a.art.shapes) {
        doc.lineCap(shape.round ? 'round' : 'butt').lineJoin(shape.round ? 'round' : 'miter');
        doc.path(shape.d);
        if (shape.gradient) {
          // Linear gradient in CMYK across the element (docs/23 S11).
          const line = gradientLine(shape.gradient.angle, a.width, a.height);
          const gradient = doc.linearGradient(line.x1, line.y1, line.x2, line.y2);
          for (const stop of shape.gradient.stops) gradient.stop(stop.offset, hexToCmyk(stop.color) as unknown as string); // PDFKit takes CMYK arrays; its typings say string
          if (shape.stroke) doc.lineWidth(shape.strokeWidth ?? LINE_MM).fillAndStroke(gradient, hexToCmyk(shape.stroke));
          else doc.fill(gradient);
        } else if (shape.fill && shape.stroke) doc.lineWidth(shape.strokeWidth ?? LINE_MM).fillAndStroke(shape.cmyk ?? hexToCmyk(shape.fill), hexToCmyk(shape.stroke));
        else if (shape.stroke) doc.lineWidth(shape.strokeWidth ?? LINE_MM).stroke(hexToCmyk(shape.stroke));
        else doc.fill(shape.cmyk ?? hexToCmyk(shape.fill ?? '#FFFFFF'));
      }
      for (const t of a.texts) if (t.d) doc.path(t.d).fill(hexToCmyk(t.color));
    });

  beginLayer('Artwork');
  for (const { kind, item } of drawList(layout, artwork)) {
    if (kind === 'art') drawArt(item);
    else if (kind === 'text') {
      const text = item;
      if (text.d) {
        placed(text, () => {
          if (text.stroke) doc.lineWidth(text.stroke.widthMm * 2).lineJoin('round').path(text.d).stroke(hexToCmyk(text.stroke.color));
          doc.path(text.d).fill(text.cmyk);
        });
      }
    } else if (kind === 'barcode') {
      const b = item;
      placed(b, () => {
        // White knockout (no ink, never overprinted), then the modules in plain black.
        doc.rect(b.x, b.y, b.width, b.height).fill(PAPER);
        doc.path(b.d).fill(K100);
      });
    } else {
      const image = item;
      const file = artwork.get(image.url);
      const prepared = file && (await prepareImage(imageFileOf(file, image), image));
      if (!prepared) continue;
      const label = embedImage(prepared);
      const { dx, dy, dw, dh } = prepared.draw;
      placed(image, () => {
        if (image.mask) {
          // Frame of the photo (rounded, circle, arch).
          doc.translate(image.x, image.y);
          doc.path(image.mask).clip();
          doc.translate(-image.x, -image.y);
        }
        doc.transform(dw, 0, 0, -dh, image.x + dx, image.y + dy + dh);
        doc.addContent(`/${label} Do`);
      });
    }
  }
  const watermark = options?.watermarked ? watermarkOutline(layout) : null;
  if (watermark) {
    // ActualText: the outlines read as the sentence when the PDF is searched or its text copied.
    const actualText = `FEFF${Buffer.from(WATERMARK_TEXT, 'utf16le').swap16().toString('hex').toUpperCase()}`;
    doc.addContent(`/Span <</ActualText <${actualText}>>> BDC`);
    doc.path(watermark.d).fill(hexToCmyk(WATERMARK_COLOR));
    doc.addContent('EMC');
  }
  // Spec line in the margin: printed with the artwork so the print shop and the customer can read the box size.
  const spec = dimensionMarks(layout).info;
  doc.path(labelPath(spec.text, spec.x, spec.y, SPEC_LINE_FONT_MM, false)).fill(CMYK_INFO);
  endLayer();

  // Finishes (docs/23 S6, D8): each foil / UV / embossed element in its spot colour, 100 %, overprinted.
  const finished = drawList(layout, artwork).filter(({ item }) => item.finish);
  if (finished.length) {
    beginLayer('Finish');
    doc.save();
    doc.addContent('/GsOverprint gs');
    for (const { kind, item } of finished) {
      const colour = FINISH_SPOTS[item.finish!].name;
      placed({ ...item, opacity: 1 }, () => {
        if (kind === 'art') {
          doc.translate(item.x, item.y);
          for (const shape of item.art.shapes) {
            doc.path(shape.d);
            if (shape.fill && shape.stroke) doc.lineWidth(shape.strokeWidth ?? LINE_MM).fillAndStroke(colour, colour);
            else if (shape.stroke) doc.lineWidth(shape.strokeWidth ?? LINE_MM).stroke(colour);
            else doc.fill(colour);
          }
          for (const t of item.texts) if (t.d) doc.path(t.d).fill(colour);
        } else if (kind === 'text' || kind === 'barcode') {
          if (item.d) doc.path(item.d).fill(colour);
        } else {
          doc.rect(item.x, item.y, item.width, item.height).fill(colour);
        }
      });
    }
    doc.restore();
    endLayer();
  }

  // Only the cut line: the dashed crease lines are not part of the print file.
  beginLayer('CutContour');
  doc.save().lineWidth(LINE_MM).strokeColor(SPOT_COLORS.cut.name);
  doc.addContent('/GsOverprint gs');
  for (const stroke of layout.strokes.filter((s) => s.type === 'cut')) doc.path(stroke.d).stroke();
  doc.restore();
  endLayer();

  beginLayer('Dimensions');
  const marks = dimensionMarks(layout);
  doc.save().lineWidth(0.15).strokeColor(CMYK_INFO);
  for (const [x1, y1, x2, y2] of marks.lines) doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  for (const label of marks.labels) {
    turned(label.vertical ? -90 : 0, label.x, label.y, () =>
      doc.path(labelPath(label.text, label.x, label.y, INFO_FONT_MM, true)).fill(CMYK_INFO),
    );
  }
  doc.restore();
  endLayer();

  if (isA4Print) {
    // Crop marks at the four corners of the dielines and a 1:1 ruler: printed (outside the layers), in plain black.
    const markLen = 6;
    const markGap = 1.5;
    const { left, top, right, bottom } = area;
    doc.save().lineWidth(0.25).strokeColor(K100);
    for (const [x, y, dx, dy] of [
      [left, top, -1, -1],
      [right, top, 1, -1],
      [left, bottom, -1, 1],
      [right, bottom, 1, 1],
    ] as const) {
      doc.moveTo(x + dx * markGap, y).lineTo(x + dx * (markGap + markLen), y).stroke();
      doc.moveTo(x, y + dy * markGap).lineTo(x, y + dy * (markGap + markLen)).stroke();
    }
    doc.restore();

    // 50 mm ruler to check the printer kept 100 % scale.
    doc.save().lineWidth(0.3).strokeColor(CMYK_INFO);
    const rulerX = -offsetX + 15;
    const rulerY = pageHeight - offsetY - 12;
    doc.moveTo(rulerX, rulerY).lineTo(rulerX + 50, rulerY).stroke();
    doc.moveTo(rulerX, rulerY - 2).lineTo(rulerX, rulerY + 2).stroke();
    doc.moveTo(rulerX + 50, rulerY - 2).lineTo(rulerX + 50, rulerY + 2).stroke();
    doc.path(labelPath('<- Thước chuẩn 50 mm (In đúng 100% tỷ lệ thật) ->', rulerX, rulerY - 2, 2.8, false)).fill(CMYK_INFO);
    doc.path(labelPath('Cắt nét đỏ | Cấn nếp gập nét xanh — WrapFit DIY Studio', rulerX, rulerY + 5, 2.8, false)).fill(CMYK_INFO);
    doc.restore();
  }
  doc.restore();
  };

  await drawSheet(layout);
  // The inside of the sheet (docs/23 S5): its own page, the dieline mirrored as the printer sees the back.
  if (layout.inside) {
    doc.addPage({ size: [pageWidth * PT_PER_MM, pageHeight * PT_PER_MM], margin: 0 });
    await drawSheet(layout.inside);
  }

  doc.end();
  return done;
}

/**
 * ASCII DXF (R12) in mm with layers CUT (red, ACI 1) and CREASE (blue, ACI 5, dashed) for CNC die-cutting machines.
 * Each continuous line is one POLYLINE; curves (pillow box) become short chords within 0.1 mm of the curve.
 */
export function renderDxf(layout: PrintLayout): string {
  const out: (string | number)[] = [];
  const pair = (code: number, value: string | number) => out.push(code, value);
  pair(0, 'SECTION');
  pair(2, 'HEADER');
  pair(9, '$INSUNITS');
  pair(70, 4); // millimetres
  pair(0, 'ENDSEC');
  pair(0, 'SECTION');
  pair(2, 'TABLES');
  pair(0, 'TABLE');
  pair(2, 'LTYPE');
  pair(70, 1);
  pair(0, 'LTYPE');
  pair(2, 'DASHED');
  pair(70, 0);
  pair(3, 'Dashed 4 mm');
  pair(72, 65);
  pair(73, 2);
  pair(40, 2 * DASH_MM);
  pair(49, DASH_MM);
  pair(49, -DASH_MM);
  pair(0, 'ENDTAB');
  pair(0, 'TABLE');
  pair(2, 'LAYER');
  pair(70, 2);
  for (const [name, color, ltype] of [
    ['CUT', 1, 'CONTINUOUS'],
    ['CREASE', 5, 'DASHED'],
  ] as const) {
    pair(0, 'LAYER');
    pair(2, name);
    pair(70, 0);
    pair(62, color);
    pair(6, ltype);
  }
  pair(0, 'ENDTAB');
  pair(0, 'ENDSEC');
  pair(0, 'SECTION');
  pair(2, 'ENTITIES');
  for (const stroke of layout.strokes) {
    const layer = stroke.type === 'cut' ? 'CUT' : 'CREASE';
    pair(0, 'POLYLINE');
    pair(8, layer);
    pair(66, 1);
    pair(10, 0);
    pair(20, 0);
    pair(30, 0);
    pair(70, stroke.closed ? 1 : 0);
    for (const [x, y] of stroke.points) {
      pair(0, 'VERTEX');
      pair(8, layer);
      // DXF y axis points up: flip so the drawing is not mirrored.
      pair(10, n(x));
      pair(20, n(layout.height - y));
      pair(30, 0);
    }
    pair(0, 'SEQEND');
    pair(8, layer);
  }
  pair(0, 'ENDSEC');
  pair(0, 'EOF');
  return out.join('\n') + '\n';
}
