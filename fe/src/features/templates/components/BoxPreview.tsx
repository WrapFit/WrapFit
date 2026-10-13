import type { BoxDimensions, BoxStructureType, MaterialType } from "@wrapfit/shared";
import React, { useId } from "react";

interface BoxPreviewProps {
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  material?: MaterialType;
  /** Printed colour of the paper (`#RRGGBB`), shaded per face; replaces the stock colour of `material`. */
  color?: string;
  className?: string;
  /** Accessible name; the image is decorative without it. */
  label?: string;
}

/** Lit faces of each paper stock: top, front-left, front-right. */
const PAPER: Record<MaterialType, { top: string; left: string; right: string }> = {
  ivory: { top: "#FBF8F1", left: "#EFE8DC", right: "#E2D8C7" },
  kraft: { top: "#E8D3BC", left: "#D6B998", right: "#C4A27E" },
  duplex: { top: "#F4F2ED", left: "#E4DFD5", right: "#D3CCBF" },
};

/** `#RRGGBB` darkened by `amount` (0–1). */
function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
}

const INK = "#1C1917";
const CREASE = "#3182CE"; // dieline crease layer
const VIEW_W = 240;
const VIEW_H = 160;
const PAD = 18;

type P3 = readonly [number, number, number];
type P2 = readonly [number, number];

const COS30 = Math.cos(Math.PI / 6);
/** Isometric projection: x (length) runs right-down, y (width) left-down, z (height) up. */
const iso = ([x, y, z]: P3): P2 => [(x - y) * COS30, (x + y) * 0.5 - z];

/**
 * Parametric isometric sketch of a box drawn from its real L × W × H, used when a design has no thumbnail. Crease
 * edges use the dieline crease colour; each structure gets its tell-tale detail (tuck crease, drawer, lid band, pillow
 * curves). Very flat or very tall boxes keep at least a quarter of the longest side so the sketch stays readable.
 */
