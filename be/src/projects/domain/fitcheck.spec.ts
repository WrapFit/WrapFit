import {
  autoFixElements,
  type CanvasElement,
  checkBox,
  cutSidesOf,
  dimensionRuleErrors,
  generateDielinePieces,
  generateTuckTopDieline,
  usesLockBottom,
} from '@wrapfit/shared';
import { checkProject } from './project-fitcheck';

const dimensions = {
  length: 120,
  width: 80,
  height: 60,
  paperThickness: 0.42,
};
const tuckTop = generateDielinePieces('tuck-top', dimensions, 3);
const front = tuckTop[0].geometry.panels.find((p) => p.id === 'panel_front')!;

const element = (changes: Partial<CanvasElement>): CanvasElement => ({
  id: 'el',
  type: 'text',
  panelId: 'panel_front',
  x: 20,
  y: 20,
  width: 40,
  height: 10,
  rotation: 0,
  content: 'Lộc Xuân',
  ...changes,
});
const codes = (elements: CanvasElement[], pieces = tuckTop) =>
  checkBox(pieces, elements).violations.map((v) => [v.code, v.severity]);

describe('FitCheck (shared by the editor and the server)', () => {
  it('passes an element well inside its panel', () => {
    const report = checkBox(tuckTop, [element({})]);
    expect(report).toMatchObject({
      score: 100,
      isValidForProduction: true,
      violations: [],
    });
  });

  it('knows which panel sides are cut lines and which are folds', () => {
    expect([...cutSidesOf(front, tuckTop[0].geometry)].sort()).toEqual([
      'bottom',
      'top',
    ]);
  });

  it('names the nearest line: cut line at the top of the front panel, fold on its left', () => {
    expect(codes([element({ y: 2 })])).toEqual([['CUT_OVERLAP', 'warning']]);
    expect(codes([element({ x: 2 })])).toEqual([['CREASE_OVERLAP', 'warning']]);
    // Under 1 mm (or past the edge) it is an error and blocks the export.
    expect(codes([element({ x: -4 })])).toEqual([['CREASE_OVERLAP', 'error']]);
    expect(checkBox(tuckTop, [element({ x: 0.5 })]).isValidForProduction).toBe(
      false,
    );
  });

  it('checks a rotated element by its turned box', () => {
    // 100 × 10 mm centred on the 120 mm wide panel: fine flat, its turned box reaches the top cut line at 45°.
    const wide = element({ x: 10.21, y: 25, width: 100, height: 10 });
    expect(codes([wide])).toEqual([]);
    expect(codes([{ ...wide, rotation: 45 }])).toEqual([
      ['CUT_OVERLAP', 'error'],
    ]);
  });

  it('lets backgrounds reach the cut lines only with 2 mm of bleed', () => {
    const pattern = (x: number, y: number, width: number, height: number) =>
      element({
        type: 'pattern',
        content: 'https://x/p.png',
        x,
        y,
        width,
        height,
      });
    const { width: W, height: H } = front.bounds;
    // Covers the panel and bleeds 2 mm past the top and bottom cut lines: no margin rule for backgrounds.
    expect(codes([pattern(0, -2, W, H + 4)])).toEqual([]);
    // Stops 1 mm short of the top cut line: a white edge may show after die-cutting.
    expect(codes([pattern(0, 1, W, H - 2)])).toEqual([
      ['BLEED_INSUFFICIENT', 'warning'],
    ]);
    // Framed 3 mm inside: fine.
    expect(codes([pattern(3, 3, W - 6, H - 6)])).toEqual([]);
  });

  it('keeps ink off the glue flap', () => {
    // On the back panel, past its left fold onto the glue flap.
    const onGlue = element({ panelId: 'panel_back', x: -6 });
    expect(codes([onGlue])).toEqual([
      ['CREASE_OVERLAP', 'error'],
      ['GLUE_CONTAMINATED', 'error'],
    ]);
  });

  it('warns about elements on a panel the box does not have, and low resolution images', () => {
    expect(codes([element({ panelId: 'lid_top' })])).toEqual([
      ['NO_PANEL', 'warning'],
    ]);
    expect(
      codes([element({ type: 'image', content: 'https://x/a.png', dpi: 150 })]),
    ).toEqual([['LOW_DPI', 'warning']]);
  });

  it('warns when a flat piece is larger than a B1 sheet', () => {
    const big = generateDielinePieces(
      'tuck-top',
      { ...dimensions, length: 320, width: 220 },
      3,
    );
    expect(codes([], big)).toEqual([
      ['DIMENSION_OUT_OF_BOUNDS', 'warning'],
      ['EMPTY_DESIGN', 'info'],
    ]);
  });

  it('scores 100 − 30 per error − 10 per warning', () => {
    const report = checkBox(tuckTop, [
      element({ id: 'a', x: -4 }),
      element({ id: 'b', y: 2 }),
    ]);
    expect(report.score).toBe(60);
  });

  it('is what the server saves with the project', () => {
    const elements = [element({ x: 2 }), element({ id: 'b', y: 1 })];
    const { auditedAt: _a, ...server } = checkProject(
      'tuck-top',
      dimensions,
      elements,
      3,
    );
    const { auditedAt: _b, ...client } = checkBox(tuckTop, elements);
    expect(server).toEqual(client);
  });
});

