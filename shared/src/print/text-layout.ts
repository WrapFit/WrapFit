/**
 * One text model for the editor canvas, the thumbnail and the print files (docs/12 Phase 9), so a text prints with the
 * font, size, line breaks, alignment and rotation it has on screen.
 *
 * - `style.fontSize` is in points (1 pt = 25.4 / 72 mm).
 * - Bold (700) unless `style.fontWeight` is 400; italic with `style.fontStyle` (TextFace, four files per family).
 * - Line height `style.lineHeight` (default 1.2) × the font size; `style.textTransform` changes the case first.
 * - Words wrap inside the element box; a word longer than the box is cut between characters. `\n` starts a new line.
 * - Lines follow `style.textAlign` (default centred), the block is centred vertically in the box.
 * - The element rotates around the centre of its box.
 *
 * Widths come from a `measure` callback (canvas 2D in the browser, PDFKit on the server) using the real font file.
 */

import type { CanvasElement } from "../types/project";

export const PT_TO_MM = 25.4 / 72;
export const DEFAULT_FONT_SIZE_PT = 12;
/** Weight of the texts that set no `fontWeight` (every text before docs/23). */
export const TEXT_FONT_WEIGHT = 700;
export const TEXT_LINE_HEIGHT = 1.2;
/** Baseline below the centre of a line, as a fraction of the font size (about half the cap height). */
const BASELINE_FROM_CENTER = 0.35;
const WIDTH_TOLERANCE_MM = 0.01;

/** Fonts the print files embed; any other family prints in Be Vietnam Pro. */
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

/** Weight and slant of a text: one font file each (Big Shoulders Display has no italic, see hasItalic). */
export type TextFace = "bold" | "regular" | "italic" | "boldItalic";
export const TEXT_FACES: readonly TextFace[] = ["bold", "regular", "italic", "boldItalic"];

/** Families printed without an italic file: their texts stay upright. */
const NO_ITALIC: ReadonlySet<PrintFontId> = new Set<PrintFontId>(["big-shoulders-display"]);

export function hasItalic(font: PrintFontId): boolean {
  return !NO_ITALIC.has(font);
}

/** The face a text style prints with. */
export function textFaceOf(style: CanvasElement["style"], font: PrintFontId = printFontOf(style?.fontFamily)): TextFace {
  const bold = style?.fontWeight !== 400;
  const italic = style?.fontStyle === "italic" && hasItalic(font);
  if (italic) return bold ? "boldItalic" : "italic";
  return bold ? "bold" : "regular";
}

/** CSS weight and style of a face (canvas 2D, SVG, @font-face). */
export function faceCss(face: TextFace): { weight: 400 | 700; style: "normal" | "italic" } {
  return {
    weight: face === "regular" || face === "italic" ? 400 : 700,
    style: face === "italic" || face === "boldItalic" ? "italic" : "normal",
  };
}

const FONT_FILE_STEM: Record<PrintFontId, string> = {
  "be-vietnam-pro": "BeVietnamPro",
  "playfair-display": "PlayfairDisplay",
  "cormorant-garamond": "CormorantGaramond",
  "big-shoulders-display": "BigShouldersDisplay",
  inter: "Inter",
};
const FACE_SUFFIX: Record<TextFace, string> = {
  regular: "400Regular",
  italic: "400Regular_Italic",
  bold: "700Bold",
  boldItalic: "700Bold_Italic",
};

/** The face actually printed: families without an italic file use the upright face of the same weight. */
export function printedFace(font: PrintFontId, face: TextFace): TextFace {
  if (hasItalic(font)) return face;
  return face === "italic" ? "regular" : face === "boldItalic" ? "bold" : face;
}

/** File name of a print font face, e.g. "BeVietnamPro_400Regular_Italic.ttf" (fe/src/assets/fonts/print). */
export function fontFileName(font: PrintFontId, face: TextFace): string {
  return `${FONT_FILE_STEM[font]}_${FACE_SUFFIX[printedFace(font, face)]}.ttf`;
}

/** Path of a print font face inside the @expo-google-fonts packages (the export worker loads them from there). */
export function fontPackagePath(font: PrintFontId, face: TextFace): string {
  const file = fontFileName(font, face);
  return font === "big-shoulders-display"
    ? `@expo-google-fonts/${font}/${file}`
    : `@expo-google-fonts/${font}/${FACE_SUFFIX[printedFace(font, face)]}/${file}`;
}

/** Width in mm of `text` set in `font` (face `face`, bold when omitted) at `fontSizeMm`. */
export type MeasureText = (text: string, font: PrintFontId, fontSizeMm: number, face?: TextFace, fontUrl?: string) => number;

