/**
 * Recolouring of SVG logos and imported vector art (docs/23 S14). An SVG's colours are its fills, strokes and
 * gradient stops written as hex, rgb() or a few names; the user maps each to a new colour (`style.colorMap`), and the
 * editor, the 3D box and both print paths rewrite the file the same way before drawing it.
 */

export interface ColorSwap {
  /** Colour of the file, #RRGGBB. */
  from: string;
  /** Colour it prints in, #RRGGBB. */
  to: string;
}

const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  orange: "#FFA500",
  gray: "#808080",
  grey: "#808080",
};

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();

/** #RRGGBB of a CSS colour written in an SVG, or null (none, url(#…), currentColor, unknown names). */
export function normalizeSvgColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v.toUpperCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toUpperCase();
  const rgb = /^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)/.exec(v);
  if (rgb) {
    const channel = (c: string) => (c.endsWith("%") ? (parseFloat(c) * 255) / 100 : parseFloat(c));
    return `#${hex2(channel(rgb[1]))}${hex2(channel(rgb[2]))}${hex2(channel(rgb[3]))}`;
  }
  return NAMED[v] ?? null;
}

// Colour values in attributes (fill="…", stroke="…", stop-color="…") and in CSS (fill: …;) of style attributes and
// <style> blocks. Group 1 is the prefix kept as it is, group 2 the colour.
const COLOR_SPOTS = /((?:fill|stroke|stop-color|color|flood-color|lighting-color)\s*(?:=\s*["']|:\s*))(#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)|[a-zA-Z]+)/g;

/** Colours of an SVG, the most used first (an SVG without any fill draws in black). */
export function svgColorsOf(svg: string): string[] {
  const counts = new Map<string, number>();
  for (const match of svg.matchAll(COLOR_SPOTS)) {
    const color = normalizeSvgColor(match[2]);
    if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  // Shapes with no fill at all are black: the file's default colour is one the user may want to change too.
  if (/<(path|rect|circle|ellipse|polygon|text)\b(?![^>]*\b(?:fill\s*=|style\s*=\s*["'][^"']*\bfill\s*:))[^>]*>/i.test(svg) && !/<svg[^>]*\bfill\s*=/i.test(svg) && !counts.has("#000000")) {
    counts.set("#000000", 0.5);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
}

/** Usable swaps only: both colours valid, a real change, one swap per source colour. */
export function cleanColorMap(map: readonly ColorSwap[] | null | undefined): ColorSwap[] {
  const seen = new Set<string>();
  const clean: ColorSwap[] = [];
  for (const swap of map ?? []) {
    const from = normalizeSvgColor(swap.from ?? "");
    const to = normalizeSvgColor(swap.to ?? "");
    if (!from || !to || from === to || seen.has(from)) continue;
    seen.add(from);
    clean.push({ from, to });
  }
  return clean;
}

/** The SVG with its colours swapped. Each colour is swapped once, so A→B with B→A trades them. */
export function recolorSvg(svg: string, map: readonly ColorSwap[] | null | undefined): string {
  const swaps = new Map(cleanColorMap(map).map((swap) => [swap.from, swap.to]));
  if (!swaps.size) return svg;
  let out = svg.replace(COLOR_SPOTS, (whole, prefix: string, value: string) => {
    const to = swaps.get(normalizeSvgColor(value) ?? "");
    return to ? `${prefix}${to}` : whole;
  });
  // The default black of shapes without a fill: set it on the root so it is inherited.
  const black = swaps.get("#000000");
  if (black) out = out.replace(/<svg\b(?![^>]*\bfill\s*=)/i, `<svg fill="${black}"`);
  return out;
}

/**
 * Swaps that dress an SVG in a palette: its most used colour takes the palette's base, the next its accent, the
 * next its ink (darkest colours to ink first when the file is mostly dark lettering).
 */
export function paletteColorMap(colors: readonly string[], palette: { base: string; accent: string; ink: string }): ColorSwap[] {
  const targets = [palette.base, palette.accent, palette.ink];
  return cleanColorMap(colors.slice(0, 6).map((from, i) => ({ from, to: targets[i % targets.length] })));
}

/** Data URI of an SVG text (the recoloured file drawn by <img>, canvas and PDF). */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
