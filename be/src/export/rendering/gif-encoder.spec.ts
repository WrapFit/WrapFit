import { buildGifPalette, encodeGif, indexFrame, lzwEncode } from '@wrapfit/shared';

/** LZW codes of GIF image data (after the minimum code size byte), decoded as a browser does. */
function lzwDecode(blocks: Uint8Array, pixelCount: number): Uint8Array {
  expect(blocks[0]).toBe(8);
  const data: number[] = [];
  let i = 1;
  while (blocks[i] !== 0) {
    const n = blocks[i];
    data.push(...blocks.slice(i + 1, i + 1 + n));
    i += n + 1;
  }
  expect(i).toBe(blocks.length - 1);
  const out: number[] = [];
  let bit = 0;
  let size = 9;
  let dict: number[][] = [];
  let next = 258;
  const reset = () => {
    dict = Array.from({ length: 256 }, (_, k) => [k]);
    dict[256] = [];
    dict[257] = [];
    next = 258;
    size = 9;
  };
  reset();
  let prev: number[] | null = null;
  for (;;) {
    let code = 0;
    for (let b = 0; b < size; b++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << b;
    if (code === 256) {
      reset();
      prev = null;
      continue;
    }
    if (code === 257) break;
    let entry: number[];
    if (!prev) entry = dict[code];
    else if (code < next) {
      entry = dict[code];
      if (next < 4096) dict[next++] = [...prev, entry[0]];
    } else {
      entry = [...prev, prev[0]];
      dict[next++] = entry;
    }
    out.push(...entry);
    prev = entry;
    if (next === 1 << size && size < 12) size++;
  }
  expect(out).toHaveLength(pixelCount);
  return Uint8Array.from(out);
}

/** RGBA frame: a soft gradient with a square that moves with `t`. */
function frame(width: number, height: number, t: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = Math.abs(x - 10 - t * 3) < 6 && Math.abs(y - height / 2) < 6;
      pixels.set(inside ? [200, 60 + t * 10, 40, 255] : [240 - y, 236 - x / 2, 228, 255], i);
    }
  }
  return pixels;
}

describe('GIF encoder (docs/23 S19)', () => {
  it('LZW round-trips long runs, noise and table resets', () => {
    const runs = new Uint8Array(20_000).fill(7);
    const noise = Uint8Array.from({ length: 60_000 }, (_, i) => (i * 2654435761) % 251);
    const mixed = Uint8Array.from({ length: 30_000 }, (_, i) => (i % 97 < 60 ? 3 : i % 255));
    for (const indices of [runs, noise, mixed, Uint8Array.of(5)]) {
      expect(Array.from(lzwDecode(lzwEncode(indices), indices.length))).toEqual(Array.from(indices));
    }
  });

  it('builds a palette of at most 255 colours that keeps the colours of the frames close', () => {
    const frames = [frame(48, 32, 0), frame(48, 32, 4)];
    const palette = buildGifPalette(frames, 1);
    const indices = indexFrame(frames[0], palette);
    expect(Math.max(...indices)).toBeLessThan(255);
    for (let p = 0; p < indices.length; p += 37) {
      const c = indices[p] * 3;
      for (let ch = 0; ch < 3; ch++) expect(Math.abs(palette.colours[c + ch] - frames[0][p * 4 + ch])).toBeLessThanOrEqual(12);
    }
  });

  it('writes a looping GIF89a whose frames decode back, unchanged pixels transparent', () => {
    const width = 48;
    const height = 32;
    const frames = Array.from({ length: 6 }, (_, t) => frame(width, height, t));
    const palette = buildGifPalette(frames);
    const gif = encodeGif(frames, width, height, 80, palette);
    const text = (from: number, n: number) => String.fromCharCode(...gif.slice(from, from + n));
    expect(text(0, 6)).toBe('GIF89a');
    expect(gif[6] | (gif[7] << 8)).toBe(width);
    expect(gif[8] | (gif[9] << 8)).toBe(height);
    expect(gif[10]).toBe(0xf7);
    expect(text(13 + 768 + 3, 11)).toBe('NETSCAPE2.0');
    expect(gif[gif.length - 1]).toBe(0x3b);

    // Walk the frames: graphic control, image descriptor, LZW data.
    let at = 13 + 768 + 19;
    let shown: Uint8Array | null = null;
    for (const [n, pixels] of frames.entries()) {
      expect([gif[at], gif[at + 1]]).toEqual([0x21, 0xf9]);
      const flags = gif[at + 3];
      expect(flags & 1).toBe(n > 0 ? 1 : 0);
      expect(gif[at + 4] | (gif[at + 5] << 8)).toBe(8); // 80 ms
      at += 8;
      expect(gif[at]).toBe(0x2c);
      at += 10;
      let end = at + 1;
      while (gif[end] !== 0) end += gif[end] + 1;
      const decoded = lzwDecode(gif.slice(at, end + 1), width * height);
      at = end + 1;
      const expected = indexFrame(pixels, palette);
      const composed: Uint8Array = shown ? Uint8Array.from(decoded, (v, i) => (v === 255 ? shown![i] : v)) : decoded;
      expect(Array.from(composed)).toEqual(Array.from(expected));
      if (n > 0) expect(decoded.filter((v) => v === 255).length).toBeGreaterThan(width * height * 0.8);
      shown = composed;
    }
    expect(gif[at]).toBe(0x3b);
  });
});