export function BoxPreview({ structure, dimensions, material = "ivory", color, className = "", label }: BoxPreviewProps) {
  const gradientId = useId();
  const paper = color && /^#[0-9a-f]{6}$/i.test(color) ? { top: color, left: shade(color, 0.08), right: shade(color, 0.16) } : (PAPER[material] ?? PAPER.ivory);
  const longest = Math.max(dimensions.length, dimensions.width, dimensions.height, 1);
  const L = Math.max(dimensions.length, longest * 0.25);
  const W = Math.max(dimensions.width, longest * 0.25);
  const H = Math.max(dimensions.height, longest * 0.25);

  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };

  if (structure === "pillow") {
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2 - 4;
    const halfW = 92;
    const halfH = Math.min(46, Math.max(22, (W / L) * 70));
    const body = `M ${cx - halfW} ${cy} C ${cx - halfW * 0.5} ${cy - halfH * 1.35}, ${cx + halfW * 0.5} ${cy - halfH * 1.35}, ${
      cx + halfW
    } ${cy} C ${cx + halfW * 0.5} ${cy + halfH * 1.35}, ${cx - halfW * 0.5} ${cy + halfH * 1.35}, ${cx - halfW} ${cy} Z`;
    const endFold = (side: 1 | -1) =>
      `M ${cx + side * halfW * 0.74} ${cy - halfH * 0.74} Q ${cx + side * halfW * 0.5} ${cy}, ${cx + side * halfW * 0.74} ${
        cy + halfH * 0.74
      }`;
    return (
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} {...a11y}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={paper.top} />
            <stop offset="100%" stopColor={paper.right} />
          </linearGradient>
        </defs>
        <ellipse cx={cx} cy={cy + halfH + 16} rx={halfW * 0.8} ry={7} fill={INK} opacity={0.07} />
        <path d={body} fill={`url(#${gradientId})`} stroke={INK} strokeOpacity={0.7} strokeWidth={1.2} />
        <path d={endFold(-1)} fill="none" stroke={CREASE} strokeWidth={1} strokeDasharray="4 4" />
        <path d={endFold(1)} fill="none" stroke={CREASE} strokeWidth={1} strokeDasharray="4 4" />
        <path d={`M ${cx - halfW * 0.5} ${cy} L ${cx + halfW * 0.5} ${cy}`} stroke={INK} strokeOpacity={0.08} strokeWidth={6} />
      </svg>
    );
  }

  // Corners of the box, then everything is fitted into the view box.
  const corners: Record<string, P3> = {
    a: [0, 0, H],
    b: [L, 0, H],
    c: [L, W, H],
    d: [0, W, H],
    e: [L, 0, 0],
    f: [L, W, 0],
    g: [0, W, 0],
  };
  const projected = Object.values(corners).map(iso);
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY + 14; // room for the ground shadow
  const scale = Math.min((VIEW_W - PAD * 2) / spanX, (VIEW_H - PAD * 2) / spanY);
  const offsetX = (VIEW_W - spanX * scale) / 2;
  const offsetY = (VIEW_H - spanY * scale) / 2;

  const pt = (p: P3): string => {
    const [x, y] = iso(p);
    return `${((x - minX) * scale + offsetX).toFixed(1)},${((y - minY) * scale + offsetY).toFixed(1)}`;
  };
  const poly = (...points: P3[]) => points.map(pt).join(" ");
  const { a, b, c, d, e, f, g } = corners;
  // Soft contact shadow under the front corner, centred on the box.
  const shadowY = Number(pt(f).split(",")[1]);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} {...a11y}>
      <ellipse cx={VIEW_W / 2} cy={shadowY + 2} rx={spanX * scale * 0.46} ry={7} fill={INK} opacity={0.07} />
      <polygon points={poly(a, b, c, d)} fill={paper.top} />
      <polygon points={poly(d, c, f, g)} fill={paper.left} />
      <polygon points={poly(b, e, f, c)} fill={paper.right} />

      {structure === "tuck-top" && (
        // Crease of the tuck flap, just behind the front edge of the lid.
        <polyline
          points={poly([0, W * 0.8, H], [L, W * 0.8, H])}
          fill="none"
          stroke={CREASE}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}
      {structure === "sleeve-drawer" && (
        <>
          {/* Tray front seen through the open end of the sleeve, with its thumb notch. */}
          <polygon
            points={poly([L, W * 0.1, H * 0.88], [L, W * 0.9, H * 0.88], [L, W * 0.9, H * 0.12], [L, W * 0.1, H * 0.12])}
            fill={INK}
            fillOpacity={0.06}
            stroke={INK}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <polyline
            points={poly([L, W * 0.4, H * 0.88], [L, W * 0.5, H * 0.72], [L, W * 0.6, H * 0.88])}
            fill="none"
            stroke={INK}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
        </>
      )}
      {structure === "lid-base" && (
        // Bottom edge of the lid around the base.
        <>
          <polyline points={poly([0, W, H * 0.66], [L, W, H * 0.66], [L, 0, H * 0.66])} fill="none" stroke={INK} strokeOpacity={0.6} strokeWidth={1.2} />
          <polyline points={poly([0, W, H * 0.63], [L, W, H * 0.63], [L, 0, H * 0.63])} fill="none" stroke={INK} strokeOpacity={0.1} strokeWidth={2} />
        </>
      )}

      <polygon points={poly(a, b, e, f, g, d)} fill="none" stroke={INK} strokeOpacity={0.72} strokeWidth={1.2} strokeLinejoin="round" />
      <polyline points={poly(d, c, b)} fill="none" stroke={CREASE} strokeWidth={1} strokeDasharray="4 4" />
      <polyline points={poly(c, f)} fill="none" stroke={CREASE} strokeWidth={1} strokeDasharray="4 4" />
    </svg>
  );
}
