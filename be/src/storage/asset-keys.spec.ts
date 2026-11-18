import {
  assetUrl,
  configureAssetBase,
  disallowedFileContents,
  isAllowedFileContent,
  isAllowedMediaUrl,
  storedCanvasKeys,
  toClientBrandKit,
  toClientCanvas,
  toStoredCanvas,
  uploadKeyOf,
} from './asset-keys';

describe('asset keys', () => {
  const key = 'users/0192a4c0-0000-7000-8000-000000000001/image/0192a4c0-0000-7000-8000-0000000000aa.png';
  const element = (type: string, content: string) => ({ id: type, type, panelId: 'front', content });

  beforeEach(() => configureAssetBase('https://cdn.wrapfit.vn/'));
  afterAll(() => configureAssetBase(''));

  it('turns upload URLs into keys whatever the scheme, query or fragment', () => {
    expect(uploadKeyOf(`https://cdn.wrapfit.vn/${key}`)).toBe(key);
    expect(uploadKeyOf(`http://cdn.wrapfit.vn/${key}?v=2#x`)).toBe(key);
    expect(uploadKeyOf(`https://other.example/${key}`)).toBeNull();
    expect(uploadKeyOf('https://cdn.wrapfit.vn/projects/p-1/unboxing/qr-abc.png')).toBeNull(); // not an upload
    expect(uploadKeyOf('/branding/wrapfit-logo.png')).toBeNull();
    expect(uploadKeyOf('https://cdn.wrapfit.vn/users/a/image/%E0%A4%A.png')).toBeNull(); // malformed escape, no throw
  });

  it('builds URLs only while storage is enabled', () => {
    expect(assetUrl(key)).toBe(`https://cdn.wrapfit.vn/${key}`);
    expect(assetUrl(null)).toBeNull();
    configureAssetBase('');
    expect(assetUrl(key)).toBeNull();
    expect(uploadKeyOf(`https://cdn.wrapfit.vn/${key}`)).toBeNull();
  });

  it('stores canvas uploads as keys and returns them as URLs; other contents are kept as sent', () => {
    const client = {
      elements: [
        element('image', `https://cdn.wrapfit.vn/${key}`),
        element('logo', '/branding/wrapfit-logo.png'),
        element('pattern', 'https://images.example/pattern.svg'),
        element('text', `https://cdn.wrapfit.vn/${key}`), // text is never a file
      ],
      backgroundTheme: 'earthy_olive',
    };
    const stored = toStoredCanvas(client);
    expect(stored.elements.map((e) => e.content)).toEqual([
      key,
      '/branding/wrapfit-logo.png',
      'https://images.example/pattern.svg',
      `https://cdn.wrapfit.vn/${key}`,
    ]);
    expect(stored.backgroundTheme).toBe('earthy_olive');
    expect(toStoredCanvas(stored)).toEqual(stored); // idempotent
    expect(storedCanvasKeys(stored)).toEqual([key]);
    expect(toClientCanvas(stored)).toEqual(client);
  });

  it('returns the brand kit logo as a URL, and leaves kits saved before keys untouched', () => {
    expect(toClientBrandKit({ logoKey: key, colors: ['#111111'] })).toEqual({
      logoUrl: `https://cdn.wrapfit.vn/${key}`,
      colors: ['#111111'],
    });
    expect(toClientBrandKit({ logoKey: null, colors: [] })).toEqual({ logoUrl: null, colors: [] });
    expect(toClientBrandKit(null)).toBeNull();
  });

  it('only lets canvas files point at WrapFit: uploads, frontend paths and sticker labels', () => {
    for (const ok of [`https://cdn.wrapfit.vn/${key}`, key, '/branding/wrapfit-logo.png', 'Bé Gói Vẫy Tay', 'WrapFit Signature']) {
      expect(isAllowedFileContent(ok)).toBe(true);
    }
    for (const bad of [
      'https://tracker.example/pixel.png',
      'https://cdn.wrapfit.vn/projects/p-1/exports/x.pdf', // our host, but not an upload
      '//tracker.example/p.png',
      '\\\\tracker.example/p.png',
      'data:image/svg+xml,<svg/>',
      'javascript:alert(1)',
      ' java\tscript:alert(1)', // browsers drop the tab and the leading space

      'blob:https://wrapfit.vn/1',
    ]) {
      expect(isAllowedFileContent(bad)).toBe(false);
    }
  });

  it('lists the outside files a canvas adds, keeping those the saved design already shows', () => {
    const saved = { elements: [element('image', 'https://legacy.example/a.png')] };
    const next = {
      elements: [
        element('image', 'https://legacy.example/a.png'), // saved before the rule: kept
        element('logo', 'https://tracker.example/b.png'),
        element('logo', 'https://tracker.example/b.png'),
        element('text', 'https://example.com is printed as text'),
        element('pattern', '/patterns/tet.svg'),
      ],
    };
    expect(disallowedFileContents(next, saved)).toEqual(['https://tracker.example/b.png']);
    expect(disallowedFileContents(next)).toEqual(['https://legacy.example/a.png', 'https://tracker.example/b.png']);
  });

  it('only plays music from WrapFit', () => {
    expect(isAllowedMediaUrl('/audio/xuan.mp3')).toBe(true);
    expect(isAllowedMediaUrl(`https://cdn.wrapfit.vn/${key}`)).toBe(true);
    expect(isAllowedMediaUrl('https://tracker.example/a.mp3')).toBe(false);
    expect(isAllowedMediaUrl('//tracker.example/a.mp3')).toBe(false);
    expect(isAllowedMediaUrl('xuan.mp3')).toBe(false);
  });

  it('stores the uploaded fonts of a design as keys and refuses fonts from other hosts (docs/23 S13)', () => {
    const fontKey = 'users/0192a4c0-0000-7000-8000-000000000001/font/0192a4c0-0000-7000-8000-0000000000bb.ttf';
    const fontUrl = `https://cdn.wrapfit.vn/${fontKey}`;
    const client = {
      elements: [{ id: 't', type: 'text', panelId: 'front', content: 'Chào', style: { fontFamily: "'Nét Tay'", fontUrl } }],
      customFonts: [{ family: 'Nét Tay', url: fontUrl }],
    };
    const stored = toStoredCanvas(client);
    expect(stored.elements[0].style?.fontUrl).toBe(fontKey);
    expect(stored.customFonts?.[0].url).toBe(fontKey);
    expect(storedCanvasKeys(stored)).toEqual([fontKey]);
    expect(toClientCanvas(stored).customFonts?.[0].url).toBe(fontUrl);
    const foreign = { elements: [{ ...client.elements[0], style: { fontUrl: 'https://fonts.example/x.ttf' } }] };
    expect(disallowedFileContents(foreign)).toEqual(['https://fonts.example/x.ttf']);
    expect(disallowedFileContents({ elements: [], customFonts: [{ family: 'x', url: '/fonts/x.ttf' }] })).toEqual(['/fonts/x.ttf']);
    expect(disallowedFileContents(client)).toEqual([]);
  });
});
