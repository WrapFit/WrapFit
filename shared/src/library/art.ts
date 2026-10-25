/**
 * Built-in vector art of the library: stickers, seals, labels, tags, ribbons and background fills, drawn from a
 * design, a palette and the user's own words. A canvas element points at one with
 * `content = "wf-art:<design>?p=<palette>&t=<line 1>|<line 2>"` (type "logo", or "pattern" for backgrounds).
 *
 * The art is generated for the size of the element (mm, origin at its top-left corner), so the editor, the 3D box,
 * the thumbnail and the print files draw exactly the same shapes, with nothing to download or license: shapes are
 * vectors (Bézier curves only, no arcs), texts are set in the print fonts and outlined by the print renderers, every
 * line is at least MIN_LINE_MM thick.
 */
import { MIN_LINE_MM } from "../print/prepress";
import type { PrintFontId } from "../print/text-layout";
import { LIBRARY_ICONS } from "./icons";

export const LIBRARY_ART_SCHEME = "wf-art:";

export interface ArtShape {
  /** Absolute SVG path data (M L C Q Z), mm from the top-left of the element. */
  d: string;
  fill?: string;
  stroke?: string;
  /** mm, never under MIN_LINE_MM. */
  strokeWidth?: number;
  /** Round line caps and joins (line icons). */
  round?: boolean;
}

export interface ArtText {
  text: string;
  /** Anchor point: centre of the line ("middle") or its left end ("start"), mm. */
  x: number;
  /** Alphabetic baseline, mm. */
  baseline: number;
  /** Font size, mm. */
  size: number;
  font: PrintFontId;
  color: string;
  anchor: "middle" | "start";
}

export interface VectorArt {
  width: number;
  height: number;
  shapes: ArtShape[];
  texts: ArtText[];
}

export interface ArtPalette {
  id: string;
  name: string;
  /** Main fill of the sticker / background. */
  base: string;
  /** Text and lines on `base`. */
  ink: string;
  /** Borders, ornaments, motifs. */
  accent: string;
  /** A second fill (ribbon tails, header bands). */
  deep: string;
}

/** Palettes of the library, named the way a shop owner would describe them. */
export const ART_PALETTES: ArtPalette[] = [
  { id: "son-do", name: "Đỏ son vàng kim", base: "#B91C1C", ink: "#FEF3C7", accent: "#D4AF37", deep: "#7F1D1D" },
  { id: "kim-ngan", name: "Ngà vàng kim", base: "#FDFBF7", ink: "#7C2D12", accent: "#B8860B", deep: "#E9D8A6" },
  { id: "rung-thong", name: "Xanh rừng thông", base: "#1A362B", ink: "#FEFAE0", accent: "#D4AF37", deep: "#0F2219" },
  { id: "hong-phan", name: "Hồng phấn", base: "#FBCFE8", ink: "#831843", accent: "#DB2777", deep: "#F472B6" },
  { id: "kraft-moc", name: "Kraft mộc", base: "#E8D8C8", ink: "#3F2A1D", accent: "#8B5E3C", deep: "#C9A98A" },
  { id: "toi-gian", name: "Đen trắng tối giản", base: "#FFFFFF", ink: "#111827", accent: "#111827", deep: "#E5E7EB" },
  { id: "xanh-reu", name: "Xanh rêu", base: "#DDE5D3", ink: "#2F3E2C", accent: "#5B7553", deep: "#A3B597" },
  { id: "oai-huong", name: "Tím oải hương", base: "#EDE9FE", ink: "#4C1D95", accent: "#7C3AED", deep: "#C4B5FD" },
  { id: "cam-fpt", name: "Cam tươi", base: "#F26522", ink: "#FFFFFF", accent: "#FDE68A", deep: "#B93F0A" },
  { id: "bien-xanh", name: "Xanh biển", base: "#DBEAFE", ink: "#1E3A8A", accent: "#2563EB", deep: "#93C5FD" },
  { id: "kem-sua", name: "Kem sữa", base: "#FFF7ED", ink: "#7C2D12", accent: "#EA580C", deep: "#FED7AA" },
  { id: "den-sang", name: "Đen ánh kim", base: "#1C1917", ink: "#F5E6B8", accent: "#D4AF37", deep: "#000000" },
];

const PALETTES = new Map(ART_PALETTES.map((p) => [p.id, p]));

// ---------------------------------------------------------------- geometry helpers

const n = (value: number) => Number(value.toFixed(3)).toString();
const K = 0.5523; // circle by four cubic Béziers

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  const [kx, ky] = [rx * K, ry * K];
  return [
    `M ${n(cx - rx)} ${n(cy)}`,
    `C ${n(cx - rx)} ${n(cy - ky)} ${n(cx - kx)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}`,
    `C ${n(cx + kx)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - ky)} ${n(cx + rx)} ${n(cy)}`,
    `C ${n(cx + rx)} ${n(cy + ky)} ${n(cx + kx)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}`,
    `C ${n(cx - kx)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + ky)} ${n(cx - rx)} ${n(cy)} Z`,
  ].join(" ");
}
const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);

