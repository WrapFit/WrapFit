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
  filterCss,
  fontUrlsOf,
  FINISH_SPOTS,
  gradientLine,
  imageDraw,
  isCropped,
  outlineTextOnArc,
  fontFileName,
  hexToCmyk,
  underlineOf,
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
  type PlacedBase,
  type PrintFontId,
  type TextFace,
} from "@wrapfit/shared";
import { create as openFont } from "fontkit";
import { zlibSync } from "fflate";
import QRCode from "qrcode";
import type { PrintLayout } from "./printLayout";
import { imageKey, recoloredSrc } from "../../../utils/svgRecolor";

const COLORS = { cut: "#E53E3E", crease: "#3182CE", info: "#64748B" };
const LINE_MM = 0.25;
const DASH_MM = 4;
const PT_PER_MM = 72 / 25.4;
const INFO_FONT_MM = 3.5;
/** Spec line of the box (name, structure, L x W x H, paper): 6 pt, printed in the margin on the Artwork layer. */
const SPEC_LINE_FONT_MM = 6 / PT_PER_MM;
/** Baseline of the spec line below the cut: its top stays at least 5 mm under the cut, clear of the 3 mm bleed. */
const SPEC_LINE_BELOW_CUT_MM = 5 + SPEC_LINE_FONT_MM;
/** Raster images are downsampled to this at their printed size; SVG logos are rasterised at VECTOR_DPI. */
const MAX_EMBED_DPI = 450;
const VECTOR_DPI = 600;
/** Upper bound of one embedded bitmap (pixels), so a big pattern does not exhaust the browser's memory. */
const MAX_IMAGE_PIXELS = 24_000_000;
const CMYK_INFO: Cmyk = [0, 0, 0, 60];

/** The very files the editor draws box texts with (src/assets/fonts/print), four faces per family. */
const FONT_URLS: Record<string, string> = {
  BeVietnamPro_400Regular: new URL("../../../../../assets/fonts/print/BeVietnamPro_400Regular.ttf", import.meta.url).href,
  BeVietnamPro_400Regular_Italic: new URL("../../../../../assets/fonts/print/BeVietnamPro_400Regular_Italic.ttf", import.meta.url).href,
  BeVietnamPro_700Bold: new URL("../../../../../assets/fonts/print/BeVietnamPro_700Bold.ttf", import.meta.url).href,
  BeVietnamPro_700Bold_Italic: new URL("../../../../../assets/fonts/print/BeVietnamPro_700Bold_Italic.ttf", import.meta.url).href,
  PlayfairDisplay_400Regular: new URL("../../../../../assets/fonts/print/PlayfairDisplay_400Regular.ttf", import.meta.url).href,
  PlayfairDisplay_400Regular_Italic: new URL("../../../../../assets/fonts/print/PlayfairDisplay_400Regular_Italic.ttf", import.meta.url).href,
  PlayfairDisplay_700Bold: new URL("../../../../../assets/fonts/print/PlayfairDisplay_700Bold.ttf", import.meta.url).href,
  PlayfairDisplay_700Bold_Italic: new URL("../../../../../assets/fonts/print/PlayfairDisplay_700Bold_Italic.ttf", import.meta.url).href,
  CormorantGaramond_400Regular: new URL("../../../../../assets/fonts/print/CormorantGaramond_400Regular.ttf", import.meta.url).href,
  CormorantGaramond_400Regular_Italic: new URL("../../../../../assets/fonts/print/CormorantGaramond_400Regular_Italic.ttf", import.meta.url).href,
  CormorantGaramond_700Bold: new URL("../../../../../assets/fonts/print/CormorantGaramond_700Bold.ttf", import.meta.url).href,
  CormorantGaramond_700Bold_Italic: new URL("../../../../../assets/fonts/print/CormorantGaramond_700Bold_Italic.ttf", import.meta.url).href,
  BigShouldersDisplay_400Regular: new URL("../../../../../assets/fonts/print/BigShouldersDisplay_400Regular.ttf", import.meta.url).href,
  BigShouldersDisplay_700Bold: new URL("../../../../../assets/fonts/print/BigShouldersDisplay_700Bold.ttf", import.meta.url).href,
  Inter_400Regular: new URL("../../../../../assets/fonts/print/Inter_400Regular.ttf", import.meta.url).href,
  Inter_400Regular_Italic: new URL("../../../../../assets/fonts/print/Inter_400Regular_Italic.ttf", import.meta.url).href,
  Inter_700Bold: new URL("../../../../../assets/fonts/print/Inter_700Bold.ttf", import.meta.url).href,
  Inter_700Bold_Italic: new URL("../../../../../assets/fonts/print/Inter_700Bold_Italic.ttf", import.meta.url).href,
};
const PRINT_FONT_IDS: PrintFontId[] = ["be-vietnam-pro", "playfair-display", "cormorant-garamond", "big-shoulders-display", "inter"];
/** Key of a face in FONT_URLS: the file name without extension. */
const faceKey = (font: PrintFontId, face: TextFace) => fontFileName(font, face).replace(/\.ttf$/, "");
/** Labels of the Dimensions layer and the ruler. */
const INFO_FONT: PrintFontId = "be-vietnam-pro";
/** Digits under an EAN-13. */
const BARCODE_FONT: PrintFontId = "inter";

