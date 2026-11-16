import {
  boxFrameOf,
  type BoxDimensions,
  checkBox,
  cupCarrierSizeForCups,
  cupCarrierSizesOf,
  dimensionRuleErrors,
  type DielineGeometry,
  foldedSize,
  generatedTemplates,
  generateDielinePieces,
  multiply,
  panelTransforms,
  quote,
  segmentPoints,
  transformPoint,
  unitOf,
} from '@wrapfit/shared';

const T = 0.42;
const EPSILON = 1e-6;

const carrier = (length: number, width: number, height: number, cells?: BoxDimensions['cells']): DielineGeometry =>
  generateDielinePieces('cup-carrier', { length, width, height, paperThickness: T, ...(cells && { cells }) }, 3)[0].geometry;

/** Box-space position of a sheet point of a panel, closed. */
const closed = (geometry: DielineGeometry) => {
  const frame = boxFrameOf(geometry)!;
  const transforms = panelTransforms(geometry, 1);
  return (id: string, p: { x: number; y: number }) => transformPoint(multiply(frame, transforms[id]), [p.x, p.y, 0]);
};

describe('Cup carrier dieline (khay xách ly)', () => {
  it('is one strip L wide whose panels tile it without overlapping', () => {
    const g = carrier(190, 95, 60);
    expect(g.totalBoundingBox.width).toBe(190);
    const panels = [...g.panels].sort((a, b) => a.bounds.y - b.bounds.y);
    expect(panels[0].bounds.y).toBe(0);
    panels.forEach((panel, i) => {
      expect(panel.bounds.x).toBe(0);
      expect(panel.bounds.width).toBe(190);
      if (i) expect(panel.bounds.y).toBeCloseTo(panels[i - 1].bounds.y + panels[i - 1].bounds.height, 6);
    });
    const last = panels[panels.length - 1];
    expect(last.bounds.y + last.bounds.height).toBeCloseTo(g.totalBoundingBox.height, 6);
  });

  it('folds into a carrier as deep as the inside plus one thickness, the handles back to back on top', () => {
    const g = carrier(190, 95, 60);
    const size = foldedSize(g)!;
    expect(size.x).toBeCloseTo(190, 6);
    expect(size.z).toBeCloseTo(95 + T, 6);
    const s = cupCarrierSizesOf(g.dimensions);
    expect(size.y).toBeCloseTo(s.H + s.rise + s.handle, 6);

    // The two handles are parallel planes one paper thickness apart, and their hand holes line up.
    const at = closed(g);
    const front = g.openings!.find((o) => o.panelId === 'carrier_handle_front')!;
    const back = g.openings!.find((o) => o.panelId === 'carrier_handle_back')!;
    const f = at('carrier_handle_front', { x: front.x, y: front.y });
    const b = at('carrier_handle_back', { x: back.x, y: back.y + back.height });
    expect(Math.abs(f[2] - b[2])).toBeCloseTo(T, 6);
    expect(f[0]).toBeCloseTo(b[0], 6);
    expect(f[1]).toBeCloseTo(b[1], 6);
  });

  it('cuts one hole per cup inside the base, clear of the creases', () => {
    for (const cells of [{ rows: 1, cols: 1 }, { rows: 1, cols: 2 }, { rows: 2, cols: 2 }, { rows: 1, cols: 4 }]) {
      const g = carrier(95 * cells.cols, 95 * cells.rows, 60, cells);
      const base = g.panels.find((p) => p.id === 'carrier_base')!.bounds;
      const cups = g.openings!.filter((o) => o.kind === 'cup');
      expect(cups).toHaveLength(cells.rows * cells.cols);
      for (const cup of cups) {
        expect(cup.panelId).toBe('carrier_base');
        expect(cup.width).toBeGreaterThanOrEqual(80);
        expect(cup.x).toBeGreaterThanOrEqual(base.x + 5 - EPSILON);
        expect(cup.y).toBeGreaterThanOrEqual(base.y + 5 - EPSILON);
        expect(cup.x + cup.width).toBeLessThanOrEqual(base.x + base.width - 5 + EPSILON);
        expect(cup.y + cup.height).toBeLessThanOrEqual(base.y + base.height - 5 + EPSILON);
      }
      // A round hole is four curved corners (its straight sides have no length).
      expect(g.segments.filter((s) => s.id.startsWith('cut_cup_') && s.type === 'cut')).toHaveLength(4 * cups.length);
      expect(g.segments.some((s) => s.id === `cut_cup_${cups.length - 1}_corner_tl`)).toBe(true);
    }
  });

  it('cuts the cup holes as true circles (the die must match the round cups)', () => {
    const g = carrier(190, 95, 60);
    for (const [i, cup] of g.openings!.filter((o) => o.kind === 'cup').entries()) {
      const cx = cup.x + cup.width / 2;
      const cy = cup.y + cup.height / 2;
      const points = g.segments.filter((s) => s.id.startsWith(`cut_cup_${i}_`)).flatMap((s) => segmentPoints(s, 0.01));
      expect(points.length).toBeGreaterThan(20);
      for (const p of points) expect(Math.abs(Math.hypot(p.x - cx, p.y - cy) - cup.width / 2)).toBeLessThan(0.05);
    }
  });

  it('leaves the base whole when the cups would not fit', () => {
    const g = carrier(80, 34, 40, { rows: 1, cols: 2 });
    expect(g.openings!.filter((o) => o.kind === 'cup')).toHaveLength(0);
  });

  it('warns about artwork over a cup hole, and needs room for the hand hole', () => {
    const g = carrier(190, 95, 60);
    const cup = g.openings!.find((o) => o.kind === 'cup')!;
    const base = g.panels.find((p) => p.id === 'carrier_base')!.bounds;
    const report = checkBox(
      [{ name: 'Khay', geometry: g }],
      [
        {
          id: 'logo',
          type: 'text',
          panelId: 'carrier_base',
          x: cup.x - base.x + 10,
          y: cup.y - base.y + 10,
          width: 30,
          height: 8,
          rotation: 0,
          content: 'Logo',
          style: { fontFamily: 'Inter', fontSize: 12, color: '#000000' },
        },
      ],
    );
    const under = report.violations.find((v) => v.code === 'UNDER_OPENING');
    expect(under?.message).toContain('lỗ đặt ly');
    expect(dimensionRuleErrors('cup-carrier', { length: 60, width: 95, height: 60 })[0]?.field).toBe('length');
    expect(dimensionRuleErrors('cup-carrier', { length: 190, width: 95, height: 60 })).toEqual([]);
  });

  it('resizes with the number of cups so every cup keeps its room', () => {
    const base = { length: 190, width: 95, height: 60, paperThickness: T, cells: { rows: 1, cols: 2 } };
    const hole = cupCarrierSizesOf(base).cupDiameter;
    const four = cupCarrierSizeForCups(base, { rows: 1, cols: 4 });
    expect([four.length, four.width, four.height]).toEqual([380, 95, 60]);
    expect(cupCarrierSizesOf(four).cupDiameter).toBeCloseTo(hole);
    const eight = cupCarrierSizeForCups(four, { rows: 2, cols: 4 });
    expect([eight.length, eight.width]).toEqual([380, 190]);
    expect(cupCarrierSizeForCups(eight, { rows: 1, cols: 2 })).toMatchObject({ length: 190, width: 95 });
    // A carrier too small to cut any hole restarts from the standard cup.
    const small = { length: 120, width: 80, height: 60, paperThickness: T, cells: { rows: 1, cols: 4 } };
    expect(cupCarrierSizesOf(small).cupDiameter).toBe(0);
    const fixed = cupCarrierSizeForCups(small, { rows: 1, cols: 3 });
    expect([fixed.length, fixed.width]).toEqual([285, 95]);
    expect(cupCarrierSizesOf(fixed).cupDiameter).toBeGreaterThan(0);
  });

  it('is quoted per carrier', () => {
    expect(unitOf('cup-carrier')).toBe('khay');
    const pieces = generateDielinePieces('cup-carrier', { length: 190, width: 95, height: 60, paperThickness: T }, 3);
    const price = quote({ structure: 'cup-carrier', pieces, quantity: 500, paper: 'ivory' });
    const gable = quote({ structure: 'gable', pieces, quantity: 500, paper: 'ivory' });
    // Same sheet, cheaper finishing (fold and glue the handles) than a gable box.
    expect(price.total).toBeLessThan(gable.total);
  });

  it('ships beverage templates on the carrier that pass FitCheck', () => {
    const beverage = generatedTemplates().filter((t) => t.industry === 'BEVERAGE');
    expect(beverage.filter((t) => t.structure === 'cup-carrier').length).toBeGreaterThanOrEqual(10);
    for (const t of beverage) {
      const pieces = generateDielinePieces(t.structure, t.dimensions);
      expect(checkBox(pieces, t.canvasState.elements).violations.filter((v) => v.severity !== 'info')).toEqual([]);
    }
  });
});
