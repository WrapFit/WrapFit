/**
 * Animated GIF encoder for the folding-box clip (docs/23 S19), small and dependency-free: one global palette built by
 * median cut, LZW-compressed frames, and pixels that did not change since the previous frame written as transparent,
 * so the still background costs almost nothing after the first frame.
 */

/** Palette index kept for "same as the previous frame". */
const TRANSPARENT = 255;
const MAX_COLOURS = 255;

/** 15-bit colour key of an RGB pixel (5 bits per channel). */
const key15 = (r: number, g: number, b: number) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

export interface GifPalette {
  /** RGB triples, at most 255 colours (index 255 is the transparent one). */
  colours: Uint8Array;
  /** Palette index of every 15-bit colour key. */
  lookup: Uint8Array;
}

/**
 * Palette of up to 255 colours for RGBA frames (every `stride`-th pixel is sampled): median cut over a 15-bit
 * histogram, each colour the weighted mean of its box.
 */
export function buildGifPalette(frames: readonly Uint8ClampedArray[], stride = 3): GifPalette {
  const counts = new Uint32Array(32768);
  for (const pixels of frames) {
    for (let i = 0; i < pixels.length; i += 4 * stride) counts[key15(pixels[i], pixels[i + 1], pixels[i + 2])]++;
  }
  const keys: number[] = [];
  for (let k = 0; k < counts.length; k++) if (counts[k]) keys.push(k);
  const channel = (k: number, c: number) => (k >> (10 - 5 * c)) & 31;

  type Box = { keys: number[]; weight: number };
  const boxes: Box[] = [{ keys, weight: keys.reduce((s, k) => s + counts[k], 0) }];
  while (boxes.length < MAX_COLOURS) {
    // Split the heaviest box that still holds more than one colour, along its widest channel, at the weighted median.
    let best = -1;
    for (let i = 0; i < boxes.length; i++) if (boxes[i].keys.length > 1 && (best < 0 || boxes[i].weight > boxes[best].weight)) best = i;
    if (best < 0) break;
    const box = boxes[best];
    let widest = 0;
    let range = -1;
    for (let c = 0; c < 3; c++) {
      let lo = 31;
      let hi = 0;
      for (const k of box.keys) {
        const v = channel(k, c);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo > range) {
        range = hi - lo;
        widest = c;
      }
    }
    box.keys.sort((a, b) => channel(a, widest) - channel(b, widest));
    let half = 0;
    let cut = 0;
    while (cut < box.keys.length - 1 && half + counts[box.keys[cut]] <= box.weight / 2) half += counts[box.keys[cut++]];
    cut = Math.max(1, cut);
    const left = box.keys.slice(0, cut);
    const right = box.keys.slice(cut);
    const weightOf = (list: number[]) => list.reduce((s, k) => s + counts[k], 0);
    boxes.splice(best, 1, { keys: left, weight: weightOf(left) }, { keys: right, weight: weightOf(right) });
  }

  const colours = new Uint8Array(256 * 3);
  const lookup = new Uint8Array(32768);
  boxes.forEach((box, index) => {
    let r = 0;
    let g = 0;
    let b = 0;
    const w = Math.max(1, box.weight);
    for (const k of box.keys) {
      const n = counts[k];
      r += ((channel(k, 0) << 3) + 4) * n;
      g += ((channel(k, 1) << 3) + 4) * n;
      b += ((channel(k, 2) << 3) + 4) * n;
    }
    colours.set([Math.round(r / w), Math.round(g / w), Math.round(b / w)], index * 3);
    for (const k of box.keys) lookup[k] = index;
  });
  // Colours never sampled: the nearest palette colour.
  const used = Math.max(1, boxes.length);
  for (let k = 0; k < 32768; k++) {
    if (counts[k]) continue;
    const r = (channel(k, 0) << 3) + 4;
    const g = (channel(k, 1) << 3) + 4;
    const b = (channel(k, 2) << 3) + 4;
    let nearest = 0;
    let distance = Infinity;
    for (let i = 0; i < used; i++) {
      const d = (colours[i * 3] - r) ** 2 + (colours[i * 3 + 1] - g) ** 2 + (colours[i * 3 + 2] - b) ** 2;
      if (d < distance) {
        distance = d;
        nearest = i;
      }
    }
    lookup[k] = nearest;
  }
  return { colours, lookup };
}

