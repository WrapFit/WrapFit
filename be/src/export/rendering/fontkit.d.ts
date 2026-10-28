// fontkit ships no types: the export renderers only read glyph outlines (`OutlineFont` of @wrapfit/shared).
declare module 'fontkit' {
  import type { OutlineFont } from '@wrapfit/shared';

  export function openSync(path: string): OutlineFont;
}
