import type { CanvasElement } from '@wrapfit/shared';
import QRCode from 'qrcode';
import { fileNameFor } from '../export.service';
import {
  buildPrintLayout,
  PIECE_GAP_MM,
  SHEET_MARGIN_MM,
  strokesOf,
  UnsupportedFormulaVersionError,
  UnsupportedStructureError,
} from './print-layout';
import { CURRENT_FORMULA_VERSION, layoutTextBox, printFontOf, PT_TO_MM } from '@wrapfit/shared';
import { strFromU8, unzipSync } from 'fflate';
import { renderPrintPackage } from './print-package';
import {
  Artwork,
  BLEED_BOX_MM,
  hexToCmyk,
  imageResolutions,
  PRINT_LAYERS,
  renderDxf,
  renderPdf,
  renderSvg,
} from './print-renderers';

describe('text model shared with the editor canvas', () => {
  // 1 mm per character at any size: easy to reason about.
  const measure = (text: string) => text.length;
  const box = { content: 'aaa bbb ccc', width: 7, height: 20, style: { fontSize: 10 } };

  it('wraps words inside the box, centres the lines and the block', () => {
    const layout = layoutTextBox(box, measure);
    expect(layout.fontSizeMm).toBeCloseTo(10 * PT_TO_MM);
    expect(layout.lines.map((line) => line.text)).toEqual(['aaa bbb', 'ccc']);
    expect(layout.lines[1].x).toBe(2); // (7 - 3) / 2
    const blockTop = (20 - 2 * layout.lineHeightMm) / 2;
    expect(layout.lines[0].baseline).toBeCloseTo(blockTop + 0.5 * layout.lineHeightMm + 0.35 * layout.fontSizeMm);
  });

  it('keeps line breaks and cuts words longer than the box', () => {
    expect(layoutTextBox({ ...box, content: 'ab\ncd' }, measure).lines.map((l) => l.text)).toEqual(['ab', 'cd']);
    expect(layoutTextBox({ ...box, content: 'abcdefghij' }, measure).lines.map((l) => l.text)).toEqual(['abcdefg', 'hij']);
  });

  it('prints the first family of the CSS list that WrapFit embeds', () => {
    expect(printFontOf("'Big Shoulders Display', sans-serif")).toBe('big-shoulders-display');
    expect(printFontOf('Comic Sans MS, Inter')).toBe('inter');
    expect(printFontOf(undefined)).toBe('be-vietnam-pro');
  });
});

const dimensions = { length: 120, width: 80, height: 60, paperThickness: 0.4 };
const greeting = {
  id: 't1',
  type: 'text' as const,
  panelId: 'front',
  x: 10,
  y: 12,
  width: 60,
  height: 10,
  rotation: 0,
  content: 'Chúc mừng năm mới <Tết> & an khang',
  style: { fontSize: 14, color: '#C0392B' },
};
const layoutOf = (structure: string, elements: CanvasElement[] = [greeting]) =>
  buildPrintLayout({ title: 'Hộp nến Tết', structure, formulaVersion: 1, dimensions, elements });

