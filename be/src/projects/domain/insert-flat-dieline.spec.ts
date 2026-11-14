import {
  bellyBandSizesOf,
  boxFrameOf,
  type BoxDimensions,
  type CanvasElement,
  checkBox,
  type DielineGeometry,
  foldedSize,
  generateDielinePieces,
  insertLayoutOf,
  multiply,
  panelTransforms,
  quote,
  segmentPoints,
  transformPoint,
} from '@wrapfit/shared';

const T = 0.42;
const EPSILON = 1e-6;
const FIT = 0.5;

const dims = (length: number, width: number, height: number, extra: Partial<BoxDimensions> = {}): BoxDimensions => ({
  length,
  width,
  height,
  paperThickness: T,
  ...extra,
});

type Bounds = DielineGeometry['panels'][number]['bounds'];
const overlaps = (a: Bounds, b: Bounds) =>
  a.x < b.x + b.width - EPSILON && b.x < a.x + a.width - EPSILON && a.y < b.y + b.height - EPSILON && b.y < a.y + a.height - EPSILON;

/** Panels never overlap and every line stays on the sheet. */
const expectClean = (geometry: DielineGeometry) => {
  const { panels, segments, totalBoundingBox: sheet } = geometry;
  for (const [i, a] of panels.entries()) {
    for (const b of panels.slice(i + 1)) expect([a.id, b.id, overlaps(a.bounds, b.bounds)]).toEqual([a.id, b.id, false]);
  }
  for (const p of segments.flatMap((s) => segmentPoints(s))) {
    expect(p.x).toBeGreaterThanOrEqual(-1e-3);
    expect(p.y).toBeGreaterThanOrEqual(-1e-3);
    expect(p.x).toBeLessThanOrEqual(sheet.width + 1e-3);
    expect(p.y).toBeLessThanOrEqual(sheet.height + 1e-3);
  }
};

/** Consecutive segments of a path id share their ends, and the path ends where it starts. */
const expectClosed = (geometry: DielineGeometry, prefix: string) => {
  const path = geometry.segments.filter((s) => s.id.startsWith(prefix));
  expect(path.length).toBeGreaterThan(2);
  for (const [i, segment] of path.entries()) {
    const next = path[(i + 1) % path.length];
    expect(Math.hypot(segment.end.x - next.start.x, segment.end.y - next.start.y)).toBeLessThan(EPSILON);
  }
};

/** Box-space outward normal of the printed side of a panel, closed. */
const normalOf = (geometry: DielineGeometry, id: string) => {
  const m = multiply(boxFrameOf(geometry)!, panelTransforms(geometry, 1)[id]);
  const { x, y, width, height } = geometry.panels.find((p) => p.id === id)!.bounds;
  const c = transformPoint(m, [x + width / 2, y + height / 2, 0]);
  const q = transformPoint(m, [x + width / 2, y + height / 2, -1]);
  return [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
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
    content: 'Cảm ơn',
    style: { fontFamily: 'Be Vietnam Pro', fontSize: 18, color: '#1C1917' },
  }) as CanvasElement;

