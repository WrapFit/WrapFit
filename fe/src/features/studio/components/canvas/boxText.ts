"use client";

import { useEffect, useState } from "react";
import {
  layoutTextBox,
  PRINT_FONTS,
  printFontOf,
  TEXT_FONT_WEIGHT,
  type CanvasElement,
  type MeasureText,
  type PrintFontId,
  type TextBoxLayout,
} from "@wrapfit/shared";
import { PRINT_FONT_VARIABLES } from "@/assets/fonts";

const families = new Map<PrintFontId, string>();

/** CSS `font-family` of a print font on this page: the family next/font loaded, its real name, then a fallback. */
export function cssFontFamily(font: PrintFontId): string {
  const named = `"${PRINT_FONTS[font]}", sans-serif`;
  if (typeof document === "undefined") return named;
  const cached = families.get(font);
  if (cached) return cached;
  const loaded = getComputedStyle(document.documentElement).getPropertyValue(PRINT_FONT_VARIABLES[font]).trim();
  if (!loaded) return named;
  const family = `${loaded}, ${named}`;
  families.set(font, family);
  return family;
}

let context: CanvasRenderingContext2D | null | undefined;
const REFERENCE_PX = 100;

/** Text width in mm with the font the page draws (the same files the print PDF embeds). */
export const measureInBrowser: MeasureText = (text, font, fontSizeMm) => {
  if (context === undefined) context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!context) return text.length * fontSizeMm * 0.55;
  context.font = `${TEXT_FONT_WEIGHT} ${REFERENCE_PX}px ${cssFontFamily(font)}`;
  return (context.measureText(text).width / REFERENCE_PX) * fontSizeMm;
};

/** Lines of a text element, laid out exactly like the print files (`layoutTextBox` of @wrapfit/shared). */
export function layoutBoxText(element: Pick<CanvasElement, "content" | "width" | "height" | "style">): TextBoxLayout {
  return layoutTextBox(element, measureInBrowser);
}

/**
 * Loads the print fonts the elements use (plus `extra`, e.g. the font of texts about to be added) and returns a
 * number that changes once they are ready, so texts first measured with a fallback font are laid out again.
 */
export function useBoxFonts(elements: CanvasElement[], extra: PrintFontId[] = []): number {
  const [version, setVersion] = useState(0);
  const used = elements.filter((el) => el.type === "text").map((el) => printFontOf(el.style?.fontFamily));
  const key = [...new Set([...used, ...extra])]
    .sort()
    .join(",");
  useEffect(() => {
    if (!key || typeof document === "undefined" || !document.fonts) return;
    let cancelled = false;
    const fonts = key.split(",") as PrintFontId[];
    void Promise.all(fonts.map((font) => document.fonts.load(`${TEXT_FONT_WEIGHT} 16px ${cssFontFamily(font)}`)))
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setVersion((value) => value + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return version;
}
