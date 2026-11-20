/**
 * Drop shadow and blend modes of an element (docs-old/23 S22), the same on screen, on the 3D box and in the print files.
 *
 * Blend modes are the separable ones every PDF reader and RIP knows (PDF 1.4 /BM). On screen the shadow is a real
 * gaussian blur; in the print files it stays vector and CMYK: the element's outline, offset, in a few layers that
 * widen and fade (`shadowLayers`), which is what a RIP prints from a blur anyway once halftoned.
 */

export type BlendMode = "multiply" | "screen" | "overlay" | "darken" | "lighten";

export const BLEND_MODES: readonly { id: BlendMode; label: string; hint: string; pdf: string }[] = [
  { id: "multiply", label: "Nhân (Multiply)", hint: "Màu sẫm lại, nền trắng biến mất: hợp con dấu, họa tiết in chồng", pdf: "Multiply" },
  { id: "screen", label: "Sáng (Screen)", hint: "Màu sáng lên, nền đen biến mất", pdf: "Screen" },
  { id: "overlay", label: "Phủ (Overlay)", hint: "Tăng tương phản với lớp bên dưới", pdf: "Overlay" },
  { id: "darken", label: "Tối hơn (Darken)", hint: "Giữ màu tối hơn của hai lớp", pdf: "Darken" },
  { id: "lighten", label: "Sáng hơn (Lighten)", hint: "Giữ màu sáng hơn của hai lớp", pdf: "Lighten" },
];

export const pdfBlendName = (mode: BlendMode) => BLEND_MODES.find((b) => b.id === mode)!.pdf;

/** Drop shadow: colour #RRGGBB, opacity 0..1, blur radius and offset in mm (offset in the element's own frame). */
export interface ElementShadow {
  color: string;
  opacity: number;
  blur: number;
  x: number;
  y: number;
}

export const DEFAULT_SHADOW: ElementShadow = { color: "#000000", opacity: 0.35, blur: 1.5, x: 0.8, y: 1.2 };
/** Bounds the editor and the API accept. */
export const SHADOW_LIMITS = { blur: 10, offset: 20 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The shadow of a style, made safe to draw; null when there is none or it would not show. */
export function shadowOf(style: { shadow?: ElementShadow | null } | undefined): ElementShadow | null {
  const s = style?.shadow;
  if (!s || !/^#[0-9a-f]{6}$/i.test(s.color)) return null;
  const shadow = {
    color: s.color,
    opacity: clamp(Number(s.opacity) || 0, 0, 1),
    blur: clamp(Number(s.blur) || 0, 0, SHADOW_LIMITS.blur),
    x: clamp(Number(s.x) || 0, -SHADOW_LIMITS.offset, SHADOW_LIMITS.offset),
    y: clamp(Number(s.y) || 0, -SHADOW_LIMITS.offset, SHADOW_LIMITS.offset),
  };
  return shadow.opacity > 0 ? shadow : null;
}

export const blendOf = (style: { blendMode?: BlendMode | null } | undefined): BlendMode | null =>
  style?.blendMode && BLEND_MODES.some((b) => b.id === style.blendMode) ? style.blendMode : null;

/**
 * Vector layers of a soft shadow for the print files: the outline filled, then stroked wider and wider at a low
 * opacity each, so the overlaps add up to `opacity` in the middle and fade over `blur` mm at the edge.
 */
export function shadowLayers(shadow: ElementShadow, steps = 5): { strokeWidth: number; opacity: number }[] {
  if (shadow.blur <= 0.05) return [{ strokeWidth: 0, opacity: shadow.opacity }];
  // Each layer at `a`: n layers overlapping give 1 - (1 - a)^n = opacity.
  const a = 1 - Math.pow(1 - shadow.opacity, 1 / steps);
  return Array.from({ length: steps }, (_, i) => ({ strokeWidth: (2 * shadow.blur * i) / (steps - 1), opacity: a }));
}
