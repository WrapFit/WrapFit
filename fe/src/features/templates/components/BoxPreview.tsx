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

/** Base colour of each paper stock, lit per face below. */
const PAPER: Record<MaterialType, string> = {
  ivory: "#F8F3E8",
  kraft: "#DCBE9C",
  duplex: "#F1EEE7",
};

/** `#RRGGBB` mixed towards black (amount > 0) or white (amount < 0). */
function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 255;
    return Math.round(amount >= 0 ? c * (1 - amount) : c + (255 - c) * -amount);
  };
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
}

const INK = "#1C1917";
const CREASE = "#3182CE"; // dieline crease layer
const VIEW_W = 240;
const VIEW_H = 160;
const PAD = 20;

type P3 = readonly [number, number, number];
type P2 = readonly [number, number];

const COS30 = Math.cos(Math.PI / 6);
/** Isometric projection: x (length) runs right-down, y (width) left-down, z (height) up. */
const iso = ([x, y, z]: P3): P2 => [(x - y) * COS30, (x + y) * 0.5 - z];

/**
 * Parametric isometric render of a box drawn from its real L × W × H, used when a design has no thumbnail: light
 * from the upper left (bright lid, mid front, darker side, each face graded towards the floor), a paper edge that
 * catches the light and a soft shadow on the floor. Each structure gets its tell-tale detail (tuck crease, drawer,
 * lid band, pillow curves). Very flat or very tall boxes keep at least a quarter of the longest side.
 */
