import {
  boxFrameOf,
  type BoxDimensions,
  type CanvasElement,
  checkBox,
  dimensionRuleErrors,
  type DielineGeometry,
  foldedSize,
  gableSizesOf,
  generateDielinePieces,
  multiply,
  panelTransforms,
  quote,
  segmentPoints,
  transformPoint,
} from '@wrapfit/shared';

/** L × W × H (mm): the S / M / L sizes of the studio, a narrow one and a tall one. */
const SIZES: [number, number, number][] = [
  [120, 70, 80],
  [180, 100, 90],
  [260, 140, 160],
  [60, 30, 50],
  [80, 80, 200],
];
const T = 0.42;
const EPSILON = 1e-6;
const FIT = 0.5;

const box = ([length, width, height]: [number, number, number], extra: Partial<BoxDimensions> = {}): BoxDimensions => ({
  length,
  width,
  height,
  paperThickness: T,
  ...extra,
});
const gable = (size: [number, number, number]): DielineGeometry => generateDielinePieces('gable', box(size), 3)[0].geometry;

type Bounds = DielineGeometry['panels'][number]['bounds'];
const overlaps = (a: Bounds, b: Bounds) =>
  a.x < b.x + b.width - EPSILON &&
  b.x < a.x + a.width - EPSILON &&
  a.y < b.y + b.height - EPSILON &&
  b.y < a.y + a.height - EPSILON;

/** Box-space position of a sheet point of a panel, closed. */
const closed = (geometry: DielineGeometry) => {
  const frame = boxFrameOf(geometry)!;
  const transforms = panelTransforms(geometry, 1);
  return (id: string, p: { x: number; y: number }, z = 0) => transformPoint(multiply(frame, transforms[id]), [p.x, p.y, z]);
};

const text = (panelId: string, x: number, y: number, width: number, height: number): CanvasElement =>
  ({
    id: `t_${panelId}_${x}_${y}`,
    type: 'text',
    panelId,
    x,
    y,
    width,
    height,
    rotation: 0,
    content: 'Hộp quà',
    style: { fontFamily: 'Be Vietnam Pro', fontSize: 24, color: '#1C1917' },
  }) as CanvasElement;

