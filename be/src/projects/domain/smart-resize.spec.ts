import {
  type BoxDimensions,
  type CanvasElement,
  checkBox,
  generateDielinePieces,
  generatedTemplates,
  inferAnchor,
  reflowElements,
  safeMarginsOf,
} from '@wrapfit/shared';

const T = 0.42;
const box = (length: number, width: number, height: number): BoxDimensions => ({ length, width, height, paperThickness: T });
const tuck = (d: BoxDimensions) => generateDielinePieces('tuck-top', d, 3);
const panelOf = (pieces: ReturnType<typeof tuck>, id: string) => pieces[0].geometry.panels.find((p) => p.id === id)!;

const text = (id: string, x: number, y: number, width: number, height: number, extra: Partial<CanvasElement> = {}): CanvasElement =>
  ({
    id,
    type: 'text',
    panelId: 'panel_front',
    x,
    y,
    width,
    height,
    rotation: 0,
    content: id,
    style: { fontFamily: 'Be Vietnam Pro', fontSize: 14, color: '#1C1917' },
    ...extra,
  }) as CanvasElement;

describe('smart resize by anchors (docs/23 S20)', () => {
  const before = tuck(box(90, 90, 110));
  const after = tuck(box(120, 80, 60));
  const front0 = panelOf(before, 'panel_front').bounds;
  const front1 = panelOf(after, 'panel_front').bounds;

  it('scenario 15: 90×90×110 → 120×80×60, the title stays in the middle of the front, the logo in its top corner', () => {
    const title = text('title', (front0.width - 60) / 2, (front0.height - 12) / 2, 60, 12);
    const logo = { ...text('logo', 6, 6, 18, 18), type: 'logo', content: 'https://cdn/users/u/logo.png' } as CanvasElement;
    const [t, l] = reflowElements(before, after, [title, logo]);
    expect(t.x + t.width / 2).toBeCloseTo(front1.width / 2, 6);
    expect(t.y + t.height / 2).toBeCloseTo(front1.height / 2, 6);
    expect([l.x, l.y, l.width, l.height]).toEqual([6, 6, 18, 18]);
    expect(checkBox(after, [t, l]).violations.filter((v) => v.severity !== 'info')).toEqual([]);
  });

  it('follows explicit anchors: right / bottom keep their distance to those sides, stretch keeps both', () => {
    const corner = text('corner', front0.width - 30, front0.height - 20, 24, 14, { anchor: { h: 'right', v: 'bottom' } });
    const band = text('band', 6, 40, front0.width - 12, 12, { anchor: { h: 'stretch', v: 'top' } });
    const [c, b] = reflowElements(before, after, [corner, band]);
    expect(front1.width - (c.x + c.width)).toBeCloseTo(front0.width - (corner.x + corner.width), 6);
    expect(front1.height - (c.y + c.height)).toBeCloseTo(front0.height - (corner.y + corner.height), 6);
    expect(b.x).toBe(6);
    expect(b.width).toBeCloseTo(front1.width - 12, 6);
    expect(b.y).toBe(40);
  });

  it('shrinks back inside the safe area what no longer fits the smaller face', () => {
    const tall = text('tall', 10, 10, 50, 95, { anchor: { h: 'left', v: 'top' } });
    const [t] = reflowElements(before, after, [tall]);
    const m = safeMarginsOf(panelOf(after, 'panel_front'), after[0].geometry);
    expect(t.y + t.height).toBeLessThanOrEqual(front1.height - m.bottom + 1e-6);
    expect(t.height).toBeLessThan(95);
  });

  it('leaves alone backgrounds, hidden elements, faces that did not change and faces that are gone', () => {
    const background = { ...text('bg', -3, -3, front0.width + 6, front0.height + 6), type: 'pattern', role: 'background' } as CanvasElement;
    const hidden = text('hidden', 70, 90, 10, 8, { hidden: true });
    const gone = text('gone', 10, 10, 10, 8, { panelId: 'pillow_front' });
    const elements = [background, hidden, gone];
    expect(reflowElements(before, after, elements)).toBe(elements);
    expect(reflowElements(before, before, [text('same', 30, 40, 20, 10)])[0]).toMatchObject({ x: 30, y: 40 });
  });

  it('infers the anchor from the third of the face the element sits in', () => {
    const panel = panelOf(before, 'panel_front');
    expect(inferAnchor({ x: 2, y: 2, width: 10, height: 10 }, panel)).toEqual({ h: 'left', v: 'top' });
    expect(inferAnchor({ x: front0.width / 2 - 5, y: front0.height - 12, width: 10, height: 10 }, panel)).toEqual({ h: 'center', v: 'bottom' });
    expect(inferAnchor({ x: 0, y: front0.height / 2 - 5, width: front0.width, height: 10 }, panel)).toEqual({ h: 'stretch', v: 'middle' });
  });

  it('ships every template element (but backgrounds) with an anchor', () => {
    const elements = generatedTemplates().flatMap((t) => t.canvasState.elements);
    expect(elements.length).toBeGreaterThan(100);
    for (const el of elements) if (el.role !== 'background') expect([el.id, el.anchor]).toEqual([el.id, expect.objectContaining({ h: expect.any(String) })]);
  });
});
