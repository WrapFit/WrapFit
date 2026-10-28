// Business rules of @wrapfit/shared used by the studio demo: the quote of step 6 (pricing/quote), the printable
// palettes of step 4 (library/recolor, boxBackgrounds) and the FitCheck note of an empty box.
import {
  ART_PALETTES,
  boxBackgrounds,
  type CanvasElement,
  checkBox,
  DIGITAL_MAX_QUANTITY,
  generateDielinePieces,
  libraryArtContent,
  PALETTE_PARTNERS,
  parseLibraryArt,
  QUOTE_PRICES,
  quote,
  quoteLadder,
  quoteSaving,
  recolorDesign,
} from '@wrapfit/shared';

const gift = { length: 90, width: 90, height: 110, paperThickness: 0.42 };
const pieces = generateDielinePieces('tuck-top', gift);

describe('quote', () => {
  it('picks the cheaper method, digital only up to the longest digital run', () => {
    for (const quantity of [1, 50, 200, 250, 300, 500, DIGITAL_MAX_QUANTITY]) {
      const chosen = quote({ structure: 'tuck-top', pieces, quantity, paper: 'ivory' });
      const other = quote({ structure: 'tuck-top', pieces, quantity, paper: 'ivory', method: chosen.method === 'digital' ? 'offset' : 'digital' });
      expect(chosen.total).toBeLessThanOrEqual(other.total);
    }
    expect(quote({ structure: 'tuck-top', pieces, quantity: 50, paper: 'ivory' }).method).toBe('digital');
    expect(quote({ structure: 'tuck-top', pieces, quantity: DIGITAL_MAX_QUANTITY + 1, paper: 'ivory' }).method).toBe('offset');
    // Small boxes stay digital longer: no jump in price at the old 300-box threshold.
    const small = generateDielinePieces('tuck-top', { length: 40, width: 40, height: 60, paperThickness: 0.42 });
    const at300 = quote({ structure: 'tuck-top', pieces: small, quantity: 300, paper: 'ivory' });
    const at301 = quote({ structure: 'tuck-top', pieces: small, quantity: 301, paper: 'ivory' });
    expect(at301.perBox).toBeLessThanOrEqual(at300.perBox + 100);
  });

  it('charges the digital minimum for one box, without shipping or a commission line', () => {
    const one = quote({ structure: 'tuck-top', pieces, quantity: 1, paper: 'ivory' });
    expect(one.lines.some((line) => line.label === 'Bù đơn tối thiểu')).toBe(true);
    expect(Math.abs(one.total - QUOTE_PRICES.digitalMinimum)).toBeLessThanOrEqual(300);
    expect(one.perBox).toBe(one.total);
    expect(one.lines.some((line) => line.id === 'partner' || line.id === 'shipping')).toBe(false);
    // The commission comes out of the partner's price.
    expect(one.commissionVnd).toBe(Math.round((one.total * QUOTE_PRICES.partnerShare) / 100) * 100);
  });

  it('gets cheaper per box with quantity, and the lines add up', () => {
    const prices = [1, 50, 300, 1000].map((quantity) => quote({ structure: 'tuck-top', pieces, quantity, paper: 'ivory' }));
    for (let i = 1; i < prices.length; i++) expect(prices[i].perBox).toBeLessThan(prices[i - 1].perBox);
    for (const price of prices) {
      expect(price.lines.reduce((sum, line) => sum + line.vnd, 0)).toBe(price.total);
      expect(price.perSheet).toBeGreaterThan(0);
    }
    expect(prices[3].lines.some((line) => line.label.startsWith('Khuôn bế'))).toBe(true);
  });

  it('splits the total into box material, printing, converting and finishing, each line with its formula', () => {
    for (const quantity of [1, 50, 500]) {
      const q = quote({ structure: 'tuck-top', pieces, quantity, paper: 'kraft', finishes: ['matte-lamination', 'foil'] });
      expect(q.groups.map((g) => g.group)).toEqual(['material', 'print', 'converting']);
      expect(q.groups.reduce((sum, g) => sum + g.vnd, 0)).toBe(q.total);
      expect(q.groups.reduce((sum, g) => sum + g.share, 0)).toBeCloseTo(1, 6);
      expect(q.fixedVnd + q.variableVnd).toBe(q.total);
      for (const line of q.lines) expect(line.detail.length).toBeGreaterThan(0);
      expect(q.lines.find((line) => line.id === 'paper')!.group).toBe('material');
      // Foil: its block once, then per box.
      expect(q.lines.find((line) => line.id === 'foil-setup')!.kind).toBe('fixed');
      expect(q.lines.find((line) => line.id === 'foil')!.kind).toBe('perUnit');
    }
    const offset = quote({ structure: 'tuck-top', pieces, quantity: 500, paper: 'ivory' });
    expect(offset.lines.filter((line) => line.kind === 'fixed').map((line) => line.id)).toEqual(['setup', 'die']);
  });

  it('compares quantities: price per box and how much it drops', () => {
    const ladder = quoteLadder({ structure: 'tuck-top', pieces, paper: 'ivory' }, [500, 1, 50, 50, 1000]);
    expect(ladder.map((step) => step.quantity)).toEqual([1, 50, 500, 1000]);
    expect(ladder[0].savingVsOne).toBe(0);
    expect(ladder[0].savingVsPrevious).toBeNull();
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].perBox).toBeLessThan(ladder[i - 1].perBox);
      expect(ladder[i].savingVsPrevious).toBeCloseTo(1 - ladder[i].perBox / ladder[i - 1].perBox, 6);
      expect(ladder[i].savingVsOne).toBeGreaterThan(ladder[i - 1].savingVsOne);
    }
    expect(ladder.map((step) => step.method)).toEqual(['digital', 'digital', 'offset', 'offset']);
  });

  it('suggests trimming a side when more boxes then fit on a sheet', () => {
    const candle = { length: 85, width: 85, height: 105, paperThickness: 0.42 };
    const saving = quoteSaving({ structure: 'tuck-top', dimensions: candle, quantity: 500, paper: 'kraft' });
    expect(saving).not.toBeNull();
    expect(saving!.deltaMm).toBeGreaterThanOrEqual(1);
    expect(saving!.deltaMm).toBeLessThanOrEqual(5);
    expect(saving!.saving).toBeGreaterThanOrEqual(0.03);
    const before = quote({ structure: 'tuck-top', pieces: generateDielinePieces('tuck-top', candle), quantity: 500, paper: 'kraft' });
    expect(saving!.perSheet).toBeGreaterThan(before.perSheet);
    expect(saving!.perBox).toBeLessThan(before.perBox);
  });
});

