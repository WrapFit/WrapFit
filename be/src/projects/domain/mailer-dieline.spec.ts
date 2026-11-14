import {
  boxFrameOf,
  type BoxDimensions,
  type CanvasElement,
  checkBox,
  type DielineGeometry,
  foldedSize,
  generateDielinePieces,
  mailerSizesOf,
  multiply,
  panelTransforms,
  quote,
  segmentPoints,
  transformPoint,
} from '@wrapfit/shared';

/** L × W × H (mm): the S / M / L sizes of the studio, a tall one and the minimum sizes of the box templates. */
const SIZES: [number, number, number][] = [
  [150, 110, 50],
  [220, 160, 70],
  [300, 220, 100],
  [60, 60, 150],
  [40, 30, 20],
];
const T = 0.42;
const EPSILON = 1e-6;
const FIT = 0.5;

const box = ([length, width, height]: [number, number, number]): BoxDimensions => ({
  length,
  width,
  height,
  paperThickness: T,
});
const mailer = (size: [number, number, number]): DielineGeometry =>
  generateDielinePieces('mailer', box(size), 3)[0].geometry;

type Bounds = DielineGeometry['panels'][number]['bounds'];
const overlaps = (a: Bounds, b: Bounds) =>
  a.x < b.x + b.width - EPSILON &&
  b.x < a.x + a.width - EPSILON &&
  a.y < b.y + b.height - EPSILON &&
  b.y < a.y + a.height - EPSILON;

describe('mailer box (FEFCO 0427, docs/23 S16)', () => {
  it.each(SIZES)(
    '%s × %s × %s: one piece, panels never overlap, every line stays on the sheet',
    (...size) => {
      const pieces = generateDielinePieces('mailer', box(size), 3);
      expect(pieces).toHaveLength(1);
      const { panels, segments, totalBoundingBox: sheet } = pieces[0].geometry;
      for (const [i, a] of panels.entries()) {
        for (const b of panels.slice(i + 1))
          expect([a.id, b.id, overlaps(a.bounds, b.bounds)]).toEqual([a.id, b.id, false]);
      }
      for (const point of segments.flatMap((s) => segmentPoints(s))) {
        expect(point.x).toBeGreaterThanOrEqual(-1e-3);
        expect(point.y).toBeGreaterThanOrEqual(-1e-3);
        expect(point.x).toBeLessThanOrEqual(sheet.width + 1e-3);
        expect(point.y).toBeLessThanOrEqual(sheet.height + 1e-3);
      }
    },
  );

  it.each(SIZES)(
    '%s × %s × %s folds into a box whose inside is L × W × H',
    (...size) => {
      const folded = foldedSize(mailer(size))!;
      // Along L: outer and inner side walls on both sides (3t between the outer mid-planes and the inside); along W:
      // a double front and a single back (2t); up: half the bottom and half the lid (t).
      expect(Math.abs(folded.x - 3 * T - size[0])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(folded.z - 2 * T - size[1])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(folded.y - T - size[2])).toBeLessThanOrEqual(FIT);
    },
  );

  it.each(SIZES)(
    '%s × %s × %s: the outline is closed and the box needs no glue',
    (...size) => {
      const geometry = mailer(size);
      expect(geometry.glueAreas).toEqual([]);
      const outline = geometry.segments.filter((s) => s.id.startsWith('cut_outline_'));
      for (const [i, segment] of outline.entries()) {
        const next = outline[(i + 1) % outline.length];
        expect(Math.hypot(segment.end.x - next.start.x, segment.end.y - next.start.y)).toBeLessThan(EPSILON);
      }
      const s = mailerSizesOf(box(size));
      // The ears of the front and back walls meet inside the side walls without overlapping.
      expect(2 * s.ear).toBeLessThan(s.bottomW);
      expect(s.tuck).toBeLessThan(s.inner);
    },
  );

  it('closes: the lid lies on top, printed side up, and the inner walls hang inside the outer ones', () => {
    const geometry = mailer([220, 160, 70]);
    const frame = boxFrameOf(geometry)!;
    const transforms = panelTransforms(geometry, 1);
    const at = (id: string, p: [number, number, number]) => transformPoint(multiply(frame, transforms[id]), p);
    const centreOf = (id: string) => {
      const { x, y, width, height } = geometry.panels.find((p) => p.id === id)!.bounds;
      return at(id, [x + width / 2, y + height / 2, 0]);
    };
    const normalOf = (id: string) => {
      const { x, y, width, height } = geometry.panels.find((p) => p.id === id)!.bounds;
      const c = centreOf(id);
      const q = at(id, [x + width / 2, y + height / 2, -1]); // printed side: −z on the sheet
      return [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
    };
    const size = foldedSize(geometry)!;
    const lid = centreOf('mailer_lid');
    expect(lid[1]).toBeCloseTo(size.y, 3);
    expect(normalOf('mailer_lid')[1]).toBeGreaterThan(0.99);
    expect(normalOf('mailer_front')[2]).toBeGreaterThan(0.99); // front faces +z
    expect(normalOf('mailer_back')[2]).toBeLessThan(-0.99);
    for (const [outer, inner] of [
      ['mailer_front', 'mailer_front_inner'],
      ['mailer_left', 'mailer_left_inner'],
      ['mailer_right', 'mailer_right_inner'],
    ]) {
      const o = centreOf(outer);
      const i = centreOf(inner);
      expect(Math.hypot(i[0], i[2])).toBeLessThan(Math.hypot(o[0], o[2]));
      // Printed side of the inner wall faces the inside of the box (seen with the lid open).
      const n = normalOf(inner);
      expect(n[0] * i[0] + n[2] * i[2]).toBeLessThan(0);
    }
  });

  it('is quoted with folding and no glue, and a title on the lid passes FitCheck', () => {
    const pieces = generateDielinePieces('mailer', box([220, 160, 70]), 3);
    const price = quote({ structure: 'mailer', pieces, quantity: 100, paper: 'ivory' });
    expect(price.lines.find((line) => line.id === 'glue')?.label).toBe('Gấp hộp (không dùng keo)');
    expect(price.total).toBeGreaterThan(0);
    const title: CanvasElement = {
      id: 'title',
      type: 'text',
      panelId: 'mailer_lid',
      x: 40,
      y: 60,
      width: 140,
      height: 14,
      rotation: 0,
      content: 'Hộp quà',
      style: { fontFamily: 'Playfair Display', fontSize: 24, color: '#1C1917' },
    } as CanvasElement;
    const report = checkBox(pieces, [title]);
    expect(report.violations.filter((v) => v.severity === 'error')).toEqual([]);
  });
});
