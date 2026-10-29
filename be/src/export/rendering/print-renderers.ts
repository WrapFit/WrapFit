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
  type Cmyk,
  type MeasureText,
  type OutlineFont,
  type PrintFontId,
} from '@wrapfit/shared';
import { openSync } from 'fontkit';
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
/** Raster images are downsampled to this at their printed size (the print shop's RIP would do it anyway). */
const MAX_EMBED_DPI = 450;
/** Vector logos (SVG) are rasterised at this resolution for the PDF; the SVG export keeps them as vectors. */
const VECTOR_DPI = 600;
/** Layers of the PDF (Optional Content Groups) and the SVG, bottom to top. `Dimensions` is not printed. */
export const PRINT_LAYERS = ['Artwork', 'Crease', 'CutContour', 'Dimensions'] as const;

/** Bold font files, the weight the editor draws texts with (TEXT_FONT_WEIGHT). */
const FONT_FILES: Record<PrintFontId | 'info', string> = {
  'be-vietnam-pro': require.resolve('@expo-google-fonts/be-vietnam-pro/700Bold/BeVietnamPro_700Bold.ttf'),
  'playfair-display': require.resolve('@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'),
  'cormorant-garamond': require.resolve('@expo-google-fonts/cormorant-garamond/700Bold/CormorantGaramond_700Bold.ttf'),
  'big-shoulders-display': require.resolve('@expo-google-fonts/big-shoulders-display/BigShouldersDisplay_700Bold.ttf'),
  inter: require.resolve('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  info: require.resolve('@expo-google-fonts/be-vietnam-pro/400Regular/BeVietnamPro_400Regular.ttf'),
};
const fonts = new Map<string, OutlineFont>();
const fontOf = (id: PrintFontId | 'info'): OutlineFont => {
  if (!fonts.has(id)) fonts.set(id, openSync(FONT_FILES[id]));
  return fonts.get(id)!;
};

const n = (value: number) => Number(value.toFixed(3)).toString();

/** Files of the layout images, by URL (the export worker loads them from storage). Missing URLs are not drawn. */
export type Artwork = Map<string, { body: Buffer; contentType: string }>;

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const specLine = (layout: PrintLayout) =>
  `WrapFit — ${layout.title} — ${layout.structure} ${layout.dimensions.length} x ${layout.dimensions.width} x ${layout.dimensions.height} mm, giấy ${layout.dimensions.paperThickness} mm`;

/** Text widths from the font files, with the shaping of the outlines. */
const measure: MeasureText = (text, font, fontSizeMm) => outlineAdvanceMm(fontOf(font), text, fontSizeMm);

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
  const info = { text: specLine(layout), x: layout.pieces[0].x, y: trimArea(layout).bottom + 10 };
  return { lines, labels, info };
}

/** Outlines of a one-line label whose baseline starts (or, `centred`, is centred) at (x, y). */
function labelPath(text: string, x: number, y: number, sizeMm: number, centred: boolean, font: PrintFontId | 'info' = 'info') {
  const left = centred ? x - outlineAdvanceMm(fontOf(font), text, sizeMm) / 2 : x;
  return outlineText(fontOf(font), text, left, y, sizeMm);
}

/** Every text element as outlines (one path per element) with its print ink. */
function textOutlines(layout: PrintLayout) {
  return layout.texts.map((t) => {
    const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t }, measure);
    const d = box.lines
      .filter((line) => line.text)
      .map((line) => outlineText(fontOf(box.font), line.text, t.x + line.x, t.y + line.baseline, box.fontSizeMm))
      .join(' ');
    return { d, color: t.color, cmyk: textCmyk(t.color, t.fontSizePt), rotation: t.rotation, cx: t.x + t.width / 2, cy: t.y + t.height / 2 };
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
    return [{ box: b, d: `${bars} ${digits}`.trim(), rotation: b.rotation, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }];
  });
}

/** Library art (`layout.arts`) of one kind: its shapes, and its texts outlined, in the coordinates of the element. */
function artVectors(layout: PrintLayout, background: boolean) {
  return layout.arts
    .filter((a) => a.background === background)
    .map((a) => ({
      ...a,
      cx: a.x + a.width / 2,
      cy: a.y + a.height / 2,
      texts: a.art.texts.map((t) => ({ d: labelPath(t.text, t.x, t.baseline, t.size, t.anchor === 'middle', t.font), color: t.color })),
    }));
}

/** SVG group of library art: placed on the sheet, turned around the centre of its element. */
function artSvg(a: ReturnType<typeof artVectors>[number]): string {
  const turn = a.rotation ? `rotate(${n(a.rotation)} ${n(a.cx)} ${n(a.cy)}) ` : '';
  const shapes = a.art.shapes.map(
    (s) =>
      `<path d="${s.d}" fill="${escapeXml(s.fill ?? 'none')}"` +
      (s.stroke ? ` stroke="${escapeXml(s.stroke)}" stroke-width="${n(s.strokeWidth ?? LINE_MM)}"` : '') +
      (s.round ? ' stroke-linecap="round" stroke-linejoin="round"' : '') +
      '/>',
  );
  const texts = a.texts.filter((t) => t.d).map((t) => `<path d="${t.d}" fill="${escapeXml(t.color)}"/>`);
  return `<g transform="${turn}translate(${n(a.x)} ${n(a.y)})">${shapes.join('')}${texts.join('')}</g>`;
}