const fontCache = new Map<string, Promise<OutlineFont>>();
function loadFont(key: string): Promise<OutlineFont> {
  if (!fontCache.has(key)) {
    const loading = fetch(FONT_URLS[key])
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được font ${key}`);
        return response.arrayBuffer();
      })
      .then((buffer) => openFont(new Uint8Array(buffer)) as unknown as OutlineFont);
    loading.catch(() => fontCache.delete(key));
    fontCache.set(key, loading);
  }
  return fontCache.get(key)!;
}

/** Everything the renderers need besides the layout: font outlines and the image files. */
export interface PrintAssets {
  /** Bold face of each family (labels, library art, barcode digits). */
  fonts: Record<PrintFontId, OutlineFont>;
  /** Every face, by `faceKey` (texts of the design). */
  faces: Record<string, OutlineFont>;
  /** Fonts the user uploaded (docs/23 S13), by file URL. */
  custom: Record<string, OutlineFont>;
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
  // Faces the texts use, plus the bold of every family (library art, labels, barcode digits).
  const keys = new Set(PRINT_FONT_IDS.map((id) => faceKey(id, "bold")));
  // The inside sheet (docs/23 S5) needs its fonts and images too.
  const sheets = [layout, ...(layout.inside ? [layout.inside] : [])];
  for (const t of sheets.flatMap((sheet) => sheet.texts)) {
    keys.add(faceKey(fontOfPlaced(t), textFaceOfPlaced(t)));
  }
  const loaded = await Promise.all([...keys].map(async (key) => [key, await loadFont(key)] as const));
  const faces = Object.fromEntries(loaded) as Record<string, OutlineFont>;
  const fonts = Object.fromEntries(PRINT_FONT_IDS.map((id) => [id, faces[faceKey(id, "bold")]])) as Record<PrintFontId, OutlineFont>;
  const images: PrintAssets["images"] = new Map();
  // One file per URL and colour swaps: recoloured SVG logos (docs/23 S14) print from their recoloured copy.
  for (const image of sheets.flatMap((sheet) => sheet.images)) {
    const key = imageKey(image.url, image.colorMap);
    if (images.has(key)) continue;
    images.set(key, { dataUri: null, bitmap: null });
    const src = await recoloredSrc(image.url, image.colorMap);
    const [dataUri, bitmap] = await Promise.all([dataUriOf(src), loadImage(src)]);
    images.set(key, { dataUri, bitmap });
  }
  // Uploaded fonts of the texts (docs/23 S13): a font that cannot load prints in its built-in fallback.
  const custom: Record<string, OutlineFont> = {};
  for (const url of fontUrlsOf(sheets.flatMap((sheet) => sheet.texts).map((t) => ({ type: "text" as const, style: t.style })))) {
    try {
      const response = await fetch(url);
      if (response.ok) custom[url] = openFont(new Uint8Array(await response.arrayBuffer())) as unknown as OutlineFont;
    } catch {
      // fallback font
    }
  }
  return { fonts, faces, images, custom };
}

/** Font and face of a placed text (the same choice layoutTextBox makes). */
function fontOfPlaced(t: PrintLayout["texts"][number]): PrintFontId {
  return layoutTextBox({ content: "", width: 1, height: 1, style: t.style }, () => 0).font;
}
function textFaceOfPlaced(t: PrintLayout["texts"][number]): TextFace {
  return layoutTextBox({ content: "", width: 1, height: 1, style: t.style }, () => 0).face;
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
  const info = { text: specLine(layout), x: layout.pieces[0].x, y: trimArea(layout).bottom + SPEC_LINE_BELOW_CUT_MM };
  return { lines, labels, info };
}

/** Outlines of a one-line label whose baseline starts (or, `centred`, is centred) at (x, y). */
function labelPath(font: OutlineFont, text: string, x: number, y: number, sizeMm: number, centred: boolean) {
  return outlineText(font, text, centred ? x - outlineAdvanceMm(font, text, sizeMm) / 2 : x, y, sizeMm);
}

/** Every text element as outlines (one path per element, underlines included) with its print ink. */
function textOutlines(layout: PrintLayout, assets: PrintAssets) {
  const fontFor = (font: PrintFontId, face: TextFace = "bold", fontUrl?: string | null) =>
    (fontUrl ? assets.custom[fontUrl] : undefined) ?? assets.faces[faceKey(font, face)] ?? assets.fonts[font];
  const measure: MeasureText = (text, font, sizeMm, face, fontUrl) => outlineAdvanceMm(fontFor(font, face, fontUrl), text, sizeMm);
  return layout.texts.map((t) => {
    const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t.style }, measure);
    const font = fontFor(box.font, box.face, box.fontUrl);
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
    return { ...t, d: [...glyphs, ...bars].join(" "), cmyk: t.style.cmyk ?? textCmyk(t.color, t.fontSizePt), stroke: box.stroke };
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
    return [{ ...b, knockout, d: [...bars, ...digits].join(" ") }];
  });
}

/** Vector art (library art and shapes), with its texts outlined, in the coordinates of the element. */
function artVectors(layout: PrintLayout, assets: PrintAssets) {
  return layout.arts.map((a) => ({
    ...a,
    texts: a.art.texts.map((t) => ({ d: labelPath(assets.fonts[t.font], t.text, t.x, t.baseline, t.size, t.anchor === "middle"), color: t.color })),
  }));
}

/** Everything of the artwork layer in paint order (the order of the layers in the editor, docs/23 D3). */
type DrawItem =
  | { kind: "art"; item: ReturnType<typeof artVectors>[number] }
  | { kind: "image"; item: PrintLayout["images"][number] }
  | { kind: "text"; item: ReturnType<typeof textOutlines>[number] }
  | { kind: "barcode"; item: ReturnType<typeof barcodeVectors>[number] };

function drawList(layout: PrintLayout, assets: PrintAssets): DrawItem[] {
  const items: DrawItem[] = [
    ...artVectors(layout, assets).map((item) => ({ kind: "art" as const, item })),
    ...layout.images.map((item) => ({ kind: "image" as const, item })),
    ...textOutlines(layout, assets).map((item) => ({ kind: "text" as const, item })),
    ...barcodeVectors(layout, assets).map((item) => ({ kind: "barcode" as const, item })),
  ];
  return items.sort((a, b) => a.item.order - b.item.order);
}

const centreOf = (b: PlacedBase) => ({ cx: b.x + b.width / 2, cy: b.y + b.height / 2 });

/** SVG of vector art in sheet coordinates (the caller adds the clip, the turn and the mirror). */
let gradientCount = 0;
function artSvg(a: ReturnType<typeof artVectors>[number]): string {
  const defs: string[] = [];
  const fillOf = (s: (typeof a.art.shapes)[number]) => {
    if (!s.gradient) return escapeXml(s.fill ?? "none");
    const id = `grad${++gradientCount}`;
    const line = gradientLine(s.gradient.angle, a.width, a.height);
    const stops = s.gradient.stops.map((stop) => `<stop offset="${n(stop.offset)}" stop-color="${escapeXml(stop.color)}"/>`).join("");
    defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(line.x1)}" y1="${n(line.y1)}" x2="${n(line.x2)}" y2="${n(line.y2)}">${stops}</linearGradient>`);
    return `url(#${id})`;
  };
  const shapes = a.art.shapes.map(
    (s) =>
      `<path d="${s.d}" fill="${fillOf(s)}"` +
      (s.stroke ? ` stroke="${escapeXml(s.stroke)}" stroke-width="${n(s.strokeWidth ?? LINE_MM)}"` : "") +
      (s.round ? ' stroke-linecap="round" stroke-linejoin="round"' : "") +
      "/>",
  );
  const texts = a.texts.filter((t) => t.d).map((t) => `<path d="${t.d}" fill="${escapeXml(t.color)}"/>`);
  const gradients = defs.length ? `<defs>${defs.join("")}</defs>` : "";
  return `<g transform="translate(${n(a.x)} ${n(a.y)})">${gradients}${shapes.join("")}${texts.join("")}</g>`;
}