describe('divider insert (docs/23 S18)', () => {
  it.each([
    [180, 120, 50, 2, 3],
    [120, 80, 40, 2, 2],
    [260, 180, 40, 3, 4],
    [200, 60, 30, 1, 4],
    [90, 200, 60, 4, 1],
  ])('%s × %s × %s, %s × %s cells: a tray whose inside is L × W and interlocking partitions', (L, W, H, rows, cols) => {
    const pieces = generateDielinePieces('insert', dims(L, W, H, { cells: { rows, cols } }), 3);
    expect(pieces.map((p) => p.name)).toEqual(['Khay lót', 'Vách chia ngăn']);
    const [tray, dividers] = pieces.map((p) => p.geometry);
    expectClean(tray);
    expectClean(dividers);
    const folded = foldedSize(tray)!;
    expect(Math.abs(folded.x - 3 * T - L)).toBeLessThanOrEqual(FIT);
    expect(Math.abs(folded.z - T - W)).toBeLessThanOrEqual(FIT);

    const g = insertLayoutOf(dims(L, W, H, { cells: { rows, cols } }));
    const long = dividers.panels.filter((p) => p.id.startsWith('divider_long_'));
    const cross = dividers.panels.filter((p) => p.id.startsWith('divider_cross_'));
    expect(long).toHaveLength(rows - 1);
    expect(cross).toHaveLength(cols - 1);
    // Cells are equal and the partitions fill the inside exactly.
    expect(cols * g.cellL + (cols - 1) * T).toBeCloseTo(L, 6);
    expect(rows * g.cellW + (rows - 1) * T).toBeCloseTo(W, 6);
    for (const panel of long) {
      expect(panel.bounds.width).toBeCloseTo(L - 0.5, 6);
      expectClosed(dividers, `cut_${panel.id}_`);
      // Slots from the top at the column lines, half the height deep.
      const slotFloors = dividers.segments
        .filter((s) => s.id.startsWith(`cut_${panel.id}_`) && Math.abs(s.start.y - s.end.y) < EPSILON && Math.abs(s.start.y - (panel.bounds.y + g.stripHeight / 2)) < EPSILON)
        .map((s) => (s.start.x + s.end.x) / 2 - panel.bounds.x + 0.25);
      expect(slotFloors.map((x) => Number(x.toFixed(6)))).toEqual(g.colLines.map((x) => Number(x.toFixed(6))));
    }
    for (const panel of cross) {
      expect(panel.bounds.width).toBeCloseTo(W - 0.5, 6);
      expectClosed(dividers, `cut_${panel.id}_`);
      const slotTops = dividers.segments.filter(
        (s) => s.id.startsWith(`cut_${panel.id}_`) && Math.abs(s.start.y - s.end.y) < EPSILON && Math.abs(s.start.y - (panel.bounds.y + g.stripHeight / 2)) < EPSILON,
      );
      expect(slotTops).toHaveLength(rows - 1);
    }
  });

  it('has no partitions with a single cell, clamps the grid and is quoted per set', () => {
    expect(generateDielinePieces('insert', dims(100, 80, 40, { cells: { rows: 1, cols: 1 } }), 3)).toHaveLength(1);
    const big = insertLayoutOf(dims(200, 150, 40, { cells: { rows: 9, cols: 0 } }));
    expect([big.rows, big.cols]).toEqual([4, 1]);
    expect([insertLayoutOf(dims(200, 150, 40)).rows, insertLayoutOf(dims(200, 150, 40)).cols]).toEqual([2, 3]);
    const pieces = generateDielinePieces('insert', dims(180, 120, 50), 3);
    const price = quote({ structure: 'insert', pieces, quantity: 100, paper: 'duplex' });
    const glue = price.lines.find((line) => line.id === 'glue')!;
    expect(glue.label).toBe('Dán khay và cài vách chia ngăn');
    expect(glue.detail).toContain('100 bộ');
  });
});

