/**
 * Photos and logos in their frame (docs/23 S10), one model for the editor, the 3D box, the thumbnail and the print files:
 * - `crop`: the part of the source image used (fractions 0..1), the whole image when omitted;
 * - `fit`: "fit" shows all of it inside the box (letterbox, the default), "fill" / "tile" cover the box (cut to it);
 * - `mask`: the shape of the frame (rounded corners, circle, arch), cut out of the box;
 * - `style.filters`: brightness, contrast and saturation (-100..100), baked into the printed pixels.
 */
import type { CanvasElement, ImageMask } from "../types/project";

export interface ImageDraw {
  /** Part of the source, in source pixels. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Where it lands, mm from the top-left of the element box. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** How the source (`width` × `height` px) is drawn into the element box. */
/** What imageDraw reads of an element (placed images use null for "none"). */
export interface ImageFraming {
  width: number;
  height: number;
  crop?: CanvasElement["crop"] | null;
  fit?: CanvasElement["fit"] | null;
}

export function imageDraw(
  element: ImageFraming,
  source: { width: number; height: number }
): ImageDraw {
  const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  let sx = crop.x * source.width;
  let sy = crop.y * source.height;
  let sw = Math.max(1, crop.width * source.width);
  let sh = Math.max(1, crop.height * source.height);
  const box = { width: Math.max(0.01, element.width), height: Math.max(0.01, element.height) };
  if (element.fit === "fill" || element.fit === "tile") {
    // Cover: keep the middle of the region with the proportions of the box.
    const boxRatio = box.width / box.height;
    if (sw / sh > boxRatio) {
      const w = sh * boxRatio;
      sx += (sw - w) / 2;
      sw = w;
    } else {
      const h = sw / boxRatio;
      sy += (sh - h) / 2;
      sh = h;
    }
    return { sx, sy, sw, sh, dx: 0, dy: 0, dw: box.width, dh: box.height };
  }
  const scale = Math.min(box.width / sw, box.height / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  return { sx, sy, sw, sh, dx: (box.width - dw) / 2, dy: (box.height - dh) / 2, dw, dh };
}

/** Does the element use only part of its image or cover its box (the renderers must cut the source)? */
export const isCropped = (element: Pick<ImageFraming, "crop" | "fit">) => !!element.crop || element.fit === "fill" || element.fit === "tile";

const KAPPA = 0.5522847498;
const n = (value: number) => Number(value.toFixed(3)).toString();

/** Outline of a frame mask, absolute path in mm from the top-left of the element box; null for a plain rectangle. */
export function maskPath(mask: ImageMask | null | undefined, width: number, height: number): string | null {
  if (!mask || mask === "rect") return null;
  if (mask === "circle") {
    const [cx, cy, rx, ry] = [width / 2, height / 2, width / 2, height / 2];
    const [ox, oy] = [rx * KAPPA, ry * KAPPA];
    return [
      `M ${n(cx - rx)} ${n(cy)}`,
      `C ${n(cx - rx)} ${n(cy - oy)} ${n(cx - ox)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}`,
      `C ${n(cx + ox)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - oy)} ${n(cx + rx)} ${n(cy)}`,
      `C ${n(cx + rx)} ${n(cy + oy)} ${n(cx + ox)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}`,
      `C ${n(cx - ox)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + oy)} ${n(cx - rx)} ${n(cy)}`,
      "Z",
    ].join(" ");
  }
  if (mask === "arch") {
    // A rectangle whose top is a half ellipse as wide as the box.
    const r = Math.min(width / 2, height);
    const ry = r;
    const k = KAPPA;
    return [
      `M 0 ${n(height)}`,
      `L 0 ${n(ry)}`,
      `C 0 ${n(ry - ry * k)} ${n(width / 2 - (width / 2) * k)} 0 ${n(width / 2)} 0`,
      `C ${n(width / 2 + (width / 2) * k)} 0 ${n(width)} ${n(ry - ry * k)} ${n(width)} ${n(ry)}`,
      `L ${n(width)} ${n(height)}`,
      "Z",
    ].join(" ");
  }
  // Rounded corners: 12 % of the shorter side.
  const r = Math.min(width, height) * 0.12;
  const c = r * (1 - KAPPA);
  return [
    `M ${n(r)} 0`,
    `L ${n(width - r)} 0`,
    `C ${n(width - c)} 0 ${n(width)} ${n(c)} ${n(width)} ${n(r)}`,
    `L ${n(width)} ${n(height - r)}`,
    `C ${n(width)} ${n(height - c)} ${n(width - c)} ${n(height)} ${n(width - r)} ${n(height)}`,
    `L ${n(r)} ${n(height)}`,
    `C ${n(c)} ${n(height)} 0 ${n(height - c)} 0 ${n(height - r)}`,
    `L 0 ${n(r)}`,
    `C 0 ${n(c)} ${n(c)} 0 ${n(r)} 0`,
    "Z",
  ].join(" ");
}

export type ImageFilters = NonNullable<NonNullable<CanvasElement["style"]>["filters"]>;

const clampAdjust = (value: number | undefined) => Math.max(-100, Math.min(100, value ?? 0));

/** Are any photo adjustments set? */
export const hasFilters = (filters: ImageFilters | undefined) =>
  !!filters && (clampAdjust(filters.brightness) !== 0 || clampAdjust(filters.contrast) !== 0 || clampAdjust(filters.saturation) !== 0);

/** CSS / canvas 2D filter of the adjustments ("none" when there are none). */
export function filterCss(filters: ImageFilters | undefined): string {
  if (!hasFilters(filters)) return "none";
  const f = filters!;
  return `brightness(${1 + clampAdjust(f.brightness) / 100}) contrast(${1 + clampAdjust(f.contrast) / 100}) saturate(${1 + clampAdjust(f.saturation) / 100})`;
}

/**
 * The adjustments applied to 8-bit RGB(A) pixels in place, the same formulas as CSS filters (brightness and contrast
 * linear, saturation by the luminance matrix), so the print matches the screen.
 */
export function applyFilters(pixels: Uint8Array | Uint8ClampedArray, channels: 3 | 4, filters: ImageFilters | undefined): void {
  if (!hasFilters(filters)) return;
  const b = 1 + clampAdjust(filters!.brightness) / 100;
  const c = 1 + clampAdjust(filters!.contrast) / 100;
  const s = 1 + clampAdjust(filters!.saturation) / 100;
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < pixels.length; i += channels) {
    let r = pixels[i] * b;
    let g = pixels[i + 1] * b;
    let bl = pixels[i + 2] * b;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    pixels[i] = clamp(lum + (r - lum) * s);
    pixels[i + 1] = clamp(lum + (g - lum) * s);
    pixels[i + 2] = clamp(lum + (bl - lum) * s);
  }
}

/** The ends of a linear gradient across a w × h box at `angle` degrees (0 = left to right, 90 = top to bottom). */
export function gradientLine(angle: number, width: number, height: number): { x1: number; y1: number; x2: number; y2: number } {
  const a = (angle * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const half = (Math.abs(dx) * width + Math.abs(dy) * height) / 2;
  const [cx, cy] = [width / 2, height / 2];
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half };
}
