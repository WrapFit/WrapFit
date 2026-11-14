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
import { readFileSync } from 'fs';
import { create as createFont } from 'fontkit';
import {
  cleanFamilyName,
  fontUrlsOf,
  missingVietnamese,
  alignElements,
  applyFilters,
  arcPlacements,
  canGroup,
  distributeElements,
  groupElements,
  imageDraw,
  maskPath,
  resizeBox,
  selectionOf,
  snapBox,
  ungroupElements,
  cmykToHex,
  CURRENT_FORMULA_VERSION,
  FINISH_SPOTS,
  mirrorGeometry,
  mirrorPath,
  outOfPrintGamut,
  printSafeColor,
  printsInside,
  quoteFinishesOf,
  fitWatermark,
  layoutTextBox,
  printFontOf,
  PT_TO_MM,
  WATERMARK_SAFE_MM,
  WATERMARK_TEXT,
  watermarkPlacement,
} from '@wrapfit/shared';
import { strFromU8, unzipSync } from 'fflate';
import { inflateSync } from 'zlib';
import { checkProject } from '../../projects';
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
  svgImages,
  watermarkOutline,
} from './print-renderers';
import sharp from 'sharp';

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
      expect.objectContaining({ url: logo.content, type: 'logo', x: lid.x + top.bounds.x + 10, y: lid.y + top.bounds.y + 12, width: 60, height: 15, rotation: 15 }),
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

