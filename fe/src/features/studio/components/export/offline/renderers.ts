// Print files built in the browser when there is no backend (the Vercel demo), following the same prepress rules as
// be/src/export/rendering/print-renderers.ts (`print/prepress.ts` of @wrapfit/shared):
// - artwork in CMYK: every image is decoded and converted to DeviceCMYK pixel by pixel (rich black on photos and
//   patterns), texts and barcodes are filled with CMYK inks; dielines are the spot colours CutContour / Crease
//   (overprinted) on their own layers;
// - every text is outlined with the print font files (fontkit), so the files hold no font at all;
// - images are embedded (PDF XObjects, SVG data URIs) up to 450 DPI at their printed size, SVG logos at 600 DPI;
// - barcodes and QR codes are vectors in K100 on a white knockout; TrimBox = dielines, BleedBox +3 mm.
import {
  barcodeArt,
  BLEED_BOX_MM,
  ean13Digits,
  effectiveDpi,
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
} from "@wrapfit/shared";
import { create as openFont } from "fontkit";
import { zlibSync } from "fflate";
import QRCode from "qrcode";
import type { PrintLayout } from "./printLayout";

const COLORS = { cut: "#E53E3E", crease: "#3182CE", info: "#64748B" };
const LINE_MM = 0.25;
const DASH_MM = 4;
const PT_PER_MM = 72 / 25.4;
const INFO_FONT_MM = 3.5;
/** Raster images are downsampled to this at their printed size; SVG logos are rasterised at VECTOR_DPI. */
const MAX_EMBED_DPI = 450;
const VECTOR_DPI = 600;
/** Upper bound of one embedded bitmap (pixels), so a big pattern does not exhaust the browser's memory. */
const MAX_IMAGE_PIXELS = 24_000_000;
const CMYK_INFO: Cmyk = [0, 0, 0, 60];

/** The very files the editor draws box texts with (src/assets/fonts/print). */
const FONT_URLS: Record<PrintFontId, string> = {
  "be-vietnam-pro": new URL("../../../../../assets/fonts/print/BeVietnamPro_700Bold.ttf", import.meta.url).href,
  "playfair-display": new URL("../../../../../assets/fonts/print/PlayfairDisplay_700Bold.ttf", import.meta.url).href,
  "cormorant-garamond": new URL("../../../../../assets/fonts/print/CormorantGaramond_700Bold.ttf", import.meta.url).href,
  "big-shoulders-display": new URL("../../../../../assets/fonts/print/BigShouldersDisplay_700Bold.ttf", import.meta.url).href,
  inter: new URL("../../../../../assets/fonts/print/Inter_700Bold.ttf", import.meta.url).href,
};
/** Labels of the Dimensions layer and the ruler. */
const INFO_FONT: PrintFontId = "be-vietnam-pro";
/** Digits under an EAN-13. */
const BARCODE_FONT: PrintFontId = "inter";

