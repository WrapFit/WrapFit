import {
  faceCss,
  filterCss,
  imageDraw,
  isCropped,
  maskPath,
  matchesPanel,
  orderElements,
  PRINT_FONTS,
  printedFace,
  sideOf,
  underlineOf,
  type CanvasElement,
  type DielineGeometry,
  type DielinePiece,
} from "@wrapfit/shared";
import { elementImageKey, recoloredSrc } from "./svgRecolor";
import { layoutBoxText } from "../components/canvas/boxText";
import { curvedChars } from "../components/canvas/elementVisuals";
import { artMarkup, elementArt } from "../components/library/elementArt";

/** Paper colour of each look of the editor (BoxMaterialTheme). */
const PAPER_FILL: Record<string, string> = {
  ivory: "#FDFBF7",
  kraft: "#E3CBB2",
  duplex: "#F7F7F3",
  rigid: "#FBFAF6",
  forest: "#1A362B",
  gold_foil: "#F4E7C1",
};

const WIDTH_PX = 640;
const PAD_MM = 6;
/** Gap between the pieces of a two-piece box, mm. */
const GAP_MM = 12;

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);

// data: and blob: are uploads kept in the browser (offline demo, storage out of reach).
const isFileUrl = (content: string) => /^(https?:\/\/|\/|blob:|data:image\/)/.test(content);

/**
 * Reads an image as a data URL, so the SVG drawn on the canvas has no outside reference: an image of another origin
 * (object storage) would taint the canvas and `toBlob` would throw. `null` when it cannot be read.
 */
async function inlineImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Preview of a design for the dashboard: the flat dieline of every piece side by side, in the paper colour with its
 * artwork, as a PNG of 640 px width (upload purpose THUMBNAIL, ≤ 2 MB). Web fonts are not available to an SVG drawn as
 * an image, so text falls back to the closest system font.
 */