function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  const c = Math.min(r, w / 2, h / 2);
  const k = c * (1 - K);
  return [
    `M ${n(x + c)} ${n(y)}`,
    `L ${n(x + w - c)} ${n(y)} C ${n(x + w - k)} ${n(y)} ${n(x + w)} ${n(y + k)} ${n(x + w)} ${n(y + c)}`,
    `L ${n(x + w)} ${n(y + h - c)} C ${n(x + w)} ${n(y + h - k)} ${n(x + w - k)} ${n(y + h)} ${n(x + w - c)} ${n(y + h)}`,
    `L ${n(x + c)} ${n(y + h)} C ${n(x + k)} ${n(y + h)} ${n(x)} ${n(y + h - k)} ${n(x)} ${n(y + h - c)}`,
    `L ${n(x)} ${n(y + c)} C ${n(x)} ${n(y + k)} ${n(x + k)} ${n(y)} ${n(x + c)} ${n(y)} Z`,
  ].join(" ");
}
const rect = (x: number, y: number, w: number, h: number) =>
  `M ${n(x)} ${n(y)} L ${n(x + w)} ${n(y)} L ${n(x + w)} ${n(y + h)} L ${n(x)} ${n(y + h)} Z`;
const polygon = (points: [number, number][]) =>
  `M ${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(" L ")} Z`;
const line = (width: number) => Math.max(MIN_LINE_MM, width);
/** Relative luminance of `#RRGGBB` (0 black … 1 white). */
const luminanceOf = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Average advance of a character, as a fraction of the font size (to fit a line without measuring it). */
const CHAR_WIDTH: Record<PrintFontId, number> = {
  "be-vietnam-pro": 0.62,
  inter: 0.6,
  "big-shoulders-display": 0.44,
  "playfair-display": 0.6,
  "cormorant-garamond": 0.52,
};

/** A line of text that fits `maxWidth` (font size shrinks from `size`, never under 1.6 mm ≈ 4.5 pt). */
function fit(
  text: string,
  x: number,
  baseline: number,
  size: number,
  maxWidth: number,
  font: PrintFontId,
  color: string,
  anchor: ArtText["anchor"] = "middle"
): ArtText[] {
  if (!text.trim()) return [];
  const upper = text === text.toUpperCase() && /[A-ZÀ-Ỹ]/.test(text) ? 1.12 : 1;
  const estimate = text.length * CHAR_WIDTH[font] * upper;
  return [{ text, x, baseline, size: Math.max(1.6, Math.min(size, maxWidth / estimate)), font, color, anchor }];
}

// ---------------------------------------------------------------- designs

type DesignFn = (w: number, h: number, p: ArtPalette, t: string[], icon: string) => VectorArt;

export interface ArtDesign {
  id: string;
  name: string;
  kind: "sticker" | "label" | "background";
  /** Width / height the design is drawn for (the element keeps it when added). */
  aspect: number;
  /** Lines of text the design shows, with their default words. */
  lines: string[];
  /** Shows a line icon of LIBRARY_ICONS (`i=` of the reference). */
  icon?: boolean;
  draw: DesignFn;
}

const DEFAULT_ICON = "gift";

/** A line icon of the library, `size` mm square with its top-left at (x, y), stroked in `color`. */
function iconShape(id: string, x: number, y: number, size: number, color: string): ArtShape {
  const icon = LIBRARY_ICONS[id] ?? LIBRARY_ICONS[DEFAULT_ICON];
  const scale = size / 24;
  let index = 0;
  // Only absolute M L C Q Z: the numbers alternate x and y.
  const d = icon.d.replace(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi, (value) => n(Number(value) * scale + (index++ % 2 === 0 ? x : y)));
  return { d, stroke: color, strokeWidth: line(2 * scale), round: true };
}

/** A near-white colour (a fill of it disappears on white paper). */
const isLight = (hex: string) => luminanceOf(hex) > 0.85;

/** Square art of side `s` centred in the element. */
const square = (w: number, h: number) => {
  const s = Math.min(w, h);
  return { s, cx: w / 2, cy: h / 2 };
};

const dotsRing = (cx: number, cy: number, r: number, count: number, dot: number, color: string): ArtShape[] =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { d: circle(cx + r * Math.cos(a), cy + r * Math.sin(a), dot), fill: color };
  });

