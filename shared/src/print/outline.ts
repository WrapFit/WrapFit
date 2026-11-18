/**
 * Texts of the print files as vector outlines (prepress rule 2, "Create Outlines"): the glyphs of the font file become
 * filled paths, so the file opens and prints the same without the font. Works with a `fontkit` font (the server and
 * the browser both use fontkit, which is also what PDFKit measures with).
 */

/** The part of a fontkit font this module uses. */
export interface OutlineFont {
  unitsPerEm: number;
  layout(text: string): {
    glyphs: { path: { commands: { command: string; args: number[] }[] } }[];
    positions: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }[];
  };
}

const n = (value: number) => Number(value.toFixed(3)).toString();

/**
 * Width of `text` in mm, with the shaping (kerning, ligatures) of the outlines. `spacingMm` is added after every glyph
 * (CSS letter-spacing).
 */
export function outlineAdvanceMm(font: OutlineFont, text: string, sizeMm: number, spacingMm = 0): number {
  const scale = sizeMm / font.unitsPerEm;
  const run = font.layout(text);
  return run.positions.reduce((total, p) => total + p.xAdvance, 0) * scale + spacingMm * run.glyphs.length;
}

type GlyphPoint = (gx: number, gy: number) => string;

/** Path commands of one glyph, its points mapped by `point` (font units in, "x y" in mm out). */
function glyphPath(commands: { command: string; args: number[] }[], point: GlyphPoint, out: string[]) {
  for (const { command, args } of commands) {
    if (command === "moveTo") out.push(`M ${point(args[0], args[1])}`);
    else if (command === "lineTo") out.push(`L ${point(args[0], args[1])}`);
    else if (command === "quadraticCurveTo") out.push(`Q ${point(args[0], args[1])} ${point(args[2], args[3])}`);
    else if (command === "bezierCurveTo") out.push(`C ${point(args[0], args[1])} ${point(args[2], args[3])} ${point(args[4], args[5])}`);
    else if (command === "closePath") out.push("Z");
  }
}

/**
 * Where each glyph of a curved line sits (docs/23 S9): the line is bent on a circle so that its length is kept and its
 * ends turn by `curveDeg` in total. Positive curves arch up (text on top of the circle), negative ones bow down.
 * `advances` are the glyph widths (spacing included), mm; (cx, baseline) is the middle of the straight line.
 * Returns the centre of each glyph on the baseline and its turn in degrees.
 */
export function arcPlacements(advances: number[], curveDeg: number, cx: number, baseline: number): { x: number; y: number; angle: number }[] {
  const total = advances.reduce((sum, a) => sum + a, 0);
  const theta = (Math.max(-360, Math.min(360, curveDeg)) * Math.PI) / 180;
  const placements: { x: number; y: number; angle: number }[] = [];
  let s = 0;
  for (const advance of advances) {
    const along = s + advance / 2 - total / 2;
    s += advance;
    if (!theta || !total) {
      placements.push({ x: cx + along, y: baseline, angle: 0 });
      continue;
    }
    const radius = total / Math.abs(theta);
    const phi = along / radius;
    const up = theta > 0;
    placements.push({
      x: cx + radius * Math.sin(phi),
      y: up ? baseline + radius - radius * Math.cos(phi) : baseline - radius + radius * Math.cos(phi),
      angle: ((up ? phi : -phi) * 180) / Math.PI,
    });
  }
  return placements;
}

/**
 * SVG path data (absolute M L Q C Z, mm, y down) of one line of text whose alphabetic baseline starts at (x, baseline).
 * Fill it with the non-zero rule (SVG and PDF default).
 */
export function outlineText(font: OutlineFont, text: string, x: number, baseline: number, sizeMm: number, spacingMm = 0): string {
  const scale = sizeMm / font.unitsPerEm;
  const run = font.layout(text);
  const out: string[] = [];
  let penX = 0;
  let penY = 0;
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    const ox = penX + position.xOffset;
    const oy = penY + position.yOffset;
    glyphPath(glyph.path.commands, (gx, gy) => `${n(x + (ox + gx) * scale)} ${n(baseline - (oy + gy) * scale)}`, out);
    penX += position.xAdvance + spacingMm / scale;
    penY += position.yAdvance;
  });
  return out.join(" ");
}

/** Outlines of one line bent on an arc (see arcPlacements); (cx, baseline) is the middle of the straight line. */
export function outlineTextOnArc(font: OutlineFont, text: string, cx: number, baseline: number, sizeMm: number, spacingMm: number, curveDeg: number): string {
  const scale = sizeMm / font.unitsPerEm;
  const run = font.layout(text);
  const advances = run.positions.map((p) => p.xAdvance * scale + spacingMm);
  const places = arcPlacements(advances, curveDeg, cx, baseline);
  const out: string[] = [];
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    const { x, y, angle } = places[index];
    const a = (angle * Math.PI) / 180;
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    const half = (position.xAdvance * scale) / 2;
    glyphPath(
      glyph.path.commands,
      (gx, gy) => {
        const lx = (position.xOffset + gx) * scale - half;
        const ly = -(position.yOffset + gy) * scale;
        return `${n(x + lx * cos - ly * sin)} ${n(y + lx * sin + ly * cos)}`;
      },
      out
    );
  });
  return out.join(" ");
}