/** Palette indices of an RGBA frame. */
export function indexFrame(pixels: Uint8ClampedArray, palette: GifPalette): Uint8Array {
  const out = new Uint8Array(pixels.length / 4);
  for (let i = 0, p = 0; p < out.length; i += 4, p++) out[p] = palette.lookup[key15(pixels[i], pixels[i + 1], pixels[i + 2])];
  return out;
}

/** LZW data of one frame (GIF flavour, minimum code size 8), split in sub-blocks of at most 255 bytes. */
export function lzwEncode(indices: Uint8Array): Uint8Array {
  const clear = 256;
  const end = 257;
  const out: number[] = [];
  let bits = 0;
  let accumulator = 0;
  let size = 9;
  const write = (code: number) => {
    accumulator |= code << bits;
    bits += size;
    while (bits >= 8) {
      out.push(accumulator & 0xff);
      accumulator >>>= 8;
      bits -= 8;
    }
  };
  let table = new Map<number, number>();
  let next = 258;
  write(clear);
  let prefix = indices.length ? indices[0] : 0;
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    write(prefix);
    if (next < 4096) {
      table.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else {
      write(clear);
      table = new Map();
      next = 258;
      size = 9;
    }
    prefix = k;
  }
  if (indices.length) write(prefix);
  write(end);
  if (bits > 0) out.push(accumulator & 0xff);

  const blocks: number[] = [8];
  for (let i = 0; i < out.length; i += 255) {
    const chunk = out.slice(i, i + 255);
    blocks.push(chunk.length, ...chunk);
  }
  blocks.push(0);
  return Uint8Array.from(blocks);
}

/**
 * Animated GIF written one frame at a time (the studio yields to the page between frames), looping forever,
 * `delayMs` per frame (GIF counts in 1/100 s). Pixels whose colour index did not change since the previous frame are
 * written transparent.
 */
export class GifWriter {
  private readonly parts: Uint8Array[] = [];
  private previous: Uint8Array | null = null;
  private readonly delay: number;

  constructor(
    private readonly width: number,
    private readonly height: number,
    delayMs: number,
    private readonly palette: GifPalette,
  ) {
    this.delay = Math.max(2, Math.round(delayMs / 10));
    const text = new TextEncoder();
    this.parts.push(text.encode("GIF89a"));
    this.bytes(...this.word(width), ...this.word(height), 0xf7, 0, 0); // global colour table of 256 entries
    this.parts.push(palette.colours);
    this.bytes(0x21, 0xff, 0x0b, ...text.encode("NETSCAPE2.0"), 0x03, 0x01, 0, 0, 0); // loop forever
  }

  private bytes(...values: number[]) {
    this.parts.push(Uint8Array.from(values));
  }

  private word(v: number) {
    return [v & 0xff, (v >> 8) & 0xff];
  }

  /** Adds an RGBA frame of the writer's size. */
  add(pixels: Uint8ClampedArray) {
    if (pixels.length !== this.width * this.height * 4) throw new Error("GIF frame size mismatch");
    const indices = indexFrame(pixels, this.palette);
    const written = indices.slice();
    const previous = this.previous;
    if (previous) for (let i = 0; i < written.length; i++) if (written[i] === previous[i]) written[i] = TRANSPARENT;
    // Graphic control: keep the previous frame (disposal 1), transparency on after the first frame.
    this.bytes(0x21, 0xf9, 0x04, (1 << 2) | (previous ? 1 : 0), ...this.word(this.delay), TRANSPARENT, 0);
    this.bytes(0x2c, 0, 0, 0, 0, ...this.word(this.width), ...this.word(this.height), 0);
    this.parts.push(lzwEncode(written));
    this.previous = indices;
  }

  /** The finished file. */
  finish(): Uint8Array {
    this.bytes(0x3b);
    const total = this.parts.reduce((sum, p) => sum + p.length, 0);
    const gif = new Uint8Array(total);
    let offset = 0;
    for (const p of this.parts) {
      gif.set(p, offset);
      offset += p.length;
    }
    return gif;
  }
}

/** Animated GIF of RGBA frames, all `width` × `height` (see GifWriter). */
export function encodeGif(frames: readonly Uint8ClampedArray[], width: number, height: number, delayMs: number, palette = buildGifPalette(frames)): Uint8Array {
  const writer = new GifWriter(width, height, delayMs, palette);
  for (const pixels of frames) writer.add(pixels);
  return writer.finish();
}
