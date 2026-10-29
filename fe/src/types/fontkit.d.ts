// fontkit ships no types: the offline print export only reads glyph outlines (`OutlineFont` of @wrapfit/shared).
declare module "fontkit" {
  export function create(buffer: Uint8Array): unknown;
}
