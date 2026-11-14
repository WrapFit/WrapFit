/**
 * Elements placed on a print sheet (mm), shared by the export worker (be/src/export/rendering/print-layout.ts) and the
 * demo without a backend (fe .../export/offline/printLayout.ts), so both print the same thing.
 *
 * Every placed element carries `order`, its index in paint order: renderers draw all kinds in that order, so the
 * layers the user arranged print the same way (docs/23 D3). Hidden elements and elements of the other side of the
 * sheet are left out. `clip` is the printable box of the element's face on the sheet (face + bleed, D5).
 */
import { orderElements, panelPrintBox, sideOf, type Box } from "../canvas/elements";
import { cleanColorMap, type ColorSwap } from "./svg-colors";
import { matchesPanel } from "../fitcheck/validator";
import { elementVectorArt } from "../library/shapes";
import type { VectorArt } from "../library/art";
import type { DielineGeometry } from "../types/dieline";
import type { CanvasElement, CanvasElementStyle, ElementFinish, PrintSide } from "../types/project";
import { fontSizeMmOf, PT_TO_MM } from "./text-layout";
import { hasFilters, maskPath, type ImageFilters } from "./imagery";

export interface PlacedBase {
  /** Paint order across every kind (lower first). */
  order: number;
  /** Top-left of the element box on the sheet, mm. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, around the centre of the box (like the canvas). */
  rotation: number;
  /** 0..1. */
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  /** Printable box of the face on the sheet: the element is cut to it. */
  clip: Box;
  finish: ElementFinish | null;
}

export interface PlacedText extends PlacedBase {
  content: string;
  fontSizeMm: number;
  /** Size in points: large black texts print in rich black. */
  fontSizePt: number;
  fontFamily: string | undefined;
  fontSize: number | undefined;
  color: string;
  /** Full style of the element, for `layoutTextBox`. */
  style: CanvasElementStyle;
}

export interface PlacedImage extends PlacedBase {
  url: string;
  /** Photos and patterns print near-black as rich black; logos keep plain K. */
  type: CanvasElement["type"];
  /** Part of the image and how it fills the box (print/imagery: imageDraw). */
  crop: CanvasElement["crop"] | null;
  fit: CanvasElement["fit"] | null;
  /** Frame outline, path in mm from the top-left of the box (maskPath), null for the plain box. */
  mask: string | null;
  filters: ImageFilters | null;
  /** Colour swaps of an SVG file (svg-colors: recolorSvg), null when it prints as it is. */
  colorMap: ColorSwap[] | null;
}

export interface PlacedBarcode extends PlacedBase {
  content: string;
}

export interface PlacedArt extends PlacedBase {
  art: VectorArt;
  background: boolean;
}

export interface PlacedElements {
  texts: PlacedText[];
  images: PlacedImage[];
  barcodes: PlacedBarcode[];
  arts: PlacedArt[];
}

const FILE_TYPES = new Set<CanvasElement["type"]>(["logo", "image", "pattern"]);

/**
 * Places the elements of one side on the pieces of the sheet. `isFile`: whether a logo / image / pattern content is a
 * file the renderer can load (the worker and the browser accept different URLs).
 */
export function placeElements(
  pieces: { geometry: DielineGeometry; x: number; y: number }[],
  elements: CanvasElement[],
  options: { isFile: (content: string) => boolean; side?: PrintSide }
): PlacedElements {
  const side = options.side ?? "outside";
  const placed: PlacedElements = { texts: [], images: [], barcodes: [], arts: [] };
  orderElements(elements).forEach((element, order) => {
    if (element.hidden || sideOf(element) !== side) return;
    const isText = element.type === "text";
    const isBarcode = element.type === "barcode";
    const art = elementVectorArt(element);
    const drawn = isText || isBarcode ? !!element.content.trim() : !!art || (FILE_TYPES.has(element.type) && options.isFile(element.content));
    if (!drawn) return;
    // The first piece that has the panel wins (see matchesPanel for the accepted ids).
    const piece = pieces.find((p) => p.geometry.panels.some((panel) => matchesPanel(panel, element.panelId)));
    const panel = piece?.geometry.panels.find((p) => matchesPanel(p, element.panelId));
    if (!piece || !panel) return;
    const face = panelPrintBox(panel, piece.geometry);
    const base: PlacedBase = {
      order,
      x: piece.x + panel.bounds.x + element.x,
      y: piece.y + panel.bounds.y + element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation || 0,
      opacity: typeof element.style?.opacity === "number" ? Math.min(1, Math.max(0, element.style.opacity)) : 1,
      flipX: !!element.flipX,
      flipY: !!element.flipY,
      clip: { x: piece.x + panel.bounds.x + face.x, y: piece.y + panel.bounds.y + face.y, width: face.width, height: face.height },
      finish: element.finish ?? null,
    };
    if (art) {
      placed.arts.push({ ...base, art, background: element.type === "pattern" });
    } else if (isBarcode) {
      placed.barcodes.push({ ...base, content: element.content.trim() });
    } else if (isText) {
      const fontSizeMm = fontSizeMmOf(element);
      placed.texts.push({
        ...base,
        content: element.content,
        fontSizeMm,
        fontSizePt: fontSizeMm / PT_TO_MM,
        fontFamily: element.style?.fontFamily,
        fontSize: element.style?.fontSize,
        color: element.style?.color ?? "#000000",
        style: element.style ?? {},
      });
    } else {
      placed.images.push({
        ...base,
        url: element.content,
        type: element.type,
        crop: element.crop ?? null,
        fit: element.fit ?? null,
        mask: maskPath(element.mask, element.width, element.height),
        filters: hasFilters(element.style?.filters) ? element.style!.filters! : null,
        colorMap: cleanColorMap(element.style?.colorMap).length ? cleanColorMap(element.style?.colorMap) : null,
      });
    }
  });
  return placed;
}

/**
 * Transform (SVG / PDF matrix a b c d e f, mm) that mirrors a box around its centre for flipX / flipY, or null when the
 * element is not flipped. Applied inside the rotation, like the canvas.
 */
export function flipMatrix(item: Pick<PlacedBase, "x" | "y" | "width" | "height" | "flipX" | "flipY">): [number, number, number, number, number, number] | null {
  if (!item.flipX && !item.flipY) return null;
  const sx = item.flipX ? -1 : 1;
  const sy = item.flipY ? -1 : 1;
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  return [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy];
}
