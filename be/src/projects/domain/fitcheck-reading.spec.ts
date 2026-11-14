import {
  autoFixElements,
  type CanvasElement,
  checkBox,
  contrastRatio,
  generateDielinePieces,
  generatedTemplates,
  uprightRotationOf,
} from '@wrapfit/shared';

const tuck = generateDielinePieces('tuck-top', { length: 90, width: 90, height: 110, paperThickness: 0.42 }, 3);

const text = (id: string, panelId: string, extra: Partial<CanvasElement> = {}, style: CanvasElement['style'] = {}): CanvasElement =>
  ({
    id,
    type: 'text',
    panelId,
    x: 20,
    y: 30,
    width: 50,
    height: 10,
    rotation: 0,
    content: 'Hộp quà',
    style: { fontFamily: 'Be Vietnam Pro', fontSize: 14, color: '#1C1917', ...style },
    ...extra,
  }) as CanvasElement;

const of = (elements: CanvasElement[], id: string, code: string) =>
  checkBox(tuck, elements).violations.find((v) => v.elementId === id && v.code === code);

describe('FitCheck: reading direction, size, contrast, creases (docs/23 S21)', () => {
  it('scenario 16: a text on the tuck-top lid as drawn reads upside down from the front, and the fix turns it 180°', () => {
    expect(uprightRotationOf(tuck[0].geometry, 'panel_top_lid')).toBe(180);
    const lid = text('lid', 'panel_top_lid');
    const warning = of([lid], 'lid', 'READING_DIRECTION');
    expect(warning).toMatchObject({ severity: 'warning', title: 'Chữ sẽ bị ngược khi gấp', fix: { rotation: 180 } });
    expect(of([{ ...lid, rotation: warning!.fix!.rotation }], 'lid', 'READING_DIRECTION')).toBeUndefined();
    // "Sửa tất cả" turns it too.
    expect(autoFixElements(tuck, [lid])[0].rotation).toBe(180);
  });

  it('walls read with their top up: upside down is a warning, sideways a note, the inside is not checked', () => {
    expect(of([text('front', 'panel_front')], 'front', 'READING_DIRECTION')).toBeUndefined();
    expect(of([text('down', 'panel_front', { rotation: 180 })], 'down', 'READING_DIRECTION')).toMatchObject({ severity: 'warning' });
    expect(of([text('side', 'panel_front', { rotation: 90 })], 'side', 'READING_DIRECTION')).toMatchObject({ severity: 'info', fix: { rotation: 0 } });
    expect(of([text('in', 'panel_top_lid', { side: 'inside' })], 'in', 'READING_DIRECTION')).toBeUndefined();
    // The bottom of the box has no reading direction.
    expect(uprightRotationOf(tuck[0].geometry, 'panel_bottom')).toBeNull();
  });

  it('every structure: a wall faces up, the top reads from the front, a sloped roof reads up the slope', () => {
    const d = { length: 120, width: 80, height: 90, paperThickness: 0.42 };
    const upright = (structure: string, panel: string) =>
      uprightRotationOf(generateDielinePieces(structure, d, 3).find((p) => p.geometry.panels.some((q) => q.id === panel))!.geometry, panel);
    expect(upright('mailer', 'mailer_front')).toBe(0);
    expect(upright('mailer', 'mailer_lid')).toBe(0);
    expect(upright('mailer', 'mailer_back')).toBe(180);
    expect(upright('lid-base', 'lid_top')).toBe(0);
    expect(upright('gable', 'gable_roof_front')).toBe(0);
    expect(upright('belly-band', 'band_top')).toBe(0);
    expect(upright('pillow', 'pillow_front')).toBeNull();
  });

  it('templates ship their texts upright', () => {
    for (const t of generatedTemplates()) {
      const pieces = generateDielinePieces(t.structure, t.dimensions);
      const reading = checkBox(pieces, t.canvasState.elements).violations.filter((v) => v.code === 'READING_DIRECTION' && v.severity !== 'info');
      expect([t.id, reading]).toEqual([t.id, []]);
    }
  });

  it('warns about text under 6 pt', () => {
    expect(of([text('tiny', 'panel_front', {}, { fontSize: 5 })], 'tiny', 'TEXT_TOO_SMALL')).toMatchObject({ severity: 'warning', expectedValue: 6 });
    expect(of([text('ok', 'panel_front', {}, { fontSize: 6 })], 'ok', 'TEXT_TOO_SMALL')).toBeUndefined();
  });

  it('warns about text too close in colour to the solid fill under it', () => {
    const block = { id: 'block', type: 'shape', panelId: 'panel_front', x: 10, y: 20, width: 70, height: 30, rotation: 0, content: '', style: { fillColor: '#F5F0E6' } } as CanvasElement;
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 3);
    const pale = text('pale', 'panel_front', {}, { color: '#EDE6D6' });
    expect(of([block, pale], 'pale', 'LOW_CONTRAST')).toMatchObject({ severity: 'warning' });
    expect(of([block, text('dark', 'panel_front')], 'dark', 'LOW_CONTRAST')).toBeUndefined();
    // The fill must lie under the text: drawn after it, or not covering it, it says nothing.
    expect(of([pale, block], 'pale', 'LOW_CONTRAST')).toBeUndefined();
    expect(of([{ ...block, width: 20 }, pale], 'pale', 'LOW_CONTRAST')).toBeUndefined();
  });

  it('warns about text across a crease inside its face', () => {
    // A belly band printed as a sticker label has creases where it wraps around the box.
    const band = generateDielinePieces('sticker-label', { length: 280, width: 50, height: 30, paperThickness: 0.15 }, 3);
    const crease = band[0].geometry.segments.find((s) => s.type === 'crease')!;
    const panel = band[0].geometry.panels[0].bounds;
    const across = text('across', 'panel_sticker', { x: crease.start.x - panel.x - 20, y: 15, width: 40 });
    const beside = text('beside', 'panel_sticker', { x: crease.start.x - panel.x + 10, y: 15, width: 30 }); // between the two creases
    const report = checkBox(band, [across, beside]);
    expect(report.violations.find((v) => v.elementId === 'across' && v.code === 'TEXT_ON_CREASE')).toBeDefined();
    expect(report.violations.find((v) => v.elementId === 'beside' && v.code === 'TEXT_ON_CREASE')).toBeUndefined();
  });
});
