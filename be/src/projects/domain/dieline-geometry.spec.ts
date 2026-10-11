import {
  type BoxDimensions,
  CURRENT_FORMULA_VERSION,
  type DielineGeometry,
  generateDielinePieces,
} from '@wrapfit/shared';

const STRUCTURES = ['tuck-top', 'pillow', 'lid-base', 'sleeve-drawer'];
/** L × W × H (mm): wide, tall, flat, small (the minimum sizes of the box templates). */
const SIZES: [number, number, number][] = [
  [120, 80, 60],
  [60, 60, 150],
  [200, 150, 40],
  [40, 30, 20],
];
const EPSILON = 1e-6;

const box = ([length, width, height]: [
  number,
  number,
  number,
]): BoxDimensions => ({ length, width, height, paperThickness: 0.4 });

type Bounds = DielineGeometry['panels'][number]['bounds'];
const overlaps = (a: Bounds, b: Bounds) =>
  a.x < b.x + b.width - EPSILON &&
  b.x < a.x + a.width - EPSILON &&
  a.y < b.y + b.height - EPSILON &&
  b.y < a.y + a.height - EPSILON;

describe('dieline geometry of the current formulas', () => {
  const cases = STRUCTURES.flatMap((structure) =>
    SIZES.map((size) => [structure, size.join(' × ')] as const),
  );

  it.each(cases)(
    '%s %s: panels of a piece never overlap and stay on the sheet',
    (structure, size) => {
      const dimensions = box(
        size.split(' × ').map(Number) as [number, number, number],
      );
      for (const { name, geometry } of generateDielinePieces(
        structure,
        dimensions,
        CURRENT_FORMULA_VERSION,
      )) {
        const { panels, segments, totalBoundingBox: sheet } = geometry;
        for (const [i, a] of panels.entries()) {
          for (const b of panels.slice(i + 1))
            expect([name, a.id, b.id, overlaps(a.bounds, b.bounds)]).toEqual([
              name,
              a.id,
              b.id,
              false,
            ]);
          expect(a.bounds.x).toBeGreaterThanOrEqual(-EPSILON);
          expect(a.bounds.y).toBeGreaterThanOrEqual(-EPSILON);
          expect(a.bounds.x + a.bounds.width).toBeLessThanOrEqual(
            sheet.width + EPSILON,
          );
          expect(a.bounds.y + a.bounds.height).toBeLessThanOrEqual(
            sheet.height + EPSILON,
          );
        }
        for (const point of segments
          .filter((s) => !s.pathString)
          .flatMap((s) => [s.start, s.end])) {
          expect(point.x).toBeGreaterThanOrEqual(-EPSILON);
          expect(point.y).toBeGreaterThanOrEqual(-EPSILON);
          expect(point.x).toBeLessThanOrEqual(sheet.width + EPSILON);
          expect(point.y).toBeLessThanOrEqual(sheet.height + EPSILON);
        }
      }
    },
  );
});

describe('tuck-top formulas', () => {
  it('version 2 hinges the lid and the bottom on the back panel and has cut lines', () => {
    const [{ geometry }] = generateDielinePieces(
      'tuck-top',
      box([120, 80, 60]),
      2,
    );
    const panel = (id: string) =>
      geometry.panels.find((p) => p.id === id)!.bounds;
    expect(panel('panel_top_lid').y + panel('panel_top_lid').height).toBe(
      panel('panel_back').y,
    );
    expect(panel('panel_bottom').y).toBe(
      panel('panel_back').y + panel('panel_back').height,
    );
    expect(
      geometry.segments.filter((s) => s.type === 'cut').length,
    ).toBeGreaterThan(0);
  });

  it('keeps version 1 unchanged for the projects pinned to it', () => {
    const [{ geometry }] = generateDielinePieces(
      'tuck-top',
      box([120, 80, 60]),
      1,
    );
    expect(
      geometry.panels.find((p) => p.id === 'panel_top_lid')!.bounds,
    ).toEqual({ x: 15, y: 0, width: 120, height: 80 });
    expect(geometry.totalBoundingBox).toEqual({ width: 415, height: 238 });
    expect(geometry.segments.some((s) => s.type === 'cut')).toBe(false);
  });

  it('keeps the panel sizes of version 1, so FitCheck scores do not change', () => {
    const size = (version: number) =>
      generateDielinePieces(
        'tuck-top',
        box([90, 70, 110]),
        version,
      )[0].geometry.panels.map(({ id, bounds }) => [
        id,
        bounds.width,
        bounds.height,
      ]);
    expect(size(2)).toEqual(size(1));
  });
});
