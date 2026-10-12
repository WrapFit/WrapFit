import {
  boxFrameOf,
  type BoxDimensions,
  CURRENT_FORMULA_VERSION,
  type DielineGeometry,
  foldedCorners,
  foldedSize,
  generateDielinePieces,
  multiply,
  panelTransforms,
  pillowShapeOf,
  segmentPoints,
  transformPoint,
} from '@wrapfit/shared';

const STRUCTURES = ['tuck-top', 'pillow', 'lid-base', 'sleeve-drawer'];
/** L × W × H (mm): wide, tall, flat, small (the minimum sizes of the box templates). */
const SIZES: [number, number, number][] = [
  [120, 80, 60],
  [60, 60, 150],
  [200, 150, 40],
  [40, 30, 20],
];
/** Formula versions projects can be pinned to. */
const VERSIONS = [1, 2, 3];
const T = 0.42; // 300 GSM × 0.0014
const EPSILON = 1e-6;
/** Allowed gap between the inside of a folded box and the size the user typed, mm (docs/12 Phase 8). */
const FIT = 0.5;

const box = (
  [length, width, height]: [number, number, number],
  paperThickness = T,
): BoxDimensions => ({ length, width, height, paperThickness });

type Bounds = DielineGeometry['panels'][number]['bounds'];
const overlaps = (a: Bounds, b: Bounds) =>
  a.x < b.x + b.width - EPSILON &&
  b.x < a.x + a.width - EPSILON &&
  a.y < b.y + b.height - EPSILON &&
  b.y < a.y + a.height - EPSILON;

// Tuck-top version 1 is the known defect fixed by version 2 (its lid overlaps the back panel); tested on its own below.
const cases = VERSIONS.flatMap((version) =>
  STRUCTURES.filter((s) => version > 1 || s !== 'tuck-top').flatMap(
    (structure) => SIZES.map((size) => [version, structure, size] as const),
  ),
);

