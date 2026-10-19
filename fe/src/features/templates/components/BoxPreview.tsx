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
  kraft: "#C69B7B",
  duplex: "#E2D9CC",
};

/** `#RRGGBB` mixed towards black (amount > 0) or white (amount < 0). */
function shade(hex: string, amount: number): string {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const value = parseInt(cleanHex.length === 3 ? cleanHex.split("").map((c) => c + c).join("") : cleanHex, 16);
  if (isNaN(value)) return hex;
  const channel = (shift: number) => {
    const c = (value >> shift) & 255;
    return Math.round(amount >= 0 ? c * (1 - amount) : c + (255 - c) * -amount);
  };
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
}

const INK = "#1C1917";
const GOLD = "#D4AF37";
const GOLD_LIGHT = "#F5E6B3";
const VIEW_W = 240;
const VIEW_H = 160;
const PAD = 18;

type P3 = readonly [number, number, number];
type P2 = readonly [number, number];

const COS30 = Math.cos(Math.PI / 6);
/** Isometric projection: x (length) runs right-down, y (width) left-down, z (height) up. */
const iso = ([x, y, z]: P3): P2 => [(x - y) * COS30, (x + y) * 0.5 - z];

export function BoxPreview({ structure, dimensions, material = "ivory", color, className = "", label }: BoxPreviewProps) {
  const uid = useId().replace(/:/g, "");
  const base = color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : (PAPER[material] ?? PAPER.ivory);
  const isDark = (parseInt(base.replace("#", ""), 16) || 0) < 0x888888;
  const foilColor = isDark ? GOLD : GOLD;
  const foilOpacity = isDark ? 0.85 : 0.75;

  const tone = {
    top: shade(base, -0.3),
    topFar: shade(base, -0.1),
    left: shade(base, 0.05),
    leftLow: shade(base, 0.18),
    right: shade(base, 0.16),
    rightLow: shade(base, 0.3),
  };

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
      <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={GOLD_LIGHT} />
        <stop offset="50%" stopColor={GOLD} />
        <stop offset="100%" stopColor="#AA820A" />
      </linearGradient>
    </defs>
  );

  // --- TEM NHÃN & ĐAI GIẤY (STICKER / DECAL / BELLY BAND) ---
  if (structure === "sticker-label") {
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    return (
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} {...a11y}>
        {defs}
        {/* Shadow */}
        <rect x={cx - 85} y={cy - 38} width="170" height="76" rx="10" fill={INK} opacity="0.12" filter={`url(#${uid}-blur)`} />
        {/* Main Belly Band / Decal Card */}
        <rect x={cx - 80} y={cy - 40} width="160" height="80" rx="8" fill={base} stroke={shade(base, 0.2)} strokeWidth="1" />
        {/* Inset Gold Foil Border */}
        <rect x={cx - 74} y={cy - 34} width="148" height="68" rx="5" fill="none" stroke={foilColor} strokeWidth="1.2" strokeOpacity={foilOpacity} strokeDasharray="6 3" />
        {/* Center Decorative Crest */}
        <circle cx={cx} cy={cy - 6} r="18" fill="none" stroke={foilColor} strokeWidth="1.5" strokeOpacity={foilOpacity} />
        <path d={`M ${cx - 7} ${cy - 6} L ${cx} ${cy - 13} L ${cx + 7} ${cy - 6} L ${cx} ${cy + 1} Z`} fill={foilColor} fillOpacity={foilOpacity} />
        {/* Monogram / Brand text line */}
        <rect x={cx - 28} y={cy + 16} width="56" height="4" rx="2" fill={foilColor} fillOpacity={foilOpacity * 0.8} />
        <rect x={cx - 16} y={cy + 23} width="32" height="2.5" rx="1" fill={foilColor} fillOpacity={foilOpacity * 0.5} />
      </svg>
    );
  }

  // --- HỘP GỐI CÁNH CUNG (PILLOW BOX) ---
  if (structure === "pillow") {
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2 - 4;
    const halfW = 86;
    const halfH = Math.min(42, Math.max(22, (dimensions.width / Math.max(1, dimensions.length)) * 70));
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
        <ellipse cx={cx + 6} cy={cy + halfH + 16} rx={halfW * 0.78} ry={8} fill={INK} opacity={0.18} filter={`url(#${uid}-blur)`} />
        <path d={body} fill={`url(#${uid}-right)`} />
        <path d={upper} fill={`url(#${uid}-top)`} />
        {/* Belly Ribbon Band in center */}
        <path
          d={`M ${cx - 14} ${cy - halfH * 1.15} C ${cx - 8} ${cy - halfH * 1.18}, ${cx + 8} ${cy - halfH * 1.18}, ${cx + 14} ${cy - halfH * 1.15} L ${cx + 14} ${cy + halfH * 1.15} C ${cx + 8} ${cy + halfH * 1.18}, ${cx - 8} ${cy + halfH * 1.18}, ${cx - 14} ${cy + halfH * 1.15} Z`}
          fill={`url(#${uid}-gold)`}
          opacity="0.85"
        />
        {/* End creases */}
        <path d={endFold(-1)} fill="none" stroke={INK} strokeOpacity={0.2} strokeWidth={1.2} />
        <path d={endFold(1)} fill="none" stroke={INK} strokeOpacity={0.2} strokeWidth={1.2} />
        {/* Top highlight */}
        <path d={`M ${cx - halfW * 0.62} ${cy - halfH * 0.42} Q ${cx} ${cy - halfH * 0.9}, ${cx + halfW * 0.62} ${cy - halfH * 0.42}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.65} strokeWidth={2} strokeLinecap="round" />
        <path d={body} fill="none" stroke={INK} strokeOpacity={0.16} strokeWidth={1} />
      </svg>
    );
  }

  // --- RECTANGULAR ISOMETRIC BOXES (Tuck Top, Sleeve Drawer, Lid Base) ---
  const longest = Math.max(dimensions.length, dimensions.width, dimensions.height, 1);
  const L = Math.max(dimensions.length, longest * 0.22);
  const W = Math.max(dimensions.width, longest * 0.22);
  const H = Math.max(dimensions.height, longest * 0.22);

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
  const spanY = Math.max(...ys) - minY + 16;
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

  // Center of top lid and inset foil border points
  const centerTop: P3 = [L * 0.5, W * 0.5, H];
  const inPt = (p: P3, ratio = 0.72): P3 => [
    centerTop[0] + (p[0] - centerTop[0]) * ratio,
    centerTop[1] + (p[1] - centerTop[1]) * ratio,
    H,
  ];
  const insetTopPoly = poly(inPt(a), inPt(b), inPt(c), inPt(d));

  // Small diamond emblem on top
  const diaSize = Math.min(L, W) * 0.12;
  const diaTop = poly(
    [centerTop[0] - diaSize, centerTop[1], H],
    [centerTop[0], centerTop[1] - diaSize, H],
    [centerTop[0] + diaSize, centerTop[1], H],
    [centerTop[0], centerTop[1] + diaSize, H],
  );

  const footprint = poly([0, 0, 0], [L, 0, 0], [L, W, 0], [0, W, 0]);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} {...a11y}>
      {defs}
      {/* Soft Ambient Floor Shadow */}
      <polygon points={footprint} transform="translate(7 5)" fill={INK} opacity={0.22} filter={`url(#${uid}-blur)`} />
      <polygon points={poly(e, f, g, [0, 0, 0])} transform="translate(1 1.5)" fill={INK} opacity={0.16} />

      {/* Main 3D Box Faces */}
      <polygon points={poly(a, b, c, d)} fill={`url(#${uid}-top)`} />
      <polygon points={poly(d, c, f, g)} fill={`url(#${uid}-left)`} />
      <polygon points={poly(b, e, f, c)} fill={`url(#${uid}-right)`} />

      {/* Luxury Gold/Silver Foil Stamp & Inset Border on Top Lid */}
      <polygon
        points={insetTopPoly}
        fill="none"
        stroke={foilColor}
        strokeOpacity={foilOpacity}
        strokeWidth={1.2}
        strokeDasharray="4 2"
      />
      <polygon points={diaTop} fill={foilColor} fillOpacity={foilOpacity} />

      {/* Structure: Tuck Top Crease Line */}
      {structure === "tuck-top" && (
        <polyline
          points={poly([0, W * 0.82, H], [L, W * 0.82, H])}
          fill="none"
          stroke="#3182CE"
          strokeOpacity={0.65}
          strokeWidth={1.1}
          strokeDasharray="4 3"
        />
      )}

      {/* Structure: Sleeve & Drawer (Sliding Tray) */}
      {structure === "sleeve-drawer" && (
        <>
          {/* Inner Tray Face in Contrasting Warm Finish */}
          <polygon
            points={poly([L, W * 0.08, H * 0.9], [L, W * 0.92, H * 0.9], [L, W * 0.92, H * 0.1], [L, W * 0.08, H * 0.1])}
            fill={`url(#${uid}-gold)`}
            opacity="0.9"
          />
          {/* Tray Pull Notch */}
          <polyline
            points={poly([L, W * 0.38, H * 0.9], [L, W * 0.5, H * 0.74], [L, W * 0.62, H * 0.9])}
            fill="none"
            stroke={INK}
            strokeOpacity={0.4}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </>
      )}

      {/* Structure: Lid & Base (Two-Piece Overhang with Gold Trim) */}
      {structure === "lid-base" && (
        <>
          <polygon points={poly([0, W, H * 0.66], [L, W, H * 0.66], [L, W, H * 0.58], [0, W, H * 0.58])} fill={INK} fillOpacity={0.14} />
          <polygon points={poly([L, W, H * 0.66], [L, 0, H * 0.66], [L, 0, H * 0.58], [L, W, H * 0.58])} fill={INK} fillOpacity={0.16} />
          {/* Gold Trim Line at Lid Rim */}
          <polyline
            points={poly([0, W, H * 0.66], [L, W, H * 0.66], [L, 0, H * 0.66])}
            fill="none"
            stroke={foilColor}
            strokeOpacity={0.9}
            strokeWidth={1.4}
          />
        </>
      )}

      {/* Crisp White Edge Highlights */}
      <polyline points={poly(d, c, b)} fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.3} strokeLinejoin="round" />
      <polyline points={poly(c, f)} fill="none" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={1} />
      <polygon points={poly(a, b, e, f, g, d)} fill="none" stroke={INK} strokeOpacity={0.15} strokeWidth={1} strokeLinejoin="round" />
    </svg>
  );
}
