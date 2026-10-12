// Print files from a PrintLayout. Units are mm everywhere. Line conventions follow AGENTS.md: cut = solid red,
// crease = dashed blue (4,4). In the PDF they are the spot colors `CutContour` and `Crease` (overprinted), each on its
// own layer, so the print shop's RIP and the die maker find them by name and they never print on the box.
// Texts use the text model of the editor (`layoutTextBox` of `@wrapfit/shared`) with the same font files.
import {
  layoutTextBox,
  PRINT_FONTS,
  TEXT_FONT_WEIGHT,
  type MeasureText,
  type PrintFontId,
} from '@wrapfit/shared';
import PDFDocument from 'pdfkit';
import type { PrintLayout } from './print-layout';

const COLORS = { cut: '#E53E3E', crease: '#3182CE', info: '#64748B' };
/** Spot colors of the dielines with their CMYK alternates (0-100). */
export const SPOT_COLORS = {
  cut: { name: 'CutContour', cmyk: [0, 100, 0, 0] },
  crease: { name: 'Crease', cmyk: [100, 0, 0, 0] },
} as const;
const CMYK_INFO: [number, number, number, number] = [0, 0, 0, 60];
const LINE_MM = 0.25;
const DASH_MM = 4;
/** Background artwork must reach this far past the cut line (AGENTS.md): the PDF BleedBox. */
export const BLEED_MM = 2;
const PT_PER_MM = 72 / 25.4;
const INFO_FONT_MM = 3.5;
/** Layers of the PDF (Optional Content Groups) and the SVG, bottom to top. `Dimensions` is not printed. */
export const PRINT_LAYERS = ['Artwork', 'Crease', 'CutContour', 'Dimensions'] as const;

