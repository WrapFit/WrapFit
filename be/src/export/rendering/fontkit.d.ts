// fontkit ships no types: the export renderers only read glyph outlines (`OutlineFont` of @wrapfit/shared).
declare module 'fontkit' {
  import type { OutlineFont } from '@wrapfit/shared';

  export function openSync(path: string): OutlineFont;
  /** A font from its bytes (uploaded fonts, docs/23 S13); throws on a file that is not a font. */
  export function create(buffer: Buffer): OutlineFont & { familyName?: string; hasGlyphForCodePoint(codePoint: number): boolean };
}