const fontCache = new Map<PrintFontId, Promise<OutlineFont>>();
function loadFont(id: PrintFontId): Promise<OutlineFont> {
  if (!fontCache.has(id)) {
    const loading = fetch(FONT_URLS[id])
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được font ${id}`);
        return response.arrayBuffer();
      })
      .then((buffer) => openFont(new Uint8Array(buffer)) as unknown as OutlineFont);
    loading.catch(() => fontCache.delete(id));
    fontCache.set(id, loading);
  }
  return fontCache.get(id)!;
}

/** Everything the renderers need besides the layout: font outlines and the image files. */
export interface PrintAssets {
  fonts: Record<PrintFontId, OutlineFont>;
  /** Image files by URL, as data URIs (embedded in the SVG) and decoded bitmaps (converted for the PDF). */
  images: Map<string, { dataUri: string | null; bitmap: HTMLImageElement | null }>;
}

const n = (value: number) => Number(value.toFixed(3)).toString();
const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
/** ASCII only (PDF info dictionary strings). */
const ascii = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\x20-\x7e]/g, "");
const specLine = (layout: PrintLayout) =>
  `WrapFit — ${layout.title} — ${layout.structure} ${layout.dimensions.length} x ${layout.dimensions.width} x ${layout.dimensions.height} mm, giấy ${layout.dimensions.paperThickness} mm`;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => resolve(null), 8000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

async function dataUriOf(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null; // no CORS: the SVG links the file instead
  }
}

/** Loads the fonts and image files of a layout. */
export async function loadPrintAssets(layout: PrintLayout): Promise<PrintAssets> {
  const ids = Object.keys(FONT_URLS) as PrintFontId[];
  const loaded = await Promise.all(ids.map(loadFont));
  const fonts = Object.fromEntries(ids.map((id, i) => [id, loaded[i]])) as Record<PrintFontId, OutlineFont>;
  const images: PrintAssets["images"] = new Map();
  for (const url of new Set(layout.images.map((image) => image.url))) {
    const [dataUri, bitmap] = await Promise.all([dataUriOf(url), loadImage(url)]);
    images.set(url, { dataUri, bitmap });
  }
  return { fonts, images };
}

/** Area of the dielines on the sheet (mm): the trim box of the print file. */
function trimArea(layout: PrintLayout) {
  const right = Math.max(...layout.pieces.map((p) => p.x + p.geometry.totalBoundingBox.width));
  const bottom = Math.max(...layout.pieces.map((p) => p.y + p.geometry.totalBoundingBox.height));
  const left = Math.min(...layout.pieces.map((p) => p.x));
  const top = Math.min(...layout.pieces.map((p) => p.y));
  return { left, top, right, bottom };
}

/** Width and height of every piece (Dimensions layer): lines with end ticks and labels, mm. */
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
function labelPath(font: OutlineFont, text: string, x: number, y: number, sizeMm: number, centred: boolean) {
  return outlineText(font, text, centred ? x - outlineAdvanceMm(font, text, sizeMm) / 2 : x, y, sizeMm);
}

/** Every text element as outlines (one path per element) with its print ink. */
function textOutlines(layout: PrintLayout, assets: PrintAssets) {
  const measure: MeasureText = (text, font, sizeMm) => outlineAdvanceMm(assets.fonts[font], text, sizeMm);
  return layout.texts.map((t) => {
    const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t }, measure);
    const d = box.lines
      .filter((line) => line.text)
      .map((line) => outlineText(assets.fonts[box.font], line.text, t.x + line.x, t.y + line.baseline, box.fontSizeMm))
      .join(" ");
    return { d, color: t.color, cmyk: textCmyk(t.color, t.fontSizePt), rotation: t.rotation, cx: t.x + t.width / 2, cy: t.y + t.height / 2 };
  });
}

/** Every barcode element as vectors: white knockout box, black modules, digits as outlines. */
function barcodeVectors(layout: PrintLayout, assets: PrintAssets) {
  return layout.barcodes.flatMap((b) => {
    let qr = null;
    if (!ean13Digits(b.content)) {
      try {
        qr = QRCode.create(b.content, { errorCorrectionLevel: "M" }).modules;
      } catch {
        return [];
      }
    }
    const art = barcodeArt(b.content, b.width, b.height, qr);
    if (!art) return [];
    const bars = art.bars.map((bar) => {
      const [x, y] = [b.x + bar.x, b.y + bar.y];
      return `M ${n(x)} ${n(y)} H ${n(x + bar.width)} V ${n(y + bar.height)} H ${n(x)} Z`;
    });
    const digits = art.digits.map((digit) =>
      labelPath(assets.fonts[BARCODE_FONT], digit.text, b.x + digit.x, b.y + digit.baseline, digit.sizeMm, true),
    );
    const knockout = `M ${n(b.x)} ${n(b.y)} H ${n(b.x + b.width)} V ${n(b.y + b.height)} H ${n(b.x)} Z`;
    return [{ box: b, knockout, d: [...bars, ...digits].join(" "), rotation: b.rotation, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }];
  });
}

/** Layered SVG (artwork, crease, cut, dimensions) for cutting plotters (Cricut, laser), same as the server file. */
export function renderSvg(layout: PrintLayout, assets: PrintAssets): string {
  const rotate = (deg: number, cx: number, cy: number) => (deg ? ` transform="rotate(${n(deg)} ${n(cx)} ${n(cy)})"` : "");
  const images = layout.images.map((image) => {
    const href = assets.images.get(image.url)?.dataUri ?? image.url;
    return (
      `<image x="${n(image.x)}" y="${n(image.y)}" width="${n(image.width)}" height="${n(image.height)}" preserveAspectRatio="xMidYMid meet"` +
      `${rotate(image.rotation, image.x + image.width / 2, image.y + image.height / 2)} href="${escapeXml(href)}"/>`
    );
  });
  const texts = textOutlines(layout, assets)
    .filter((t) => t.d)
    .map((t) => `<path d="${t.d}" fill="${escapeXml(t.color)}"${rotate(t.rotation, t.cx, t.cy)}/>`);
  const barcodes = barcodeVectors(layout, assets).map(
    (b) =>
      `<g${rotate(b.rotation, b.cx, b.cy)}><rect x="${n(b.box.x)}" y="${n(b.box.y)}" width="${n(b.box.width)}" height="${n(b.box.height)}" fill="#FFFFFF"/>` +
      `<path d="${b.d}" fill="#000000"/></g>`,
  );
  const strokes = (type: "cut" | "crease") =>
    layout.strokes.filter((s) => s.type === type).map((s) => `<path d="${escapeXml(s.d)}"/>`).join("");
  const marks = dimensionMarks(layout);
  const info = assets.fonts[INFO_FONT];
  const layer = (id: string, label: string, attributes: string, content: string) =>
    `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}"${attributes}>${content}</g>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${n(layout.width)}mm" height="${n(layout.height)}mm" viewBox="0 0 ${n(layout.width)} ${n(layout.height)}">`,
    layer("artwork", "Artwork", "", images.join("") + texts.join("") + barcodes.join("")),
    layer("crease", "Crease", ` fill="none" stroke="${COLORS.crease}" stroke-width="${LINE_MM}" stroke-dasharray="${DASH_MM},${DASH_MM}"`, strokes("crease")),
    layer("cut", "CutContour", ` fill="none" stroke="${COLORS.cut}" stroke-width="${LINE_MM}"`, strokes("cut")),
    layer(
      "dimensions",
      "Dimensions",
      ` fill="${COLORS.info}" stroke="${COLORS.info}" stroke-width="0.15"`,
      marks.lines.map(([x1, y1, x2, y2]) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`).join("") +
        marks.labels
          .map(
            (label) =>
              `<path stroke="none" d="${labelPath(info, label.text, label.x, label.y, INFO_FONT_MM, true)}"` +
              (label.vertical ? ` transform="rotate(-90 ${n(label.x)} ${n(label.y)})"` : "") +
              "/>",
          )
          .join("") +
        `<path stroke="none" d="${labelPath(info, marks.info.text, marks.info.x, marks.info.y, INFO_FONT_MM, false)}"/>`,
    ),
    "</svg>",
  ].join("\n");
}