describe('print layout', () => {
  it.each([
    ['tuck-top', 1],
    ['pillow', 1],
    ['lid-base', 2],
    ['sleeve-drawer', 2],
  ])('lays out the %s dieline as %i piece(s) side by side', (structure, count) => {
    const layout = layoutOf(structure);
    expect(layout.pieces).toHaveLength(count);
    expect(layout.pieces[0]).toMatchObject({ x: SHEET_MARGIN_MM, y: SHEET_MARGIN_MM });
    if (count === 2) {
      const [first, second] = layout.pieces;
      expect(second.x).toBe(first.x + first.geometry.totalBoundingBox.width + PIECE_GAP_MM);
    }
    const last = layout.pieces[count - 1];
    expect(layout.width).toBeCloseTo(last.x + last.geometry.totalBoundingBox.width + SHEET_MARGIN_MM);
  });

  it('places text elements on their panel ("front" or "panel_front")', () => {
    const layout = layoutOf('tuck-top');
    const front = layout.pieces[0].geometry.panels.find((p) => p.id === 'panel_front')!;
    expect(layout.texts).toEqual([
      expect.objectContaining({
        x: SHEET_MARGIN_MM + front.bounds.x + 10,
        y: SHEET_MARGIN_MM + front.bounds.y + 12,
        fontSizeMm: expect.closeTo(4.94, 2), // 14 pt
      }),
    ]);
    expect(layoutOf('tuck-top', [{ ...greeting, panelId: 'nowhere' }]).texts).toEqual([]);
  });

  it('places logos, images and patterns given by URL, and barcodes; skips inline content', () => {
    const logo = { ...greeting, id: 'l', type: 'logo' as const, content: 'https://cdn/users/u/logo.png', height: 15 };
    const layout = layoutOf('lid-base', [
      { ...logo, panelId: 'lid_top', rotation: 15 },
      { ...logo, id: 'b', type: 'barcode' as const, panelId: 'lid_top' },
      { ...logo, id: 'p', type: 'pattern' as const, content: '<svg/>' },
    ]);
    const lid = layout.pieces[1];
    const top = lid.geometry.panels.find((p) => p.id === 'lid_top')!;
    expect(layout.images).toEqual([
      { url: logo.content, type: 'logo', x: lid.x + top.bounds.x + 10, y: lid.y + top.bounds.y + 12, width: 60, height: 15, rotation: 15 },
    ]);
    expect(layout.barcodes).toEqual([expect.objectContaining({ content: logo.content, width: 60, height: 15 })]);
    expect(layout.texts).toEqual([]);
  });

  it('rejects unknown structures', () => {
    expect(() => layoutOf('hexagon')).toThrow(UnsupportedStructureError);
  });

  it('never draws a project with formulas that were not registered (no silent fallback to the current ones)', () => {
    expect(() =>
      buildPrintLayout({ title: 'x', structure: 'tuck-top', formulaVersion: 99, dimensions, elements: [] }),
    ).toThrow(UnsupportedFormulaVersionError);
  });
});

