// Built-in library of @wrapfit/shared (library/*): vector art, catalogue and generated templates. Tested here with the
// print renderers that draw them.
import {
  ART_DESIGNS,
  ART_PALETTES,
  checkBox,
  generateDielinePieces,
  generatedTemplates,
  dressTemplate,
  LIBRARY_ITEMS,
  libraryArt,
  libraryArtContent,
  MIN_LINE_MM,
  parseLibraryArt,
  rejectedTemplates,
  searchLibrary,
} from '@wrapfit/shared';
import { buildPrintLayout } from '../export/rendering/print-layout';
import { renderPdf, renderSvg } from '../export/rendering/print-renderers';
import { isAllowedFileContent } from '../storage';

describe('library vector art', () => {
  it.each(ART_DESIGNS.map((design) => design.id))('%s: stays inside its box, lines ≥ 0.15 mm, texts fit', (id) => {
    for (const [width, height] of [
      [32, 32],
      [64, 20],
      [120, 80],
    ]) {
      const art = libraryArt(libraryArtContent({ design: id, palette: ART_PALETTES[0].id }), width, height)!;
      expect(art.shapes.length).toBeGreaterThan(0);
      const numbers = art.shapes.flatMap((shape) => (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number));
      // Path data alternates x and y.
      numbers.forEach((value, i) => {
        expect(value).toBeGreaterThanOrEqual(-1e-6);
        expect(value).toBeLessThanOrEqual((i % 2 === 0 ? width : height) + 0.25 * height + 1e-6);
      });
      for (const shape of art.shapes) if (shape.stroke) expect(shape.strokeWidth).toBeGreaterThanOrEqual(MIN_LINE_MM);
      for (const text of art.texts) {
        expect(text.baseline).toBeLessThanOrEqual(height);
        expect(text.size).toBeGreaterThanOrEqual(1.6);
      }
    }
  });

  it('keeps the words and palette of a reference, falls back to the defaults', () => {
    const content = libraryArtContent({ design: 'seal', palette: 'xanh-reu', texts: ['TIỆM', 'Nhà | Mây'] });
    expect(parseLibraryArt(content)).toEqual({ design: 'seal', palette: 'xanh-reu', texts: ['TIỆM', 'Nhà / Mây', 'SINCE 2026'], icon: '' });
    expect(parseLibraryArt(libraryArtContent({ design: 'icon-badge', palette: 'son-do', icon: 'cake' }))?.icon).toBe('cake');
    expect(parseLibraryArt('wf-art:icon?p=son-do&i=nope')?.icon).toBe('gift');
    expect(parseLibraryArt('wf-art:seal?p=unknown')?.palette).toBe(ART_PALETTES[0].id);
    expect(parseLibraryArt('wf-art:nope')).toBeNull();
    expect(libraryArt('https://cdn/x.png', 10, 10)).toBeNull();
  });

  it('may stand on a saved canvas (drawn from code, never fetched)', () => {
    expect(isAllowedFileContent(libraryArtContent({ design: 'ribbon', palette: 'son-do' }))).toBe(true);
    expect(isAllowedFileContent('wf-art:<script>')).toBe(false);
  });
});

describe('library catalogue', () => {
  it('lists more than a hundred items, each drawable', () => {
    expect(LIBRARY_ITEMS.length).toBeGreaterThan(150);
    expect(new Set(LIBRARY_ITEMS.map((item) => item.id)).size).toBe(LIBRARY_ITEMS.length);
    for (const item of LIBRARY_ITEMS.filter((i) => i.content.startsWith('wf-art:'))) {
      expect(libraryArt(item.content, item.widthMm, item.heightMm)).not.toBeNull();
    }
  });

  it('searches without accents, by category and occasion', () => {
    expect(searchLibrary({ q: 'tet' }).every((item) => item.occasions.includes('TET') || /t[eế]t/i.test(item.name + item.keywords.join(' ')))).toBe(true);
    expect(searchLibrary({ q: 'cam on' }).length).toBeGreaterThan(0);
    expect(searchLibrary({ category: 'background', occasion: 'TET' }).every((item) => item.category === 'background')).toBe(true);
  });
});

describe('generated templates', () => {
  const templates = generatedTemplates();

  it('makes a hundred-odd designs, none turned down by FitCheck', () => {
    expect(templates.length).toBeGreaterThanOrEqual(100);
    expect(rejectedTemplates).toEqual([]);
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
    for (const id of templates.map((t) => t.id)) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('passes FitCheck with every element on a panel', () => {
    for (const template of templates) {
      const pieces = generateDielinePieces(template.structure, template.dimensions);
      const report = checkBox(pieces, template.canvasState.elements);
      expect([template.key, report.violations.filter((v) => v.severity !== 'info')]).toEqual([template.key, []]);
    }
  });

  it('dresses a template that came without artwork', () => {
    const elements = dressTemplate({
      structure: 'lid-base',
      dimensions: { length: 220, width: 160, height: 70, paperThickness: 0.49 },
      occasion: 'TET',
      title: 'Hộp Quà Tết Hoàng Kim — Ép Kim',
    });
    expect(elements.length).toBeGreaterThan(2);
    expect(elements.some((el) => el.content.startsWith('wf-art:'))).toBe(true);
  });

  it('prints its library art as vectors: shapes and outlined words, no font, no image', async () => {
    const template = templates.find((t) => t.structure === 'tuck-top')!;
    const layout = buildPrintLayout({
      title: template.title,
      structure: template.structure,
      formulaVersion: 3,
      dimensions: template.dimensions,
      elements: template.canvasState.elements,
    });
    expect(layout.arts.length).toBeGreaterThan(0);
    const svg = renderSvg(layout);
    expect(svg).not.toContain('<text');
    expect(svg.match(/<g transform="(rotate\([^)]*\) )?translate\(/g)?.length).toBe(layout.arts.length);
    const pdf = (await renderPdf(layout)).toString('latin1');
    expect(pdf).not.toMatch(/\/FontFile|\/Type \/Font|\/Subtype \/Image/);
  });
});
