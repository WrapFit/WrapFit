import React from "react";
import type { BoxStructureType } from "@wrapfit/shared";

/**
 * WrapFit's own pictures of the box structures. Each box is modelled in 3D (x to the right, y to the left, z up, in
 * millimetre-like units) and drawn through one isometric projection, so every picture has the same angle and the
 * same light: top lit, left face in half tone, right face in the shade. Flat paper tones with a hairline edge, one
 * orange printed detail per box and a soft shadow on the table.
 */

const TOP = "#FDF8EE";
const LEFT = "#F3E6CC";
const RIGHT = "#E3CFA9";
const IN_LIGHT = "#D9C29A";
const IN_DARK = "#C7AC80";
const FLOOR = "#B99C6E";
const EDGE = "#A98A5B";
/** The printed detail, in the brand orange: lit, and in the shade. */
const ACCENT = "fill-fpt-orange";
const ACCENT_SHADE = "fill-fpt-orange-ink";

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

type Point = [number, number, number];
interface Iso {
  (x: number, y: number, z: number): [number, number];
  k: number;
}

/** Projection that centres a `w × d × h` volume in the 200 × 200 tile at scale `k`. */
function fit(w: number, d: number, h: number, k: number, dx = 0, dy = 0): Iso {
  const ox = 100 - ((w - d) * COS * k) / 2 + dx;
  const oy = 100 - (((w + d) * SIN - h) * k) / 2 + dy;
  const project = (x: number, y: number, z: number): [number, number] => [ox + (x - y) * COS * k, oy + ((x + y) * SIN - z) * k];
  return Object.assign(project, { k });
}