/** Layered SVG (layers: artwork, crease, cut, dimensions) for cutting plotters such as Cricut or laser cutters. */
export function renderSvg(layout: PrintLayout, artwork: Artwork = new Map()): string {
  const rotate = (deg: number, cx: number, cy: number) => (deg ? ` transform="rotate(${n(deg)} ${n(cx)} ${n(cy)})"` : '');
  // Images are embedded as data URIs so the file works offline in Cricut Design Space / Illustrator.
  const images = layout.images.flatMap((image) => {
    const file = artwork.get(image.url);
    if (!file?.contentType.startsWith('image/')) return [];
    return [
      `<image x="${n(image.x)}" y="${n(image.y)}" width="${n(image.width)}" height="${n(image.height)}" preserveAspectRatio="xMidYMid meet"` +
        rotate(image.rotation, image.x + image.width / 2, image.y + image.height / 2) +
        ` href="data:${escapeXml(file.contentType)};base64,${file.body.toString('base64')}"/>`,
    ];
  });
  // Texts are outlined: the file needs no font to open.
  const texts = textOutlines(layout)
    .filter((t) => t.d)
    .map((t) => `<path d="${t.d}" fill="${escapeXml(t.color)}"${rotate(t.rotation, t.cx, t.cy)}/>`);
  const barcodes = barcodeVectors(layout).map(
    (b) =>
      `<g${rotate(b.rotation, b.cx, b.cy)}><rect x="${n(b.box.x)}" y="${n(b.box.y)}" width="${n(b.box.width)}" height="${n(b.box.height)}" fill="#FFFFFF"/>` +
      `<path d="${b.d}" fill="#000000"/></g>`,
  );
  const strokes = (type: 'cut' | 'crease') =>
    layout.strokes.filter((s) => s.type === type).map((s) => `<path d="${escapeXml(s.d)}"/>`).join('');
  const marks = dimensionMarks(layout);
  const layer = (id: string, label: string, attributes: string, content: string) =>
    `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}"${attributes}>${content}</g>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${n(layout.width)}mm" height="${n(layout.height)}mm" viewBox="0 0 ${n(layout.width)} ${n(layout.height)}">`,
    layer(
      'artwork',
      'Artwork',
      '',
      artVectors(layout, true).map(artSvg).join('') +
        images.join('') +
        artVectors(layout, false).map(artSvg).join('') +
        texts.join('') +
        barcodes.join(''),
    ),
    layer('crease', 'Crease', ` fill="none" stroke="${COLORS.crease}" stroke-width="${LINE_MM}" stroke-dasharray="${DASH_MM},${DASH_MM}"`, strokes('crease')),
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
          .join('') +
        `<path stroke="none" d="${labelPath(marks.info.text, marks.info.x, marks.info.y, INFO_FONT_MM, false)}"/>`,
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
}

const isSvgFile = (file: { body: Buffer; contentType: string }) =>
  file.contentType.includes('svg') || /^\s*(<\?xml|<svg)/.test(file.body.subarray(0, 256).toString('utf8'));

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

/** Printed size (mm) of an image in its box: the file keeps its proportions, centred. */
const printedSize = (box: { width: number; height: number }, source: { width: number; height: number }) => {
  const scale = Math.min(box.width / source.width, box.height / source.height);
  return { width: source.width * scale, height: source.height * scale };
};

