// Recolouring of SVG logos (docs/23 S14): the shared helpers and the print files built from a recoloured logo.
import { type CanvasElement, cleanColorMap, normalizeSvgColor, paletteColorMap, recolorSvg, svgColorsOf, TEXT_COMBOS, textComboStyle } from '@wrapfit/shared';
import { imageFileOf, renderSvg } from './print-renderers';
import { buildPrintLayout, type PrintLayout } from './print-layout';

const LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
  '<rect width="10" height="10" fill="#f00"/><circle cx="5" cy="5" r="3" style="fill: rgb(0, 0, 255)"/>' +
  '<path d="M0 0h1v1z" fill="#FF0000"/><linearGradient><stop stop-color="#00ff00"/></linearGradient></svg>';

describe('svg colours', () => {
  it('normalises the colour notations an SVG uses', () => {
    expect(normalizeSvgColor('#abc')).toBe('#AABBCC');
    expect(normalizeSvgColor('rgb(255, 0, 0)')).toBe('#FF0000');
    expect(normalizeSvgColor('rgba(100%,0%,0%,0.5)')).toBe('#FF0000');
    expect(normalizeSvgColor('white')).toBe('#FFFFFF');
    expect(normalizeSvgColor('none')).toBeNull();
    expect(normalizeSvgColor('url(#g)')).toBeNull();
  });

  it('lists the colours of a file, the most used first', () => {
    expect(svgColorsOf(LOGO)).toEqual(['#FF0000', '#0000FF', '#00FF00']);
  });

  it('lists the default black of shapes without a fill', () => {
    expect(svgColorsOf('<svg><path d="M0 0h1v1z"/></svg>')).toEqual(['#000000']);
  });

  it('swaps colours in attributes, styles and gradient stops', () => {
    const out = recolorSvg(LOGO, [
      { from: '#FF0000', to: '#123456' },
      { from: '#0000ff', to: '#ABCDEF' },
      { from: '#00FF00', to: '#00FF00' },
    ]);
    expect(svgColorsOf(out)).toEqual(['#123456', '#ABCDEF', '#00FF00']);
    expect(out).not.toMatch(/#f00"|#FF0000/);
  });

  it('trades two colours instead of chaining the swaps', () => {
    const out = recolorSvg('<svg><rect fill="#111111"/><rect fill="#222222"/></svg>', [
      { from: '#111111', to: '#222222' },
      { from: '#222222', to: '#111111' },
    ]);
    expect(out).toBe('<svg><rect fill="#222222"/><rect fill="#111111"/></svg>');
  });

  it('gives shapes without a fill the colour that replaces black', () => {
    expect(recolorSvg('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>', [{ from: '#000000', to: '#FF8800' }])).toBe(
      '<svg fill="#FF8800" viewBox="0 0 1 1"><path d="M0 0"/></svg>',
    );
  });

  it('keeps usable swaps only', () => {
    expect(cleanColorMap([{ from: 'nope', to: '#000' }, { from: '#fff', to: '#FFFFFF' }, { from: '#000', to: '#111' }, { from: '#000000', to: '#222' }])).toEqual([
      { from: '#000000', to: '#111111' },
    ]);
  });

  it('dresses a file in a palette: base, accent, ink', () => {
    expect(paletteColorMap(['#FF0000', '#0000FF', '#00FF00'], { base: '#111111', accent: '#222222', ink: '#333333' })).toEqual([
      { from: '#FF0000', to: '#111111' },
      { from: '#0000FF', to: '#222222' },
      { from: '#00FF00', to: '#333333' },
    ]);
  });
});

describe('recoloured logos in the print files', () => {
  const image = { url: 'https://cdn.test/logo.svg', colorMap: [{ from: '#FF0000', to: '#123456' }] } as unknown as PrintLayout['images'][number];

  it('prints an SVG from its recoloured file, leaves rasters alone', () => {
    const svg = { body: Buffer.from(LOGO), contentType: 'image/svg+xml' };
    expect(imageFileOf(svg, image).body.toString()).toContain('#123456');
    const png = { body: Buffer.from([0x89, 0x50, 0x4e, 0x47]), contentType: 'image/png' };
    expect(imageFileOf(png, image)).toBe(png);
    expect(imageFileOf(svg, { ...image, colorMap: null })).toBe(svg);
  });

  it('embeds the recoloured logo in the SVG file', () => {
    const logo: CanvasElement = {
      id: 'logo',
      type: 'logo',
      panelId: 'front',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      rotation: 0,
      content: 'https://cdn.test/logo.svg',
      style: { colorMap: [{ from: '#FF0000', to: '#123456' }] },
    };
    const layout = buildPrintLayout({ title: 'Logo', structure: 'tuck-top', formulaVersion: 1, dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 }, elements: [logo] });
    expect(layout.images[0].colorMap).toEqual([{ from: '#FF0000', to: '#123456' }]);
    const out = renderSvg(layout, new Map([['https://cdn.test/logo.svg', { body: Buffer.from(LOGO), contentType: 'image/svg+xml' }]]));
    const embedded = /href="data:image\/svg\+xml;base64,([^"]+)"/.exec(out);
    expect(embedded).not.toBeNull();
    expect(Buffer.from(embedded![1], 'base64').toString()).toContain('#123456');
  });
});

describe('text combos', () => {
  it('has readable colours and a printed font for every line', () => {
    for (const combo of TEXT_COMBOS) {
      for (const line of combo.lines) {
        const style = textComboStyle(combo, line);
        expect(style.color).toMatch(/^#[0-9A-F]{6}$/i);
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(style.color!.slice(i, i + 2), 16) / 255);
        expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeLessThan(0.8);
        expect(style.fontFamily).toMatch(/^'[^']+', (serif|sans-serif)$/);
      }
    }
  });
});