/**
 * An image cut to its crop / fill and adjusted (docs/23 S10), as a PNG data URI and where it lands in its box; null
 * when the plain file is used (or the browser cannot read its pixels).
 */
function framedImage(image: PrintLayout["images"][number], assets: PrintAssets): { href: string; draw: ReturnType<typeof imageDraw> } | null {
  if (!isCropped(image) && !image.filters) return null;
  const bitmap = assets.images.get(imageKey(image.url, image.colorMap))?.bitmap;
  if (!bitmap?.naturalWidth || !bitmap.naturalHeight) return null;
  const draw = imageDraw(image, { width: bitmap.naturalWidth, height: bitmap.naturalHeight });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(draw.sw));
  canvas.height = Math.max(1, Math.round(draw.sh));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.filter = filterCss(image.filters ?? undefined);
  ctx.drawImage(bitmap, draw.sx, draw.sy, draw.sw, draw.sh, 0, 0, canvas.width, canvas.height);
  try {
    return { href: canvas.toDataURL("image/png"), draw };
  } catch {
    return null;
  }
}

/** Layered SVG (artwork, crease, cut, dimensions) for cutting plotters (Cricut, laser), same as the server file. */
export function renderSvg(layout: PrintLayout, assets: PrintAssets): string {
  let maskCount = 0;
  // Each element is cut to its face + bleed (one clip path per face), then turned and mirrored around its centre.
  const clips = new Map<string, { id: string; box: PlacedBase["clip"] }>();
  const clipId = (box: PlacedBase["clip"]) => {
    const key = [box.x, box.y, box.width, box.height].map(n).join(",");
    if (!clips.has(key)) clips.set(key, { id: `face${clips.size + 1}`, box });
    return clips.get(key)!.id;
  };
  const placed = (b: PlacedBase, content: string) => {
    const { cx, cy } = centreOf(b);
    const transform = [
      b.rotation ? `rotate(${n(b.rotation)} ${n(cx)} ${n(cy)})` : "",
      b.flipX || b.flipY ? `translate(${n(cx)} ${n(cy)}) scale(${b.flipX ? -1 : 1} ${b.flipY ? -1 : 1}) translate(${n(-cx)} ${n(-cy)})` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const inner = transform ? `<g transform="${transform}">${content}</g>` : content;
    return `<g clip-path="url(#${clipId(b.clip)})"${b.opacity < 1 ? ` opacity="${n(b.opacity)}"` : ""}>${inner}</g>`;
  };
  const artworkSvg = drawList(layout, assets)
    .map(({ kind, item }) => {
      if (kind === "art") return placed(item, artSvg(item));
      if (kind === "text") {
        if (!item.d) return "";
        // The outline sits under the fill: twice its width, half of it hidden by the letters.
        const outline = item.stroke
          ? ` stroke="${escapeXml(item.stroke.color)}" stroke-width="${n(item.stroke.widthMm * 2)}" stroke-linejoin="round" paint-order="stroke"`
          : "";
        return placed(item, `<path d="${item.d}" fill="${escapeXml(item.color)}"${outline}/>`);
      }
      if (kind === "barcode") {
        return placed(
          item,
          `<rect x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" fill="#FFFFFF"/>` +
            `<path d="${item.d}" fill="#000000"/>`,
        );
      }
      const href = assets.images.get(imageKey(item.url, item.colorMap))?.dataUri ?? item.url;
      const framed = framedImage(item, assets);
      const picture = framed
        ? `<image x="${n(item.x + framed.draw.dx)}" y="${n(item.y + framed.draw.dy)}" width="${n(framed.draw.dw)}" height="${n(framed.draw.dh)}" preserveAspectRatio="none" href="${framed.href}"/>`
        : `<image x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(href)}"/>`;
      if (!item.mask) return placed(item, picture);
      const id = `mask${++maskCount}`;
      return placed(
        item,
        `<clipPath id="${id}"><path transform="translate(${n(item.x)} ${n(item.y)})" d="${item.mask}"/></clipPath><g clip-path="url(#${id})">${picture}</g>`,
      );
    })
    .join("");
  // Finishes (docs/23 S6): the shapes of each foil / UV / embossed element in the colour of its spot, on their own layer.
  const finishSvg = drawList(layout, assets)
    .filter(({ item }) => item.finish)
    .map(({ kind, item }) => {
      const colour = escapeXml(FINISH_SPOTS[item.finish!].display);
      const solid = { ...item, opacity: 1 };
      if (kind === "art") {
        const shapes = item.art.shapes
          .map((sh) => `<path d="${sh.d}" fill="${sh.fill ? colour : "none"}"${sh.stroke ? ` stroke="${colour}" stroke-width="${n(sh.strokeWidth ?? LINE_MM)}"` : ""}/>`)
          .join("");
        const texts = item.texts.filter((t) => t.d).map((t) => `<path d="${t.d}" fill="${colour}"/>`).join("");
        return placed(solid, `<g transform="translate(${n(item.x)} ${n(item.y)})">${shapes}${texts}</g>`);
      }
      if (kind === "text" || kind === "barcode") return item.d ? placed(solid, `<path d="${item.d}" fill="${colour}"/>`) : "";
      return placed(solid, `<rect x="${n(item.x)}" y="${n(item.y)}" width="${n(item.width)}" height="${n(item.height)}" fill="${colour}"/>`);
    })
    .join("");
  const defs = clips.size
    ? `<defs>${[...clips.values()]
        .map(({ id, box }) => `<clipPath id="${id}"><rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}"/></clipPath>`)
        .join("")}</defs>`
    : "";
  const strokes = (type: "cut" | "crease") =>
    layout.strokes.filter((s) => s.type === type).map((s) => `<path d="${escapeXml(s.d)}"/>`).join("");
  const marks = dimensionMarks(layout);
  const info = assets.fonts[INFO_FONT];
  const layer = (id: string, label: string, attributes: string, content: string) =>
    `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}"${attributes}>${content}</g>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${n(layout.width)}mm" height="${n(layout.height)}mm" viewBox="0 0 ${n(layout.width)} ${n(layout.height)}">` + defs,
    layer(
      "artwork",
      "Artwork",
      "",
      artworkSvg +
        `<path fill="${COLORS.info}" d="${labelPath(info, marks.info.text, marks.info.x, marks.info.y, SPEC_LINE_FONT_MM, false)}"/>`,
    ),
    ...(finishSvg ? [layer("finish", "Finish", "", finishSvg)] : []),
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
          .join(""),
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

const isSvgUrl = (url: string, dataUri: string | null) => /\.svg(\?|#|$)/i.test(url) || !!dataUri?.startsWith("data:image/svg");

/** Resolution of each image at its printed size (null: vector or unreadable). */
export function imageResolutions(layout: PrintLayout, assets: PrintAssets) {
  return layout.images.map((image) => {
    const file = assets.images.get(imageKey(image.url, image.colorMap));
    const bitmap = file?.bitmap;
    const vector = isSvgUrl(image.url, file?.dataUri ?? null);
    if (!bitmap?.naturalWidth || vector) return { url: image.url, dpi: null, vector };
    const source = { width: bitmap.naturalWidth, height: bitmap.naturalHeight };
    const draw = imageDraw(image, source);
    return { url: image.url, dpi: effectiveDpi(draw.sw, draw.dw), vector };
  });
}

/** An image of the layout as CMYK pixels for the PDF, or null when it cannot be read (no CORS, broken file). */
function prepareImage(image: PrintLayout["images"][number], assets: PrintAssets) {
  const file = assets.images.get(imageKey(image.url, image.colorMap));
  const bitmap = file?.bitmap;
  if (!bitmap) return null;
  const vector = isSvgUrl(image.url, file.dataUri);
  // SVGs without a size report 0: take the box proportions.
  const source = bitmap.naturalWidth && bitmap.naturalHeight ? { width: bitmap.naturalWidth, height: bitmap.naturalHeight } : image;
  const draw = imageDraw(image, source);
  const printed = { width: draw.dw, height: draw.dh };
  let width = vector ? pixelsFor(printed.width, VECTOR_DPI) : Math.min(Math.round(draw.sw), pixelsFor(printed.width, MAX_EMBED_DPI));
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
  // Photo adjustments baked into the printed pixels (docs/23 S10), the part of the image the box shows.
  ctx.filter = filterCss(image.filters ?? undefined);
  if (bitmap.naturalWidth && bitmap.naturalHeight) ctx.drawImage(bitmap, draw.sx, draw.sy, draw.sw, draw.sh, 0, 0, canvas.width, canvas.height);
  else ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Rich black on photos and patterns; logos (often small black lettering) stay on the K plate.
    return { width: canvas.width, height: canvas.height, printed, draw, ...rgbaToCmyk(data, { richBlack: image.type !== "logo" }) };
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
  /** `map` for a placed element: mirrored (flipX / flipY), then turned, around the centre of its box. */
  const placedMap = (b: PlacedBase) => {
    const { cx, cy } = centreOf(b);
    const turn = turned(b.rotation, cx, cy);
    if (!b.flipX && !b.flipY) return turn;
    return (x: number, y: number) => turn(b.flipX ? 2 * cx - x : x, b.flipY ? 2 * cy - y : y);
  };
  /** Opacity graphics states (/GSa50 = 50 %), declared in the page resources. */
  const alphaStates = new Map<string, number>();
  /** Opens an element: clip to its face + bleed, opacity. Close with "Q". */
  const openPlaced = (b: PlacedBase) => {
    const { x, y, width, height } = b.clip;
    const clip = pathToPdf(`M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`, map);
    let alpha = "";
    if (b.opacity < 1) {
      const name = `GSa${Math.round(b.opacity * 100)}`;
      alphaStates.set(name, b.opacity);
      alpha = ` /${name} gs`;
    }
    return `q ${clip} W n${alpha}`;
  };
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

  let content: string[] = [];
  let xobjects: string[] = [];
  let shadings: string[] = [];

  // Layers and colour spaces, shared by the pages.
  const ocgs = [
    ["OCart", "Artwork", true],
    ["OCfin", "Finish", true],
    ["OCcut", "CutContour", true],
    ["OCdim", "Dimensions", false],
  ] as const;
  const ocgIds = ocgs.map(([, name, prints]) =>
    add(`<< /Type /OCG /Name (${name}) /Usage << /Print << /PrintState /${prints ? "ON" : "OFF"} >> >> >>`),
  );
  const tint = (cmyk: string) => `<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [${cmyk}] /N 1 >>`;
  const cutFn = add(tint("0 1 0 0"));
  const creaseFn = add(tint("1 0 0 0"));
  // Spot colours of the finishes (docs/23 D8): Foil_Gold, SpotUV, Emboss…
  const finishSpaces = Object.values(FINISH_SPOTS)
    .map((spot) => `/CsF_${spot.name} [/Separation /${spot.name} /DeviceCMYK ${add(tint(spot.cmyk.map((v) => f(v / 100)).join(" ")))} 0 R]`)
    .join(" ");
  const gsId = add("<< /Type /ExtGState /OP true /op true /OPM 1 >>");

  /** Library art: shapes filled / stroked in CMYK, then its outlined texts (element coordinates moved onto the sheet). */
  const drawArt = (a: ReturnType<typeof artVectors>[number]) => {
    const sheet = placedMap(a);
    const at = (x: number, y: number) => sheet(a.x + x, a.y + y);
    content.push(openPlaced(a));
    for (const shape of a.art.shapes) {
      const path = pathToPdf(shape.d, at);
      if (shape.gradient) {
        // Linear gradient (docs/23 S11): an axial shading in DeviceCMYK, painted inside the shape.
        const line = gradientLine(shape.gradient.angle, a.width, a.height);
        const [x1, y1] = at(line.x1, line.y1);
        const [x2, y2] = at(line.x2, line.y2);
        const stops = shape.gradient.stops;
        const inkOf = (color: string) => hexToCmyk(color).map((v) => f(v / 100)).join(" ");
        const pieces = stops.slice(1).map((stop, i) => `<< /FunctionType 2 /Domain [0 1] /C0 [${inkOf(stops[i].color)}] /C1 [${inkOf(stop.color)}] /N 1 >>`);
        const fn =
          pieces.length === 1
            ? pieces[0]
            : `<< /FunctionType 3 /Domain [0 1] /Functions [${pieces.join(" ")}] /Bounds [${stops.slice(1, -1).map((stop) => f(stop.offset)).join(" ")}] /Encode [${pieces.map(() => "0 1").join(" ")}] >>`;
        const id = add(`<< /ShadingType 2 /ColorSpace /DeviceCMYK /Coords [${[x1, y1, x2, y2].map(f).join(" ")}] /Function ${fn} /Extend [true true] >>`);
        const name = `Sh${shadings.length + 1}`;
        shadings.push(`/${name} ${id} 0 R`);
        content.push("q", path, `W n /${name} sh Q`);
        if (shape.stroke) content.push(`${ink(hexToCmyk(shape.stroke)).replace(/k$/, "K")} ${f((shape.strokeWidth ?? LINE_MM) * k)} w`, path, "S");
        continue;
      }
      const fill = shape.fill ? ink(shape.cmyk ?? hexToCmyk(shape.fill)) : "";
      const stroke = shape.stroke
        ? `${ink(hexToCmyk(shape.stroke)).replace(/k$/, "K")} ${f((shape.strokeWidth ?? LINE_MM) * k)} w ${shape.round ? "1 J 1 j" : "0 J 0 j"}`
        : "";
      content.push([fill, stroke].filter(Boolean).join(" "), path, shape.fill && shape.stroke ? "B" : shape.stroke ? "S" : "f");
    }
    for (const t of a.texts) if (t.d) content.push(ink(hexToCmyk(t.color)), pathToPdf(t.d, at), "f");
    content.push("Q");
  };

  /** One sheet on its own page (the outside, then the inside of the sheet, docs/23 S5); returns the page object. */
  const buildPage = (layout: PrintLayout): number => {
  const trim = trimArea(layout);
  content = [];
  xobjects = [];
  shadings = [];
  alphaStates.clear();
  // Artwork, in the order of the layers: backgrounds, images (CMYK XObjects), stickers, shapes, texts, barcodes.
  content.push("/OC /OCart BDC");
  for (const { kind, item } of drawList(layout, assets)) {
    if (kind === "art") {
      drawArt(item);
    } else if (kind === "text") {
      if (item.d) {
        const path = pathToPdf(item.d, placedMap(item));
        // Outline under the fill: twice its width, half of it hidden by the letters.
        const outline = item.stroke ? [`${ink(hexToCmyk(item.stroke.color)).replace(/k$/, "K")} ${f(item.stroke.widthMm * 2 * k)} w 1 j`, path, "S"] : [];
        content.push(openPlaced(item), ...outline, ink(item.cmyk), path, "f Q");
      }
    } else if (kind === "barcode") {
      const at = placedMap(item);
      content.push(`${openPlaced(item)} ${ink([0, 0, 0, 0])}`, pathToPdf(item.knockout, at), "f", ink(K100), pathToPdf(item.d, at), "f Q");
    } else {
      const image = item;
      const prepared = prepareImage(image, assets);
      if (!prepared) continue;
      const common = `/Type /XObject /Subtype /Image /Width ${prepared.width} /Height ${prepared.height} /BitsPerComponent 8 /Filter /FlateDecode`;
      const smask = prepared.alpha ? add(stream(`${common} /ColorSpace /DeviceGray`, zlibSync(prepared.alpha, { level: 6 }))) : 0;
      const id = add(stream(`${common} /ColorSpace /DeviceCMYK${smask ? ` /SMask ${smask} 0 R` : ""}`, zlibSync(prepared.cmyk, { level: 6 })));
      const name = `Im${xobjects.length + 1}`;
      xobjects.push(`/${name} ${id} 0 R`);
      // Image space: (0,0) bottom-left, (1,0) bottom-right, (0,1) top-left of the printed image.
      const x0 = image.x + prepared.draw.dx;
      const y0 = image.y + prepared.draw.dy;
      const at = placedMap(image);
      const [e, g] = at(x0, y0 + prepared.printed.height);
      const [rx, ry] = at(x0 + prepared.printed.width, y0 + prepared.printed.height);
      const [tx, ty] = at(x0, y0);
      // Frame of the photo (rounded, circle, arch): an extra clip in the coordinates of its box.
      const frame = image.mask ? ` ${pathToPdf(image.mask, (x, y) => at(image.x + x, image.y + y))} W n` : "";
      content.push(`${openPlaced(image)}${frame} ${[rx - e, ry - g, tx - e, ty - g, e, g].map(f).join(" ")} cm /${name} Do Q`);
    }
  }
  // Spec line in the margin: printed with the artwork so the print shop and the customer can read the box size.
  const spec = dimensionMarks(layout).info;
  content.push(`q ${ink(CMYK_INFO)}`, pathToPdf(labelPath(info, spec.text, spec.x, spec.y, SPEC_LINE_FONT_MM, false), map), "f Q");
  content.push("EMC");

  // Finishes: each foil / UV / embossed element in its spot colour, 100 %, overprinted.
  const finished = drawList(layout, assets).filter(({ item }) => item.finish);
  if (finished.length) {
    content.push("/OC /OCfin BDC q /GSop gs");
    for (const { kind, item } of finished) {
      const space = `CsF_${FINISH_SPOTS[item.finish!].name}`;
      const open = `${openPlaced({ ...item, opacity: 1 })} /${space} cs 1 scn /${space} CS 1 SCN`;
      if (kind === "art") {
        const sheet = placedMap(item);
        const at = (x: number, y: number) => sheet(item.x + x, item.y + y);
        content.push(open);
        for (const shape of item.art.shapes) {
          content.push(`${f((shape.strokeWidth ?? LINE_MM) * k)} w`, pathToPdf(shape.d, at), shape.fill && shape.stroke ? "B" : shape.stroke ? "S" : "f");
        }
        for (const t of item.texts) if (t.d) content.push(pathToPdf(t.d, at), "f");
        content.push("Q");
      } else if (kind === "text" || kind === "barcode") {
        if (item.d) content.push(open, pathToPdf(item.d, placedMap(item)), "f Q");
      } else {
        const rect = `M ${item.x} ${item.y} H ${item.x + item.width} V ${item.y + item.height} H ${item.x} Z`;
        content.push(open, pathToPdf(rect, placedMap(item)), "f Q");
      }
    }
    content.push("Q EMC");
  }

  const strokeLayer = (type: "cut", ocg: string, cs: string, dash: string) => {
    const paths = layout.strokes.filter((s) => s.type === type).map((s) => pathToPdf(s.d, map) + " S");
    content.push(`/OC /${ocg} BDC q /GSop gs /${cs} CS 1 SCN ${f(LINE_MM * k)} w ${dash} 1 J 1 j`, ...paths, "Q EMC");
  };
  // No crease layer: the dashed fold lines are not printed (same as the server file).
  strokeLayer("cut", "OCcut", "CsCut", "[] 0 d");

  const marks = dimensionMarks(layout);
  content.push(`/OC /OCdim BDC q ${ink(CMYK_INFO)} ${ink(CMYK_INFO).replace(/k$/, "K")} ${f(0.15 * k)} w`);
  for (const [x1, y1, x2, y2] of marks.lines) content.push(`${map(x1, y1).map(f).join(" ")} m ${map(x2, y2).map(f).join(" ")} l S`);
  for (const l of marks.labels) {
    content.push(pathToPdf(labelPath(info, l.text, l.x, l.y, INFO_FONT_MM, true), turned(l.vertical ? -90 : 0, l.x, l.y)), "f");
  }
  content.push("Q EMC");

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
      ` /Resources << /ExtGState << /GSop ${gsId} 0 R${[...alphaStates].map(([name, alpha]) => ` /${name} << /Type /ExtGState /CA ${f(alpha)} /ca ${f(alpha)} >>`).join("")} >>` +
      ` /ColorSpace << /CsCut [/Separation /CutContour /DeviceCMYK ${cutFn} 0 R] /CsCrease [/Separation /Crease /DeviceCMYK ${creaseFn} 0 R] ${finishSpaces} >>` +
      (xobjects.length ? ` /XObject << ${xobjects.join(" ")} >>` : "") +
      (shadings.length ? ` /Shading << ${shadings.join(" ")} >>` : "") +
      ` /Properties << ${props} >> >> /Contents ${contentId} 0 R >>`,
  );
  return pageId;
  };
  const pageIds = [buildPage(layout), ...(layout.inside ? [buildPage(layout.inside)] : [])];
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
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