/** Resolution of each image of the layout at its printed size (the print package lists them). */
export async function imageResolutions(layout: PrintLayout, artwork: Artwork) {
  const result: { url: string; dpi: number | null; vector: boolean }[] = [];
  for (const image of layout.images) {
    const file = artwork.get(image.url);
    const source = file && (await sourceSize(file));
    if (!source) result.push({ url: image.url, dpi: null, vector: false });
    else result.push({ url: image.url, dpi: source.vector ? null : effectiveDpi(source.width, printedSize(image, source).width), vector: source.vector });
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
  const printed = printedSize(image, source);
  try {
    let pipeline;
    if (source.vector) {
      const target = pixelsFor(printed.width, VECTOR_DPI);
      const density = Math.min(2400, Math.max(1, (72 * target) / source.width));
      pipeline = sharp(file.body, { density }).resize({ width: target });
    } else {
      const target = Math.min(source.width, pixelsFor(printed.width, MAX_EMBED_DPI));
      pipeline = sharp(file.body).autoOrient();
      if (target < source.width) pipeline = pipeline.resize({ width: target });
    }
    const { data, info } = await pipeline.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4 || data.length !== info.width * info.height * 4) return null;
    // Rich black on photos and patterns; logos (often small black lettering) stay on the K plate.
    const { cmyk, alpha } = rgbaToCmyk(data, { richBlack: image.type !== 'logo' });
    return {
      width: info.width,
      height: info.height,
      cmyk,
      alpha,
      dpi: source.vector ? VECTOR_DPI : effectiveDpi(source.width, printed.width),
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

  // Page boxes, in points from the bottom-left corner.
  const area = trimArea(layout);
  const box = (grow: number) =>
    [offsetX + area.left - grow, pageHeight - (offsetY + area.bottom) - grow, offsetX + area.right + grow, pageHeight - (offsetY + area.top) + grow].map(
      (mm) => Number((mm * PT_PER_MM).toFixed(3)),
    );
  raw.page.dictionary.data.TrimBox = box(0);
  raw.page.dictionary.data.BleedBox = box(BLEED_BOX_MM);

  // Layers.
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
  raw.page.resources.data.Properties = Object.fromEntries(groups.map((group, index) => [`L${index}`, group]));
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
  raw.page.ext_gstates.GsOverprint = overprint;
  const spot = doc as unknown as { addSpotColor(name: string, c: number, m: number, y: number, k: number): void };
  for (const { name, cmyk } of Object.values(SPOT_COLORS)) spot.addSpotColor(name, cmyk[0], cmyk[1], cmyk[2], cmyk[3]);

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

  doc.scale(PT_PER_MM); // draw in mm from here on
  if (offsetX !== 0 || offsetY !== 0) doc.translate(offsetX, offsetY);

  /** Library art in CMYK: shapes (fill and / or stroke), then its outlined texts. */
  const drawArt = (a: ReturnType<typeof artVectors>[number]) =>
    turned(a.rotation, a.cx, a.cy, () => {
      doc.translate(a.x, a.y);
      for (const shape of a.art.shapes) {
        doc.lineCap(shape.round ? 'round' : 'butt').lineJoin(shape.round ? 'round' : 'miter');
        doc.path(shape.d);
        if (shape.fill && shape.stroke) doc.lineWidth(shape.strokeWidth ?? LINE_MM).fillAndStroke(hexToCmyk(shape.fill), hexToCmyk(shape.stroke));
        else if (shape.stroke) doc.lineWidth(shape.strokeWidth ?? LINE_MM).stroke(hexToCmyk(shape.stroke));
        else doc.fill(hexToCmyk(shape.fill ?? '#FFFFFF'));
      }
      for (const t of a.texts) if (t.d) doc.path(t.d).fill(hexToCmyk(t.color));
    });

  beginLayer('Artwork');
  for (const a of artVectors(layout, true)) drawArt(a);
  for (const image of layout.images) {
    const file = artwork.get(image.url);
    const prepared = file && (await prepareImage(file, image));
    if (!prepared) continue;
    const label = embedImage(prepared);
    const size = printedSize(image, prepared);
    const x = image.x + (image.width - size.width) / 2;
    const y = image.y + (image.height - size.height) / 2;
    turned(image.rotation, image.x + image.width / 2, image.y + image.height / 2, () => {
      doc.transform(size.width, 0, 0, -size.height, x, y + size.height);
      doc.addContent(`/${label} Do`);
    });
  }
  for (const a of artVectors(layout, false)) drawArt(a);
  for (const t of textOutlines(layout)) {
    if (t.d) turned(t.rotation, t.cx, t.cy, () => doc.path(t.d).fill(t.cmyk));
  }
  for (const b of barcodeVectors(layout)) {
    turned(b.rotation, b.cx, b.cy, () => {
      // White knockout (no ink, never overprinted), then the modules in plain black.
      doc.rect(b.box.x, b.box.y, b.box.width, b.box.height).fill(PAPER);
      doc.path(b.d).fill(K100);
    });
  }
  endLayer();

  for (const type of ['crease', 'cut'] as const) {
    beginLayer(type === 'cut' ? 'CutContour' : 'Crease');
    doc.save().lineWidth(LINE_MM).strokeColor(SPOT_COLORS[type].name);
    doc.addContent('/GsOverprint gs');
    if (type === 'crease') doc.dash(DASH_MM, { space: DASH_MM });
    for (const stroke of layout.strokes.filter((s) => s.type === type)) doc.path(stroke.d).stroke();
    doc.undash().restore();
    endLayer();
  }

  beginLayer('Dimensions');
  const marks = dimensionMarks(layout);
  doc.save().lineWidth(0.15).strokeColor(CMYK_INFO);
  for (const [x1, y1, x2, y2] of marks.lines) doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  for (const label of marks.labels) {
    turned(label.vertical ? -90 : 0, label.x, label.y, () =>
      doc.path(labelPath(label.text, label.x, label.y, INFO_FONT_MM, true)).fill(CMYK_INFO),
    );
  }
  doc.path(labelPath(marks.info.text, marks.info.x, marks.info.y, INFO_FONT_MM, false)).fill(CMYK_INFO);
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
