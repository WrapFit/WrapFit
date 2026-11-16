import { sameJson } from './project-content';

describe('sameJson', () => {
  it('ignores the key order of objects, at any depth', () => {
    expect(sameJson({ a: 1, b: { c: [1, { d: 'x', e: null }] } }, { b: { c: [1, { e: null, d: 'x' }] }, a: 1 })).toBe(true);
  });

  it('treats a key holding undefined as absent, like JSON', () => {
    expect(sameJson({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 1, b: undefined })).toBe(true);
  });

  it('sees a changed value, a missing key, a null and a different array', () => {
    expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameJson({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(sameJson({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
    expect(sameJson({ a: null }, { a: {} })).toBe(false);
    expect(sameJson([1, 2], [2, 1])).toBe(false);
    expect(sameJson([1], { 0: 1 })).toBe(false);
    expect(sameJson('1', 1)).toBe(false);
  });

  it('compares class instances (validated DTOs) by their fields', () => {
    class Dimensions {
      length = 120;
      width = 80;
    }
    expect(sameJson(new Dimensions(), { width: 80, length: 120 })).toBe(true);
  });
});