const pts = (p: Iso, points: Point[]) => points.map(([x, y, z]) => p(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");

function Face({ p, at, fill, accent }: { p: Iso; at: Point[]; fill?: string; accent?: string }) {
  return accent ? <polygon points={pts(p, at)} className={accent} stroke="none" /> : <polygon points={pts(p, at)} fill={fill} />;
}

/** A circle lying flat at height `z`. */
function Disc({ p, x, y, z, r, fill, accent }: { p: Iso; x: number; y: number; z: number; r: number; fill?: string; accent?: string }) {
  const [cx, cy] = p(x, y, z);
  const props = { cx, cy, rx: r * Math.SQRT2 * COS * p.k, ry: r * Math.SQRT2 * SIN * p.k };
  return accent ? <ellipse {...props} className={accent} stroke="none" /> : <ellipse {...props} fill={fill} />;
}

function Shadow({ p, w, d, x = 0, y = 0 }: { p: Iso; w: number; d: number; x?: number; y?: number }) {
  const [cx, cy] = p(x + w / 2, y + d / 2, 0);
  const r = (Math.hypot(w, d) / 2) * 0.86;
  return <ellipse cx={cx} cy={cy + 3} rx={r * Math.SQRT2 * COS * p.k} ry={r * Math.SQRT2 * SIN * p.k} fill="#5C4424" opacity="0.1" stroke="none" />;
}

interface Block {
  p: Iso;
  x?: number;
  y?: number;
  z?: number;
  w: number;
  d: number;
  h: number;
}

/** What is seen through the open top of a box: the floor and the two far walls. Drawn before `Walls`. */
function Inside({ p, x = 0, y = 0, z = 0, w, d, h, see = false }: Block & { see?: boolean }) {
  const [x1, y1, z1] = [x + w, y + d, z + h];
  return (
    <>
      <Face p={p} at={[[x, y, z], [x1, y, z], [x1, y1, z], [x, y1, z]]} fill={FLOOR} />
      <Face p={p} at={[[x, y, z], [x, y1, z], [x, y1, z1], [x, y, z1]]} fill={see ? FLOOR : IN_LIGHT} />
      <Face p={p} at={[[x, y, z], [x1, y, z], [x1, y, z1], [x, y, z1]]} fill={IN_DARK} />
    </>
  );
}

/** The two near walls of a box and, when it is closed, its top. */
function Walls({ p, x = 0, y = 0, z = 0, w, d, h, top = false, right = RIGHT }: Block & { top?: boolean; right?: string }) {
  const [x1, y1, z1] = [x + w, y + d, z + h];
  return (
    <>
      <Face p={p} at={[[x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1]]} fill={LEFT} />
      <Face p={p} at={[[x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1]]} fill={right} />
      {top && <Face p={p} at={[[x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1]]} fill={TOP} />}
    </>
  );
}

/** A printed band around a box between `z0` and `z1`, on its two near walls. */
function Band({ p, w, d, z0, z1 }: { p: Iso; w: number; d: number; z0: number; z1: number }) {
  return (
    <>
      <Face p={p} at={[[0, d, z0], [w, d, z0], [w, d, z1], [0, d, z1]]} accent={ACCENT} />
      <Face p={p} at={[[w, 0, z0], [w, d, z0], [w, d, z1], [w, 0, z1]]} accent={ACCENT_SHADE} />
    </>
  );
}

function TuckTop() {
  const [w, d, h] = [50, 40, 64];
  const p = fit(w, d, h + 42, 1.1);
  return (
    <>
      <Shadow p={p} w={w} d={d} />
      {/* Lid standing on the far edge, its tuck flap bent forward */}
      <Face p={p} at={[[0, 0, h], [w, 0, h], [w, -8, h + 34], [0, -8, h + 34]]} fill={TOP} />
      <Face p={p} at={[[0, -8, h + 34], [w, -8, h + 34], [w, 2, h + 42], [0, 2, h + 42]]} fill={LEFT} />
      {/* Far dust flap */}
      <Face p={p} at={[[0, 0, h], [0, d, h], [-10, d - 5, h + 13], [-10, 5, h + 13]]} fill={RIGHT} />
      <Inside p={p} w={w} d={d} h={h} />
      <Walls p={p} w={w} d={d} h={h} />
      <Band p={p} w={w} d={d} z0={22} z1={38} />
      {/* Near dust flap, opened outwards */}
      <Face p={p} at={[[w, 0, h], [w, d, h], [w + 12, d - 5, h + 9], [w + 12, 5, h + 9]]} fill={TOP} />
    </>
  );
}

function SleeveDrawer() {
  const [w, d, h, out] = [80, 50, 26, 34];
  const p = fit(w + out, d, h, 1.15);
  return (
    <>
      <Shadow p={p} w={w + out} d={d} />
      {/* Sleeve: its top, its near wall and the dark mouth the tray slides out of */}
      <Face p={p} at={[[w, 0, 0], [w, d, 0], [w, d, h], [w, 0, h]]} fill={FLOOR} />
      <Face p={p} at={[[0, d, 0], [w, d, 0], [w, d, h], [0, d, h]]} fill={LEFT} />
      <Face p={p} at={[[0, 0, h], [w, 0, h], [w, d, h], [0, d, h]]} fill={TOP} />
      <Face p={p} at={[[16, 0, h], [30, 0, h], [30, d, h], [16, d, h]]} accent={ACCENT} />
      <Face p={p} at={[[16, d, 0], [30, d, 0], [30, d, h], [16, d, h]]} accent={ACCENT_SHADE} />
      {/* Tray pulled out, with its ribbon pull */}
      <Inside p={p} x={w} y={3} z={2} w={out} d={d - 6} h={h - 5} see />
      <Walls p={p} x={w} y={3} z={2} w={out} d={d - 6} h={h - 5} />
      <Face p={p} at={[[w + out, d / 2 - 6, 8], [w + out, d / 2 + 6, 8], [w + out + 9, d / 2 + 4, 4], [w + out + 9, d / 2 - 4, 4]]} accent={ACCENT} />
    </>
  );
}

function LidBase() {
  const [w, d, h] = [70, 70, 30];
  const [lz, lh] = [50, 14];
  const p = fit(w + 4, d + 4, lz + lh, 1.2);
  return (
    <>
      <Shadow p={p} w={w} d={d} x={2} y={2} />
      <Inside p={p} x={2} y={2} w={w} d={d} h={h} />
      <Walls p={p} x={2} y={2} w={w} d={d} h={h} />
      {/* Lid lifted above the base, a ribbon printed over it */}
      <Walls p={p} z={lz} w={w + 4} d={d + 4} h={lh} top />
      <Face p={p} at={[[32, 0, lz + lh], [42, 0, lz + lh], [42, d + 4, lz + lh], [32, d + 4, lz + lh]]} accent={ACCENT} />
      <Face p={p} at={[[32, d + 4, lz], [42, d + 4, lz], [42, d + 4, lz + lh], [32, d + 4, lz + lh]]} accent={ACCENT_SHADE} />
    </>
  );
}

function Pillow() {
  const [w, d, h, dip] = [112, 54, 19, 17];
  const p = fit(w, d, h, 1.2, 0, -4);
  // The body is one sheet bowed over its width; each end is pressed in along a curved crease.
  const bow = (y: number) => Math.sin((Math.PI * y) / d);
  const steps = (from: number, to: number, n = 10) => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
  /** Where the far side of the bow disappears behind its own crest, seen from this angle. */
  const crest = (d / Math.PI) * Math.acos(d / (2 * h * Math.PI));
  const right = (y: number): Point => [w - dip * bow(y), y, h * bow(y)];
  const left = (y: number): Point => [dip * bow(y), y, h * bow(y)];
  const body = [...steps(d, crest).map(right), ...steps(crest, d).map(left)];
  const [gx0, gy0] = p(w / 2, crest, h * bow(crest));
  const [gx1, gy1] = p(w / 2, d, 0);
  const [lx, ly] = p(w - dip * 0.45, d / 2, -3);
  const [ex, ey] = p(w, d, 0);
  return (
    <>
      <defs>
        <linearGradient id="wf-art-pillow" gradientUnits="userSpaceOnUse" x1={gx0} y1={gy0} x2={gx1} y2={gy1}>
          <stop offset="0" stopColor={TOP} />
          <stop offset="0.55" stopColor={LEFT} />
          <stop offset="1" stopColor={RIGHT} />
        </linearGradient>
      </defs>
      <Shadow p={p} w={w} d={d} />
      {/* The pressed-in end flap, seen under its crease */}
      <path d={`M${pts(p, steps(d, 0, 14).map(right)).replace(/ /g, " L")} Q${lx.toFixed(1)} ${ly.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)} Z`} fill={IN_DARK} />
      <polygon points={pts(p, body)} fill="url(#wf-art-pillow)" />
      {/* Printed band over the body */}
      <polygon points={pts(p, [...steps(crest, d - 1).map((y): Point => [49, y, h * bow(y)]), ...steps(d - 1, crest).map((y): Point => [65, y, h * bow(y)])])} className={ACCENT} stroke="none" />
    </>
  );
}

function Mailer() {
  const [w, d, h, lid] = [80, 60, 24, 52];
  const p = fit(w, d, h + lid + 8, 1.05);
  return (
    <>
      <Shadow p={p} w={w} d={d} />
      {/* Lid swung up on the far wall, its front lip bent forward */}
      <Face p={p} at={[[0, 0, h], [w, 0, h], [w, -10, h + lid], [0, -10, h + lid]]} fill={TOP} />
      <Face p={p} at={[[0, -10, h + lid], [w, -10, h + lid], [w, 2, h + lid + 8], [0, 2, h + lid + 8]]} fill={LEFT} />
      <Inside p={p} w={w} d={d} h={h} />
      <Walls p={p} w={w} d={d} h={h} />
      {/* Printed label on the near wall */}
      <Face p={p} at={[[12, d, 6], [40, d, 6], [40, d, 18], [12, d, 18]]} accent={ACCENT} />
    </>
  );
}

function Gable() {
  const [w, d, h, roof, grip] = [86, 42, 40, 22, 20];
  const p = fit(w, d, h + roof + grip, 1.08);
  const mid = d / 2;
  const top = h + roof;
  return (
    <>
      <Shadow p={p} w={w} d={d} />
      <Face p={p} at={[[0, d, 0], [w, d, 0], [w, d, h], [0, d, h]]} fill={LEFT} />
      {/* The end wall runs up into the gable, creased where it folds in */}
      <Face p={p} at={[[w, 0, 0], [w, d, 0], [w, d, h], [w, mid, top], [w, 0, h]]} fill={RIGHT} />
      <Face p={p} at={[[w, d, h], [w, mid, h + 6], [w, 0, h], [w, mid, top]]} fill={IN_LIGHT} />
      <Band p={p} w={w} d={d} z0={0} z1={10} />
      {/* Near roof slope, then the handle along the ridge with its rounded hand hole */}
      <Face p={p} at={[[0, d, h], [w, d, h], [w, mid, top], [0, mid, top]]} fill={TOP} />
      <Face p={p} at={[[0, mid, top], [w, mid, top], [w, mid, top + grip - 6], [w - 8, mid, top + grip], [8, mid, top + grip], [0, mid, top + grip - 6]]} fill={LEFT} />
      <Face
        p={p}
        at={[[30, mid, top + 6], [w - 30, mid, top + 6], [w - 26, mid, top + 9.5], [w - 30, mid, top + 13], [30, mid, top + 13], [26, mid, top + 9.5]]}
        fill={IN_DARK}
      />
    </>
  );
}

function Cup({ p, x, y }: { p: Iso; x: number; y: number }) {
  const [z0, z1, r0, r1] = [3, 54, 8, 11.5];
  const ring = (z: number, grow = 0) => {
    const r = r0 + ((r1 - r0) * (z - z0)) / (z1 - z0) + grow;
    const [cx, cy] = p(x, y, z);
    return { cx, cy, rx: r * Math.SQRT2 * COS * p.k, ry: r * Math.SQRT2 * SIN * p.k };
  };
  // The side of a tapered cup between two heights: straight flanks, the near half of each rim.
  const side = (za: number, zb: number, grow = 0) => {
    const [a, b] = [ring(zb, grow), ring(za, grow)];
    return `M${a.cx - a.rx} ${a.cy} L${b.cx - b.rx} ${b.cy} A${b.rx} ${b.ry} 0 0 0 ${b.cx + b.rx} ${b.cy} L${a.cx + a.rx} ${a.cy} A${a.rx} ${a.ry} 0 0 1 ${a.cx - a.rx} ${a.cy} Z`;
  };
  return (
    <>
      <path d={side(z0, z1)} fill={TOP} />
      <path d={side(24, 40)} className={ACCENT} stroke="none" />
      {/* Lid: a rim wider than the cup, its flat top and the sip hole */}
      <path d={side(z1, z1 + 4, 1.2)} fill={LEFT} />
      <Disc p={p} x={x} y={y} z={z1 + 4} r={r1 + 1.6} fill={TOP} />
      <Disc p={p} x={x + 3} y={y + 3} z={z1 + 4} r={2.2} fill={IN_DARK} />
    </>
  );
}

function CupCarrier() {
  const [w, d, h, grip] = [92, 66, 24, 78];
  const p = fit(w, d, grip, 1.08);
  const mid = d / 2;
  return (
    <>
      <Shadow p={p} w={w} d={d} />
      <Inside p={p} w={w} d={d} h={h} />
      {/* Two cups behind the handle */}
      <Cup p={p} x={25} y={15} />
      <Cup p={p} x={67} y={15} />
      {/* Handle standing across the tray, with its rounded hand hole */}
      <Face p={p} at={[[8, mid, 0], [w - 8, mid, 0], [w - 8, mid, grip - 10], [w - 20, mid, grip], [20, mid, grip], [8, mid, grip - 10]]} fill={LEFT} />
      <Face
        p={p}
        at={[[34, mid, grip - 18], [w - 34, mid, grip - 18], [w - 30, mid, grip - 14], [w - 34, mid, grip - 10], [34, mid, grip - 10], [30, mid, grip - 14]]}
        fill={IN_DARK}
      />
      {/* Two cups in front of it, each with its printed sleeve */}
      <Cup p={p} x={25} y={d - 15} />
      <Cup p={p} x={67} y={d - 15} />
      <Walls p={p} w={w} d={d} h={h} />
    </>
  );
}

function Insert() {
  const [w, d, h] = [84, 64, 16];
  const p = fit(w, d, h, 1.25);
  const half = d / 2;
  const wallX = (x: number, y0: number, y1: number) => <Face p={p} at={[[x, y0, 0], [x, y1, 0], [x, y1, h], [x, y0, h]]} fill={IN_LIGHT} />;
  return (
    <>
      <Shadow p={p} w={w} d={d} />
      <Inside p={p} w={w} d={d} h={h} />
      {/* Crossing partitions, far to near */}
      {wallX(28, 0, half)}
      {wallX(56, 0, half)}
      <Face p={p} at={[[0, half, 0], [w, half, 0], [w, half, h], [0, half, h]]} fill={TOP} />
      {wallX(28, half, d)}
      {/* One cell holds a gift */}
      <Walls p={p} x={33} y={half + 5} w={18} d={d - half - 10} h={11} right="none" />
      <Face p={p} at={[[33, half + 5, 11], [51, half + 5, 11], [51, d - 5, 11], [33, d - 5, 11]]} accent={ACCENT} />
      <Face p={p} at={[[51, half + 5, 0], [51, d - 5, 0], [51, d - 5, 11], [51, half + 5, 11]]} accent={ACCENT_SHADE} />
      {wallX(56, half, d)}
      <Walls p={p} w={w} d={d} h={h} />
    </>
  );
}

function HangTag() {
  // A flat tag is clearest seen from the front: hung by its string, turned a little.
  const tag = "M-30 -42 L-14 -58 L14 -58 L30 -42 L30 56 Q30 62 24 62 L-24 62 Q-30 62 -30 56 Z";
  return (
    <g transform="translate(104 108) rotate(10)">
      <path d={tag} transform="translate(5 6)" fill="#5C4424" opacity="0.1" stroke="none" />
      <path d={tag} fill={TOP} />
      {/* Printed band and two lines of text */}
      <path d="M-30 -8 L30 -8 L30 20 L-30 20 Z" className={ACCENT} stroke="none" />
      <path d="M-18 34 L18 34 M-12 46 L12 46" strokeWidth="2.4" opacity="0.4" />
      <path d={tag} fill="none" />
      {/* Eyelet and the loop of string through it */}
      <circle cx="0" cy="-42" r="7.5" fill={LEFT} />
      <circle cx="0" cy="-42" r="3.6" fill={IN_DARK} />
      <path d="M-1 -43 Q-30 -72 -10 -92 Q8 -104 14 -84 Q16 -66 2 -44" fill="none" className="stroke-fpt-orange" strokeWidth="2.2" />
    </g>
  );
}

function FoldedCard() {
  const [w, h] = [52, 72];
  const p = fit(w, w, h, 1.38);
  return (
    <>
      <Shadow p={p} w={w} d={w} />
      {/* A card standing open like a book: the two leaves meet at the spine, behind */}
      <Face p={p} at={[[0, 0, 0], [0, w, 0], [0, w, h], [0, 0, h]]} fill={LEFT} />
      <Face p={p} at={[[0, 0, 0], [w, 0, 0], [w, 0, h], [0, 0, h]]} fill={TOP} />
      {/* Printed motif and two lines of text on the right leaf */}
      <Face p={p} at={[[12, 0, 38], [40, 0, 38], [40, 0, 60], [12, 0, 60]]} accent={ACCENT} />
      <Face p={p} at={[[12, 0, 26], [40, 0, 26], [40, 0, 29], [12, 0, 29]]} accent="fill-current opacity-30" />
      <Face p={p} at={[[12, 0, 17], [32, 0, 17], [32, 0, 20], [12, 0, 20]]} accent="fill-current opacity-30" />
    </>
  );
}

function BellyBand() {
  const [w, d, h] = [80, 56, 30];
  const p = fit(w, d, h, 1.3);
  return (
    <>
      <Shadow p={p} w={w} d={d} />
      <Walls p={p} w={w} d={d} h={h} top />
      {/* The band: over the top and down the near wall */}
      <Face p={p} at={[[29, 0, h], [51, 0, h], [51, d, h], [29, d, h]]} accent={ACCENT} />
      <Face p={p} at={[[29, d, 0], [51, d, 0], [51, d, h], [29, d, h]]} accent={ACCENT_SHADE} />
      <Face p={p} at={[[34, 20, h], [46, 20, h], [46, 36, h], [34, 36, h]]} fill={TOP} />
    </>
  );
}

function StickerLabel() {
  // A sheet of stickers seen from the front: round seals and a long label, one seal half peeled off.
  const seal = (cx: number, cy: number) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r="19" className={ACCENT} stroke="none" />
      <circle cx={cx} cy={cy} r="12.5" fill="none" stroke={TOP} strokeWidth="1.4" strokeDasharray="2.5 2.5" />
    </g>
  );
  return (
    <g transform="translate(100 102) rotate(-7)">
      <rect x="-60" y="-66" width="130" height="142" rx="10" fill="#5C4424" opacity="0.1" stroke="none" />
      <rect x="-65" y="-72" width="130" height="142" rx="10" fill={TOP} />
      {seal(-34, -40)}
      {seal(34, -40)}
      {seal(-34, 8)}
      {/* The seal being peeled: its bare place on the sheet, then the sticker lifted, its corner curled back */}
      <circle cx="34" cy="8" r="19" fill={LEFT} strokeDasharray="3 2.5" />
      <g transform="translate(46 -4) rotate(18)">
        <circle cx="0" cy="0" r="19" className={ACCENT} stroke="none" />
        <path d="M-17.6 7 A19 19 0 0 0 7 17.6 Q-2 12 -17.6 7 Z" fill={TOP} />
      </g>
      {/* Long label */}
      <rect x="-52" y="38" width="104" height="22" rx="6" className={ACCENT_SHADE} stroke="none" />
      <path d="M-38 49 L20 49" stroke={TOP} strokeWidth="2.4" />
    </g>
  );
}

const ART: Record<BoxStructureType, () => React.JSX.Element> = {
  "tuck-top": TuckTop,
  "sleeve-drawer": SleeveDrawer,
  "lid-base": LidBase,
  pillow: Pillow,
  mailer: Mailer,
  gable: Gable,
  "cup-carrier": CupCarrier,
  insert: Insert,
  "hang-tag": HangTag,
  "folded-card": FoldedCard,
  "belly-band": BellyBand,
  "sticker-label": StickerLabel,
};

/** Picture of a box structure, scaled to its square tile. */
export function StructureArt({ structure, className }: { structure: BoxStructureType; className?: string }) {
  const Art = ART[structure] ?? TuckTop;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <g stroke={EDGE} strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round" color={EDGE}>
        <Art />
      </g>
    </svg>
  );
}