describe('auto-fix', () => {
  it('moves elements back inside on every side, shrinking those larger than the panel', () => {
    const { width: W, height: H } = front.bounds;
    const elements = [
      element({ id: 'left', x: -5 }),
      element({ id: 'right', x: W - 20 }),
      element({ id: 'bottom', y: H - 4 }),
      element({ id: 'turned', x: 10, y: 25, width: 100, rotation: 45 }),
      element({
        id: 'huge',
        x: -10,
        y: -10,
        width: W + 40,
        height: H,
        style: { fontSize: 24 },
      }),
      element({ id: 'orphan', panelId: 'nowhere', x: -5 }),
    ];
    const fixed = autoFixElements(tuckTop, elements);
    expect(
      checkBox(tuckTop, fixed).violations.map((v) => [v.elementId, v.code]),
    ).toEqual([['orphan', 'NO_PANEL']]);
    const huge = fixed.find((e) => e.id === 'huge')!;
    expect(huge.width).toBeLessThan(W);
    expect(huge.style!.fontSize).toBeLessThan(24);
    // Elements already fine are not moved.
    expect(autoFixElements(tuckTop, [element({})])).toEqual([element({})]);
  });

  it('moves only the element that breaks the margin; the one inside stays as it was', () => {
    const bad = element({ id: 'logo', type: 'logo', content: 'https://x/logo.png', x: 1, y: 1, width: 20, height: 20 });
    const good = element({ id: 'title', x: 20, y: 20 });
    expect(codes([good])).toEqual([]);
    const [fixedBad, fixedGood] = autoFixElements(tuckTop, [bad, good]);
    expect(fixedGood).toBe(good);
    expect(fixedBad).not.toEqual(bad);
    expect(fixedBad.x).toBeGreaterThanOrEqual(3);
    expect(fixedBad.y).toBeGreaterThanOrEqual(3);
    expect(checkBox(tuckTop, [fixedBad, fixedGood]).violations).toEqual([]);
  });

  it('stretches a background that stops short of a cut line to the bleed', () => {
    const { width: W, height: H } = front.bounds;
    const pattern = element({
      type: 'pattern',
      content: 'https://x/p.png',
      x: 0,
      y: 1,
      width: W,
      height: H - 2,
    });
    const [fixed] = autoFixElements(tuckTop, [pattern]);
    expect(fixed).toMatchObject({ x: 0, y: -3, width: W }); // BLEED_BOX_MM: 3 mm, inside the 2–3 mm bleed
    expect(fixed.height).toBeCloseTo(H + 6, 6);
    expect(checkBox(tuckTop, [fixed]).violations).toEqual([]);
  });
});

describe('size rules of the structures', () => {
  it('keeps a pillow box at most half as thick as wide', () => {
    expect(
      dimensionRuleErrors('pillow', { length: 100, width: 60, height: 30 }),
    ).toEqual([]);
    expect(
      dimensionRuleErrors('pillow', { length: 100, width: 60, height: 31 }),
    ).toHaveLength(1);
    expect(
      dimensionRuleErrors('tuck-top', { length: 60, width: 60, height: 150 }),
    ).toEqual([]);
  });
});

describe('tuck-top bottom (gift weight)', () => {
  const box = { length: 80, width: 80, height: 95, paperThickness: 0.42 };
  const bottomOf = (dims: typeof box & { giftWeight?: number; bottomType?: 'tuck' | 'lock' }) =>
    generateTuckTopDieline(dims).totalBoundingBox.height;

  it('switches to the crash-lock bottom (FEFCO 0215) above 300 g, unless the tuck bottom is chosen', () => {
    expect(usesLockBottom({ giftWeight: 300 })).toBe(false);
    expect(usesLockBottom({ giftWeight: 350 })).toBe(true);
    expect(usesLockBottom({ giftWeight: 350, bottomType: 'tuck' })).toBe(false);
    expect(usesLockBottom({ bottomType: 'lock' })).toBe(true);
    expect(bottomOf({ ...box, giftWeight: 350 })).not.toBe(bottomOf(box));
    expect(bottomOf({ ...box, giftWeight: 350, bottomType: 'tuck' })).toBe(bottomOf(box));
  });
});
