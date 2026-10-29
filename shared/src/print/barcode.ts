/**
 * Barcode elements of the print files: an EAN-13 when the content is 12 or 13 digits, a QR code of the content
 * otherwise. Drawn as vector rectangles in plain black K100 on a white knockout of the whole element box (prepress
 * rule 6), never as an image. Coordinates are mm from the top-left of the element box.
 */

/** QR modules from the `qrcode` package (`QRCode.create(text).modules`): row-major, truthy = dark. */
export interface QrMatrix {
  size: number;
  data: ArrayLike<number | boolean>;
}

export interface BarcodeArt {
  kind: "ean13" | "qr";
  /** Dark modules, merged into runs. */
  bars: { x: number; y: number; width: number; height: number }[];
  /** Human-readable digits of an EAN-13 (centred on `x`). */
  digits: { text: string; x: number; baseline: number; sizeMm: number }[];
}

/** Quiet zone of a QR code, modules. */
const QR_QUIET = 4;
/** Quiet zones of an EAN-13, modules (left 11, right 7) around its 95 modules. */
const EAN_LEFT = 11;
const EAN_RIGHT = 7;

const L_CODES = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const R_CODES = L_CODES.map((code) => code.replace(/./g, (bit) => (bit === "0" ? "1" : "0")));
const G_CODES = R_CODES.map((code) => [...code].reverse().join(""));
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** Digits of an EAN-13 content, or null when the content is something else. */
export function ean13Digits(content: string): string | null {
  const digits = content.replace(/\s/g, "");
  return /^\d{12,13}$/.test(digits) ? digits : null;
}

/** Check digit of the first 12 digits of an EAN-13. */
export function ean13CheckDigit(digits: string): number {
  const sum = [...digits.slice(0, 12)].reduce((total, d, i) => total + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

/** A 13-digit EAN whose last digit does not match: scanners refuse it. 12 digits get their check digit added. */
export function isEan13Valid(content: string): boolean {
  const digits = ean13Digits(content);
  return !!digits && (digits.length === 12 || Number(digits[12]) === ean13CheckDigit(digits));
}

/** Modules of an EAN-13 (95 bits) and which of them are guard bars (drawn longer). */
function ean13Modules(digits: string): { bits: string; guard: boolean[] } {
  const full = digits.length === 12 ? digits + ean13CheckDigit(digits) : digits;
  const parity = PARITY[Number(full[0])];
  const left = [...full.slice(1, 7)].map((d, i) => (parity[i] === "L" ? L_CODES : G_CODES)[Number(d)]).join("");
  const right = [...full.slice(7)].map((d) => R_CODES[Number(d)]).join("");
  const parts: [string, boolean][] = [["101", true], [left, false], ["01010", true], [right, false], ["101", true]];
  return {
    bits: parts.map(([bits]) => bits).join(""),
    guard: parts.flatMap(([bits, guard]) => Array.from(bits, () => guard)),
  };
}

/** Joins dark modules of one row into runs. */
function runs(dark: (i: number) => boolean, count: number): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (!dark(i)) continue;
    const start = i;
    while (i + 1 < count && dark(i + 1)) i++;
    result.push([start, i + 1 - start]);
  }
  return result;
}

/** Vector art of a barcode element of `width` × `height` mm. A QR code needs its matrix (from the `qrcode` package). */
export function barcodeArt(content: string, width: number, height: number, qr?: QrMatrix | null): BarcodeArt | null {
  const digits = ean13Digits(content);
  if (digits) {
    const full = digits.length === 12 ? digits + ean13CheckDigit(digits) : digits;
    const { bits, guard } = ean13Modules(digits);
    const module = width / (EAN_LEFT + 95 + EAN_RIGHT);
    const sizeMm = Math.min(module * 9, height * 0.22);
    const barHeight = height - sizeMm * 1.25;
    const bars = runs((i) => bits[i] === "1", 95).map(([start, length]) => ({
      x: (EAN_LEFT + start) * module,
      y: 0,
      width: length * module,
      height: guard[start] ? barHeight + sizeMm * 0.6 : barHeight,
    }));
    const baseline = height - sizeMm * 0.15;
    const at = (index: number) => (EAN_LEFT + index) * module;
    const centred = (text: string, from: number, to: number) => ({ text, x: (at(from) + at(to)) / 2, baseline, sizeMm });
    return {
      kind: "ean13",
      bars,
      digits: [
        { text: full[0], x: (EAN_LEFT * module) / 2, baseline, sizeMm },
        centred(full.slice(1, 7), 3, 45),
        centred(full.slice(7), 50, 92),
      ],
    };
  }
  if (!qr || qr.size <= 0) return null;
  const side = Math.min(width, height);
  const module = side / (qr.size + 2 * QR_QUIET);
  const left = (width - side) / 2 + QR_QUIET * module;
  const top = (height - side) / 2 + QR_QUIET * module;
  const bars = [];
  for (let row = 0; row < qr.size; row++) {
    for (const [col, length] of runs((col) => !!qr.data[row * qr.size + col], qr.size)) {
      bars.push({ x: left + col * module, y: top + row * module, width: length * module, height: module });
    }
  }
  return { kind: "qr", bars, digits: [] };
}

/** Smallest printed size that still scans: EAN-13 at 80 % magnification, a QR code side, mm. */
export const MIN_BARCODE_MM = { ean13Width: 30, qrSide: 15 };
