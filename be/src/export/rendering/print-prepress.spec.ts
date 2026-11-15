// Prepress of the print files (audit of 2026-11-15): rich black on large dark vector fills, the fold lines on their
// own Crease spot layer for the die maker, margin ticks instead of fold lines on the home-print sheet.
import {
  areaCmyk,
  foldTicks,
  generatedTemplates,
  hexToCmyk,
  libraryArtContent,
  pathBoxArea,
  RICH_BLACK,
  textCmyk,
  type CanvasElement,
} from '@wrapfit/shared';
import { strFromU8, unzipSync } from 'fflate';
import { inflateSync } from 'zlib';
import { buildPrintLayout } from './print-layout';
import { renderPrintPackage } from './print-package';
import { PRINT_LAYERS, renderPdf, renderSvg } from './print-renderers';

const dimensions = { length: 120, width: 80, height: 60, paperThickness: 0.4 };
const layoutOf = (structure: string, elements: CanvasElement[] = [], dims = dimensions) =>
  buildPrintLayout({ title: 'Hộp thử', structure, formulaVersion: 3, dimensions: dims, elements });

/** The decoded content streams of a PDF. */
const streams = (pdf: Buffer) => {
  const text = pdf.toString('latin1');
  const out: string[] = [];
  for (const match of text.matchAll(/stream\s/g)) {
    const start = match.index! + match[0].length;
    try {
      out.push(inflateSync(pdf.subarray(start, text.indexOf('endstream', start))).toString('latin1'));
    } catch {
      // not a Flate stream
    }
  }
  return out.join('\n');
};
/** CMYK fill colours (0-100) set in a content stream. */
const fills = (content: string) =>
  [...content.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) scn/g)].map((m) => m.slice(1, 5).map((v) => Math.round(Number(v) * 100)));

describe('rich black on large dark areas', () => {
  it('turns near-black fills of 2 × 2 cm and more into rich black, and leaves small or coloured ones alone', () => {
    expect(areaCmyk('#161616', 190 * 450)).toEqual(RICH_BLACK);
    expect(areaCmyk('#1C1917', 400)).toEqual(RICH_BLACK); // warm black of the "Đen ánh kim" palette
    expect(areaCmyk('#000000', 399)).toEqual(hexToCmyk('#000000')); // small: one plate, no register
    expect(areaCmyk('#557F3A', 1e5)).toEqual(hexToCmyk('#557F3A'));
    expect(areaCmyk('#555555', 1e5)).toEqual(hexToCmyk('#555555')); // a grey stays grey
    expect(textCmyk('#161616', 40)).toEqual(RICH_BLACK);
    expect(textCmyk('#161616', 12)).toEqual(hexToCmyk('#161616'));
  });

  it('measures the bounding box of a path, and gives up on relative or arc commands', () => {
    expect(pathBoxArea('M 0 0 L 20 0 L 20 30 L 0 30 Z')).toBe(600);
    expect(pathBoxArea('M 5 5 H 15 V 10 Z')).toBe(50);
    expect(pathBoxArea('M 0 0 C 10 0 10 10 0 10 Z')).toBe(100);
    expect(pathBoxArea('m 0 0 l 10 10')).toBe(0);
    expect(pathBoxArea('M 0 0 A 5 5 0 0 1 10 0')).toBe(0);
  });

  it('prints the black cup carrier background in rich black, not K91', async () => {
    const t = generatedTemplates().find((x) => x.key === 'do-uong-den-than/khay-2-ly/seal')!;
    const layout = buildPrintLayout({ title: t.title, structure: t.structure, formulaVersion: 3, dimensions: t.dimensions, elements: t.canvasState.elements });
    const colours = fills(streams(await renderPdf(layout)));
    expect(colours).toContainEqual(RICH_BLACK);
    expect(colours).not.toContainEqual([0, 0, 0, 91]);
  }, 60000);

  it('keeps a large near-black background element in plain ink in the SVG (screen colours) but rich black in the PDF', async () => {
    const background: CanvasElement = {
      id: 'bg',
      type: 'pattern',
      panelId: 'panel_front',
      x: -3,
      y: -3,
      width: 126,
      height: 66,
      rotation: 0,
      content: libraryArtContent({ design: 'bg-solid', palette: 'den-than' }),
    };
    const layout = layoutOf('tuck-top', [background]);
    expect(fills(streams(await renderPdf(layout)))).toContainEqual(RICH_BLACK);
    expect(renderSvg(layout)).toContain('#161616');
  });
});

describe('fold lines', () => {
  const creaseLayer = `/OC /L${PRINT_LAYERS.indexOf('Crease')} BDC`;

  it('puts every crease on the Crease spot layer of the print-shop PDF, dashed and overprinted', async () => {
    const layout = layoutOf('tuck-top');
    const pdf = await renderPdf(layout);
    expect(pdf.toString('latin1')).toMatch(/\/Type \/OCG\s+\/Name \(Crease\)/);
    expect(pdf.toString('latin1')).toMatch(/\[\/Separation \/Crease \/DeviceCMYK/);
    const content = streams(pdf);
    const start = content.indexOf(creaseLayer);
    expect(start).toBeGreaterThan(-1);
    const body = content.slice(start, content.indexOf('EMC', start));
    expect(body).toContain('/GsOverprint gs');
    expect(body).toMatch(/\[[\d.]+ [\d.]+\] 0 d/); // dashed
    // One stroked path per joined crease line.
    expect(body.match(/\bS\b/g)!.length).toBe(layout.strokes.filter((s) => s.type === 'crease').length);
  });

  it('draws no fold line across the artwork of the home-print sheet, only ticks in the margin', async () => {
    const layout = layoutOf('cup-carrier', [], { length: 190, width: 95, height: 60, paperThickness: 0.42 });
    const home = streams(await renderPdf(layout, new Map(), { withCropMarks: true, paperSize: 'A4' }));
    expect(home).not.toContain(creaseLayer);
    const ticks = foldTicks(layout.strokes);
    // The six creases of the carrier cross the strip from side to side: a tick at both ends of each.
    expect(ticks).toHaveLength(12);
    const piece = layout.pieces[0];
    for (const [x1, , x2] of ticks) {
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      expect(right <= piece.x || left >= piece.x + piece.geometry.totalBoundingBox.width).toBe(true);
    }
  });

  it('has the Crease layer in the SVG for cutting plotters, and says so in the checklist', async () => {
    expect(renderSvg(layoutOf('tuck-top'))).toMatch(/<g id="crease" [^>]*inkscape:label="Crease"[^>]*stroke-dasharray="4,4"/);
    const zip = unzipSync(await renderPrintPackage(layoutOf('tuck-top'), new Map(), 'hop'));
    const readme = strFromU8(zip['DOC-TRUOC-KHI-IN.txt']);
    expect(readme).toContain('lớp Crease');
    expect(readme).toContain('KHÔNG in lên hộp');
  });
});
