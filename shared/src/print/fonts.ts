/**
 * Fonts the user uploads (docs/23 S13, D11): accepted only when they draw every Vietnamese letter (a missing glyph
 * prints as an empty box), named by their family, measured and outlined with their own file in the print files.
 */
import type { CanvasElement } from "../types/project";

/** Every precomposed Vietnamese letter, lower and upper case. */
export const VIETNAMESE_LETTERS =
  "ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ";

/** The part of a fontkit font the check reads. */
export interface GlyphFont {
  hasGlyphForCodePoint(codePoint: number): boolean;
  familyName?: string;
}

/** Vietnamese letters (and plain ASCII letters / digits) the font cannot draw; empty when it covers them all. */
export function missingVietnamese(font: GlyphFont): string[] {
  const letters = `${VIETNAMESE_LETTERS}${VIETNAMESE_LETTERS.toLocaleUpperCase("vi")}abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
  return [...new Set(Array.from(letters))].filter((char) => !font.hasGlyphForCodePoint(char.codePointAt(0)!));
}

/** A family name safe for CSS and for `fontFamily` (letters, digits, spaces, - and _), at most 60 characters. */
export function cleanFamilyName(name: string | undefined, fallback = "Phông của tôi"): string {
  const clean = (name ?? "").replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return clean || fallback;
}

/** Upload font files a design's visible texts use (each once). */
export function fontUrlsOf(elements: Pick<CanvasElement, "type" | "hidden" | "style">[]): string[] {
  return [...new Set(elements.filter((el) => el.type === "text" && !el.hidden && el.style?.fontUrl).map((el) => el.style!.fontUrl!))];
}