describe('layers of the design (docs/23)', () => {
  const square = { id: 's', type: 'shape' as const, panelId: 'front', x: 5, y: 5, width: 20, height: 20, rotation: 0, content: '', shape: { kind: 'rect' as const }, style: { fillColor: '#112233' } };

  it('prints every kind in the order of the layers, backgrounds first', () => {
    const layout = layoutOf('tuck-top', [greeting, square, { ...square, id: 'bg', type: 'pattern', content: 'wf-art:bg-solid?p=tet', shape: undefined }]);
    // The text is first in the array but the background goes under it; the square stays above the text.
    const order = [...layout.arts, ...layout.texts].sort((a, b) => a.order - b.order).map((item) => ('content' in item ? 'text' : item.background ? 'bg' : 'shape'));
    expect(order).toEqual(['bg', 'text', 'shape']);
    const svg = renderSvg(layout);
    expect(svg.indexOf('fill="#C0392B"')).toBeLessThan(svg.indexOf('fill="#112233"'));
  });

  it('leaves out hidden layers and the inside of the sheet', () => {
    expect(layoutOf('tuck-top', [{ ...greeting, hidden: true }]).texts).toEqual([]);
    expect(layoutOf('tuck-top', [{ ...greeting, side: 'inside' }]).texts).toEqual([]);
    const inside = buildPrintLayout({ title: 'x', structure: 'tuck-top', formulaVersion: 1, dimensions, elements: [{ ...greeting, side: 'inside' }], side: 'inside' });
    expect(inside.texts).toHaveLength(1);
  });

  it('cuts each element to its face plus the bleed, with its opacity and mirror', () => {
    const layout = layoutOf('tuck-top', [{ ...square, flipX: true, style: { fillColor: '#112233', opacity: 0.5 } }]);
    const front = layout.pieces[0].geometry.panels.find((p) => p.id === 'panel_front')!;
    const [art] = layout.arts;
    expect(art.clip.x).toBeLessThanOrEqual(SHEET_MARGIN_MM + front.bounds.x);
    expect(art.clip.width).toBeGreaterThanOrEqual(front.bounds.width);
    const svg = renderSvg(layout);
    expect(svg).toMatch(/<clipPath id="face1"><rect /);
    expect(svg).toContain('clip-path="url(#face1)" opacity="0.5"');
    expect(svg).toContain('matrix(-1 0 0 1 ');
  });

  it('lays a left-aligned regular text out like the canvas', () => {
    const measure = (text: string) => text.length;
    const layout = layoutTextBox({ content: 'ab', width: 10, height: 10, style: { textAlign: 'left', fontWeight: 400, fontStyle: 'italic', textTransform: 'uppercase' } }, measure);
    expect(layout.lines[0]).toMatchObject({ text: 'AB', x: 0 });
    expect(layout.face).toBe('italic');
  });

  it('draws a PDF with shapes and styled texts', async () => {
    const styled = { ...greeting, style: { ...greeting.style, fontWeight: 400 as const, fontStyle: 'italic' as const, textDecoration: 'underline' as const } };
    const pdf = await renderPdf(layoutOf('tuck-top', [square, styled]));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('inside print, finishes and print colours (docs/23 phase 2)', () => {
  const square = { id: 's', type: 'shape' as const, panelId: 'front', x: 5, y: 5, width: 20, height: 20, rotation: 0, content: '', shape: { kind: 'rect' as const }, style: { fillColor: '#112233' } };

  it('mirrors a path around the middle of the sheet (H takes x, V takes y)', () => {
    expect(mirrorPath('M 10 5 L 30 5 H 40 V 9 C 1 2 3 4 5 6 Z', 100)).toBe('M 90 5 L 70 5 H 60 V 9 C 99 2 97 4 95 6 Z');
  });

  it('mirrors the dieline: panels, glue areas and fold edges', () => {
    const [piece] = layoutOf('tuck-top').pieces;
    const mirrored = mirrorGeometry(piece.geometry);
    const width = piece.geometry.totalBoundingBox.width;
    piece.geometry.panels.forEach((panel, i) => {
      expect(mirrored.panels[i].bounds.x).toBeCloseTo(width - panel.bounds.x - panel.bounds.width);
      if (panel.fold?.edge === 'left') expect(mirrored.panels[i].fold?.edge).toBe('right');
    });
  });

  it('lays the inside out as its own sheet, mirrored, only when the design prints there', () => {
    expect(layoutOf('tuck-top').inside).toBeUndefined();
    const layout = layoutOf('tuck-top', [greeting, { ...greeting, id: 'in', side: 'inside', content: 'Cảm ơn bạn' }]);
    expect(layout.texts.map((t) => t.content)).toEqual([greeting.content]);
    expect(layout.inside?.texts.map((t) => t.content)).toEqual(['Cảm ơn bạn']);
    const front = layout.pieces[0].geometry.panels.find((p) => p.id === 'panel_front')!;
    const insideFront = layout.inside!.pieces[0].geometry.panels.find((p) => p.id === 'panel_front')!;
    expect(insideFront.bounds.x).toBeCloseTo(layout.pieces[0].geometry.totalBoundingBox.width - front.bounds.x - front.bounds.width);
    expect(printsInside([{ ...greeting, side: 'inside', hidden: true }])).toBe(false);
  });

  it('writes the inside as a second PDF page', async () => {
    const pdf = await renderPdf(layoutOf('tuck-top', [greeting, { ...greeting, id: 'in', side: 'inside' }]));
    const pages = pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? [];
    expect(pages).toHaveLength(2);
  });

  it('puts finished elements on the Finish layer in their spot colour', async () => {
    const layout = layoutOf('tuck-top', [{ ...square, finish: 'foil_gold' }]);
    const svg = renderSvg(layout);
    expect(svg).toContain('<g id="finish"');
    expect(svg).toContain(FINISH_SPOTS.foil_gold.display);
    const pdf = (await renderPdf(layout)).toString('latin1');
    expect(pdf).toContain(`/${FINISH_SPOTS.foil_gold.name}`);
  });

  it('prices the finishes of the elements and flags foil that is too fine', () => {
    expect(quoteFinishesOf([{ ...square, finish: 'foil_gold' }, { ...square, id: 't', finish: 'deboss' }, { ...square, id: 'h', finish: 'spot_uv', hidden: true }])).toEqual(['foil', 'emboss']);
    const tiny = { ...greeting, style: { ...greeting.style, fontSize: 6 }, finish: 'foil_silver' as const };
    const report = checkProject('tuck-top', dimensions, [tiny], 1);
    expect(report.violations.some((v) => v.id === `foil_${tiny.id}`)).toBe(true);
  });

  it('warns about vivid screen colours and small rich-black texts, and prints typed CMYK as is', () => {
    expect(outOfPrintGamut('#00FF66')).toBe(true);
    expect(outOfPrintGamut('#C0392B')).toBe(false);
    expect(outOfPrintGamut(printSafeColor('#0044FF'))).toBe(false);
    expect(cmykToHex([0, 0, 0, 100])).toBe('#000000');
    const vivid = { ...square, style: { fillColor: '#00FF66' } };
    expect(checkProject('tuck-top', dimensions, [vivid], 1).violations.some((v) => v.code === 'OUT_OF_GAMUT')).toBe(true);
    const richSmall = { ...greeting, style: { ...greeting.style, fontSize: 8, cmyk: [60, 40, 40, 100] as [number, number, number, number] } };
    expect(checkProject('tuck-top', dimensions, [richSmall], 1).violations.some((v) => v.id === `richblack_${richSmall.id}`)).toBe(true);
    const typed = layoutOf('tuck-top', [{ ...square, style: { fillColor: '#112233', cmyk: [10, 20, 30, 40] as [number, number, number, number] } }]);
    expect(typed.arts[0].art.shapes[0].cmyk).toEqual([10, 20, 30, 40]);
  });
});

describe('editing tools (docs/23 phase 3)', () => {
  const box = (id: string, x: number, y: number, extra: Partial<CanvasElement> = {}): CanvasElement => ({
    id,
    type: 'shape',
    panelId: 'front',
    x,
    y,
    width: 10,
    height: 10,
    rotation: 0,
    content: '',
    shape: { kind: 'rect' },
    ...extra,
  });

  it('resizes from a handle in the turned frame, keeping the opposite side or the centre', () => {
    const start = { x: 10, y: 10, width: 20, height: 10, rotation: 0 };
    expect(resizeBox(start, { sx: 1, sy: 0 }, { x: 5, y: 0 })).toEqual({ x: 10, y: 10, width: 25, height: 10 });
    expect(resizeBox(start, { sx: -1, sy: 0 }, { x: -5, y: 0 })).toEqual({ x: 5, y: 10, width: 25, height: 10 });
    expect(resizeBox(start, { sx: 1, sy: 1 }, { x: 20, y: 0 }, { keepRatio: true })).toMatchObject({ width: 40, height: 20 });
    expect(resizeBox(start, { sx: 1, sy: 0 }, { x: 5, y: 0 }, { fromCenter: true })).toEqual({ x: 5, y: 10, width: 30, height: 10 });
    // Turned 90°: the "right" side of the element points down the sheet, the left side stays put.
    const turned = resizeBox({ ...start, rotation: 90 }, { sx: 1, sy: 0 }, { x: 10, y: 0 });
    expect(turned.width).toBe(30);
    expect(turned.y + turned.height / 2).toBeCloseTo(15 + 5);
  });

  it('aligns, distributes and groups layers', () => {
    const els = [box('a', 0, 0), box('b', 30, 5), box('c', 12, 20)];
    expect(alignElements(els, ['a', 'b'], 'left', { width: 100, height: 100 }).find((e) => e.id === 'b')!.x).toBe(0);
    expect(alignElements(els, ['a'], 'center', { width: 100, height: 100 }).find((e) => e.id === 'a')!.x).toBe(45);
    const spread = distributeElements([box('a', 0, 0), box('b', 50, 0), box('c', 12, 0)], ['a', 'b', 'c'], 'x');
    expect(spread.find((e) => e.id === 'c')!.x).toBe(25);
    const grouped = groupElements(els, ['a', 'c'], 'g1');
    expect(selectionOf(grouped, 'a').sort()).toEqual(['a', 'c']);
    expect(selectionOf(ungroupElements(grouped, ['a']), 'a')).toEqual(['a']);
    expect(canGroup([box('a', 0, 0), box('b', 0, 0, { panelId: 'back' })], ['a', 'b'])).toBe(false);
  });

  it('snaps a moving box to the nearest line within the threshold', () => {
    const snap = snapBox({ x: 9.2, y: 40, width: 10, height: 10 }, [{ axis: 'x', at: 10 }, { axis: 'y', at: 70 }], 1.5);
    expect(snap.dx).toBeCloseTo(0.8);
    expect(snap.dy).toBe(0);
    expect(snap.hits).toEqual([{ axis: 'x', at: 10 }]);
  });

  it('frames photos: crop, cover, mask and adjustments', () => {
    const fit = imageDraw({ width: 20, height: 10 }, { width: 100, height: 100 });
    expect(fit).toMatchObject({ dx: 5, dw: 10, dh: 10, sw: 100 });
    const cover = imageDraw({ width: 20, height: 10, fit: 'fill' }, { width: 100, height: 100 });
    expect(cover).toMatchObject({ dx: 0, dw: 20, sx: 0, sw: 100, sh: 50, sy: 25 });
    const cropped = imageDraw({ width: 10, height: 10, crop: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }, fit: 'fill' }, { width: 200, height: 200 });
    expect(cropped).toMatchObject({ sx: 100, sy: 100, sw: 100, sh: 100 });
    expect(maskPath('circle', 10, 10)).toMatch(/^M 0 5 C/);
    expect(maskPath('rect', 10, 10)).toBeNull();
    const pixels = new Uint8Array([100, 100, 100, 255]);
    applyFilters(pixels, 4, { brightness: 50 });
    expect(pixels[0]).toBe(150);
  });

  it('lays out letter spacing and curved texts like the editor', () => {
    const measure = (text: string) => text.length;
    const plain = layoutTextBox({ content: 'abc', width: 100, height: 10, style: { fontSize: 10 } }, measure);
    const spaced = layoutTextBox({ content: 'abc', width: 100, height: 10, style: { fontSize: 10, letterSpacing: 100 } }, measure);
    expect(spaced.lines[0].width - plain.lines[0].width).toBeCloseTo(3 * spaced.spacingMm);
    const curved = layoutTextBox({ content: 'ab\ncd', width: 100, height: 10, style: { curve: 90 } }, measure);
    expect(curved.lines.map((l) => l.text)).toEqual(['ab cd']);
    const places = arcPlacements([10, 10], 90, 50, 20);
    expect(places[0].y).toBeGreaterThan(20); // the ends of an upward arch sit lower than its top
    expect(places[0].angle).toBeLessThan(0);
    expect(places[1].angle).toBeGreaterThan(0);
  });

  it('prints curved, spaced and outlined texts, and gradients in CMYK', async () => {
    const styled = { ...greeting, style: { ...greeting.style, curve: 120, letterSpacing: 50, strokeColor: '#FFFFFF', strokeWidth: 0.4 } };
    const gradient = box('g', 5, 5, { width: 30, height: 20, style: { gradient: { type: 'linear', angle: 0, stops: [{ offset: 0, color: '#FF0000' }, { offset: 1, color: '#0000FF' }] } } });
    const layout = layoutOf('tuck-top', [styled, gradient]);
    const svg = renderSvg(layout);
    expect(svg).toContain('paint-order="stroke"');
    expect(svg).toMatch(/<linearGradient id="grad\d+"/);
    const pdf = (await renderPdf(layout)).toString('latin1');
    expect(pdf).toMatch(/\/ShadingType 2/);
    expect(pdf).toMatch(/\/ColorSpace \/DeviceCMYK/);
  });

  it('prints a cropped, framed and adjusted photo', async () => {
    const png = await sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 200, g: 50, b: 50 } } }).png().toBuffer();
    const url = 'https://cdn/users/u/photo.png';
    const photo = { ...greeting, id: 'p', type: 'image' as const, content: url, width: 30, height: 30, crop: { x: 0.25, y: 0, width: 0.5, height: 1 }, fit: 'fill' as const, mask: 'circle' as const, style: { filters: { brightness: 20 } } };
    const layout = layoutOf('tuck-top', [photo]);
    expect(layout.images[0]).toMatchObject({ fit: 'fill', filters: { brightness: 20 } });
    expect(layout.images[0].mask).toMatch(/^M /);
    const artwork: Artwork = new Map([[url, { body: png, contentType: 'image/png' }]]);
    const prepared = await svgImages(layout, artwork);
    expect([...prepared.values()][0].dataUri).toMatch(/^data:image\/png;base64,/);
    const svg = renderSvg(layout, artwork, prepared);
    expect(svg).toMatch(/<clipPath id="mask1">/);
    const [resolution] = await imageResolutions(layout, artwork);
    expect(resolution.dpi).toBeGreaterThan(0);
    const pdf = await renderPdf(layout, artwork);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('uploaded fonts (docs/23 S13)', () => {
  const fontFile = (path: string) => readFileSync(require.resolve(path));
  const playfair = '@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf';

  it('accepts a font that draws every Vietnamese letter and lists what another one misses', () => {
    expect(missingVietnamese(createFont(fontFile(playfair)))).toEqual([]);
    const latinOnly = { hasGlyphForCodePoint: (cp: number) => cp < 0x80 };
    expect(missingVietnamese(latinOnly)).toEqual(expect.arrayContaining(['ă', 'đ', 'Ự']));
    expect(cleanFamilyName('My <Font>!')).toBe('My Font');
    expect(cleanFamilyName(undefined)).toBe('Phông của tôi');
  });

  it('prints a text with its uploaded font file, and falls back to the built-in one without it', () => {
    const url = 'https://cdn/users/u/font/a.ttf';
    const text = { ...greeting, style: { ...greeting.style, fontFamily: "'Nét Tay', sans-serif", fontUrl: url } };
    const layout = layoutOf('tuck-top', [text]);
    expect(fontUrlsOf([text])).toEqual([url]);
    const withFont = renderSvg(layout, new Map([[url, { body: fontFile(playfair), contentType: 'font/ttf' }]]));
    const without = renderSvg(layout);
    const path = (svg: string) => /<path d="([^"]+)" fill="#C0392B"/.exec(svg)?.[1];
    expect(path(withFont)).toBeTruthy();
    expect(path(without)).toBeTruthy();
    expect(path(withFont)).not.toBe(path(without));
  });
});

describe('print renderers', () => {
  it('writes a layered SVG at true size with the text laid out like the canvas', () => {
    const svg = renderSvg(layoutOf('tuck-top'));
    expect(svg).toMatch(/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" [^>]*width="[\d.]+mm" height="[\d.]+mm"/);
    for (const layer of ['artwork', 'cut', 'dimensions']) expect(svg).toContain(`<g id="${layer}"`);
    // No dashed fold lines in the print file.
    expect(svg).not.toContain('<g id="crease"');
    expect(svg).not.toContain('stroke-dasharray');
    expect(svg).toContain('stroke="#E53E3E"');
    // Texts are outlined: filled paths in the colour of the element, no font needed to open the file.
    expect(svg).not.toContain('<text');
    expect(svg).not.toContain('font-family');
    expect(svg).toMatch(/<path d="M [^"]+Z" fill="#C0392B"\/>/);
    // Curved segments (pillow box) keep their curve commands, moved to the piece position.
    // (The curved fold lines are kept in the layout for the DXF, not drawn in the SVG print file.)
    expect(layoutOf('pillow').strokes.some((stroke) => / Q /.test(stroke.d))).toBe(true);
  });

  it('prints the spec line (L x W x H, paper) on the Artwork layer, in the margin below the cut and the bleed', () => {
    const layout = layoutOf('tuck-top');
    const svg = renderSvg(layout);
    // A layer runs up to the next layer (elements are nested groups inside it).
    const group = (id: string) => {
      const start = svg.indexOf(`<g id="${id}"`);
      const next = svg.indexOf('<g id="', start + 1);
      return svg.slice(start, next < 0 ? undefined : next);
    };
    expect(group('artwork')).toContain('fill="#64748B"');
    expect(group('dimensions')).not.toContain('fill="#64748B" d=');
    const bottom = Math.max(...layout.pieces.map((p) => p.y + p.geometry.totalBoundingBox.height));
    const ys = /fill="#64748B" d="([^"]+)"/
      .exec(group('artwork'))![1]
      .match(/-?\d+(\.\d+)?/g)!
      .map(Number)
      .filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(bottom + 5);
    expect(Math.max(...ys)).toBeLessThan(layout.height);
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
    expect(text).not.toMatch(/\/Name \(Crease\)/);
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

describe('watermark of the free A4 PDF', () => {
  const current = (structure: string, elements: CanvasElement[] = [greeting]) =>
    buildPrintLayout({ title: 'Hộp nến Tết', structure, formulaVersion: CURRENT_FORMULA_VERSION, dimensions, elements });
  /** Every "x y" point of a path. */
  const pointsOf = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const glueAreasOf = (layout: ReturnType<typeof current>) =>
    layout.pieces.flatMap((piece) =>
      (piece.geometry.glueAreas ?? []).map((a) => ({ left: piece.x + a.x, top: piece.y + a.y, right: piece.x + a.x + a.width, bottom: piece.y + a.y + a.height })),
    );
  const inside = (points: number[][], box: { left: number; top: number; right: number; bottom: number }) =>
    points.every(([x, y]) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);

  it.each(['tuck-top', 'pillow', 'sleeve-drawer', 'lid-base'])('puts it on a glue flap of the %s, 6 pt when it fits', (structure) => {
    const layout = current(structure);
    const mark = watermarkOutline(layout)!;
    expect(mark.placement.source).toBe('glue');
    const points = pointsOf(mark.d);
    expect(points.length).toBeGreaterThan(50);
    // Every point of the outlines lies inside one glue area.
    expect(glueAreasOf(layout).some((area) => inside(points, area))).toBe(true);
    if (structure === 'tuck-top') {
      // A tall, narrow flap: the line runs along it, at the full 6 pt.
      expect(mark.placement.rotation).toBe(-90);
      expect(mark.sizeMm).toBeCloseTo(6 * PT_TO_MM, 3);
    }
  });

  it('falls back to a band at the bottom of the largest panel, inside the 3 mm safe margin', () => {
    const layout = current('sticker-label', []);
    const placement = watermarkPlacement(layout.pieces)!;
    expect(placement).toMatchObject({ source: 'panel', rotation: 0 });
    const piece = layout.pieces[0];
    const panel = piece.geometry.panels[0].bounds;
    expect(placement.x).toBeCloseTo(piece.x + panel.x + WATERMARK_SAFE_MM);
    expect(placement.y + placement.height).toBeCloseTo(piece.y + panel.y + panel.height - WATERMARK_SAFE_MM);
    const points = pointsOf(watermarkOutline(layout)!.d);
    expect(
      inside(points, {
        left: piece.x + panel.x + WATERMARK_SAFE_MM,
        right: piece.x + panel.x + panel.width - WATERMARK_SAFE_MM,
        top: piece.y + panel.y,
        bottom: piece.y + panel.y + panel.height - WATERMARK_SAFE_MM,
      }),
    ).toBe(true);
    // Projects pinned to formulas without glue areas (version 1) use the band too.
    expect(watermarkPlacement(layoutOf('tuck-top').pieces)).toMatchObject({ source: 'panel' });
  });

  it('shrinks the text when the run is too short, and centres it', () => {
    const placement = { x: 10, y: 20, width: 30, height: 4, rotation: 0 as const, source: 'panel' as const };
    // 20 mm of text per mm of font size: 6 pt (2.12 mm) would need 42 mm, the box has 30.
    const fit = fitWatermark(placement, (size: number) => size * 20);
    expect(fit.sizeMm).toBeCloseTo(1.5); // 30 mm run / 20
    expect(fit.length).toBeCloseTo(30);
    expect(fit.origin.x).toBeCloseTo(10);
    expect(watermarkPlacement([])).toBeNull();
  });

  it('is drawn only on watermarked PDFs, in the Artwork layer, and readable as text', async () => {
    const layout = current('tuck-top');
    const streams = (pdf: Buffer) => {
      const text = pdf.toString('latin1');
      const out: string[] = [];
      for (const match of text.matchAll(/stream\s/g)) {
        const start = match.index! + match[0].length;
        const end = text.indexOf('endstream', start);
        try {
          out.push(inflateSync(pdf.subarray(start, end)).toString('latin1'));
        } catch {
          // not a Flate stream (images are raw)
        }
      }
      return out.join('\n');
    };
    const hex = `FEFF${Buffer.from(WATERMARK_TEXT, 'utf16le').swap16().toString('hex').toUpperCase()}`;
    const plain = streams(await renderPdf(layout, new Map(), { withCropMarks: true, paperSize: 'A4' }));
    expect(plain).not.toContain('/ActualText');

    const pdf = await renderPdf(layout, new Map(), { withCropMarks: true, paperSize: 'A4', watermarked: true });
    expect(pdf.toString('latin1')).not.toMatch(/\/FontFile|\/Type \/Font/); // outlined like every text
    const content = streams(pdf);
    const start = content.indexOf(`/Span <</ActualText <${hex}>>> BDC`);
    expect(start).toBeGreaterThan(-1);
    // Inside the Artwork layer (L0), before the dielines.
    expect(content.lastIndexOf('/OC /L0 BDC', start)).toBeGreaterThan(-1);
    expect(content.indexOf(`/OC /L${PRINT_LAYERS.indexOf('CutContour')} BDC`)).toBeGreaterThan(start);
    // The drawing between BDC and EMC: sheet coordinates (the page offset is a cm before), all inside the glue flap.
    const body = content.slice(start, content.indexOf('EMC', start));
    const numbers = [...body.replace(/<[0-9A-F]+>/, '').matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) [mlc]/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    expect(numbers.length).toBeGreaterThan(50);
    expect(inside(numbers, glueAreasOf(layout)[0])).toBe(true);
  });

  it('is not a design element: FitCheck of the project is the same with or without it', () => {
    const report = checkProject('tuck-top', dimensions, [greeting], CURRENT_FORMULA_VERSION);
    expect(report.violations.map((v) => v.code)).not.toContain('GLUE_CONTAMINATED');
    expect(report.isValidForProduction).toBe(true);
  });
});
