import sharp from 'sharp';
import { inspectLibraryFile, LibraryFileError, svgProblems } from './library-file.rules';

describe('library file checks', () => {
  it('accepts a plain SVG and refuses scripts, event handlers and outside references', () => {
    expect(svgProblems('<svg xmlns="http://www.w3.org/2000/svg"><use href="#a"/><image href="data:image/png;base64,AA"/></svg>')).toEqual([]);
    expect(svgProblems('<svg><script>alert(1)</script></svg>')).toContain('chứa <script>');
    expect(svgProblems('<svg onload="x()"></svg>')).toHaveLength(1);
    expect(svgProblems('<svg><image xlink:href="https://evil.example/a.png"/></svg>')).toContain('liên kết ra file bên ngoài');
    expect(svgProblems('<svg><rect style="fill:url(https://x/y)"/></svg>')).toContain('url() trỏ ra ngoài');
    expect(svgProblems('<html></html>')).toEqual(['không phải file SVG']);
  });

  it('measures rasters and refuses those too small to print 50 mm at 300 DPI', async () => {
    const png = (size: number) =>
      sharp({ create: { width: size, height: size / 2, channels: 3, background: '#F26522' } }).png().toBuffer();
    await expect(inspectLibraryFile({ body: await png(1200), contentType: 'image/png' })).resolves.toEqual({
      isVector: false,
      widthPx: 1200,
      heightPx: 600,
      maxPrintMm: 101.6,
    });
    await expect(inspectLibraryFile({ body: await png(400), contentType: 'image/png' })).rejects.toBeInstanceOf(LibraryFileError);
    await expect(inspectLibraryFile({ body: Buffer.from('nope'), contentType: 'image/png' })).rejects.toThrow('Không đọc được ảnh');
  });

  it('keeps vectors as vectors', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle r="4"/></svg>');
    await expect(inspectLibraryFile({ body: svg, contentType: 'image/svg+xml' })).resolves.toMatchObject({ isVector: true, maxPrintMm: null });
  });
});