describe('print renderers', () => {
  it('writes a layered SVG at true size with the text laid out like the canvas', () => {
    const svg = renderSvg(layoutOf('tuck-top'));
    expect(svg).toMatch(/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" [^>]*width="[\d.]+mm" height="[\d.]+mm"/);
    for (const layer of ['artwork', 'crease', 'cut', 'dimensions']) expect(svg).toContain(`<g id="${layer}"`);
    expect(svg).toContain('stroke="#E53E3E"');
    expect(svg).toContain('stroke-dasharray="4,4"');
    // Texts are outlined: filled paths in the colour of the element, no font needed to open the file.
    expect(svg).not.toContain('<text');
    expect(svg).not.toContain('font-family');
    expect(svg).toMatch(/<path d="M [^"]+Z" fill="#C0392B"\/>/);
    // Curved segments (pillow box) keep their curve commands, moved to the piece position.
    expect(renderSvg(layoutOf('pillow'))).toMatch(/<path d="M [\d. ]+Q /);
  });

  it('joins the cut segments of a box into one closed line', () => {
    const layout = buildPrintLayout({ title: 'x', structure: 'tuck-top', formulaVersion: 3, dimensions, elements: [] });
    const cut = layout.strokes.filter((stroke) => stroke.type === 'cut');
    expect(cut).toHaveLength(1);
    expect(cut[0].closed).toBe(true);
    expect(cut[0].d.endsWith('Z')).toBe(true);
    const cutSegments = layout.pieces[0].geometry.segments.filter((segment) => segment.type === 'cut');
    expect(cut[0].points).toHaveLength(cutSegments.length);
    // Collinear creases across panels become one line.
    const creases = layout.strokes.filter((stroke) => stroke.type === 'crease');
    expect(creases.length).toBeLessThan(layout.pieces[0].geometry.segments.filter((s) => s.type === 'crease').length);
  });

  it.each(['tuck-top', 'pillow', 'lid-base', 'sleeve-drawer'])(
    '%s (current formulas): every piece has exactly one closed cut line, curves sampled for DXF',
    (structure) => {
      const layout = buildPrintLayout({
        title: 'x',
        structure,
        formulaVersion: CURRENT_FORMULA_VERSION,
        dimensions,
        elements: [],
      });
      for (const piece of layout.pieces) {
        const cut = strokesOf(piece).filter((stroke) => stroke.type === 'cut');
        expect([piece.name, cut.length, cut[0]?.closed]).toEqual([piece.name, 1, true]);
      }
      if (structure === 'pillow') {
        // Each curve of the outline adds many points, all within the sheet.
        const [cut] = layout.strokes.filter((stroke) => stroke.type === 'cut');
        expect(cut.points.length).toBeGreaterThan(40);
        for (const [x, y] of cut.points) {
          expect(x).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-3);
          expect(y).toBeGreaterThanOrEqual(SHEET_MARGIN_MM - 1e-3);
        }
      }
    },
  );

  it('keeps images in proportion and rotates elements around their centre, like the canvas', () => {
    const element = { ...greeting, id: 'png', type: 'image' as const, content: 'https://cdn/users/u/a.png', rotation: 30 };
    const layout = layoutOf('tuck-top', [element, { ...greeting, rotation: 30 }]);
    const svg = renderSvg(layout, new Map([['https://cdn/users/u/a.png', { body: Buffer.from('x'), contentType: 'image/png' }]]));
    const [image] = layout.images;
    const centre = `${image.x + image.width / 2} ${image.y + image.height / 2}`;
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg.match(new RegExp(`rotate\\(30 ${centre}\\)`, 'g'))).toHaveLength(2);
  });

  it('writes a vector PDF of the sheet size with every text outlined (no font in the file)', async () => {
    const layout = layoutOf('lid-base');
    const home = await renderPdf(layout, new Map(), { withCropMarks: true });
    const pdf = await renderPdf(layout);
    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.6');
    for (const file of [home, pdf]) expect(file.toString('latin1')).not.toMatch(/\/FontFile|\/Type \/Font/);
    const text = pdf.toString('latin1');
    const [width, height] = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(text)!.slice(1).map(Number);
    expect(width).toBeCloseTo((layout.width * 72) / 25.4, 1);
    expect(height).toBeCloseTo((layout.height * 72) / 25.4, 1);
  });

  it('is ready for the print shop: layers, CutContour / Crease spot colors with overprint, trim and bleed boxes', async () => {
    const layout = buildPrintLayout({ title: 'x', structure: 'tuck-top', formulaVersion: 2, dimensions, elements: [greeting] });
    const text = (await renderPdf(layout)).toString('latin1');
    for (const layer of PRINT_LAYERS) expect(text).toMatch(new RegExp(`/Type /OCG\\s+/Name \\(${layer}\\)`));
    expect(text).toContain('/OCProperties');
    // Dimensions is shown on screen, never printed.
    expect(text).toMatch(/\/Name \(Dimensions\)\s+\/Usage <<\s+\/Print <<\s+\/PrintState \/OFF/);
    expect(text).toMatch(/\[\/Separation \/CutContour \/DeviceCMYK/);
    expect(text).toMatch(/\[\/Separation \/Crease \/DeviceCMYK/);
    expect(text).toMatch(/\/OP true\s+\/op true\s+\/OPM 1/);

    const box = (name: string) => /\[([\d. ]+)\]/.exec(text.slice(text.indexOf(`/${name}`)))![1].split(' ').map(Number);
    const pt = (mm: number) => (mm * 72) / 25.4;
    const piece = layout.pieces[0];
    const trim = box('TrimBox');
    expect(trim[0]).toBeCloseTo(pt(piece.x), 2);
    expect(trim[2]).toBeCloseTo(pt(piece.x + piece.geometry.totalBoundingBox.width), 2);
    expect(trim[3]).toBeCloseTo(pt(layout.height - piece.y), 2);
    const bleed = box('BleedBox');
    expect(bleed[0]).toBeCloseTo(trim[0] - pt(BLEED_BOX_MM), 2);
    expect(bleed[3]).toBeCloseTo(trim[3] + pt(BLEED_BOX_MM), 2);
  });

  it('outlines the texts with the font chosen in the editor', () => {
    const styled = { ...greeting, style: { ...greeting.style, fontFamily: "'Cormorant Garamond', serif" } };
    const pathOf = (svg: string) => /<path d="([^"]+)" fill="#C0392B"/.exec(svg)![1];
    expect(pathOf(renderSvg(layoutOf('tuck-top', [styled])))).not.toBe(pathOf(renderSvg(layoutOf('tuck-top'))));
  });

  it('draws barcodes as vectors: EAN-13 bars and QR modules in black on a white box', () => {
    const code = { ...greeting, id: 'ean', type: 'barcode' as const, content: '8938501234567', width: 42, height: 22 };
    const qr = { ...code, id: 'qr', content: 'https://wrapfit.vn/u/abc', width: 28, height: 28, x: 30 };
    const svg = renderSvg(layoutOf('tuck-top', [code, qr]));
    expect(svg.match(/<rect [^>]*fill="#FFFFFF"\/><path d="M [^"]+" fill="#000000"\/>/g)).toHaveLength(2);
    expect(svg).not.toContain('<image');
  });

  it('embeds the artwork: every image format, in CMYK in the PDF', async () => {
    const png = await QRCode.toBuffer('wrapfit', { type: 'png', width: 64 });
    const elements = [
      { ...greeting, id: 'png', type: 'image' as const, content: 'https://cdn/users/u/a.png' },
      { ...greeting, id: 'svg', type: 'logo' as const, content: 'https://cdn/users/u/b.svg' },
    ];
    const layout = layoutOf('tuck-top', elements);
    const artwork: Artwork = new Map([
      ['https://cdn/users/u/a.png', { body: png, contentType: 'image/png' }],
      ['https://cdn/users/u/b.svg', { body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'), contentType: 'image/svg+xml' }],
    ]);

    const svg = renderSvg(layout, artwork);
    expect(svg.match(/<image /g)).toHaveLength(2);
    expect(svg).toContain('href="data:image/svg+xml;base64,');

    const [resolution] = await imageResolutions(layout, artwork);
    // 64 px over the 10 mm the square image prints at (it fits the 10 mm height of its box): 163 DPI, under 300.
    expect(resolution.dpi).toBe(163);
    const pdfWith = async (files: Artwork) => (await renderPdf(layout, files)).toString('latin1');
    const both = await pdfWith(artwork);
    expect(both.match(/\/ColorSpace \/DeviceCMYK/g)).toHaveLength(2);
    expect(both).not.toContain('/DeviceRGB');
    // The SVG logo is rasterised for the PDF too; without artwork nothing is drawn.
    artwork.delete('https://cdn/users/u/a.png');
    expect(await pdfWith(artwork)).toContain('/Subtype /Image');
    expect(await pdfWith(new Map())).not.toContain('/Subtype /Image');
  });

  it('packs the .ai source, the PDF, a JPG proof, SVG, DXF and the checklist for the print shop', async () => {
    const zip = unzipSync(await renderPrintPackage(layoutOf('tuck-top'), new Map(), 'hop-nen-tet'));
    expect(Object.keys(zip).sort()).toEqual([
      'DOC-TRUOC-KHI-IN.txt',
      'hop-nen-tet-print.pdf',
      'hop-nen-tet-proof.jpg',
      'hop-nen-tet.ai',
      'hop-nen-tet.dxf',
      'hop-nen-tet.svg',
    ]);
    expect(strFromU8(zip['hop-nen-tet.ai'].subarray(0, 5))).toBe('%PDF-');
    expect([...zip['hop-nen-tet-proof.jpg'].subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect(strFromU8(zip['DOC-TRUOC-KHI-IN.txt'])).toContain('CMYK');
  });

  it('writes a DXF in mm with CUT and CREASE layers', () => {
    const layout = layoutOf('sleeve-drawer');
    const dxf = renderDxf(layout);
    expect(dxf.startsWith('0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n')).toBe(true);
    expect(dxf).toContain('\nLAYER\n2\nCUT\n');
    expect(dxf).toContain('\nLAYER\n2\nCREASE\n');
    // One POLYLINE per continuous line of both pieces (sleeve + drawer), no loose LINE entities.
    expect(dxf.match(/\nPOLYLINE\n/g)).toHaveLength(layout.strokes.length);
    expect(dxf.match(/\nSEQEND\n/g)).toHaveLength(layout.strokes.length);
    const vertices = layout.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
    expect(dxf.match(/\nVERTEX\n/g)).toHaveLength(vertices);
    expect(dxf).not.toMatch(/\nLINE\n/);
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
  });

  it('converts artwork colors to CMYK and names files safely', () => {
    expect(hexToCmyk('#000000')).toEqual([0, 0, 0, 100]);
    expect(hexToCmyk('#FF0000')).toEqual([0, 100, 100, 0]);
    expect(hexToCmyk('#FFFFFF')).toEqual([0, 0, 0, 0]);
    expect(fileNameFor('Hộp nến Tết Đoàn Viên!', 'PDF_CMYK')).toBe('hop-nen-tet-doan-vien-pdf-cmyk.pdf');
    expect(fileNameFor('***', 'DXF')).toBe('wrapfit-dxf.dxf');
  });
});