export function BoxPreview({ structure, dimensions, material = "ivory", color, className = "", label }: BoxPreviewProps) {
  const uid = useId().replace(/:/g, "");
  const base = color && /^#[0-9a-f]{6}$/i.test(color) ? color : (PAPER[material] ?? PAPER.ivory);
  const tone = {
    top: shade(base, -0.35),
    topFar: shade(base, -0.12),
    left: shade(base, 0.02),
    leftLow: shade(base, 0.12),
    right: shade(base, 0.14),
    rightLow: shade(base, 0.24),
  };
  const longest = Math.max(dimensions.length, dimensions.width, dimensions.height, 1);
  const L = Math.max(dimensions.length, longest * 0.25);
  const W = Math.max(dimensions.width, longest * 0.25);
  const H = Math.max(dimensions.height, longest * 0.25);

  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const defs = (
    <defs>
      <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={tone.top} />
        <stop offset="100%" stopColor={tone.topFar} />
      </linearGradient>
      <linearGradient id={`${uid}-left`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={tone.left} />
        <stop offset="100%" stopColor={tone.leftLow} />
      </linearGradient>
      <linearGradient id={`${uid}-right`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={tone.right} />
        <stop offset="100%" stopColor={tone.rightLow} />
      </linearGradient>
    </defs>
  );

  if (structure === "pillow") {
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2 - 6;
    const halfW = 88;
    const halfH = Math.min(44, Math.max(22, (W / L) * 70));
    const body = `M ${cx - halfW} ${cy} C ${cx - halfW * 0.5} ${cy - halfH * 1.35}, ${cx + halfW * 0.5} ${cy - halfH * 1.35}, ${
      cx + halfW
    } ${cy} C ${cx + halfW * 0.5} ${cy + halfH * 1.35}, ${cx - halfW * 0.5} ${cy + halfH * 1.35}, ${cx - halfW} ${cy} Z`;
    const upper = `M ${cx - halfW} ${cy} C ${cx - halfW * 0.5} ${cy - halfH * 1.35}, ${cx + halfW * 0.5} ${cy - halfH * 1.35}, ${cx + halfW} ${cy} Z`;
    const endFold = (side: 1 | -1) =>
      `M ${cx + side * halfW * 0.74} ${cy - halfH * 0.74} Q ${cx + side * halfW * 0.5} ${cy}, ${cx + side * halfW * 0.74} ${
        cy + halfH * 0.74
      }`;
    return (
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} {...a11y}>
        {defs}
        <ellipse cx={cx + 6} cy={cy + halfH + 18} rx={halfW * 0.78} ry={8} fill={INK} opacity={0.16} filter={`url(#${uid}-blur)`} />
        <path d={body} fill={`url(#${uid}-right)`} />
        <path d={upper} fill={`url(#${uid}-top)`} />
        <path d={endFold(-1)} fill="none" stroke={INK} strokeOpacity={0.14} strokeWidth={1.2} />
        <path d={endFold(1)} fill="none" stroke={INK} strokeOpacity={0.14} strokeWidth={1.2} />
        <path d={`M ${cx - halfW * 0.62} ${cy - halfH * 0.42} Q ${cx} ${cy - halfH * 0.9}, ${cx + halfW * 0.62} ${cy - halfH * 0.42}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />
        <path d={body} fill="none" stroke={INK} strokeOpacity={0.12} strokeWidth={1} />
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
  const spanY = Math.max(...ys) - minY + 16; // room for the floor shadow
  const scale = Math.min((VIEW_W - PAD * 2) / spanX, (VIEW_H - PAD * 2) / spanY);
  const offsetX = (VIEW_W - spanX * scale) / 2;
  const offsetY = (VIEW_H - spanY * scale) / 2;

  const xy = (p: P3): P2 => {
    const [x, y] = iso(p);
    return [(x - minX) * scale + offsetX, (y - minY) * scale + offsetY];
  };
  const pt = (p: P3) => xy(p).map((v) => v.toFixed(1)).join(",");
  const poly = (...points: P3[]) => points.map(pt).join(" ");
  const { a, b, c, d, e, f, g } = corners;
  // Floor shadow: the footprint of the box, pushed away from the light and blurred.
  const footprint = poly([0, 0, 0], [L, 0, 0], [L, W, 0], [0, W, 0]);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} {...a11y}>
      {defs}
      <polygon points={footprint} transform="translate(7 5)" fill={INK} opacity={0.2} filter={`url(#${uid}-blur)`} />
      <polygon points={poly(e, f, g, [0, 0, 0])} transform="translate(1 1.5)" fill={INK} opacity={0.18} />
      <polygon points={poly(a, b, c, d)} fill={`url(#${uid}-top)`} />
      <polygon points={poly(d, c, f, g)} fill={`url(#${uid}-left)`} />
      <polygon points={poly(b, e, f, c)} fill={`url(#${uid}-right)`} />

      {structure === "tuck-top" && (
        // Crease of the tuck flap, just behind the front edge of the lid.
        <polyline points={poly([0, W * 0.82, H], [L, W * 0.82, H])} fill="none" stroke={CREASE} strokeOpacity={0.55} strokeWidth={1} strokeDasharray="4 4" />
      )}
      {structure === "sleeve-drawer" && (
        <>
          {/* Tray front seen through the open end of the sleeve, with its thumb notch. */}
          <polygon
            points={poly([L, W * 0.1, H * 0.88], [L, W * 0.9, H * 0.88], [L, W * 0.9, H * 0.12], [L, W * 0.1, H * 0.12])}
            fill={INK}
            fillOpacity={0.08}
          />
          <polyline points={poly([L, W * 0.1, H * 0.12], [L, W * 0.9, H * 0.12])} fill="none" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.2} />
          <polyline
            points={poly([L, W * 0.4, H * 0.88], [L, W * 0.5, H * 0.72], [L, W * 0.6, H * 0.88])}
            fill="none"
            stroke={INK}
            strokeOpacity={0.3}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        </>
      )}
      {structure === "lid-base" && (
        // The lid overhangs the base: a shadow band under its bottom edge, the edge itself catching the light.
        <>
          <polygon points={poly([0, W, H * 0.66], [L, W, H * 0.66], [L, W, H * 0.58], [0, W, H * 0.58])} fill={INK} fillOpacity={0.1} />
          <polygon points={poly([L, W, H * 0.66], [L, 0, H * 0.66], [L, 0, H * 0.58], [L, W, H * 0.58])} fill={INK} fillOpacity={0.12} />
          <polyline points={poly([0, W, H * 0.66], [L, W, H * 0.66], [L, 0, H * 0.66])} fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.1} />
        </>
      )}

      {/* Paper edges: the front corner and the lid rim catch the light, the outline stays a hairline. */}
      <polyline points={poly(d, c, b)} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.3} strokeLinejoin="round" />
      <polyline points={poly(c, f)} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1} />
      <polygon points={poly(a, b, e, f, g, d)} fill="none" stroke={INK} strokeOpacity={0.14} strokeWidth={1} strokeLinejoin="round" />
    </svg>
  );
}
