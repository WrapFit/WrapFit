// Copy of be/src/ai/pattern/pattern-svg.ts: the offline demo (no backend) draws the same free procedural patterns.
import type { PatternDesign, PatternTile } from './pattern.types';

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
/** Path data: commands and numbers only (no letters that could start a URL or an entity). */
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s-]+$/;
const MAX_SHAPES = 60;
const MAX_PATH_LENGTH = 2000;
export const TILE_SIZE = { min: 16, max: 400 };

export class InvalidPatternError extends Error {}

/** Validates a design from any generator; throws InvalidPatternError with the first problem found. */
export function assertValidDesign(design: PatternDesign): void {
  const fail = (message: string): never => {
    throw new InvalidPatternError(message);
  };
  const color = (value: unknown, field: string) => {
    if (typeof value !== 'string' || !HEX_COLOR.test(value)) fail(`${field} must be a #RRGGBB color`);
  };
  const num = (value: unknown, field: string, min: number, max: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      fail(`${field} must be a number between ${min} and ${max}`);
    }
  };

  if (!design.themeName?.trim() || design.themeName.length > 100) fail('themeName is missing or too long');
  if (typeof design.description !== 'string' || design.description.length > 500) fail('description is too long');
  if (!Array.isArray(design.palette) || design.palette.length < 3 || design.palette.length > 8) {
    fail('palette must have 3 to 8 colors');
  }
  design.palette.forEach((c, i) => color(c, `palette[${i}]`));

  const tile = design.tile;
  num(tile?.size, 'tile.size', TILE_SIZE.min, TILE_SIZE.max);
  const s = tile.size;
  if (tile.background !== null) color(tile.background, 'tile.background');
  const shapes = [tile.circles, tile.rects, tile.lines, tile.paths];
  if (shapes.some((list) => !Array.isArray(list))) fail('tile shapes must be arrays');
  const count = shapes.reduce((sum, list) => sum + list.length, 0);
  if (count === 0 || count > MAX_SHAPES) fail(`a tile needs 1 to ${MAX_SHAPES} shapes`);

  tile.circles.forEach((c, i) => {
    num(c.cx, `circles[${i}].cx`, -s, 2 * s);
    num(c.cy, `circles[${i}].cy`, -s, 2 * s);
    num(c.r, `circles[${i}].r`, 0.1, s);
    color(c.fill, `circles[${i}].fill`);
    num(c.opacity, `circles[${i}].opacity`, 0, 1);
  });
  tile.rects.forEach((r, i) => {
    num(r.x, `rects[${i}].x`, -s, 2 * s);
    num(r.y, `rects[${i}].y`, -s, 2 * s);
    num(r.width, `rects[${i}].width`, 0.1, 2 * s);
    num(r.height, `rects[${i}].height`, 0.1, 2 * s);
    num(r.rotate, `rects[${i}].rotate`, -360, 360);
    color(r.fill, `rects[${i}].fill`);
    num(r.opacity, `rects[${i}].opacity`, 0, 1);
  });
  tile.lines.forEach((l, i) => {
    for (const key of ['x1', 'y1', 'x2', 'y2'] as const) num(l[key], `lines[${i}].${key}`, -s, 2 * s);
    color(l.stroke, `lines[${i}].stroke`);
    num(l.strokeWidth, `lines[${i}].strokeWidth`, 0.1, s / 2);
    num(l.opacity, `lines[${i}].opacity`, 0, 1);
  });
  tile.paths.forEach((p, i) => {
    if (typeof p.d !== 'string' || !p.d.trim() || p.d.length > MAX_PATH_LENGTH || !PATH_DATA.test(p.d)) {
      fail(`paths[${i}].d must be path commands and numbers only`);
    }
    if (p.fill === null && p.stroke === null) fail(`paths[${i}] needs a fill or a stroke`);
    if (p.fill !== null) color(p.fill, `paths[${i}].fill`);
    if (p.stroke !== null) color(p.stroke, `paths[${i}].stroke`);
    num(p.strokeWidth, `paths[${i}].strokeWidth`, 0, s / 2);
    num(p.opacity, `paths[${i}].opacity`, 0, 1);
  });
}

const n = (value: number) => Number(value.toFixed(2)).toString();

function renderShapes(tile: PatternTile): string {
  return [
    ...tile.circles.map(
      (c) => `<circle cx="${n(c.cx)}" cy="${n(c.cy)}" r="${n(c.r)}" fill="${c.fill}" fill-opacity="${n(c.opacity)}"/>`,
    ),
    ...tile.rects.map((r) => {
      const rotate = r.rotate
        ? ` transform="rotate(${n(r.rotate)} ${n(r.x + r.width / 2)} ${n(r.y + r.height / 2)})"`
        : '';
      return `<rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.width)}" height="${n(r.height)}" fill="${r.fill}" fill-opacity="${n(r.opacity)}"${rotate}/>`;
    }),
    ...tile.lines.map(
      (l) =>
        `<line x1="${n(l.x1)}" y1="${n(l.y1)}" x2="${n(l.x2)}" y2="${n(l.y2)}" stroke="${l.stroke}" stroke-width="${n(l.strokeWidth)}" stroke-opacity="${n(l.opacity)}" stroke-linecap="round"/>`,
    ),
    ...tile.paths.map(
      (p) =>
        `<path d="${p.d.replace(/\s+/g, ' ').trim()}" fill="${p.fill ?? 'none'}"` +
        (p.stroke ? ` stroke="${p.stroke}" stroke-width="${n(p.strokeWidth)}"` : '') +
        ` opacity="${n(p.opacity)}"/>`,
    ),
  ].join('');
}

/**
 * Builds the SVG of one tile. The motif is drawn 9 times (the tile and its 8 neighbours) and clipped by the
 * viewBox, so any shape crossing an edge re-enters on the opposite side: the tile repeats without seams.
 */
export function renderPatternSvg(design: PatternDesign): string {
  assertValidDesign(design);
  const { tile } = design;
  const size = n(tile.size);
  const motif = renderShapes(tile);
  const copies: string[] = [];
  for (const dx of [-tile.size, 0, tile.size]) {
    for (const dy of [-tile.size, 0, tile.size]) {
      copies.push(dx || dy ? `<g transform="translate(${n(dx)} ${n(dy)})">${motif}</g>` : `<g>${motif}</g>`);
    }
  }
  const background = tile.background ? `<rect width="${size}" height="${size}" fill="${tile.background}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    background +
    copies.join('') +
    '</svg>'
  );
}