export async function renderThumbnail(
  pieces: DielinePiece[],
  elements: CanvasElement[],
  materialTheme: string
): Promise<Blob> {
  const totalW = pieces.reduce((sum, p) => sum + p.geometry.totalBoundingBox.width, 0) + GAP_MM * (pieces.length - 1);
  const totalH = Math.max(...pieces.map((p) => p.geometry.totalBoundingBox.height));
  const viewW = totalW + 2 * PAD_MM;
  const viewH = totalH + 2 * PAD_MM;
  const heightPx = Math.max(1, Math.round((WIDTH_PX * viewH) / viewW));
  const paper = PAPER_FILL[materialTheme] ?? PAPER_FILL.ivory;
  const ink = materialTheme === "forest" ? "#F7F5F0" : "#1C1917";

  const images = new Map<string, string | null>();
  const sizes = new Map<string, { width: number; height: number }>();
  await Promise.all(
    elements
      .filter((el) => (el.type === "image" || el.type === "logo" || el.type === "pattern") && isFileUrl(el.content))
      .map(async (el) => {
        const key = elementImageKey(el);
        if (images.has(key)) return;
        images.set(key, null);
        const src = await recoloredSrc(el.content, el.style?.colorMap);
        const href = src.startsWith("data:") ? src : await inlineImage(new URL(src, location.href).href);
        images.set(key, href);
        // Natural size of the file, for cropped and filled photos (docs/23 S10).
        if (href) {
          const img = new Image();
          img.src = href;
          try {
            await img.decode();
            if (img.naturalWidth && img.naturalHeight) sizes.set(key, { width: img.naturalWidth, height: img.naturalHeight });
          } catch {
            // drawn without its crop
          }
        }
      })
  );

  let x = 0;
  const drawn = pieces.map(({ geometry }) => {
    const group = `<g transform="translate(${x} 0)">${pieceSvg(geometry, elements, images, paper, ink, sizes)}</g>`;
    x += geometry.totalBoundingBox.width + GAP_MM;
    return group;
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_PX}" height="${heightPx}" viewBox="0 0 ${viewW} ${viewH}">` +
    `<rect width="100%" height="100%" fill="#F7F5F0"/>` +
    `<g transform="translate(${PAD_MM} ${PAD_MM})">${drawn.join("")}</g></svg>`;

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH_PX;
    canvas.height = heightPx;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Thumbnail encoding failed"))), "image/png")
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** One piece: panels in the paper colour, the artwork of its panels, then its cut and crease lines. */
function pieceSvg(
  dieline: DielineGeometry,
  elements: CanvasElement[],
  images: Map<string, string | null>,
  paper: string,
  ink: string,
  sizes: Map<string, { width: number; height: number }> = new Map()
): string {
  // Panels are outlined too: dielines of formula version 1 have no cut lines.
  const panels = dieline.panels
    .map((p) => `<rect x="${p.bounds.x}" y="${p.bounds.y}" width="${p.bounds.width}" height="${p.bounds.height}" fill="${paper}" stroke="${ink}" stroke-opacity="0.55" stroke-width="0.5"/>`)
    .join("");
  const segments = dieline.segments
    .map((s) => {
      const stroke = s.type === "cut" ? `stroke="${ink}" stroke-width="0.6"` : `stroke="${ink}" stroke-opacity="0.35" stroke-width="0.4" stroke-dasharray="2 2"`;
      return s.pathString
        ? `<path d="${s.pathString}" fill="none" ${stroke}/>`
        : `<line x1="${s.start.x}" y1="${s.start.y}" x2="${s.end.x}" y2="${s.end.y}" ${stroke}/>`;
    })
    .join("");

  // The outside of the sheet, visible layers, in paint order.
  const artwork = orderElements(elements)
    .map((el) => {
      const panel = dieline.panels.find((p) => matchesPanel(p, el.panelId));
      if (!panel || el.hidden || sideOf(el) !== "outside") return "";
      const x = panel.bounds.x + el.x;
      const y = panel.bounds.y + el.y;
      const [cx, cy] = [x + el.width / 2, y + el.height / 2];
      const turns = [
        el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : "",
        el.flipX || el.flipY ? `translate(${cx} ${cy}) scale(${el.flipX ? -1 : 1} ${el.flipY ? -1 : 1}) translate(${-cx} ${-cy})` : "",
      ].filter(Boolean);
      const alpha = typeof el.style?.opacity === "number" && el.style.opacity < 1 ? ` opacity="${el.style.opacity}"` : "";
      const rotate = (turns.length ? ` transform="${turns.join(" ")}"` : "") + alpha;
      const art = elementArt(el);
      if (art) return artMarkup(art, x, y, rotate);
      if ((el.type === "image" || el.type === "logo" || el.type === "pattern") && isFileUrl(el.content)) {
        const href = images.get(elementImageKey(el));
        if (!href) return `<rect x="${x}" y="${y}" width="${el.width}" height="${el.height}" fill="${ink}" fill-opacity="0.08"${rotate}/>`;
        const size = sizes.get(elementImageKey(el));
        const filter = filterCss(el.style?.filters);
        const look = filter !== "none" ? ` style="filter:${filter}"` : "";
        let picture = `<image href="${href}" x="${x}" y="${y}" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid meet"${look}/>`;
        if (size && isCropped(el)) {
          const d = imageDraw(el, size);
          picture = `<svg x="${x + d.dx}" y="${y + d.dy}" width="${d.dw}" height="${d.dh}" viewBox="${d.sx} ${d.sy} ${d.sw} ${d.sh}" preserveAspectRatio="none"><image href="${href}" width="${size.width}" height="${size.height}"${look}/></svg>`;
        }
        const mask = maskPath(el.mask, el.width, el.height);
        if (!mask) return `<g${rotate}>${picture}</g>`;
        const id = `thumb-mask-${el.id.replace(/[^w-]/g, "")}`;
        return `<g${rotate}><clipPath id="${id}"><path transform="translate(${x} ${y})" d="${mask}"/></clipPath><g clip-path="url(#${id})">${picture}</g></g>`;
      }
      // Lines as on the canvas and in the print files. An SVG drawn as an image cannot use the page's web fonts, so
      // the preview names the family and the system draws it (or a fallback).
      const box = layoutBoxText(el);
      const { weight, style } = faceCss(printedFace(box.font, box.face));
      const lines = box.lines
        .filter((line) => line.text)
        .map((line) => {
          if (box.curve) {
            return curvedChars(box, line.text, x + el.width / 2, y + line.baseline)
              .map((c) => `<text x="${c.x}" y="${c.y}" text-anchor="middle" transform="rotate(${c.angle} ${c.x} ${c.y})">${escapeXml(c.char)}</text>`)
              .join("");
          }
          const u = box.underline ? underlineOf(line, box.fontSizeMm) : null;
          const bar = u ? `<rect x="${x + u.x}" y="${y + u.y}" width="${u.width}" height="${u.height}"/>` : "";
          return `<text x="${x + line.x}" y="${y + line.baseline}">${escapeXml(line.text)}</text>${bar}`;
        })
        .join("");
      return `<g font-size="${box.fontSizeMm}" font-weight="${weight}" font-style="${style}" font-family="${escapeXml(PRINT_FONTS[box.font])}, sans-serif" fill="${escapeXml(el.style?.color ?? ink)}"${box.spacingMm && !box.curve ? ` letter-spacing="${box.spacingMm}"` : ""}${box.stroke ? ` stroke="${escapeXml(box.stroke.color)}" stroke-width="${box.stroke.widthMm * 2}" stroke-linejoin="round" paint-order="stroke"` : ""}${rotate}>${lines}</g>`;
    })
    .join("");

  return `${panels}${artwork}${segments}`;
}
