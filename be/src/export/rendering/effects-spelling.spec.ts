import {
  type CanvasElement,
  checkBox,
  generateDielinePieces,
  isVietnameseSyllable,
  misspelledWords,
  shadowLayers,
  shadowOf,
} from '@wrapfit/shared';
import sharp from 'sharp';
import { inflateSync } from 'zlib';
import { buildPrintLayout } from './print-layout';
import { renderPdf, renderSvg, type Artwork } from './print-renderers';

const dimensions = { length: 120, width: 80, height: 60, paperThickness: 0.4 };
const shadow = { color: '#1A1A1A', opacity: 0.4, blur: 2, x: 1, y: 1.5 };
const square = {
  id: 's',
  type: 'shape' as const,
  panelId: 'front',
  x: 5,
  y: 5,
  width: 20,
  height: 20,
  rotation: 0,
  content: '',
  shape: { kind: 'rect' as const },
  style: { fillColor: '#C0392B', shadow, blendMode: 'multiply' as const },
} as CanvasElement;
const layoutOf = (elements: CanvasElement[]) => buildPrintLayout({ title: 'x', structure: 'tuck-top', formulaVersion: 1, dimensions, elements });

/** Uncompressed content streams of a PDF. */
const streams = (pdf: Buffer) => {
  const text = pdf.toString('latin1');
  const out: string[] = [];
  for (const match of text.matchAll(/stream\s/g)) {
    const start = match.index! + match[0].length;
    try {
      out.push(inflateSync(pdf.subarray(start, text.indexOf('endstream', start))).toString('latin1'));
    } catch {
      // raw image data
    }
  }
  return out.join('\n');
};

describe('drop shadow and blend modes (docs/23 S22)', () => {
  it('keeps the shadow safe and splits it in fading layers that add up to its opacity', () => {
    expect(shadowOf({ shadow: { ...shadow, blur: 99, x: -99, opacity: 3 } })).toEqual({ ...shadow, blur: 10, x: -20, opacity: 1 });
    expect(shadowOf({ shadow: { ...shadow, color: 'red' } })).toBeNull();
    expect(shadowOf({ shadow: { ...shadow, opacity: 0 } })).toBeNull();
    const layers = shadowLayers(shadow);
    expect(layers[0].strokeWidth).toBe(0);
    expect(layers[layers.length - 1].strokeWidth).toBeCloseTo(2 * shadow.blur, 6);
    const covered = 1 - layers.reduce((left, layer) => left * (1 - layer.opacity), 1);
    expect(covered).toBeCloseTo(shadow.opacity, 6);
  });

  it('places the effects with the element, never on its finish layer', () => {
    const layout = layoutOf([{ ...square, finish: 'foil_gold' } as CanvasElement]);
    expect(layout.arts[0]).toMatchObject({ shadow, blend: 'multiply' });
  });

  it('writes the SVG with a drop shadow filter and a blend mode', () => {
    const svg = renderSvg(layoutOf([square]));
    expect(svg).toMatch(/<filter id="shadow1" filterUnits="userSpaceOnUse"[^>]*><feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#1A1A1A" flood-opacity="0.4"\/><\/filter>/);
    expect(svg).toContain('style="mix-blend-mode:multiply"');
    expect(svg).toContain('filter="url(#shadow1)"');
  });

  it('writes the PDF with a /BM graphics state and the shadow as CMYK vector layers under the element', async () => {
    const pdf = await renderPdf(layoutOf([square]));
    const text = pdf.toString('latin1');
    expect(text).toMatch(/\/Type \/ExtGState\s*\/BM \/Multiply/);
    const content = streams(pdf);
    expect(content).toContain('/GsBMMultiply gs');
    // The shadow colour (#1A1A1A) is painted before the element colour (#C0392B).
    const shadowAt = content.search(/0 0 0 0\.9\d* scn/);
    expect(shadowAt).toBeGreaterThan(-1);
    expect(shadowAt).toBeLessThan(content.lastIndexOf(' scn'));
  });

  it('gives a photo the soft shadow of its own pixels in the PDF', async () => {
    const url = 'https://cdn/users/u/a.png';
    const png = await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } } }).png().toBuffer();
    const artwork: Artwork = new Map([[url, { body: png, contentType: 'image/png' }]]);
    const photo = { ...square, id: 'p', type: 'image', content: url, shape: undefined, style: { shadow } } as CanvasElement;
    const pdf = await renderPdf(layoutOf([photo]), artwork);
    // Two image XObjects: the photo and its blurred shadow (with a soft mask).
    expect(pdf.toString('latin1').match(/\/Subtype \/Image/g)!.length).toBeGreaterThanOrEqual(3);
    expect(streams(pdf).match(/\/ImC\d+ Do/g)).toHaveLength(2);
  });
});

describe('Vietnamese spell check (docs/23 S22)', () => {
  it('accepts written Vietnamese, with its hard spellings', () => {
    const words =
      'Cảm ơn bạn chúc mừng năm mới Tết an khang thịnh vượng nghiêng khuya quyển giường gìn gì giữa Nguyễn chuyện huỳnh oách thuở khuỷu xoẹt ngoằn ngoèo người yêu kẹo bánh mì nhé ạ ừ quà gỗ ước đẹp kỹ quý ghế ngủ khoẻ hoà thuý kê';
    expect(misspelledWords(words)).toEqual([]);
  });

  it('flags the usual typos: a lost or wrong tone on a stop ending, doubled letters, bad onsets, open diphthongs', () => {
    expect(misspelledWords('Chúc mừng năm mới đep Têt chúcc cámm thnàh tiê nghă ngè cí')).toEqual(['đep', 'Têt', 'chúcc', 'cámm', 'thnàh', 'tiê', 'nghă', 'ngè', 'cí']);
    expect(isVietnameseSyllable('Tết')).toBe(true);
    expect(isVietnameseSyllable('Têt')).toBe(false);
  });

  it('never flags English, names with foreign letters or numbers', () => {
    expect(misspelledWords('HANDMADE Café Thank you 2026 WrapFit Jéan')).toEqual([]);
  });

  it('is a FitCheck note, not a penalty', () => {
    const pieces = generateDielinePieces('tuck-top', { ...dimensions, paperThickness: 0.42 }, 3);
    const typo = { id: 't', type: 'text', panelId: 'panel_front', x: 10, y: 20, width: 60, height: 10, rotation: 0, content: 'Chúc mừng năm mơi đep', style: { fontSize: 14, color: '#111111' } } as CanvasElement;
    const report = checkBox(pieces, [typo]);
    const note = report.violations.find((v) => v.code === 'SPELLING');
    expect(note).toMatchObject({ severity: 'info', message: expect.stringContaining('"đep"') });
    expect(report.score).toBe(100);
  });
});