const DESIGNS: ArtDesign[] = [
  {
    id: "seal",
    name: "Tem tròn viền chấm",
    kind: "sticker",
    aspect: 1,
    lines: ["HANDMADE", "With Love", "SINCE 2026"],
    draw: (w, h, p, [top, middle, bottom]) => {
      const { s, cx, cy } = square(w, h);
      const r = s / 2;
      return {
        width: w,
        height: h,
        shapes: [
          { d: circle(cx, cy, r), fill: p.base },
          { d: circle(cx, cy, r * 0.8), stroke: p.accent, strokeWidth: line(s * 0.014) },
          ...dotsRing(cx, cy, r * 0.9, 28, Math.max(0.25, s * 0.011), p.accent),
        ],
        texts: [
          ...fit(top, cx, cy - r * 0.38, s * 0.085, r * 1.1, "be-vietnam-pro", p.ink),
          ...fit(middle, cx, cy + s * 0.06, s * 0.17, r * 1.45, "playfair-display", p.ink),
          ...fit(bottom, cx, cy + r * 0.52, s * 0.07, r * 1.0, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "rosette",
    name: "Tem hoa thị",
    kind: "sticker",
    aspect: 1,
    lines: ["Special", "GIFT"],
    draw: (w, h, p, [top, middle]) => {
      const { s, cx, cy } = square(w, h);
      const r = s * 0.44;
      const bumps = 16;
      const parts: string[] = [];
      for (let i = 0; i < bumps; i++) {
        const a0 = (i / bumps) * Math.PI * 2;
        const am = ((i + 0.5) / bumps) * Math.PI * 2;
        const a1 = ((i + 1) / bumps) * Math.PI * 2;
        if (i === 0) parts.push(`M ${n(cx + r * Math.cos(a0))} ${n(cy + r * Math.sin(a0))}`);
        parts.push(
          `Q ${n(cx + r * 1.13 * Math.cos(am))} ${n(cy + r * 1.13 * Math.sin(am))} ${n(cx + r * Math.cos(a1))} ${n(cy + r * Math.sin(a1))}`
        );
      }
      return {
        width: w,
        height: h,
        shapes: [
          { d: `${parts.join(" ")} Z`, fill: p.base },
          { d: circle(cx, cy, r * 0.78), fill: p.deep },
          { d: circle(cx, cy, r * 0.7), stroke: p.accent, strokeWidth: line(s * 0.012) },
        ],
        texts: [
          ...fit(top, cx, cy - s * 0.04, s * 0.11, r * 1.2, "playfair-display", p.ink),
          ...fit(middle, cx, cy + s * 0.13, s * 0.13, r * 1.2, "big-shoulders-display", p.ink),
        ],
      };
    },
  },
  {
    id: "burst",
    name: "Tem nổ nhọn",
    kind: "sticker",
    aspect: 1,
    lines: ["MỚI", "100% tự nhiên"],
    draw: (w, h, p, [big, small]) => {
      const { s, cx, cy } = square(w, h);
      const spikes = 22;
      const points: [number, number][] = [];
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = (i % 2 === 0 ? 0.5 : 0.42) * s;
        points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return {
        width: w,
        height: h,
        shapes: [{ d: polygon(points), fill: p.base }, { d: circle(cx, cy, s * 0.34), stroke: p.accent, strokeWidth: line(s * 0.012) }],
        texts: [
          ...fit(big, cx, cy + s * 0.04, s * 0.2, s * 0.6, "big-shoulders-display", p.ink),
          ...fit(small, cx, cy + s * 0.17, s * 0.07, s * 0.55, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "heart",
    name: "Tem trái tim",
    kind: "sticker",
    aspect: 1,
    lines: ["Love", "you"],
    draw: (w, h, p, [first, second]) => {
      const { s, cx, cy } = square(w, h);
      const top = cy - s * 0.3;
      const bottom = cy + s * 0.44;
      const d = [
        `M ${n(cx)} ${n(bottom)}`,
        `C ${n(cx - s * 0.12)} ${n(bottom - s * 0.14)} ${n(cx - s * 0.5)} ${n(cy + s * 0.05)} ${n(cx - s * 0.48)} ${n(cy - s * 0.15)}`,
        `C ${n(cx - s * 0.46)} ${n(top - s * 0.18)} ${n(cx - s * 0.1)} ${n(top - s * 0.18)} ${n(cx)} ${n(top + s * 0.04)}`,
        `C ${n(cx + s * 0.1)} ${n(top - s * 0.18)} ${n(cx + s * 0.46)} ${n(top - s * 0.18)} ${n(cx + s * 0.48)} ${n(cy - s * 0.15)}`,
        `C ${n(cx + s * 0.5)} ${n(cy + s * 0.05)} ${n(cx + s * 0.12)} ${n(bottom - s * 0.14)} ${n(cx)} ${n(bottom)} Z`,
      ].join(" ");
      return {
        width: w,
        height: h,
        shapes: [{ d, fill: p.base }],
        texts: [
          ...fit(first, cx, cy + s * 0.02, s * 0.16, s * 0.62, "playfair-display", p.ink),
          ...fit(second, cx, cy + s * 0.17, s * 0.09, s * 0.4, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "ribbon",
    name: "Băng rôn ruy băng",
    kind: "label",
    aspect: 3.2,
    lines: ["Chúc Mừng Năm Mới"],
    draw: (w, h, p, [title]) => {
      const bodyH = h * 0.62;
      const top = (h - bodyH) / 2;
      const tail = w * 0.12;
      const notch = tail * 0.45;
      return {
        width: w,
        height: h,
        shapes: [
          { d: polygon([[0, top + h * 0.18], [tail * 1.4, top + h * 0.18], [tail * 1.4, h], [0, h], [notch, (top + h * 0.18 + h) / 2]]), fill: p.deep },
          { d: polygon([[w, top + h * 0.18], [w - tail * 1.4, top + h * 0.18], [w - tail * 1.4, h], [w, h], [w - notch, (top + h * 0.18 + h) / 2]]), fill: p.deep },
          { d: rect(tail, top, w - 2 * tail, bodyH), fill: p.base },
          { d: rect(tail + h * 0.06, top + h * 0.06, w - 2 * tail - h * 0.12, bodyH - h * 0.12), stroke: p.accent, strokeWidth: line(h * 0.025) },
        ],
        texts: fit(title, w / 2, top + bodyH * 0.66, bodyH * 0.42, w - 2 * tail - h * 0.3, "playfair-display", p.ink),
      };
    },
  },
  {
    id: "label",
    name: "Nhãn chữ nhật viền đôi",
    kind: "label",
    aspect: 1.6,
    lines: ["Tên Sản Phẩm", "Thủ công • 100% tự nhiên"],
    draw: (w, h, p, [title, subtitle]) => {
      const s = Math.min(w, h);
      return {
        width: w,
        height: h,
        shapes: [
          { d: roundRect(0, 0, w, h, s * 0.1), fill: p.base },
          { d: roundRect(s * 0.06, s * 0.06, w - s * 0.12, h - s * 0.12, s * 0.06), stroke: p.accent, strokeWidth: line(s * 0.018) },
          { d: roundRect(s * 0.09, s * 0.09, w - s * 0.18, h - s * 0.18, s * 0.04), stroke: p.accent, strokeWidth: line(s * 0.008) },
        ],
        texts: [
          ...fit(title, w / 2, h * 0.5, h * 0.2, w * 0.78, "playfair-display", p.ink),
          ...fit(subtitle, w / 2, h * 0.7, h * 0.08, w * 0.72, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "oval",
    name: "Nhãn bầu dục",
    kind: "label",
    aspect: 1.5,
    lines: ["Tiệm Nhà Mây", "est. 2026"],
    draw: (w, h, p, [title, subtitle]) => ({
      width: w,
      height: h,
      shapes: [
        { d: ellipse(w / 2, h / 2, w / 2, h / 2), fill: p.base },
        { d: ellipse(w / 2, h / 2, w * 0.44, h * 0.41), stroke: p.accent, strokeWidth: line(Math.min(w, h) * 0.014) },
      ],
      texts: [
        ...fit(title, w / 2, h * 0.52, h * 0.19, w * 0.68, "cormorant-garamond", p.ink),
        ...fit(subtitle, w / 2, h * 0.7, h * 0.08, w * 0.5, "be-vietnam-pro", p.ink),
      ],
    }),
  },
  {
    id: "tag",
    name: "Thẻ quà treo",
    kind: "label",
    aspect: 1.9,
    lines: ["To: Người thương", "From: Tiệm nhỏ"],
    draw: (w, h, p, [to, from]) => {
      const cut = h * 0.32;
      return {
        width: w,
        height: h,
        shapes: [
          { d: polygon([[cut, 0], [w, 0], [w, h], [cut, h], [0, h / 2]]), fill: p.base },
          { d: circle(cut * 0.75, h / 2, h * 0.08), fill: p.deep },
          { d: circle(cut * 0.75, h / 2, h * 0.08), stroke: p.accent, strokeWidth: line(h * 0.02) },
        ],
        texts: [
          ...fit(to, cut + h * 0.1, h * 0.43, h * 0.15, w - cut - h * 0.2, "playfair-display", p.ink, "start"),
          ...fit(from, cut + h * 0.1, h * 0.72, h * 0.11, w - cut - h * 0.2, "be-vietnam-pro", p.ink, "start"),
        ],
      };
    },
  },
  {
    id: "ticket",
    name: "Nhãn vé cổ điển",
    kind: "label",
    aspect: 2.2,
    lines: ["LIMITED EDITION", "Lô 01 / 2026"],
    draw: (w, h, p, [title, subtitle]) => {
      const c = Math.min(w, h) * 0.16;
      const notched = polygon([[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]]);
      const inset = c * 0.45;
      return {
        width: w,
        height: h,
        shapes: [
          { d: notched, fill: p.base },
          {
            d: polygon([[c + inset * 0.4, inset], [w - c - inset * 0.4, inset], [w - inset, c + inset * 0.4], [w - inset, h - c - inset * 0.4], [w - c - inset * 0.4, h - inset], [c + inset * 0.4, h - inset], [inset, h - c - inset * 0.4], [inset, c + inset * 0.4]]),
            stroke: p.accent,
            strokeWidth: line(h * 0.02),
          },
        ],
        texts: [
          ...fit(title, w / 2, h * 0.52, h * 0.22, w * 0.78, "big-shoulders-display", p.ink),
          ...fit(subtitle, w / 2, h * 0.74, h * 0.1, w * 0.6, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "arch",
    name: "Nhãn mái vòm",
    kind: "label",
    aspect: 0.72,
    lines: ["Trà Sen", "Tây Hồ"],
    draw: (w, h, p, [title, subtitle]) => {
      // Rounded top: a full half circle in a tall box, rounded corners with a flat top in a wide one.
      const arch = (x: number, y: number, ww: number, hh: number) => {
        const rr = Math.min(ww / 2, hh * 0.55);
        const k = rr * K;
        return [
          `M ${n(x)} ${n(y + hh)}`,
          `L ${n(x)} ${n(y + rr)}`,
          `C ${n(x)} ${n(y + rr - k)} ${n(x + rr - k)} ${n(y)} ${n(x + rr)} ${n(y)}`,
          `L ${n(x + ww - rr)} ${n(y)}`,
          `C ${n(x + ww - rr + k)} ${n(y)} ${n(x + ww)} ${n(y + rr - k)} ${n(x + ww)} ${n(y + rr)}`,
          `L ${n(x + ww)} ${n(y + hh)} Z`,
        ].join(" ");
      };
      const s = Math.min(w, h);
      const r = Math.min(w / 2, h * 0.55);
      const inset = s * 0.07;
      const baseline = Math.min(Math.max(r, h * 0.55), h * 0.72);
      return {
        width: w,
        height: h,
        shapes: [
          { d: arch(0, 0, w, h), fill: p.base },
          { d: arch(inset, inset, w - 2 * inset, h - 2 * inset), stroke: p.accent, strokeWidth: line(s * 0.014) },
        ],
        texts: [
          ...fit(title, w / 2, baseline, Math.min(w * 0.2, h * 0.24), w * 0.74, "playfair-display", p.ink),
          ...fit(subtitle, w / 2, Math.min(baseline + s * 0.16, h * 0.9), Math.min(w * 0.1, h * 0.11), w * 0.66, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "info",
    name: "Nhãn thông tin sản phẩm",
    kind: "label",
    aspect: 1.45,
    lines: ["THÔNG TIN SẢN PHẨM", "Thành phần: sáp đậu nành", "Khối lượng: 200 g", "NSX / HSD: xem đáy hộp"],
    draw: (w, h, p, [title, ...rows]) => {
      const band = h * 0.24;
      // A near-white palette would vanish on the white label: its darker fill makes the band.
      const bandFill = isLight(p.base) ? p.deep : p.base;
      const pad = w * 0.07;
      return {
        width: w,
        height: h,
        shapes: [
          { d: rect(0, 0, w, h), fill: "#FFFFFF" },
          { d: rect(0, 0, w, band), fill: bandFill },
          { d: rect(line(h * 0.012) / 2, line(h * 0.012) / 2, w - line(h * 0.012), h - line(h * 0.012)), stroke: p.base, strokeWidth: line(h * 0.012) },
        ],
        texts: [
          ...fit(title, w / 2, band * 0.66, band * 0.45, w - 2 * pad, "be-vietnam-pro", p.ink),
          ...rows.flatMap((row, i) => fit(row, pad, band + (h - band) * (0.3 + i * 0.25), h * 0.075, w - 2 * pad, "inter", "#111827", "start")),
        ],
      };
    },
  },
  {
    id: "band",
    name: "Dải cảnh báo",
    kind: "label",
    aspect: 4,
    lines: ["HÀNG DỄ VỠ • XIN NHẸ TAY"],
    draw: (w, h, p, [title]) => ({
      width: w,
      height: h,
      shapes: [
        { d: rect(0, 0, w, h), fill: p.base },
        { d: rect(h * 0.12, h * 0.12, w - h * 0.24, h - h * 0.24), stroke: p.ink, strokeWidth: line(h * 0.035) },
      ],
      texts: fit(title, w / 2, h * 0.64, h * 0.38, w * 0.86, "big-shoulders-display", p.ink),
    }),
  },
  // ---- line icons (Lucide, ISC): alone, in a round badge, or on a label with words
  {
    id: "icon",
    name: "Biểu tượng",
    kind: "sticker",
    aspect: 1,
    lines: [],
    icon: true,
    draw: (w, h, p, _t, icon) => {
      const { s, cx, cy } = square(w, h);
      return { width: w, height: h, shapes: [iconShape(icon, cx - s / 2, cy - s / 2, s, isLight(p.base) ? p.ink : p.base)], texts: [] };
    },
  },
  {
    id: "icon-badge",
    name: "Huy hiệu biểu tượng",
    kind: "sticker",
    aspect: 1,
    lines: [],
    icon: true,
    draw: (w, h, p, _t, icon) => {
      const { s, cx, cy } = square(w, h);
      const r = s / 2;
      return {
        width: w,
        height: h,
        shapes: [
          { d: circle(cx, cy, r), fill: p.base },
          { d: circle(cx, cy, r * 0.86), stroke: p.accent, strokeWidth: line(s * 0.02) },
          iconShape(icon, cx - s * 0.27, cy - s * 0.27, s * 0.54, p.ink),
        ],
        texts: [],
      };
    },
  },
  {
    id: "icon-label",
    name: "Nhãn kèm biểu tượng",
    kind: "label",
    aspect: 3,
    lines: ["Handmade"],
    icon: true,
    draw: (w, h, p, [word], icon) => {
      const pad = h * 0.18;
      const size = h - 2 * pad;
      return {
        width: w,
        height: h,
        shapes: [{ d: roundRect(0, 0, w, h, h / 2), fill: p.base }, iconShape(icon, h * 0.32, pad, size, p.ink)],
        texts: fit(word, h * 0.32 + size + h * 0.22, h * 0.64, h * 0.42, w - size - h * 0.85, "be-vietnam-pro", p.ink, "start"),
      };
    },
  },
  // ---- more shapes
  {
    id: "stamp",
    name: "Tem bưu chính",
    kind: "sticker",
    aspect: 0.8,
    lines: ["Gửi Yêu Thương", "2026"],
    draw: (w, h, p, [title, value]) => {
      // Perforated edge: small scallops all around.
      const step = Math.min(w, h) / 9;
      const bump = step * 0.32;
      const edge = (x0: number, y0: number, x1: number, y1: number, ox: number, oy: number) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        const count = Math.max(2, Math.round(len / step));
        const parts: string[] = [];
        for (let i = 0; i < count; i++) {
          const [ax, ay] = [x0 + ((x1 - x0) * i) / count, y0 + ((y1 - y0) * i) / count];
          const [bx, by] = [x0 + ((x1 - x0) * (i + 1)) / count, y0 + ((y1 - y0) * (i + 1)) / count];
          if (i === 0 && x0 === 2 * bump && y0 === 2 * bump) parts.push(`M ${n(ax)} ${n(ay)}`);
          parts.push(`Q ${n((ax + bx) / 2 + ox)} ${n((ay + by) / 2 + oy)} ${n(bx)} ${n(by)}`);
        }
        return parts.join(" ");
      };
      // The scallops bulge out by `bump`: the edge sits 2 × bump inside, so even their control points stay in the box.
      const [l, t, r, b] = [2 * bump, 2 * bump, w - 2 * bump, h - 2 * bump];
      const d = [edge(l, t, r, t, 0, -bump * 2), edge(r, t, r, b, bump * 2, 0), edge(r, b, l, b, 0, bump * 2), edge(l, b, l, t, -bump * 2, 0), "Z"].join(" ");
      const inset = 2 * bump + step * 0.55;
      return {
        width: w,
        height: h,
        shapes: [
          { d, fill: p.base },
          { d: rect(inset, inset, w - 2 * inset, h - 2 * inset), stroke: p.accent, strokeWidth: line(Math.min(w, h) * 0.015) },
        ],
        texts: [
          // The value in the top-right corner, like a postage stamp.
          ...fit(value, w - inset - (w - 2 * inset) * 0.2, inset + h * 0.14, h * 0.1, (w - 2 * inset) * 0.35, "big-shoulders-display", p.ink),
          ...fit(title, w / 2, h * 0.62, h * 0.12, w - 2 * inset - w * 0.08, "playfair-display", p.ink),
        ],
      };
    },
  },
  {
    id: "shield",
    name: "Huy hiệu khiên",
    kind: "sticker",
    aspect: 0.82,
    lines: ["PREMIUM", "Chất Lượng", "EST. 2026"],
    draw: (w, h, p, [top, middle, bottom]) => {
      const shield = (x: number, y: number, ww: number, hh: number) =>
        [
          `M ${n(x)} ${n(y + hh * 0.08)}`,
          `Q ${n(x + ww / 2)} ${n(y)} ${n(x + ww)} ${n(y + hh * 0.08)}`,
          `L ${n(x + ww)} ${n(y + hh * 0.5)}`,
          `C ${n(x + ww)} ${n(y + hh * 0.78)} ${n(x + ww * 0.7)} ${n(y + hh * 0.9)} ${n(x + ww / 2)} ${n(y + hh)}`,
          `C ${n(x + ww * 0.3)} ${n(y + hh * 0.9)} ${n(x)} ${n(y + hh * 0.78)} ${n(x)} ${n(y + hh * 0.5)} Z`,
        ].join(" ");
      const inset = Math.min(w, h) * 0.08;
      return {
        width: w,
        height: h,
        shapes: [
          { d: shield(0, h * 0.02, w, h * 0.98), fill: p.base },
          { d: shield(inset, h * 0.02 + inset, w - 2 * inset, h * 0.98 - 2 * inset), stroke: p.accent, strokeWidth: line(w * 0.018) },
        ],
        texts: [
          ...fit(top, w / 2, h * 0.3, w * 0.1, w * 0.62, "be-vietnam-pro", p.ink),
          ...fit(middle, w / 2, h * 0.52, w * 0.17, w * 0.72, "playfair-display", p.ink),
          ...fit(bottom, w / 2, h * 0.68, w * 0.08, w * 0.5, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "cloud",
    name: "Tem đám mây",
    kind: "sticker",
    aspect: 1.5,
    lines: ["Ngọt Ngào"],
    draw: (w, h, p, [word]) => {
      // Overlapping round puffs on a flat base, one fill.
      const shapes: ArtShape[] = [
        { d: roundRect(w * 0.06, h * 0.45, w * 0.88, h * 0.5, h * 0.25), fill: p.base },
        { d: circle(w * 0.3, h * 0.55, h * 0.27), fill: p.base },
        { d: circle(w * 0.52, h * 0.4, h * 0.36), fill: p.base },
        { d: circle(w * 0.74, h * 0.55, h * 0.28), fill: p.base },
      ];
      return { width: w, height: h, shapes, texts: fit(word, w / 2, h * 0.7, h * 0.22, w * 0.7, "playfair-display", p.ink) };
    },
  },
  {
    id: "hexagon",
    name: "Nhãn lục giác",
    kind: "sticker",
    aspect: 1.1,
    lines: ["Mật Ong", "Rừng U Minh"],
    draw: (w, h, p, [title, subtitle]) => {
      const hex = (cx: number, cy: number, rx: number, ry: number) =>
        polygon(Array.from({ length: 6 }, (_, i) => [cx + rx * Math.cos((i * Math.PI) / 3), cy + ry * Math.sin((i * Math.PI) / 3)] as [number, number]));
      return {
        width: w,
        height: h,
        shapes: [
          { d: hex(w / 2, h / 2, w / 2, h / 2), fill: p.base },
          { d: hex(w / 2, h / 2, w * 0.42, h * 0.42), stroke: p.accent, strokeWidth: line(Math.min(w, h) * 0.016) },
        ],
        texts: [
          ...fit(title, w / 2, h * 0.52, h * 0.17, w * 0.6, "playfair-display", p.ink),
          ...fit(subtitle, w / 2, h * 0.68, h * 0.08, w * 0.5, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "bubble",
    name: "Bong bóng lời nhắn",
    kind: "label",
    aspect: 1.7,
    lines: ["Cảm ơn bạn", "đã ủng hộ tiệm!"],
    draw: (w, h, p, [first, second]) => {
      const body = h * 0.78;
      return {
        width: w,
        height: h,
        shapes: [
          { d: roundRect(0, 0, w, body, body * 0.3), fill: p.base },
          { d: polygon([[w * 0.2, body - 0.5], [w * 0.38, body - 0.5], [w * 0.16, h]]), fill: p.base },
        ],
        texts: [
          ...fit(first, w / 2, body * 0.48, body * 0.24, w * 0.82, "playfair-display", p.ink),
          ...fit(second, w / 2, body * 0.76, body * 0.14, w * 0.78, "be-vietnam-pro", p.ink),
        ],
      };
    },
  },
  {
    id: "lantern",
    name: "Đèn lồng",
    kind: "sticker",
    aspect: 0.62,
    lines: ["Phúc"],
    draw: (w, h, p, [word]) => {
      const cx = w / 2;
      const top = h * 0.12;
      const bottom = h * 0.78;
      const rx = w * 0.46;
      const ry = (bottom - top) / 2;
      const cy = (top + bottom) / 2;
      const ribs = [-0.62, -0.25, 0.25, 0.62].map((k) => ({
        d: `M ${n(cx + rx * k * 0.35)} ${n(top + 0.4)} Q ${n(cx + rx * k * 1.25)} ${n(cy)} ${n(cx + rx * k * 0.35)} ${n(bottom - 0.4)}`,
        stroke: p.accent,
        strokeWidth: line(w * 0.018),
      }));
      return {
        width: w,
        height: h,
        shapes: [
          { d: rect(cx - w * 0.05, 0, w * 0.1, top * 0.6), fill: p.deep },
          { d: roundRect(cx - w * 0.22, top * 0.55, w * 0.44, top * 0.6, top * 0.15), fill: p.accent },
          { d: ellipse(cx, cy, rx, ry), fill: p.base },
          ...ribs,
          { d: roundRect(cx - w * 0.22, bottom - top * 0.2, w * 0.44, top * 0.6, top * 0.15), fill: p.accent },
          ...[-0.12, 0, 0.12].map((k) => ({ d: rect(cx + w * k - w * 0.015, bottom + top * 0.4, w * 0.03, h - bottom - top * 0.4), fill: p.accent })),
        ],
        texts: fit(word, cx, cy + rx * 0.22, rx * 0.6, rx * 1.1, "playfair-display", p.ink),
      };
    },
  },
  {
    id: "lotus",
    name: "Huy hiệu hoa sen",
    kind: "sticker",
    aspect: 1,
    lines: ["Trà Sen"],
    draw: (w, h, p, [word]) => {
      const { s, cx, cy } = square(w, h);
      const r = s / 2;
      const base = cy + s * 0.05;
      const petal = (angle: number, length: number, width: number) => {
        const a = (angle * Math.PI) / 180;
        const [dx, dy] = [Math.sin(a), -Math.cos(a)];
        const [px, py] = [-dy, dx];
        const tip = [cx + dx * length, base + dy * length];
        const mid = [cx + dx * length * 0.5, base + dy * length * 0.5];
        return `M ${n(cx)} ${n(base)} Q ${n(mid[0] + px * width)} ${n(mid[1] + py * width)} ${n(tip[0])} ${n(tip[1])} Q ${n(mid[0] - px * width)} ${n(mid[1] - py * width)} ${n(cx)} ${n(base)} Z`;
      };
      return {
        width: w,
        height: h,
        shapes: [
          { d: circle(cx, cy, r), fill: p.base },
          { d: circle(cx, cy, r * 0.88), stroke: p.accent, strokeWidth: line(s * 0.015) },
          ...[-58, 58].map((angle) => ({ d: petal(angle, s * 0.3, s * 0.08), fill: p.deep })),
          ...[-28, 28].map((angle) => ({ d: petal(angle, s * 0.34, s * 0.09), fill: p.accent })),
          { d: petal(0, s * 0.38, s * 0.1), fill: p.accent },
        ],
        texts: fit(word, cx, cy + r * 0.52, s * 0.11, r * 1.3, "playfair-display", p.ink),
      };
    },
  },
  // ---- backgrounds: drawn over the whole element (a panel plus its bleed); motifs that would cross the edge are left out
  {
    id: "bg-solid",
    name: "Nền màu trơn",
    kind: "background",
    aspect: 1,
    lines: [],
    draw: (w, h, p) => ({ width: w, height: h, shapes: [{ d: rect(0, 0, w, h), fill: p.base }], texts: [] }),
  },
  {
    id: "bg-dots",
    name: "Nền chấm bi",
    kind: "background",
    aspect: 1,
    lines: [],
    draw: (w, h, p) => tiled(w, h, p, 8, (x, y, row) => [{ d: circle(x + (row % 2) * 4, y, 1.1), fill: p.accent }], 1.2),
  },
  {
    id: "bg-stripes",
    name: "Nền kẻ sọc",
    kind: "background",
    aspect: 1,
    lines: [],
    draw: (w, h, p) => {
      const shapes: ArtShape[] = [{ d: rect(0, 0, w, h), fill: p.base }];
      for (let x = 3; x + 2.5 <= w; x += 9) shapes.push({ d: rect(x, 0, 2.5, h), fill: p.deep });
      return { width: w, height: h, shapes, texts: [] };
    },
  },
  {
    id: "bg-grid",
    name: "Nền kẻ ô caro",
    kind: "background",
    aspect: 1,
    lines: [],
    draw: (w, h, p) => {
      const shapes: ArtShape[] = [{ d: rect(0, 0, w, h), fill: p.base }];
      const t = 0.35;
      for (let x = 6; x + t <= w; x += 10) shapes.push({ d: rect(x, 0, t, h), fill: p.accent });
      for (let y = 6; y + t <= h; y += 10) shapes.push({ d: rect(0, y, w, t), fill: p.accent });
      return { width: w, height: h, shapes, texts: [] };
    },
  },
  {
    id: "bg-diamonds",
    name: "Nền hoa văn trám",
    kind: "background",
    aspect: 1,
    lines: [],
    draw: (w, h, p) =>
      tiled(w, h, p, 10, (x, y, row) => {
        const cx = x + (row % 2) * 5;
        return [{ d: polygon([[cx, y - 2.2], [cx + 1.6, y], [cx, y + 2.2], [cx - 1.6, y]]), fill: p.accent }];
      }, 2.4),
  },
  {
    id: "bg-blossoms",
    name: "Nền hoa mai đào",
    kind: "background",
    aspect: 1,
    lines: [],
    draw: (w, h, p) =>
      tiled(w, h, p, 14, (x, y, row) => {
        const cx = x + (row % 2) * 7;
        const petals = Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return { d: circle(cx + 1.7 * Math.cos(a), y + 1.7 * Math.sin(a), 1.25), fill: p.accent };
        });
        return [...petals, { d: circle(cx, y, 0.8), fill: p.deep }];
      }, 3.2),
  },
  {
    id: "bg-waves",
    name: "Nền sóng nước",
    kind: "background",
    aspect: 1,
    lines: [],
    draw: (w, h, p) => {
      const shapes: ArtShape[] = [{ d: rect(0, 0, w, h), fill: p.base }];
      const amp = 1.4;
      const period = 12;
      for (let y = 6; y + amp + 0.5 <= h; y += 7) {
        const parts = [`M 0 ${n(y)}`];
        for (let x = 0; x + period <= w; x += period) {
          parts.push(`C ${n(x + period / 4)} ${n(y - amp)} ${n(x + period / 4)} ${n(y - amp)} ${n(x + period / 2)} ${n(y)}`);
          parts.push(`C ${n(x + (3 * period) / 4)} ${n(y + amp)} ${n(x + (3 * period) / 4)} ${n(y + amp)} ${n(x + period)} ${n(y)}`);
        }
        shapes.push({ d: parts.join(" "), stroke: p.accent, strokeWidth: 0.5 });
      }
      return { width: w, height: h, shapes, texts: [] };
    },
  },
];

/** Base fill plus a motif repeated every `step` mm, keeping only motifs `margin` mm or more inside the element. */
function tiled(w: number, h: number, p: ArtPalette, step: number, motif: (x: number, y: number, row: number) => ArtShape[], margin: number): VectorArt {
  const shapes: ArtShape[] = [{ d: rect(0, 0, w, h), fill: p.base }];
  let row = 0;
  for (let y = step / 2; y <= h; y += step, row++) {
    for (let x = step / 2; x <= w; x += step) {
      const shift = (row % 2) * (step / 2);
      if (x + shift - margin < 0 || x + shift + margin > w || y - margin < 0 || y + margin > h) continue;
      shapes.push(...motif(x, y, row));
    }
  }
  return { width: w, height: h, shapes, texts: [] };
}

export const ART_DESIGNS: readonly ArtDesign[] = DESIGNS;
const DESIGN_MAP = new Map(DESIGNS.map((d) => [d.id, d]));

// ---------------------------------------------------------------- references

export interface LibraryArtRef {
  design: string;
  palette: string;
  /** Lines of text (defaults of the design when missing). */
  texts?: string[];
  /** Line icon of the icon designs (id of LIBRARY_ICONS). */
  icon?: string;
}

/** The `content` of an element showing this art. Texts are kept short (the API stores at most 5000 characters). */
export function libraryArtContent({ design, palette, texts, icon }: LibraryArtRef): string {
  const params = new URLSearchParams({ p: palette });
  if (icon) params.set("i", icon);
  if (texts?.length) params.set("t", texts.map((t) => t.replace(/\|/g, "/").slice(0, 80)).join("|"));
  return `${LIBRARY_ART_SCHEME}${design}?${params.toString()}`;
}

export const isLibraryArt = (content: string) => typeof content === "string" && content.startsWith(LIBRARY_ART_SCHEME);

export function parseLibraryArt(content: string): (LibraryArtRef & { texts: string[]; icon: string }) | null {
  if (!isLibraryArt(content)) return null;
  const [path, query = ""] = content.slice(LIBRARY_ART_SCHEME.length).split("?");
  const design = DESIGN_MAP.get(path);
  if (!design) return null;
  const params = new URLSearchParams(query);
  const palette = PALETTES.has(params.get("p") ?? "") ? params.get("p")! : ART_PALETTES[0].id;
  const given = params.get("t")?.split("|");
  const icon = params.get("i") ?? "";
  return {
    design: design.id,
    palette,
    texts: design.lines.map((fallback, i) => given?.[i] ?? fallback),
    icon: design.icon ? (LIBRARY_ICONS[icon] ? icon : DEFAULT_ICON) : "",
  };
}

/** The art of an element (`content` = a `wf-art:` reference) at its size, or null for any other content. */
export function libraryArt(content: string, width: number, height: number): VectorArt | null {
  const ref = parseLibraryArt(content);
  if (!ref || !(width > 0) || !(height > 0)) return null;
  return DESIGN_MAP.get(ref.design)!.draw(width, height, PALETTES.get(ref.palette)!, ref.texts, ref.icon);
}

export const artDesignOf = (id: string) => DESIGN_MAP.get(id) ?? null;
export const artPaletteOf = (id: string) => PALETTES.get(id) ?? null;

/** The art as a standalone SVG (previews, thumbnails). Texts use the print fonts by name (`fontFamily(font)`). */
export function artToSvg(art: VectorArt, fontFamily: (font: PrintFontId) => string): string {
  const esc = (text: string) => text.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  const shapes = art.shapes.map(
    (s) =>
      `<path d="${s.d}" fill="${s.fill ?? "none"}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${n(s.strokeWidth ?? MIN_LINE_MM)}"` : ""}/>`
  );
  const texts = art.texts.map(
    (t) =>
      `<text x="${n(t.x)}" y="${n(t.baseline)}" font-size="${n(t.size)}" font-weight="700" font-family="${esc(fontFamily(t.font))}"` +
      ` fill="${t.color}" text-anchor="${t.anchor}">${esc(t.text)}</text>`
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(art.width)} ${n(art.height)}" width="${n(art.width)}mm" height="${n(art.height)}mm">` +
    shapes.join("") +
    texts.join("") +
    "</svg>"
  );
}