describe('dieline geometry of every formula version in use', () => {
  it.each(cases)(
    'v%s %s %p: panels never overlap and every line stays on the sheet',
    (version, structure, size) => {
      for (const { name, geometry } of generateDielinePieces(
        structure,
        box(size),
        version,
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
        for (const point of segments.flatMap((s) => segmentPoints(s))) {
          expect(point.x).toBeGreaterThanOrEqual(-1e-3);
          expect(point.y).toBeGreaterThanOrEqual(-1e-3);
          expect(point.x).toBeLessThanOrEqual(sheet.width + 1e-3);
          expect(point.y).toBeLessThanOrEqual(sheet.height + 1e-3);
        }
      }
    },
  );
});

describe('formula version 3', () => {
  const v3 = (structure: string, size: [number, number, number], t = T) =>
    generateDielinePieces(structure, box(size, t), 3).map((p) => p.geometry);

  it('is the version given to new projects', () => {
    expect(CURRENT_FORMULA_VERSION).toBe(3);
  });

  it.each(SIZES)(
    'tuck-top %s × %s × %s folds into a box whose inside is L × W × H',
    (...size) => {
      const [geometry] = v3('tuck-top', size);
      const folded = foldedSize(geometry)!;
      // Creases on the paper mid-plane: half a thickness on each side.
      expect(Math.abs(folded.x - T - size[0])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(folded.z - T - size[1])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(folded.y - T - size[2])).toBeLessThanOrEqual(FIT);
    },
  );

  it.each(SIZES)(
    'lid-base %s × %s × %s: the base holds L × W × H, the lid slides over it',
    (...size) => {
      const [base, lid] = v3('lid-base', size).map((g) => foldedSize(g)!);
      // Base: two corner tabs inside the side walls take 2t of the length.
      expect(Math.abs(base.x - 3 * T - size[0])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(base.z - T - size[1])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(base.y - T / 2 - size[2])).toBeLessThanOrEqual(FIT);
      const gapL = lid.x - 3 * T - (base.x + T);
      const gapW = lid.z - T - (base.z + T);
      for (const gap of [gapL, gapW]) {
        expect(gap).toBeGreaterThanOrEqual(0.5);
        expect(gap).toBeLessThanOrEqual(1.5);
      }
      expect(lid.y).toBeLessThanOrEqual(base.y + EPSILON);
    },
  );

  it.each(SIZES)(
    'sleeve-drawer %s × %s × %s: the drawer holds L × W × H and slides along L in the sleeve',
    (...size) => {
      const [sleeve, drawer] = v3('sleeve-drawer', size).map((g) =>
        foldedSize(g)!,
      );
      expect(Math.abs(drawer.x - 3 * T - size[0])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(drawer.z - T - size[1])).toBeLessThanOrEqual(FIT);
      expect(Math.abs(drawer.y - T / 2 - size[2])).toBeLessThanOrEqual(FIT);
      // Sleeve open along x: as long as the drawer, a little larger on W and H.
      expect(Math.abs(sleeve.x - (drawer.x + T))).toBeLessThanOrEqual(FIT);
      const gapW = sleeve.z - T - (drawer.z + T);
      const gapH = sleeve.y - T - (drawer.y + T / 2);
      for (const gap of [gapW, gapH]) {
        expect(gap).toBeGreaterThanOrEqual(0.5);
        expect(gap).toBeLessThanOrEqual(1.5);
      }
    },
  );

  it.each(
    STRUCTURES.filter((s) => s !== 'pillow').flatMap((structure) =>
      SIZES.map((size) => [structure, size] as const),
    ),
  )(
    '%s %p: every folded panel corner meets a corner of another panel (no gap)',
    (structure, size) => {
      for (const geometry of v3(structure, size)) {
        const corners = foldedCorners(geometry);
        const ids = Object.keys(corners);
        for (const id of ids) {
          for (const corner of corners[id]) {
            const shared = ids.filter(
              (other) =>
                other !== id &&
                corners[other].some(
                  (p) =>
                    Math.hypot(
                      p[0] - corner[0],
                      p[1] - corner[1],
                      p[2] - corner[2],
                    ) < 0.01,
                ),
            );
            expect([id, shared.length > 0]).toEqual([id, true]);
          }
        }
      }
    },
  );

  const UPRIGHT = new Set([
    'panel_back',
    'panel_left',
    'panel_front',
    'panel_right',
    'base_front',
    'drawer_front',
    'lid_front',
    'sleeve_right',
  ]);
  /** Top faces whose texts read upright from the front of the box. */
  const READS_FROM_FRONT = new Set(['lid_top', 'sleeve_top']);
  it.each(STRUCTURES.filter((s) => s !== 'pillow'))(
    '%s: printed sides face out, side panels stand upright and read left to right (3D model)',
    (structure) => {
      for (const geometry of v3(structure, [120, 80, 60])) {
        const frame = boxFrameOf(geometry)!;
        const transforms = panelTransforms(geometry, 1);
        const at = (id: string, p: [number, number, number]) =>
          transformPoint(multiply(frame, transforms[id]), p);
        const centre = [0, 0, 0];
        const all = geometry.panels.map((panel) => {
          const { x, y, width, height } = panel.bounds;
          return at(panel.id, [x + width / 2, y + height / 2, 0]);
        });
        for (let i = 0; i < 3; i++)
          centre[i] = all.reduce((sum, p) => sum + p[i], 0) / all.length;
        for (const panel of geometry.panels) {
          const { x, y, width, height } = panel.bounds;
          const c = at(panel.id, [x + width / 2, y + height / 2, 0]);
          const dir = (p: [number, number, number]) => {
            const q = at(panel.id, p);
            return [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
          };
          // Printed side: −z on the sheet (fold.ts).
          const normal = dir([x + width / 2, y + height / 2, -1]);
          const outward = c.map((v, i) => v - centre[i]);
          const dot = (a: number[], b: number[]) =>
            a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
          expect([panel.id, dot(normal, outward) > 0]).toEqual([
            panel.id,
            true,
          ]);
          if (Math.abs(normal[1]) > 0.5) {
            // Top and bottom faces: the top of their texts points to the back (−z in box space).
            if (READS_FROM_FRONT.has(panel.id)) {
              const up = dir([x + width / 2, y + height / 2 - 1, 0]);
              expect([panel.id, up[2] < -0.5]).toEqual([panel.id, true]);
            }
            continue;
          }
          const up = dir([x + width / 2, y + height / 2 - 1, 0]); // sheet −y
          const right = dir([x + width / 2 + 1, y + height / 2, 0]); // sheet +x
          // Seen from outside (looking along −normal) with this up, "right" is up × normal.
          const expectedRight = [
            up[1] * normal[2] - up[2] * normal[1],
            up[2] * normal[0] - up[0] * normal[2],
            up[0] * normal[1] - up[1] * normal[0],
          ];
          expect([panel.id, dot(right, expectedRight) > 0]).toEqual([
            panel.id,
            true,
          ]);
          // Walls whose top edge is the hinge side on the sheet stand upright; the others (tray back walls, the
          // last panel of the sleeve) are upside down in 3D, like the folded print.
          if (UPRIGHT.has(panel.id))
            expect([panel.id, up[1] > 0.5]).toEqual([panel.id, true]);
        }
      }
    },
  );

  it('pillow faces are as wide as one arc of the section', () => {
    // Flat pillow: the arc is the chord.
    expect(pillowShapeOf(box([100, 80, 0], 0)).faceWidth).toBeCloseTo(80, 6);
    // Round pillow (H = W): half a circle of diameter W + t.
    expect(pillowShapeOf(box([100, 80, 80])).faceWidth).toBeCloseTo(
      (Math.PI * (80 + T)) / 2,
      6,
    );
    const [geometry] = v3('pillow', [120, 80, 30]);
    const shape = pillowShapeOf(box([120, 80, 30]));
    for (const panel of geometry.panels) {
      expect(panel.bounds.width).toBeCloseTo(shape.faceWidth, 6);
      expect(panel.bounds.height).toBe(120);
    }
    expect(geometry.totalBoundingBox.height).toBeCloseTo(
      120 + 4 * shape.endDepth,
      6,
    );
  });

  it('pillow faces stay clear of the curved creases', () => {
    const [geometry] = v3('pillow', [120, 80, 30]);
    const creases = geometry.segments.filter(
      (s) => s.type === 'crease' && s.pathString,
    );
    for (const panel of geometry.panels) {
      const { x, y, width, height } = panel.bounds;
      for (const point of creases.flatMap((s) => segmentPoints(s, 0.01))) {
        const inside =
          point.x > x + 1e-3 &&
          point.x < x + width - 1e-3 &&
          point.y > y + 1e-3 &&
          point.y < y + height - 1e-3;
        expect([panel.id, inside]).toEqual([panel.id, false]);
      }
    }
  });

  it('keeps the panel ids of version 2, so canvas elements stay on their panels', () => {
    for (const structure of STRUCTURES) {
      const ids = (version: number) =>
        generateDielinePieces(structure, box([120, 80, 60]), version)
          .flatMap((p) => p.geometry.panels.map((panel) => panel.id))
          .sort();
      expect(ids(3)).toEqual(ids(2));
    }
  });
});

describe('frozen formula versions', () => {
  it('keep their sheets unchanged for the projects pinned to them', () => {
    const sheets = (structure: string, version: number) =>
      generateDielinePieces(structure, box([120, 80, 60], 0.4), version).map(
        (p) => p.geometry.totalBoundingBox,
      );
    expect(sheets('tuck-top', 1)).toEqual([{ width: 415, height: 238 }]);
    expect(sheets('tuck-top', 2)).toEqual([{ width: 415, height: 256 }]);
    for (const version of [1, 2]) {
      expect(sheets('pillow', version)).toEqual([
        { width: 218.4, height: 148.8 },
      ]);
      expect(sheets('lid-base', version)).toEqual([
        { width: 240, height: 200 },
        { width: 194, height: 154 },
      ]);
      const [sleeve, drawer] = sheets('sleeve-drawer', version);
      expect(sleeve.width).toBeCloseTo(382.2, 6);
      expect(sleeve.height).toBeCloseTo(81.8, 6);
      expect(drawer).toEqual({ width: 240, height: 200 });
    }
  });

  it('tuck-top version 1 has no cut lines and its lid overlaps the back panel', () => {
    const [{ geometry }] = generateDielinePieces(
      'tuck-top',
      box([120, 80, 60], 0.4),
      1,
    );
    expect(
      geometry.panels.find((p) => p.id === 'panel_top_lid')!.bounds,
    ).toEqual({ x: 15, y: 0, width: 120, height: 80 });
    expect(geometry.segments.some((s) => s.type === 'cut')).toBe(false);
  });

  it('tuck-top version 2 keeps the panel sizes of version 1, so FitCheck scores do not change', () => {
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