/** Bold font files, the weight the editor draws texts with (TEXT_FONT_WEIGHT). */
const FONT_FILES: Record<PrintFontId, string> = {
  'be-vietnam-pro': require.resolve('@expo-google-fonts/be-vietnam-pro/700Bold/BeVietnamPro_700Bold.ttf'),
  'playfair-display': require.resolve('@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'),
  'cormorant-garamond': require.resolve('@expo-google-fonts/cormorant-garamond/700Bold/CormorantGaramond_700Bold.ttf'),
  'big-shoulders-display': require.resolve('@expo-google-fonts/big-shoulders-display/BigShouldersDisplay_700Bold.ttf'),
  inter: require.resolve('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
};
const INFO_FONT = require.resolve('@expo-google-fonts/be-vietnam-pro/400Regular/BeVietnamPro_400Regular.ttf');

const n = (value: number) => Number(value.toFixed(3)).toString();

/** Files of the layout images, by URL (the export worker loads them from storage). Missing URLs are not drawn. */
export type Artwork = Map<string, { body: Buffer; contentType: string }>;

/** PDFKit embeds PNG and JPEG only (WebP, SVG and PDF logos are left out of the PDF; the SVG export keeps them). */
export function canEmbedInPdf(body: Buffer): boolean {
  const isPng = body.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isJpeg = body[0] === 0xff && body[1] === 0xd8;
  return isPng || isJpeg;
}

/** Naive RGB -> CMYK (0-100) for artwork colors; the print shop does the final color management. */
export function hexToCmyk(hex: string): [number, number, number, number] {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return [0, 0, 0, 100];
  const [r, g, b] = match.slice(1).map((h) => parseInt(h, 16) / 255);
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return [0, 0, 0, 100];
  const c = (x: number) => Math.round(((1 - x - k) / (1 - k)) * 100);
  return [c(r), c(g), c(b), Math.round(k * 100)];
}
const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const specLine = (layout: PrintLayout) =>
  `WrapFit — ${layout.title} — ${layout.structure} ${layout.dimensions.length} x ${layout.dimensions.width} x ${layout.dimensions.height} mm, giấy ${layout.dimensions.paperThickness} mm`;

function registerFonts(doc: PDFKit.PDFDocument): PDFKit.PDFDocument {
  for (const id of Object.keys(FONT_FILES) as PrintFontId[]) doc.registerFont(id, FONT_FILES[id]);
  doc.registerFont('info', INFO_FONT);
  return doc;
}

let measureDoc: PDFKit.PDFDocument | undefined;
/** Text widths with the embedded font files, the same metrics the PDF uses. */
const measure: MeasureText = (text, font, fontSizeMm) => {
  measureDoc ??= registerFonts(new PDFDocument({ autoFirstPage: false }));
  return measureDoc.font(font).fontSize(fontSizeMm).widthOfString(text);
};

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

/** Layered SVG (layers: artwork, crease, cut, dimensions) for cutting plotters such as Cricut or laser cutters. */
export function renderSvg(layout: PrintLayout, artwork: Artwork = new Map()): string {
  // Images are embedded as data URIs so the file works offline in Cricut Design Space / Illustrator.
  const images = layout.images.flatMap((image) => {
    const file = artwork.get(image.url);
    if (!file?.contentType.startsWith('image/')) return [];
    const rotate = image.rotation
      ? ` transform="rotate(${n(image.rotation)} ${n(image.x + image.width / 2)} ${n(image.y + image.height / 2)})"`
      : '';
    return [
      `<image x="${n(image.x)}" y="${n(image.y)}" width="${n(image.width)}" height="${n(image.height)}" preserveAspectRatio="xMidYMid meet"${rotate}` +
        ` href="data:${escapeXml(file.contentType)};base64,${file.body.toString('base64')}"/>`,
    ];
  });
  const texts = layout.texts.map((t) => {
    const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t }, measure);
    const rotate = t.rotation ? ` transform="rotate(${n(t.rotation)} ${n(t.x + t.width / 2)} ${n(t.y + t.height / 2)})"` : '';
    const lines = box.lines
      .filter((line) => line.text)
      .map((line) => `<text x="${n(t.x + line.x)}" y="${n(t.y + line.baseline)}">${escapeXml(line.text)}</text>`);
    return (
      `<g font-family="${escapeXml(PRINT_FONTS[box.font])}, sans-serif" font-weight="${TEXT_FONT_WEIGHT}" font-size="${n(box.fontSizeMm)}"` +
      ` fill="${escapeXml(t.color)}"${rotate}>${lines.join('')}</g>`
    );
  });
  const strokes = (type: 'cut' | 'crease') =>
    layout.strokes.filter((s) => s.type === type).map((s) => `<path d="${escapeXml(s.d)}"/>`).join('');
  const marks = dimensionMarks(layout);
  const layer = (id: string, label: string, attributes: string, content: string) =>
    `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}"${attributes}>${content}</g>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${n(layout.width)}mm" height="${n(layout.height)}mm" viewBox="0 0 ${n(layout.width)} ${n(layout.height)}">`,
    layer('artwork', 'Artwork', '', images.join('') + texts.join('')),
    layer('crease', 'Crease', ` fill="none" stroke="${COLORS.crease}" stroke-width="${LINE_MM}" stroke-dasharray="${DASH_MM},${DASH_MM}"`, strokes('crease')),
    layer('cut', 'CutContour', ` fill="none" stroke="${COLORS.cut}" stroke-width="${LINE_MM}"`, strokes('cut')),
    layer(
      'dimensions',
      'Dimensions',
      ` font-family="Be Vietnam Pro, sans-serif" font-size="${INFO_FONT_MM}" fill="${COLORS.info}" stroke="${COLORS.info}" stroke-width="0.15"`,
      marks.lines.map(([x1, y1, x2, y2]) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`).join('') +
        marks.labels
          .map(
            (label) =>
              `<text x="${n(label.x)}" y="${n(label.y)}" text-anchor="middle" stroke="none"` +
              (label.vertical ? ` transform="rotate(-90 ${n(label.x)} ${n(label.y)})"` : '') +
              `>${escapeXml(label.text)}</text>`,
          )
          .join('') +
        `<text x="${n(marks.info.x)}" y="${n(marks.info.y)}" stroke="none">${escapeXml(marks.info.text)}</text>`,
    ),
    '</svg>',
  ].join('\n');
}

// PDFKit has no API for optional content or overprint: these write the PDF objects directly.
type Raw = { ref(data: object): { end(): void }; _root: { data: Record<string, unknown> }; page: RawPage };
type RawPage = { resources: { data: Record<string, unknown> }; dictionary: { data: Record<string, unknown> }; ext_gstates: Record<string, unknown> };

/**
 * Vector PDF 1.6 at true size (1 mm = 2.8346 pt): CMYK artwork with the editor's fonts embedded, dielines in the spot
 * colors CutContour / Crease (overprint), four layers (Dimensions does not print), TrimBox = dielines, BleedBox +2 mm.
 */
export function renderPdf(layout: PrintLayout, artwork: Artwork = new Map()): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [layout.width * PT_PER_MM, layout.height * PT_PER_MM],
      margin: 0,
      pdfVersion: '1.6',
      info: { Title: layout.title, Creator: 'WrapFit', Subject: specLine(layout) },
    });
    const raw = doc as unknown as Raw;
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    registerFonts(doc);

    // Page boxes, in points from the bottom-left corner.
    const area = trimArea(layout);
    const box = (grow: number) =>
      [area.left - grow, layout.height - area.bottom - grow, area.right + grow, layout.height - area.top + grow].map(
        (mm) => Number((mm * PT_PER_MM).toFixed(3)),
      );
    raw.page.dictionary.data.TrimBox = box(0);
    raw.page.dictionary.data.BleedBox = box(BLEED_MM);

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
    const inLayer = (name: (typeof PRINT_LAYERS)[number], draw: () => void) => {
      doc.addContent(`/OC /L${PRINT_LAYERS.indexOf(name)} BDC`);
      draw();
      doc.addContent('EMC');
    };

    // Overprint for the dielines, and their spot colors.
    const overprint = raw.ref({ Type: 'ExtGState', OP: true, op: true, OPM: 1 });
    overprint.end();
    raw.page.ext_gstates.GsOverprint = overprint;
    const spot = doc as unknown as { addSpotColor(name: string, c: number, m: number, y: number, k: number): void };
    for (const { name, cmyk } of Object.values(SPOT_COLORS)) spot.addSpotColor(name, cmyk[0], cmyk[1], cmyk[2], cmyk[3]);

    doc.scale(PT_PER_MM); // draw in mm from here on

    inLayer('Artwork', () => {
      for (const image of layout.images) {
        const file = artwork.get(image.url);
        if (!file || !canEmbedInPdf(file.body)) continue;
        doc.save();
        if (image.rotation) {
          doc.rotate(image.rotation, { origin: [image.x + image.width / 2, image.y + image.height / 2] });
        }
        doc.image(file.body, image.x, image.y, { fit: [image.width, image.height], align: 'center', valign: 'center' });
        doc.restore();
      }
      for (const t of layout.texts) {
        const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t }, measure);
        doc.save();
        if (t.rotation) doc.rotate(t.rotation, { origin: [t.x + t.width / 2, t.y + t.height / 2] });
        doc.font(box.font).fontSize(box.fontSizeMm).fillColor(hexToCmyk(t.color));
        for (const line of box.lines) {
          if (line.text) doc.text(line.text, t.x + line.x, t.y + line.baseline, { lineBreak: false, baseline: 'alphabetic' });
        }
        doc.restore();
      }
    });

    for (const type of ['crease', 'cut'] as const) {
      inLayer(type === 'cut' ? 'CutContour' : 'Crease', () => {
        doc.save().lineWidth(LINE_MM).strokeColor(SPOT_COLORS[type].name);
        doc.addContent('/GsOverprint gs');
        if (type === 'crease') doc.dash(DASH_MM, { space: DASH_MM });
        for (const stroke of layout.strokes.filter((s) => s.type === type)) doc.path(stroke.d).stroke();
        doc.undash().restore();
      });
    }

    inLayer('Dimensions', () => {
      const marks = dimensionMarks(layout);
      doc.save().lineWidth(0.15).strokeColor(CMYK_INFO).fillColor(CMYK_INFO);
      for (const [x1, y1, x2, y2] of marks.lines) doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
      doc.font('info').fontSize(INFO_FONT_MM);
      for (const label of marks.labels) {
        const width = doc.widthOfString(label.text);
        doc.save();
        if (label.vertical) doc.rotate(-90, { origin: [label.x, label.y] });
        doc.text(label.text, label.x - width / 2, label.y, { lineBreak: false, baseline: 'alphabetic' });
        doc.restore();
      }
      doc.text(marks.info.text, marks.info.x, marks.info.y, { lineBreak: false, baseline: 'alphabetic' });
      doc.restore();
    });
    doc.end();
  });
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