describe('gable box (docs/23 S17)', () => {
  it.each(SIZES)('%s × %s × %s: panels never overlap, lines stay on the sheet, the outline is closed', (...size) => {
    const pieces = generateDielinePieces('gable', box(size), 3);
    expect(pieces).toHaveLength(1);
    const { panels, segments, totalBoundingBox: sheet } = pieces[0].geometry;
    for (const [i, a] of panels.entries()) {
      for (const b of panels.slice(i + 1)) expect([a.id, b.id, overlaps(a.bounds, b.bounds)]).toEqual([a.id, b.id, false]);
    }
    for (const point of segments.flatMap((s) => segmentPoints(s))) {
      expect(point.x).toBeGreaterThanOrEqual(-1e-3);
      expect(point.y).toBeGreaterThanOrEqual(-1e-3);
      expect(point.x).toBeLessThanOrEqual(sheet.width + 1e-3);
      expect(point.y).toBeLessThanOrEqual(sheet.height + 1e-3);
    }
    const outline = segments.filter((s) => s.id.startsWith('cut_outline_'));
    for (const [i, segment] of outline.entries()) {
      const next = outline[(i + 1) % outline.length];
      expect(Math.hypot(segment.end.x - next.start.x, segment.end.y - next.start.y)).toBeLessThan(EPSILON);
    }
  });

  it.each(SIZES)('%s × %s × %s: the body is L × W inside, the handles stand on top', (...size) => {
    const geometry = gable(size);
    const folded = foldedSize(geometry)!;
    const s = gableSizesOf(box(size));
    expect(Math.abs(folded.x - T - size[0])).toBeLessThanOrEqual(FIT);
    expect(Math.abs(folded.z - T - size[1])).toBeLessThanOrEqual(FIT);
    expect(folded.y).toBeCloseTo(s.H + s.rise + s.handle, 3);
  });

  it.each(SIZES)('%s × %s × %s: handles back to back with the hand holes in register, gables under the ridge', (...size) => {
    const geometry = gable(size);
    const at = closed(geometry);
    const s = gableSizesOf(box(size));
    const [back, front] = geometry.openings!;
    expect(geometry.openings!.map((o) => o.kind)).toEqual(['handle', 'handle']);
    const centre = (o: typeof back) => at(o.panelId, { x: o.x + o.width / 2, y: o.y + o.height / 2 });
    const a = centre(back);
    const b = centre(front);
    // Same place along L and in height, one paper thickness apart (the two handle mid-planes).
    expect(Math.abs(a[0] - b[0])).toBeLessThan(1e-6);
    expect(Math.abs(a[1] - b[1])).toBeLessThan(1e-6);
    expect(Math.abs(Math.abs(a[2] - b[2]) - T)).toBeLessThan(1e-6);
    // The apex of each gable sits on the ridge, between the roofs.
    for (const id of ['gable_left', 'gable_right']) {
      const panel = geometry.panels.find((p) => p.id === id)!;
      const apex = at(id, panel.outline![2]);
      expect(apex[1]).toBeCloseTo(s.H + s.rise, 3);
      expect(Math.abs(apex[2])).toBeLessThan(1e-6);
    }
    // Every handle panel stands upright.
    for (const id of ['gable_handle_back', 'gable_handle_front']) {
      const { x, y, width, height } = geometry.panels.find((p) => p.id === id)!.bounds;
      const top = at(id, { x, y });
      const bottom = at(id, { x, y: y + height });
      expect(Math.abs(top[2] - bottom[2])).toBeLessThan(1e-6);
      expect(width).toBeCloseTo(s.L, 6);
    }
  });

  it('keeps the support tabs inside their own column of the sheet, and drops them on a narrow box', () => {
    const geometry = gable([180, 100, 90]);
    const creases = geometry.segments.filter((s) => /^crease_(left|right)_tab_/.test(s.id));
    expect(creases).toHaveLength(4);
    const tabsCut = geometry.segments.filter((s) => s.id.startsWith('cut_outline_'));
    const bodyTop = geometry.panels.find((p) => p.id === 'gable_back')!.bounds.y;
    for (const id of ['gable_left', 'gable_right']) {
      const { x, width } = geometry.panels.find((p) => p.id === id)!.bounds;
      const points = tabsCut.flatMap((s) => [s.start, s.end]).filter((p) => p.y < bodyTop + 1e-6 &&p.x > x + EPSILON && p.x < x + width - EPSILON);
      expect(points.length).toBeGreaterThanOrEqual(9); // two tabs (4 points each) and the apex
      for (const p of points) {
        expect(p.x).toBeGreaterThan(x + 0.5);
        expect(p.x).toBeLessThan(x + width - 0.5);
      }
    }
    const narrow = generateDielinePieces('gable', box([60, 8, 50]), 3)[0].geometry;
    expect(narrow.segments.some((s) => s.id.includes('_tab_'))).toBe(false);
  });

  it('is quoted with gluing, needs room for the hand hole, and keeps artwork inside the gable', () => {
    const pieces = generateDielinePieces('gable', box([180, 100, 90]), 3);
    const price = quote({ structure: 'gable', pieces, quantity: 100, paper: 'ivory' });
    expect(price.lines.find((line) => line.id === 'glue')?.label).toBe('Gấp và dán');
    expect(price.lines.some((line) => line.id === 'window')).toBe(false);
    expect(dimensionRuleErrors('gable', { length: 50, width: 60, height: 60 })).toHaveLength(1);
    expect(dimensionRuleErrors('gable', { length: 60, width: 60, height: 60 })).toEqual([]);

    const left = pieces[0].geometry.panels.find((p) => p.id === 'gable_left')!;
    const inBody = text('gable_left', 10, left.bounds.height - 40, left.bounds.width - 20, 14);
    const inCorner = text('gable_left', 4, 4, 30, 10);
    const onHole = text('gable_handle_front', 60, 12, 60, 12);
    const report = checkBox(pieces, [inBody, inCorner, onHole]);
    const codes = (id: string) => report.violations.filter((v) => v.elementId === id).map((v) => v.code);
    expect(codes(inBody.id)).toEqual([]);
    expect(codes(inCorner.id)).toContain('CUT_OVERLAP');
    expect(codes(onHole.id)).toContain('UNDER_OPENING');
  });
});

