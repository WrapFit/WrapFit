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

/** Width of `text` in mm, with the shaping (kerning, ligatures) of the outlines. */
export function outlineAdvanceMm(font: OutlineFont, text: string, sizeMm: number): number {
  const scale = sizeMm / font.unitsPerEm;
  return font.layout(text).positions.reduce((total, p) => total + p.xAdvance, 0) * scale;
}

/**
 * SVG path data (absolute M L Q C Z, mm, y down) of one line of text whose alphabetic baseline starts at (x, baseline).
 * Fill it with the non-zero rule (SVG and PDF default).
 */
export function outlineText(font: OutlineFont, text: string, x: number, baseline: number, sizeMm: number): string {
  const scale = sizeMm / font.unitsPerEm;
  const run = font.layout(text);
  const out: string[] = [];
  let penX = 0;
  let penY = 0;
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    const ox = penX + position.xOffset;
    const oy = penY + position.yOffset;
    const point = (gx: number, gy: number) => `${n(x + (ox + gx) * scale)} ${n(baseline - (oy + gy) * scale)}`;
    for (const { command, args } of glyph.path.commands) {
      if (command === "moveTo") out.push(`M ${point(args[0], args[1])}`);
      else if (command === "lineTo") out.push(`L ${point(args[0], args[1])}`);
      else if (command === "quadraticCurveTo") out.push(`Q ${point(args[0], args[1])} ${point(args[2], args[3])}`);
      else if (command === "bezierCurveTo")
        out.push(`C ${point(args[0], args[1])} ${point(args[2], args[3])} ${point(args[4], args[5])}`);
      else if (command === "closePath") out.push("Z");
    }
    penX += position.xAdvance;
    penY += position.yAdvance;
  });
  return out.join(" ");
}
