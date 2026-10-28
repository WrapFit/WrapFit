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
  quoteSaving,
  recolorDesign,
} from '@wrapfit/shared';

const gift = { length: 90, width: 90, height: 110, paperThickness: 0.42 };
const pieces = generateDielinePieces('tuck-top', gift);

describe('quote', () => {
  it('prints digitally up to the threshold, offset above it', () => {
    expect(quote({ structure: 'tuck-top', pieces, quantity: DIGITAL_MAX_QUANTITY, paper: 'ivory' }).method).toBe('digital');
    expect(quote({ structure: 'tuck-top', pieces, quantity: DIGITAL_MAX_QUANTITY + 1, paper: 'ivory' }).method).toBe('offset');
  });

  it('charges the digital minimum for one box, plus partner share and shipping', () => {
    const one = quote({ structure: 'tuck-top', pieces, quantity: 1, paper: 'ivory' });
    expect(one.lines.some((line) => line.label === 'Bù đơn tối thiểu')).toBe(true);
    const floor = QUOTE_PRICES.digitalMinimum * (1 + QUOTE_PRICES.partnerShare) + QUOTE_PRICES.shipping;
    expect(Math.abs(one.total - floor)).toBeLessThanOrEqual(300);
    expect(one.perBox).toBe(one.total);
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