describe('printable palettes', () => {
  const [palette] = ART_PALETTES;
  const other = ART_PALETTES.find((p) => p.id !== palette.id && p.id !== PALETTE_PARTNERS[palette.id])!;
  const front = pieces[0].geometry.panels.find((p) => p.id === 'panel_front')!;
  const sticker: CanvasElement = {
    id: 'stamp',
    type: 'logo',
    panelId: front.id,
    x: 10,
    y: 10,
    width: 30,
    height: 30,
    rotation: 0,
    content: libraryArtContent({ design: 'stamp', palette: other.id }),
  };
  const text: CanvasElement = { id: 'name', type: 'text', panelId: front.id, x: 10, y: 50, width: 60, height: 12, rotation: 0, content: 'Nến Mộc', style: { color: '#123456' } };

  it('backgrounds take the palette, art on them the partner palette, text the ink', () => {
    const backgrounds = boxBackgrounds(pieces, { design: 'bg-dots', palette: other.id });
    const result = recolorDesign([...backgrounds, sticker, text], palette.id);
    for (const el of result.filter((e) => e.type === 'pattern')) expect(parseLibraryArt(el.content)!.palette).toBe(palette.id);
    expect(parseLibraryArt(result.find((e) => e.id === 'stamp')!.content)!.palette).toBe(PALETTE_PARTNERS[palette.id]);
    expect(result.find((e) => e.id === 'name')!.style?.color).toBe(palette.ink);
  });

  it('without a background, art takes the palette itself', () => {
    const result = recolorDesign([sticker, text], palette.id);
    expect(parseLibraryArt(result[0].content)!.palette).toBe(palette.id);
    expect(recolorDesign([sticker], 'no-such-palette')).toEqual([sticker]);
  });

  it('box backgrounds bleed on cut sides and never cover a glue flap', () => {
    for (const structure of ['tuck-top', 'sleeve-drawer', 'lid-base', 'pillow']) {
      const boxPieces = generateDielinePieces(structure, gift);
      const elements = boxBackgrounds(boxPieces, { design: 'bg-stripes', palette: palette.id }, 'panel_front');
      expect(elements.length).toBeGreaterThan(0);
      for (const el of elements) {
        const piece = boxPieces.find((p) => p.geometry.panels.some((panel) => panel.id === el.panelId))!;
        const panel = piece.geometry.panels.find((p) => p.id === el.panelId)!;
        const x = panel.bounds.x + el.x;
        const y = panel.bounds.y + el.y;
        for (const g of piece.geometry.glueAreas ?? []) {
          expect(x < g.x + g.width && g.x < x + el.width && y < g.y + g.height && g.y < y + el.height).toBe(false);
        }
        if (el.panelId === 'panel_front') expect(parseLibraryArt(el.content)!.design).toBe('bg-solid');
      }
    }
  });
});

describe('FitCheck of an empty box', () => {
  it('says the box prints plain, without costing points', () => {
    const empty = checkBox(pieces, []);
    const note = empty.violations.find((v) => v.code === 'EMPTY_DESIGN');
    expect(note?.severity).toBe('info');
    expect(checkBox(pieces, [{ id: 't', type: 'text', panelId: 'panel_front', x: 10, y: 10, width: 40, height: 10, rotation: 0, content: 'Hi' }]).violations.some((v) => v.code === 'EMPTY_DESIGN')).toBe(false);
  });
});