describe('display windows (docs/23 S17)', () => {
  it('cuts a window in the front of a tuck-top box, and nothing moves without one', () => {
    const plain = generateDielinePieces('tuck-top', box([100, 60, 150]), 3)[0].geometry;
    const windowed = generateDielinePieces('tuck-top', box([100, 60, 150], { window: true }), 3)[0].geometry;
    expect(plain.openings).toBeUndefined();
    expect(windowed.segments.slice(0, plain.segments.length)).toEqual(plain.segments);
    const [window] = windowed.openings!;
    expect(window).toMatchObject({ kind: 'window', panelId: 'panel_front' });
    const front = windowed.panels.find((p) => p.id === 'panel_front')!.bounds;
    expect(window.x).toBeGreaterThanOrEqual(front.x + 10);
    expect(window.y).toBeGreaterThanOrEqual(front.y + 10);
    expect(window.x + window.width).toBeLessThanOrEqual(front.x + front.width - 10);
    expect(window.y + window.height).toBeLessThanOrEqual(front.y + front.height - 10);
    const cuts = windowed.segments.filter((s) => s.id.startsWith('cut_window_'));
    expect(cuts.length).toBeGreaterThanOrEqual(8);
    // Closed loop.
    for (const [i, segment] of cuts.entries()) {
      const next = cuts[(i + 1) % cuts.length];
      expect(Math.hypot(segment.end.x - next.start.x, segment.end.y - next.start.y)).toBeLessThan(EPSILON);
    }
  });

  it('cuts a window in the top of a lid & base lid, and skips a panel too small for one', () => {
    const [base, lid] = generateDielinePieces('lid-base', box([200, 200, 60], { window: true }), 3);
    expect(base.geometry.openings).toBeUndefined();
    expect(lid.geometry.openings).toEqual([expect.objectContaining({ kind: 'window', panelId: 'lid_top' })]);
    const tiny = generateDielinePieces('tuck-top', box([30, 20, 40], { window: true }), 3)[0].geometry;
    expect(tiny.openings).toBeUndefined();
  });

  it('prices the PET film and warns about artwork under the window', () => {
    const pieces = generateDielinePieces('tuck-top', box([100, 60, 150], { window: true }), 3);
    const price = quote({ structure: 'tuck-top', pieces, quantity: 100, paper: 'ivory' });
    const film = price.lines.find((line) => line.id === 'window');
    expect(film?.label).toBe('Màng PET cửa sổ');
    expect(film?.vnd).toBe(100 * 900);
    const plainTotal = quote({ structure: 'tuck-top', pieces: generateDielinePieces('tuck-top', box([100, 60, 150]), 3), quantity: 100, paper: 'ivory' }).total;
    expect(price.total).toBeGreaterThan(plainTotal);

    const front = pieces[0].geometry.panels.find((p) => p.id === 'panel_front')!.bounds;
    const centre = text('panel_front', front.width / 2 - 20, front.height / 2 - 5, 40, 10);
    const report = checkBox(pieces, [centre]);
    expect(report.violations.find((v) => v.elementId === centre.id)).toMatchObject({ code: 'UNDER_OPENING', severity: 'warning' });
    // Seen from the inside, the window is mirrored with the sheet.
    const inside = { ...centre, id: 'inside', side: 'inside' } as CanvasElement;
    expect(checkBox(pieces, [inside]).violations.some((v) => v.elementId === 'inside' && v.code === 'UNDER_OPENING')).toBe(true);
  });
});