/** ASCII DXF (R12) in mm, layers CUT (red) and CREASE (blue, dashed), one POLYLINE per continuous line. */
export function renderDxf(layout: PrintLayout): string {
  const out: (string | number)[] = [];
  const pair = (code: number, value: string | number) => out.push(code, value);
  pair(0, "SECTION");
  pair(2, "HEADER");
  pair(9, "$INSUNITS");
  pair(70, 4);
  pair(0, "ENDSEC");
  pair(0, "SECTION");
  pair(2, "TABLES");
  pair(0, "TABLE");
  pair(2, "LTYPE");
  pair(70, 1);
  pair(0, "LTYPE");
  pair(2, "DASHED");
  pair(70, 0);
  pair(3, "Dashed 4 mm");
  pair(72, 65);
  pair(73, 2);
  pair(40, 2 * DASH_MM);
  pair(49, DASH_MM);
  pair(49, -DASH_MM);
  pair(0, "ENDTAB");
  pair(0, "TABLE");
  pair(2, "LAYER");
  pair(70, 2);
  for (const [name, color, ltype] of [
    ["CUT", 1, "CONTINUOUS"],
    ["CREASE", 5, "DASHED"],
  ] as const) {
    pair(0, "LAYER");
    pair(2, name);
    pair(70, 0);
    pair(62, color);
    pair(6, ltype);
  }
  pair(0, "ENDTAB");
  pair(0, "ENDSEC");
  pair(0, "SECTION");
  pair(2, "ENTITIES");
  for (const stroke of layout.strokes) {
    const layer = stroke.type === "cut" ? "CUT" : "CREASE";
    pair(0, "POLYLINE");
    pair(8, layer);
    pair(66, 1);
    pair(10, 0);
    pair(20, 0);
    pair(30, 0);
    pair(70, stroke.closed ? 1 : 0);
    for (const [x, y] of stroke.points) {
      pair(0, "VERTEX");
      pair(8, layer);
      pair(10, n(x));
      pair(20, n(layout.height - y));
      pair(30, 0);
    }
    pair(0, "SEQEND");
    pair(8, layer);
  }
  pair(0, "ENDSEC");
  pair(0, "EOF");
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------- PDF

/** Printed size (mm) of an image in its box: the file keeps its proportions, centred. */
const printedSize = (box: { width: number; height: number }, source: { width: number; height: number }) => {
  const scale = Math.min(box.width / source.width, box.height / source.height);
  return { width: source.width * scale, height: source.height * scale };
};

const isSvgUrl = (url: string, dataUri: string | null) => /\.svg(\?|#|$)/i.test(url) || !!dataUri?.startsWith("data:image/svg");

/** Resolution of each image at its printed size (null: vector or unreadable). */
export function imageResolutions(layout: PrintLayout, assets: PrintAssets) {
  return layout.images.map((image) => {
    const file = assets.images.get(image.url);
    const bitmap = file?.bitmap;
    const vector = isSvgUrl(image.url, file?.dataUri ?? null);
    if (!bitmap?.naturalWidth || vector) return { url: image.url, dpi: null, vector };
    const source = { width: bitmap.naturalWidth, height: bitmap.naturalHeight };
    return { url: image.url, dpi: effectiveDpi(source.width, printedSize(image, source).width), vector };
  });
}

/** An image of the layout as CMYK pixels for the PDF, or null when it cannot be read (no CORS, broken file). */
function prepareImage(image: PrintLayout["images"][number], assets: PrintAssets) {
  const file = assets.images.get(image.url);
  const bitmap = file?.bitmap;
  if (!bitmap) return null;
  const vector = isSvgUrl(image.url, file.dataUri);
  // SVGs without a size report 0: take the box proportions.
  const source = bitmap.naturalWidth && bitmap.naturalHeight ? { width: bitmap.naturalWidth, height: bitmap.naturalHeight } : image;
  const printed = printedSize(image, source);
  let width = vector ? pixelsFor(printed.width, VECTOR_DPI) : Math.min(source.width, pixelsFor(printed.width, MAX_EMBED_DPI));
  let height = Math.max(1, Math.round((width * printed.height) / printed.width));
  const pixels = width * height;
  if (pixels > MAX_IMAGE_PIXELS) {
    const shrink = Math.sqrt(MAX_IMAGE_PIXELS / pixels);
    width = Math.floor(width * shrink);
    height = Math.floor(height * shrink);
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Rich black on photos and patterns; logos (often small black lettering) stay on the K plate.
    return { width: canvas.width, height: canvas.height, printed, ...rgbaToCmyk(data, { richBlack: image.type !== "logo" }) };
  } catch {
    return null; // an image without CORS tainted the canvas
  }
}

/** Absolute SVG path data (M L H V C S Q T Z; arcs become lines) to PDF path operators in points. */
function pathToPdf(d: string, map: (x: number, y: number) => [number, number]): string {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out: string[] = [];
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastCtrl: [number, number] | null = null;
  const nextNum = () => Number(tokens[i++]);
  const p = (x: number, y: number) => map(x, y).map((v) => v.toFixed(3)).join(" ");
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    switch (cmd) {
      case "M":
        cx = nextNum();
        cy = nextNum();
        sx = cx;
        sy = cy;
        out.push(`${p(cx, cy)} m`);
        cmd = "L";
        lastCtrl = null;
        break;
      case "L":
        cx = nextNum();
        cy = nextNum();
        out.push(`${p(cx, cy)} l`);
        lastCtrl = null;
        break;
      case "H":
        cx = nextNum();
        out.push(`${p(cx, cy)} l`);
        lastCtrl = null;
        break;
      case "V":
        cy = nextNum();
        out.push(`${p(cx, cy)} l`);
        lastCtrl = null;
        break;
      case "C": {
        const [x1, y1, x2, y2, x, y] = [nextNum(), nextNum(), nextNum(), nextNum(), nextNum(), nextNum()];
        out.push(`${p(x1, y1)} ${p(x2, y2)} ${p(x, y)} c`);
        lastCtrl = [x2, y2];
        cx = x;
        cy = y;
        break;
      }
      case "S": {
        const [x2, y2, x, y] = [nextNum(), nextNum(), nextNum(), nextNum()];
        const [x1, y1] = lastCtrl ? [2 * cx - lastCtrl[0], 2 * cy - lastCtrl[1]] : [cx, cy];
        out.push(`${p(x1, y1)} ${p(x2, y2)} ${p(x, y)} c`);
        lastCtrl = [x2, y2];
        cx = x;
        cy = y;
        break;
      }
      case "Q":
      case "T": {
        const [qx, qy]: [number, number] =
          cmd === "Q" ? [nextNum(), nextNum()] : lastCtrl ? [2 * cx - lastCtrl[0], 2 * cy - lastCtrl[1]] : [cx, cy];
        const [x, y] = [nextNum(), nextNum()];
        out.push(`${p(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy))} ${p(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y))} ${p(x, y)} c`);
        lastCtrl = [qx, qy];
        cx = x;
        cy = y;
        break;
      }
      case "A": {
        i += 5;
        cx = nextNum();
        cy = nextNum();
        out.push(`${p(cx, cy)} l`);
        lastCtrl = null;
        break;
      }
      case "Z":
        out.push("h");
        cx = sx;
        cy = sy;
        lastCtrl = null;
        cmd = "";
        break;
      default:
        i++;
    }
  }
  return out.join("\n");
}

export interface PdfOptions {
  /** Home printing: the sheet centred on A4 or A3 at 1:1, with crop marks and a 50 mm check ruler. */
  homePrint?: boolean;
}

const enc = new TextEncoder();

/** The print PDF (see the file header). Everything is written as PDF objects by hand. */
export async function renderPdf(layout: PrintLayout, assets: PrintAssets, options: PdfOptions = {}): Promise<Blob> {
  const trim = trimArea(layout);
  // Page: the sheet itself, or A4 / A3 (portrait or landscape) holding it at 1:1 for home printing.
  let pageW = layout.width;
  let pageH = layout.height;
  if (options.homePrint) {
    const fits = (w: number, h: number) => layout.width + 20 <= w && layout.height + 30 <= h;
    const formats: [number, number][] = [[210, 297], [297, 210], [297, 420], [420, 297]];
    const chosen = formats.find(([w, h]) => fits(w, h));
    if (chosen) [pageW, pageH] = chosen;
    else {
      pageW = layout.width + 20;
      pageH = layout.height + 30;
    }
  }
  const ox = (pageW - layout.width) / 2;
  const oy = options.homePrint ? Math.max(5, (pageH - layout.height - 15) / 2) : 0;
  const k = PT_PER_MM;
  const map = (x: number, y: number): [number, number] => [(x + ox) * k, (pageH - (y + oy)) * k];
  /** `map` after turning the point `deg` degrees (clockwise on the sheet, like SVG) around (cx, cy). */
  const turned = (deg: number, cx: number, cy: number) => {
    if (!deg) return map;
    const a = (deg * Math.PI) / 180;
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    return (x: number, y: number) => map(cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos);
  };
  const f = (v: number) => v.toFixed(3);
  const ink = ([c, m, y, kk]: Cmyk) => `${[c, m, y, kk].map((v) => f(v / 100)).join(" ")} k`;
  const info = assets.fonts[INFO_FONT];

  // ---- objects
  const objects: (string | Uint8Array[])[] = [];
  const add = (body: string | Uint8Array[]) => {
    objects.push(body);
    return objects.length;
  };
  const stream = (dict: string, bytes: Uint8Array) => [enc.encode(`<< ${dict} /Length ${bytes.length} >>\nstream\n`), bytes, enc.encode("\nendstream")];
  const catalogId = 1;
  objects.push(""); // catalog, filled below
  const pagesId = add("");

  const content: string[] = [];
  const xobjects: string[] = [];

  // Artwork: images (CMYK XObjects), texts (outlines), barcodes (K100 on a white knockout).
  content.push("/OC /OCart BDC");
  for (const image of layout.images) {
    const prepared = prepareImage(image, assets);
    if (!prepared) continue;
    const common = `/Type /XObject /Subtype /Image /Width ${prepared.width} /Height ${prepared.height} /BitsPerComponent 8 /Filter /FlateDecode`;
    const smask = prepared.alpha ? add(stream(`${common} /ColorSpace /DeviceGray`, zlibSync(prepared.alpha, { level: 6 }))) : 0;
    const id = add(stream(`${common} /ColorSpace /DeviceCMYK${smask ? ` /SMask ${smask} 0 R` : ""}`, zlibSync(prepared.cmyk, { level: 6 })));
    const name = `Im${xobjects.length + 1}`;
    xobjects.push(`/${name} ${id} 0 R`);
    // Image space: (0,0) bottom-left, (1,0) bottom-right, (0,1) top-left of the printed image.
    const x0 = image.x + (image.width - prepared.printed.width) / 2;
    const y0 = image.y + (image.height - prepared.printed.height) / 2;
    const at = turned(image.rotation, image.x + image.width / 2, image.y + image.height / 2);
    const [e, g] = at(x0, y0 + prepared.printed.height);
    const [rx, ry] = at(x0 + prepared.printed.width, y0 + prepared.printed.height);
    const [tx, ty] = at(x0, y0);
    content.push(`q ${[rx - e, ry - g, tx - e, ty - g, e, g].map(f).join(" ")} cm /${name} Do Q`);
  }
  for (const t of textOutlines(layout, assets)) {
    if (t.d) content.push(`q ${ink(t.cmyk)}`, pathToPdf(t.d, turned(t.rotation, t.cx, t.cy)), "f Q");
  }
  for (const b of barcodeVectors(layout, assets)) {
    const at = turned(b.rotation, b.cx, b.cy);
    content.push(`q ${ink([0, 0, 0, 0])}`, pathToPdf(b.knockout, at), "f", ink(K100), pathToPdf(b.d, at), "f Q");
  }
  content.push("EMC");

  const strokeLayer = (type: "cut" | "crease", ocg: string, cs: string, dash: string) => {
    const paths = layout.strokes.filter((s) => s.type === type).map((s) => pathToPdf(s.d, map) + " S");
    content.push(`/OC /${ocg} BDC q /GSop gs /${cs} CS 1 SCN ${f(LINE_MM * k)} w ${dash} 1 J 1 j`, ...paths, "Q EMC");
  };
  strokeLayer("crease", "OCcrease", "CsCrease", `[${f(DASH_MM * k)} ${f(DASH_MM * k)}] 0 d`);
  strokeLayer("cut", "OCcut", "CsCut", "[] 0 d");

  const marks = dimensionMarks(layout);
  content.push(`/OC /OCdim BDC q ${ink(CMYK_INFO)} ${ink(CMYK_INFO).replace(/k$/, "K")} ${f(0.15 * k)} w`);
  for (const [x1, y1, x2, y2] of marks.lines) content.push(`${map(x1, y1).map(f).join(" ")} m ${map(x2, y2).map(f).join(" ")} l S`);
  for (const l of marks.labels) {
    content.push(pathToPdf(labelPath(info, l.text, l.x, l.y, INFO_FONT_MM, true), turned(l.vertical ? -90 : 0, l.x, l.y)), "f");
  }
  content.push(pathToPdf(labelPath(info, marks.info.text, marks.info.x, marks.info.y, INFO_FONT_MM, false), map), "f", "Q EMC");

  if (options.homePrint) {
    // Crop marks at the trim corners and a 50 mm ruler to check the printer kept 1:1 (printed, plain black).
    content.push(`q 0 0 0 1 K 0 0 0 1 k ${f(0.2 * k)} w`);
    const gap = 3;
    const len = 6;
    for (const [x, y, sxDir, syDir] of [
      [trim.left, trim.top, -1, -1],
      [trim.right, trim.top, 1, -1],
      [trim.left, trim.bottom, -1, 1],
      [trim.right, trim.bottom, 1, 1],
    ] as const) {
      content.push(`${map(x + sxDir * gap, y).map(f).join(" ")} m ${map(x + sxDir * (gap + len), y).map(f).join(" ")} l S`);
      content.push(`${map(x, y + syDir * gap).map(f).join(" ")} m ${map(x, y + syDir * (gap + len)).map(f).join(" ")} l S`);
    }
    const rx = -ox + 10;
    const ry = pageH - oy - 8;
    content.push(`${map(rx, ry).map(f).join(" ")} m ${map(rx + 50, ry).map(f).join(" ")} l S`);
    for (let mm = 0; mm <= 50; mm += 10) content.push(`${map(rx + mm, ry - (mm % 50 === 0 ? 2.5 : 1.5)).map(f).join(" ")} m ${map(rx + mm, ry).map(f).join(" ")} l S`);
    content.push(pathToPdf(labelPath(info, "50 mm — in đúng tỷ lệ 100% (không co giãn)", rx + 54, ry + 1, 3, false), map), "f Q");
  }

  const ocgs = [
    ["OCart", "Artwork", true],
    ["OCcrease", "Crease", true],
    ["OCcut", "CutContour", true],
    ["OCdim", "Dimensions", false],
  ] as const;
  const ocgIds = ocgs.map(([, name, prints]) =>
    add(`<< /Type /OCG /Name (${name}) /Usage << /Print << /PrintState /${prints ? "ON" : "OFF"} >> >> >>`),
  );
  const tint = (cmyk: string) => `<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [${cmyk}] /N 1 >>`;
  const cutFn = add(tint("0 1 0 0"));
  const creaseFn = add(tint("1 0 0 0"));
  const gsId = add("<< /Type /ExtGState /OP true /op true /OPM 1 >>");
  const contentId = add(stream("/Filter /FlateDecode", zlibSync(enc.encode(content.join("\n")), { level: 6 })));
  const box = (l: number, t: number, r: number, b: number) => {
    const [x1, y1] = map(l, b);
    const [x2, y2] = map(r, t);
    return `[${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}]`;
  };
  const props = ocgs.map(([key], index) => `/${key} ${ocgIds[index]} 0 R`).join(" ");
  const pageId = add(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f(pageW * k)} ${f(pageH * k)}]` +
      ` /TrimBox ${box(trim.left, trim.top, trim.right, trim.bottom)}` +
      ` /BleedBox ${box(trim.left - BLEED_BOX_MM, trim.top - BLEED_BOX_MM, trim.right + BLEED_BOX_MM, trim.bottom + BLEED_BOX_MM)}` +
      ` /Resources << /ExtGState << /GSop ${gsId} 0 R >>` +
      ` /ColorSpace << /CsCut [/Separation /CutContour /DeviceCMYK ${cutFn} 0 R] /CsCrease [/Separation /Crease /DeviceCMYK ${creaseFn} 0 R] >>` +
      (xobjects.length ? ` /XObject << ${xobjects.join(" ")} >>` : "") +
      ` /Properties << ${props} >> >> /Contents ${contentId} 0 R >>`,
  );
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;
  const refs = ocgIds.map((id) => `${id} 0 R`).join(" ");
  objects[catalogId - 1] =
    `<< /Type /Catalog /Pages ${pagesId} 0 R /OCProperties << /OCGs [${refs}] /D << /Order [${refs}] /ON [${refs}]` +
    ` /AS [<< /Event /Print /OCGs [${refs}] /Category [/Print] >>] >> >> >>`;
  const infoId = add(`<< /Title (${ascii(layout.title) || "WrapFit"}) /Producer (WrapFit) /Creator (WrapFit Studio) >>`);

  // ---- file with cross-reference table
  const parts: Uint8Array[] = [enc.encode("%PDF-1.6\n%\xE2\xE3\xCF\xD3\n")];
  let offset = parts[0].length;
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(offset);
    const chunks = [enc.encode(`${index + 1} 0 obj\n`), ...(typeof body === "string" ? [enc.encode(body)] : body), enc.encode("\nendobj\n")];
    for (const chunk of chunks) {
      parts.push(chunk);
      offset += chunk.length;
    }
  });
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(enc.encode(`${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${offset}\n%%EOF\n`));
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/** The SVG of the sheet as a JPG on white paper (150 DPI), for checking the print file against; null if the browser refuses. */
export async function renderProofJpeg(svg: string, dpi = 150): Promise<Blob | null> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = await loadImage(url);
    if (!image) return null;
    const widthMm = Number(/width="([\d.]+)mm"/.exec(svg)?.[1] ?? 0);
    const heightMm = Number(/height="([\d.]+)mm"/.exec(svg)?.[1] ?? 0);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, pixelsFor(widthMm, dpi));
    canvas.height = Math.max(1, pixelsFor(heightMm, dpi));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      } catch {
        resolve(null);
      }
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
