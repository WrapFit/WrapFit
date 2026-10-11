/**
 * One text model for the editor canvas, the thumbnail and the print files (docs/12 Phase 9), so a text prints with the
 * font, size, line breaks, alignment and rotation it has on screen.
 *
 * - `style.fontSize` is in points (1 pt = 25.4 / 72 mm).
 * - Bold (700), line height 1.2 × the font size.
 * - Words wrap inside the element box; a word longer than the box is cut between characters. `\n` starts a new line.
 * - Lines are centred horizontally, the block is centred vertically in the box.
 * - The element rotates around the centre of its box.
 *
 * Widths come from a `measure` callback (canvas 2D in the browser, PDFKit on the server) using the real font file.
 */

import type { CanvasElement } from "../types/project";

export const PT_TO_MM = 25.4 / 72;
export const DEFAULT_FONT_SIZE_PT = 12;
export const TEXT_FONT_WEIGHT = 700;
export const TEXT_LINE_HEIGHT = 1.2;
/** Baseline below the centre of a line, as a fraction of the font size (about half the cap height). */
const BASELINE_FROM_CENTER = 0.35;
const WIDTH_TOLERANCE_MM = 0.01;

/** Fonts the print files embed (bold); any other family prints in Be Vietnam Pro. */
export const PRINT_FONTS = {
  "be-vietnam-pro": "Be Vietnam Pro",
  "playfair-display": "Playfair Display",
  "cormorant-garamond": "Cormorant Garamond",
  "big-shoulders-display": "Big Shoulders Display",
  inter: "Inter",
} as const;

export type PrintFontId = keyof typeof PRINT_FONTS;
export const DEFAULT_PRINT_FONT: PrintFontId = "be-vietnam-pro";

/** The printed font of a CSS `font-family` list: its first family WrapFit prints, else Be Vietnam Pro. */
export function printFontOf(fontFamily: string | undefined): PrintFontId {
  for (const raw of (fontFamily ?? "").split(",")) {
    const name = raw.trim().replace(/^["']|["']$/g, "").toLowerCase();
    const match = (Object.keys(PRINT_FONTS) as PrintFontId[]).find((id) => PRINT_FONTS[id].toLowerCase() === name);
    if (match) return match;
  }
  return DEFAULT_PRINT_FONT;
}

/** Width in mm of `text` set in `font` at `fontSizeMm`. */
export type MeasureText = (text: string, font: PrintFontId, fontSizeMm: number) => number;

export interface TextLine {
  text: string;
  /** Left of the line, mm from the left of the element box. */
  x: number;
  /** Alphabetic baseline, mm from the top of the element box. */
  baseline: number;
  width: number;
}

export interface TextBoxLayout {
  font: PrintFontId;
  fontSizeMm: number;
  lineHeightMm: number;
  lines: TextLine[];
}

/** Font size of a text element in mm. */
export function fontSizeMmOf(element: Pick<CanvasElement, "style">): number {
  const pt = element.style?.fontSize;
  return (typeof pt === "number" && pt > 0 ? pt : DEFAULT_FONT_SIZE_PT) * PT_TO_MM;
}

function breakWord(word: string, fits: (text: string) => boolean): string[] {
  const parts: string[] = [];
  let current = "";
  for (const char of Array.from(word)) {
    if (current && !fits(current + char)) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** Greedy word wrap of one paragraph. */
function wrapParagraph(paragraph: string, fits: (text: string) => boolean): string[] {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (fits(word)) {
      current = word;
    } else {
      const pieces = breakWord(word, fits);
      current = pieces.pop() ?? "";
      lines.push(...pieces);
    }
  }
  lines.push(current);
  return lines;
}

/** Lines of a text element inside its box (box-local mm). */
export function layoutTextBox(
  element: Pick<CanvasElement, "content" | "width" | "height" | "style">,
  measure: MeasureText
): TextBoxLayout {
  const font = printFontOf(element.style?.fontFamily);
  const fontSizeMm = fontSizeMmOf(element);
  const lineHeightMm = fontSizeMm * TEXT_LINE_HEIGHT;
  const maxWidth = Math.max(0, element.width) + WIDTH_TOLERANCE_MM;
  const fits = (text: string) => measure(text, font, fontSizeMm) <= maxWidth;

  const texts = element.content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .flatMap((paragraph) => wrapParagraph(paragraph, fits));
  const top = (element.height - texts.length * lineHeightMm) / 2;
  const lines = texts.map((text, index) => {
    const width = text ? measure(text, font, fontSizeMm) : 0;
    return {
      text,
      width,
      x: (element.width - width) / 2,
      baseline: top + (index + 0.5) * lineHeightMm + BASELINE_FROM_CENTER * fontSizeMm,
    };
  });
  return { font, fontSizeMm, lineHeightMm, lines };
}

/** Smallest box height (mm) that holds the lines of a text, for sizing a new text element. */
export function textBlockHeight(layout: TextBoxLayout): number {
  return layout.lines.length * layout.lineHeightMm;
}
