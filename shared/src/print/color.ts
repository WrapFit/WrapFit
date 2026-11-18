/**
 * Screen colours and print colours (docs/23 S7). Screens show RGB; presses print CMYK, whose gamut is smaller: very
 * saturated greens, blues and violets print visibly duller. WrapFit has no ICC profile in the browser, so the check is
 * a heuristic on hue, saturation and brightness, worded as "may print duller", never as a blocking error.
 */
import type { Cmyk } from "./prepress";

function rgbOf(hex: string): [number, number, number] | null {
  const long = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  const parts = long ? long.slice(1) : short ? short.slice(1).map((h) => h + h) : null;
  return parts ? (parts.map((h) => parseInt(h, 16)) as [number, number, number]) : null;
}

/** Hue (0..360), saturation and value (0..1) of a colour. */
export function hsvOf(hex: string): { h: number; s: number; v: number } | null {
  const rgb = rgbOf(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max ? d / max : 0, v: max };
}

/** Would this screen colour print visibly duller in CMYK? (vivid greens, cyans, blues and violets) */
export function outOfPrintGamut(hex: string): boolean {
  const hsv = hsvOf(hex);
  if (!hsv) return false;
  return hsv.s >= 0.85 && hsv.v >= 0.75 && hsv.h >= 75 && hsv.h <= 300;
}

/** The screen colour of a CMYK ink (0..100 each), without a colour profile. */
export function cmykToHex([c, m, y, k]: Cmyk): string {
  const channel = (ink: number) => Math.round(255 * (1 - Math.min(100, Math.max(0, ink)) / 100) * (1 - Math.min(100, Math.max(0, k)) / 100));
  return `#${[channel(c), channel(m), channel(y)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** A calmer version of a colour that prints closer to what the screen shows (lower saturation and brightness). */
export function printSafeColor(hex: string): string {
  const hsv = hsvOf(hex);
  if (!hsv || !outOfPrintGamut(hex)) return hex.toUpperCase();
  const s = Math.min(hsv.s, 0.7);
  const v = Math.min(hsv.v, 0.8);
  const c = v * s;
  const x = c * (1 - Math.abs(((hsv.h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    hsv.h < 60 ? [c, x, 0] : hsv.h < 120 ? [x, c, 0] : hsv.h < 180 ? [0, c, x] : hsv.h < 240 ? [0, x, c] : hsv.h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((v2) => Math.round((v2 + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
