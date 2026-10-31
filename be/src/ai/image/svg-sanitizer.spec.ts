import { InvalidSvgError, sanitizeSvg } from './svg-sanitizer';

describe('sanitizeSvg', () => {
  it('keeps the drawing: shapes, gradients and links inside the document', () => {
    const svg = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <defs><linearGradient id="g"><stop offset="0" stop-color="#f26522"/></linearGradient></defs>
      <g fill="url(#g)"><path d="M0 0L10 10"/><circle cx="5" cy="5" r="2"/></g>
      <use href="#g"/></svg>`);
    expect(svg).toContain('<linearGradient id="g">');
    expect(svg).toContain('fill="url(#g)"');
    expect(svg).toContain('<path d="M0 0L10 10"/>');
    expect(svg).toContain('<use href="#g"/>');
  });

  it('drops scripts, HTML, styles, raster images and comments', () => {
    const svg = sanitizeSvg(`<?xml version="1.0"?><!-- hi --><svg xmlns="http://www.w3.org/2000/svg">
      <script>alert(1)</script><style>@import url(https://evil.test/a.css);</style>
      <foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>
      <image href="https://evil.test/a.png"/><a href="https://evil.test"><rect width="1" height="1"/></a>
      <rect width="2" height="2"/></svg>`);
    expect(svg).not.toMatch(/script|style|foreignObject|<image|<a |evil|hi -->/);
    expect(svg).toContain('<rect width="2" height="2"/>');
  });

  it('drops event handlers, links and url() leaving the document', () => {
    const svg = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="alert(1)">
      <rect onclick="x()" fill="url(https://evil.test/p.svg#a)" style="fill:url('https://evil.test')" width="1" height="1"/>
      <use xlink:href="https://evil.test/x.svg#a"/><use href="javascript:alert(1)"/></svg>`);
    expect(svg).not.toMatch(/onload|onclick|evil|javascript/);
    expect(svg).toContain('<rect width="1" height="1"/>');
  });

  it('refuses something that is not an SVG', () => {
    expect(() => sanitizeSvg('<html><body>hi</body></html>')).toThrow(InvalidSvgError);
    expect(() => sanitizeSvg('not xml at all <')).toThrow(InvalidSvgError);
  });
});
