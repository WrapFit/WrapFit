// Print files built in the browser when there is no backend (the Vercel demo). SVG and DXF are ports of
// be/src/export/rendering/print-renderers.ts. The PDF is written by hand (no PDFKit in the browser): vector cut and
// crease lines as the spot colours CutContour / Crease (CMYK alternates, overprinted) on their own layers, TrimBox and
// a 2 mm BleedBox, and the artwork (texts, images) drawn at 300 DPI on the Artwork layer.
import { layoutTextBox, PRINT_FONTS, TEXT_FONT_WEIGHT, type PrintFontId } from "@wrapfit/shared";
import { cssFontFamily, measureInBrowser } from "@/features/studio/components/canvas/boxText";
import type { PrintLayout } from "./printLayout";

const COLORS = { cut: "#E53E3E", crease: "#3182CE", info: "#64748B" };
const LINE_MM = 0.25;
const DASH_MM = 4;
export const BLEED_MM = 2;
const PT_PER_MM = 72 / 25.4;
const INFO_FONT_MM = 3.5;
/** Resolution of the artwork layer of the PDF. */
const ARTWORK_DPI = 300;
/** Upper bound of the artwork bitmap (pixels), so a big sheet does not exhaust the browser's memory. */
const MAX_ARTWORK_PIXELS = 24_000_000;

const n = (value: number) => Number(value.toFixed(3)).toString();
const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
/** ASCII only (the PDF info text uses a standard font). */
const ascii = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\x20-\x7e]/g, "");
const specLine = (layout: PrintLayout) =>
  `WrapFit — ${layout.title} — ${layout.structure} ${layout.dimensions.length} x ${layout.dimensions.width} x ${layout.dimensions.height} mm, giấy ${layout.dimensions.paperThickness} mm`;

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