describe('flat products (docs/23 S18)', () => {
  it.each([
    [40, 65],
    [55, 90],
    [70, 120],
  ])('hang tag %s × %s: one face with clipped corners and a string hole, priced per tag', (L, H) => {
    const pieces = generateDielinePieces('hang-tag', dims(L, 1, H), 3);
    const tag = pieces[0].geometry;
    expectClean(tag);
    expectClosed(tag, 'cut_outline_');
    expectClosed(tag, 'cut_hole_');
    expect(tag.totalBoundingBox).toEqual({ width: L, height: H });
    const [hole] = tag.openings!;
    expect(hole).toMatchObject({ kind: 'hole', panelId: 'tag_front', width: 5, height: 5, radius: 2.5 });
    expect(hole.x + hole.width / 2).toBeCloseTo(L / 2, 6);
    // The printed side faces the viewer and the tag stands upright.
    expect(normalOf(tag, 'tag_front')[2]).toBeGreaterThan(0.99);
    const size = foldedSize(tag)!;
    expect(size.x).toBeCloseTo(L, 6);
    expect(size.y).toBeCloseTo(H, 6);

    const price = quote({ structure: 'hang-tag', pieces, quantity: 200, paper: 'ivory' });
    expect(price.lines.find((line) => line.id === 'glue')).toMatchObject({ label: 'Đục lỗ và xỏ dây' });
    expect(price.lines.find((line) => line.id === 'print')!.detail).toContain('200 thẻ');

    const onHole = text('tag_front', L / 2 - 10, 6, 20, 8);
    const below = text('tag_front', 6, H / 2, L - 12, 10);
    const report = checkBox(pieces, [onHole, below]);
    expect(report.violations.find((v) => v.elementId === onHole.id)).toMatchObject({ code: 'UNDER_OPENING', title: 'Hình nằm trên lỗ xỏ dây' });
    expect(report.violations.filter((v) => v.elementId === below.id)).toEqual([]);
  });

  it('folded card: two covers on one spine, closed it is L × H with the front cover facing out', () => {
    const pieces = generateDielinePieces('folded-card', dims(105, 1, 148), 3);
    const card = pieces[0].geometry;
    expectClean(card);
    expectClosed(card, 'cut_outline_');
    expect(card.totalBoundingBox).toEqual({ width: 210, height: 148 });
    expect(card.segments.filter((s) => s.type === 'crease')).toHaveLength(1);
    const size = foldedSize(card)!;
    expect(size.x).toBeCloseTo(105, 6);
    expect(size.y).toBeCloseTo(148, 6);
    expect(size.z).toBeLessThan(5);
    expect(normalOf(card, 'card_front')[2]).toBeGreaterThan(0.99);
    expect(normalOf(card, 'card_back')[2]).toBeLessThan(-0.99);
    expect(quote({ structure: 'folded-card', pieces, quantity: 100, paper: 'ivory' }).lines.find((l) => l.id === 'glue')?.label).toBe('Cấn nếp và gấp thiệp');
  });

  it.each([
    [90, 60, 30],
    [200, 200, 60],
    [300, 220, 100],
  ])('belly band around a %s × %s × %s box: a ring that slides on, glued underneath', (L, W, H) => {
    const pieces = generateDielinePieces('belly-band', dims(L, W, H), 3);
    const band = pieces[0].geometry;
    expectClean(band);
    expectClosed(band, 'cut_outline_');
    const s = bellyBandSizesOf(dims(L, W, H));
    const size = foldedSize(band)!;
    // Mid-plane of the band: the box plus one paper thickness and 0.5 mm of play.
    expect(size.x).toBeCloseTo(L + T + 0.5, 6);
    expect(size.y).toBeCloseTo(H + T + 0.5, 6);
    expect(size.z).toBeCloseTo(s.breadth, 6);
    expect(s.breadth).toBeLessThanOrEqual(W);
    expect(normalOf(band, 'band_top')[1]).toBeGreaterThan(0.99);
    expect(normalOf(band, 'band_bottom')[1]).toBeLessThan(-0.99);
    expect(normalOf(band, 'band_left')[0]).toBeLessThan(-0.99);
    expect(normalOf(band, 'band_right')[0]).toBeGreaterThan(0.99);
    expect(band.glueAreas).toHaveLength(1);
    expect(quote({ structure: 'belly-band', pieces, quantity: 100, paper: 'kraft' }).lines.find((l) => l.id === 'glue')?.label).toBe('Dán đai');
  });

  it('a sticker label is not folded or glued', () => {
    const pieces = generateDielinePieces('sticker-label', dims(100, 60, 2), 3);
    expect(quote({ structure: 'sticker-label', pieces, quantity: 100, paper: 'ivory' }).lines.some((l) => l.id === 'glue')).toBe(false);
  });
});