export interface TextLine {
  text: string;
  /** Left of the line, mm from the left of the element box. */
  x: number;
  /** Alphabetic baseline, mm from the top of the element box. */
  baseline: number;
  width: number;
}

export interface TextBoxLayout {
  /** Built-in print font (the fallback when an uploaded font cannot load). */
  font: PrintFontId;
  /** Uploaded font file the text uses (docs/23 S13), null for the built-in fonts. */
  fontUrl: string | null;
  face: TextFace;
  /** Draw a bar under each line (underlineOf). */
  underline: boolean;
  /** Extra space after every character, mm (style.letterSpacing is in thousandths of an em). */
  spacingMm: number;
  /** Arc of a curved text in degrees (0 = straight): one line, bent with `arcPlacements` (print/outline). */
  curve: number;
  /** Outline of the letters (style.strokeColor / strokeWidth), drawn under the fill. */
  stroke: { color: string; widthMm: number } | null;
  fontSizeMm: number;
  lineHeightMm: number;
  lines: TextLine[];
}

/** Font size of a text element in mm. */
export function fontSizeMmOf(element: Pick<CanvasElement, "style">): number {
  const pt = element.style?.fontSize;
  return (typeof pt === "number" && pt > 0 ? pt : DEFAULT_FONT_SIZE_PT) * PT_TO_MM;
}

/** Line height of a style as a multiple of the font size (0.8..3). */
export function lineHeightOf(style: CanvasElement["style"]): number {
  const value = style?.lineHeight;
  return typeof value === "number" && Number.isFinite(value) ? Math.min(3, Math.max(0.8, value)) : TEXT_LINE_HEIGHT;
}

/** The words of a text with its case style applied (Vietnamese casing rules). */
export function displayedText(content: string, style: CanvasElement["style"]): string {
  if (style?.textTransform === "uppercase") return content.toLocaleUpperCase("vi");
  if (style?.textTransform === "lowercase") return content.toLocaleLowerCase("vi");
  return content;
}

/** Underline of one line: a bar under the baseline, box-local mm. */
export function underlineOf(line: TextLine, fontSizeMm: number): { x: number; y: number; width: number; height: number } {
  return { x: line.x, y: line.baseline + fontSizeMm * 0.12, width: line.width, height: Math.max(0.15, fontSizeMm * 0.06) };
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
  const style = element.style;
  const font = printFontOf(style?.fontFamily);
  const fontUrl = style?.fontUrl || null;
  // An uploaded font is one file: one face.
  const face: TextFace = fontUrl ? "regular" : textFaceOf(style, font);
  const fontSizeMm = fontSizeMmOf(element);
  const lineHeightMm = fontSizeMm * lineHeightOf(style);
  const maxWidth = Math.max(0, element.width) + WIDTH_TOLERANCE_MM;
  const spacingMm = ((style?.letterSpacing ?? 0) / 1000) * fontSizeMm;
  const widthOf = (text: string) => measure(text, font, fontSizeMm, face, fontUrl ?? undefined) + spacingMm * Array.from(text).length;
  const fits = (text: string) => widthOf(text) <= maxWidth;
  const align = style?.textAlign ?? "center";
  const curve = Math.max(-360, Math.min(360, style?.curve ?? 0));

  const words = displayedText(element.content, style).replace(/\r\n?/g, "\n");
  // A curved text is one line on its arc (docs/23 S9); a straight one wraps inside the box.
  const texts = curve
    ? [words.split(/\s+/).filter(Boolean).join(" ")]
    : words.split("\n").flatMap((paragraph) => wrapParagraph(paragraph, fits));
  const top = (element.height - texts.length * lineHeightMm) / 2;
  const lines = texts.map((text, index) => {
    const width = text ? widthOf(text) : 0;
    const x = curve || align === "center" ? (element.width - width) / 2 : align === "left" ? 0 : element.width - width;
    return {
      text,
      width,
      x,
      baseline: top + (index + 0.5) * lineHeightMm + BASELINE_FROM_CENTER * fontSizeMm,
    };
  });
  const stroke = style?.strokeColor && style.strokeWidth ? { color: style.strokeColor, widthMm: style.strokeWidth } : null;
  return { font, fontUrl, face, underline: !curve && style?.textDecoration === "underline", spacingMm, curve, stroke, fontSizeMm, lineHeightMm, lines };
}

/** Smallest box height (mm) that holds the lines of a text, for sizing a new text element. */
export function textBlockHeight(layout: TextBoxLayout): number {
  return layout.lines.length * layout.lineHeightMm;
}