/** Layered SVG (artwork, crease, cut, dimensions) for cutting plotters (Cricut, laser), same as the server file. */
export function renderSvg(layout: PrintLayout): string {
  const images = layout.images.map((image) => {
    const rotate = image.rotation
      ? ` transform="rotate(${n(image.rotation)} ${n(image.x + image.width / 2)} ${n(image.y + image.height / 2)})"`
      : "";
    return `<image x="${n(image.x)}" y="${n(image.y)}" width="${n(image.width)}" height="${n(image.height)}" preserveAspectRatio="xMidYMid meet"${rotate} href="${escapeXml(image.url)}"/>`;
  });
  const texts = layout.texts.map((t) => {
    const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t }, measureInBrowser);
    const rotate = t.rotation ? ` transform="rotate(${n(t.rotation)} ${n(t.x + t.width / 2)} ${n(t.y + t.height / 2)})"` : "";
    const lines = box.lines
      .filter((line) => line.text)
      .map((line) => `<text x="${n(t.x + line.x)}" y="${n(t.y + line.baseline)}">${escapeXml(line.text)}</text>`);
    return (
      `<g font-family="${escapeXml(PRINT_FONTS[box.font])}, sans-serif" font-weight="${TEXT_FONT_WEIGHT}" font-size="${n(box.fontSizeMm)}"` +
      ` fill="${escapeXml(t.color)}"${rotate}>${lines.join("")}</g>`
    );
  });
  const strokes = (type: "cut" | "crease") =>
    layout.strokes.filter((s) => s.type === type).map((s) => `<path d="${escapeXml(s.d)}"/>`).join("");
  const marks = dimensionMarks(layout);
  const layer = (id: string, label: string, attributes: string, content: string) =>
    `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}"${attributes}>${content}</g>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${n(layout.width)}mm" height="${n(layout.height)}mm" viewBox="0 0 ${n(layout.width)} ${n(layout.height)}">`,
    layer("artwork", "Artwork", "", images.join("") + texts.join("")),
    layer("crease", "Crease", ` fill="none" stroke="${COLORS.crease}" stroke-width="${LINE_MM}" stroke-dasharray="${DASH_MM},${DASH_MM}"`, strokes("crease")),
    layer("cut", "CutContour", ` fill="none" stroke="${COLORS.cut}" stroke-width="${LINE_MM}"`, strokes("cut")),
    layer(
      "dimensions",
      "Dimensions",
      ` font-family="Be Vietnam Pro, sans-serif" font-size="${INFO_FONT_MM}" fill="${COLORS.info}" stroke="${COLORS.info}" stroke-width="0.15"`,
      marks.lines.map(([x1, y1, x2, y2]) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`).join("") +
        marks.labels
          .map(
            (label) =>
              `<text x="${n(label.x)}" y="${n(label.y)}" text-anchor="middle" stroke="none"` +
              (label.vertical ? ` transform="rotate(-90 ${n(label.x)} ${n(label.y)})"` : "") +
              `>${escapeXml(label.text)}</text>`,
          )
          .join("") +
        `<text x="${n(marks.info.x)}" y="${n(marks.info.y)}" stroke="none">${escapeXml(marks.info.text)}</text>`,
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

/** Texts and images of the sheet as a JPEG at 300 DPI (white paper), or null when the design has no artwork. */
async function artworkJpeg(layout: PrintLayout): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  if (layout.texts.length === 0 && layout.images.length === 0) return null;
  let pxPerMm = ARTWORK_DPI / 25.4;
  const pixels = layout.width * layout.height * pxPerMm * pxPerMm;
  if (pixels > MAX_ARTWORK_PIXELS) pxPerMm *= Math.sqrt(MAX_ARTWORK_PIXELS / pixels);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.width * pxPerMm);
  canvas.height = Math.round(layout.height * pxPerMm);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(pxPerMm, pxPerMm);

  const fonts = [...new Set(layout.texts.map((t) => layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t }, measureInBrowser).font))];
  if (document.fonts) {
    await Promise.all(fonts.map((font: PrintFontId) => document.fonts.load(`${TEXT_FONT_WEIGHT} 16px ${cssFontFamily(font)}`).catch(() => undefined)));
  }

  const rotated = (x: number, y: number, w: number, h: number, deg: number, draw: () => void) => {
    ctx.save();
    if (deg) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    draw();
    ctx.restore();
  };

  for (const image of layout.images) {
    const img = await loadImage(image.url);
    if (!img) continue;
    const scale = Math.min(image.width / img.naturalWidth, image.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    rotated(image.x, image.y, image.width, image.height, image.rotation, () =>
      ctx.drawImage(img, image.x + (image.width - w) / 2, image.y + (image.height - h) / 2, w, h),
    );
  }
  for (const t of layout.texts) {
    const box = layoutTextBox({ content: t.content, width: t.width, height: t.height, style: t }, measureInBrowser);
    rotated(t.x, t.y, t.width, t.height, t.rotation, () => {
      // Canvas fonts below 1 px misbehave: draw at 10× and scale back.
      ctx.scale(0.1, 0.1);
      ctx.font = `${TEXT_FONT_WEIGHT} ${box.fontSizeMm * 10}px ${cssFontFamily(box.font)}`;
      ctx.fillStyle = t.color;
      ctx.textBaseline = "alphabetic";
      for (const line of box.lines) if (line.text) ctx.fillText(line.text, (t.x + line.x) * 10, (t.y + line.baseline) * 10);
    });
  }

  let blob: Blob | null;
  try {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  } catch {
    return null; // an image without CORS tainted the canvas
  }
  if (!blob) return null;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
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
export async function renderPdf(layout: PrintLayout, options: PdfOptions = {}): Promise<Blob> {
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
  const f = (v: number) => v.toFixed(3);

  const art = await artworkJpeg(layout);
  const marks = dimensionMarks(layout);

  const content: string[] = [];
  if (art) {
    content.push(
      "/OC /OCart BDC q",
      `${f(layout.width * k)} 0 0 ${f(layout.height * k)} ${f(ox * k)} ${f((pageH - oy - layout.height) * k)} cm /Art Do Q EMC`,
    );
  }
  const strokeLayer = (type: "cut" | "crease", ocg: string, cs: string, dash: string) => {
    const paths = layout.strokes.filter((s) => s.type === type).map((s) => pathToPdf(s.d, map) + " S");
    content.push(`/OC /${ocg} BDC q /GSop gs /${cs} CS 1 SCN ${f(LINE_MM * k)} w ${dash} 1 J 1 j`, ...paths, "Q EMC");
  };
  strokeLayer("crease", "OCcrease", "CsCrease", `[${f(DASH_MM * k)} ${f(DASH_MM * k)}] 0 d`);
  strokeLayer("cut", "OCcut", "CsCut", "[] 0 d");

  const label = (text: string, x: number, y: number, sizeMm: number, vertical = false, center = true) => {
    const s = ascii(text);
    const width = s.length * sizeMm * 0.5; // Helvetica, close enough to centre a label
    const [px, py] = map(x, y);
    const size = sizeMm * k;
    if (vertical) return `BT /F1 ${f(size)} Tf 0 1 -1 0 ${f(px)} ${f(py - (center ? (width * k) / 2 : 0))} Tm (${s}) Tj ET`;
    return `BT /F1 ${f(size)} Tf ${f(px - (center ? (width * k) / 2 : 0))} ${f(py)} Td (${s}) Tj ET`;
  };
  content.push(`/OC /OCdim BDC q 0 0 0 0.6 K 0 0 0 0.6 k ${f(0.15 * k)} w`);
  for (const [x1, y1, x2, y2] of marks.lines) content.push(`${map(x1, y1).map(f).join(" ")} m ${map(x2, y2).map(f).join(" ")} l S`);
  for (const l of marks.labels) content.push(label(l.text, l.x, l.y, INFO_FONT_MM * 0.85, l.vertical));
  content.push(label(marks.info.text, marks.info.x, marks.info.y, INFO_FONT_MM * 0.85, false, false), "Q EMC");

  if (options.homePrint) {
    // Crop marks at the trim corners and a 50 mm ruler to check the printer kept 1:1.
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
    content.push(label("50 mm - in o ty le 100% (khong co gian)", rx + 54, ry + 1, 3, false, false), "Q");
  }

  // ---- objects
  const objects: (string | Uint8Array[])[] = [];
  const add = (body: string | Uint8Array[]) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = 1;
  objects.push(""); // catalog, filled below
  const pagesId = add("");
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
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const gsId = add("<< /Type /ExtGState /OP true /op true /OPM 1 >>");
  let artId = 0;
  if (art) {
    artId = add([
      enc.encode(`<< /Type /XObject /Subtype /Image /Width ${art.width} /Height ${art.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${art.bytes.length} >>\nstream\n`),
      art.bytes,
      enc.encode("\nendstream"),
    ]);
  }
  const stream = enc.encode(content.join("\n"));
  const contentId = add([enc.encode(`<< /Length ${stream.length} >>\nstream\n`), stream, enc.encode("\nendstream")]);
  const box = (l: number, t: number, r: number, b: number) => {
    const [x1, y1] = map(l, b);
    const [x2, y2] = map(r, t);
    return `[${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}]`;
  };
  const props = ocgs.map(([key], index) => `/${key} ${ocgIds[index]} 0 R`).join(" ");
  const pageId = add(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f(pageW * k)} ${f(pageH * k)}]` +
      ` /TrimBox ${box(trim.left, trim.top, trim.right, trim.bottom)}` +
      ` /BleedBox ${box(trim.left - BLEED_MM, trim.top - BLEED_MM, trim.right + BLEED_MM, trim.bottom + BLEED_MM)}` +
      ` /Resources << /Font << /F1 ${fontId} 0 R >> /ExtGState << /GSop ${gsId} 0 R >>` +
      ` /ColorSpace << /CsCut [/Separation /CutContour /DeviceCMYK ${cutFn} 0 R] /CsCrease [/Separation /Crease /DeviceCMYK ${creaseFn} 0 R] >>` +
      (art ? ` /XObject << /Art ${artId} 0 R >>` : "") +
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
