"use client";

import { useEffect, useState } from "react";
import {
  faceCss,
  layoutTextBox,
  PRINT_FONTS,
  printedFace,
  printFontOf,
  textFaceOf,
  type CanvasElement,
  type MeasureText,
  type PrintFontId,
  type TextBoxLayout,
  type TextFace,
} from "@wrapfit/shared";
import { PRINT_FONT_VARIABLES } from "@/assets/fonts";
import { customFamilyOf, customFontCss, registerCustomFont } from "@/features/studio/utils/customFonts";

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

/** CSS `font` shorthand of a print font face at `px` (canvas 2D, document.fonts.load). */
export function cssFont(font: PrintFontId, face: TextFace, px: number): string {
  const { weight, style } = faceCss(printedFace(font, face));
  return `${style === "italic" ? "italic " : ""}${weight} ${px}px ${cssFontFamily(font)}`;
}

/** SVG / style attributes of a text face: weight and slant the canvas draws with. */
export function faceAttributes(font: PrintFontId, face: TextFace): { fontWeight: 400 | 700; fontStyle: "normal" | "italic" } {
  const { weight, style } = faceCss(printedFace(font, face));
  return { fontWeight: weight, fontStyle: style };
}

/** Text width in mm with the font the page draws (the same files the print PDF embeds). */
export const measureInBrowser: MeasureText = (text, font, fontSizeMm, face = "bold", fontUrl) => {
  if (context === undefined) context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!context) return text.length * fontSizeMm * 0.55;
  // An uploaded font (docs/23 S13) once the page has loaded it; the built-in font until then.
  const custom = customFamilyOf(fontUrl);
  context.font = custom ? `${REFERENCE_PX}px "${custom}"` : cssFont(font, face, REFERENCE_PX);
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
/** CSS `font` of a laid-out text at `px`: its uploaded font when loaded, else its print font face. */
export function boxFontCss(box: TextBoxLayout, px: number): string {
  const custom = customFamilyOf(box.fontUrl);
  return custom ? `${px}px "${custom}"` : cssFont(box.font, box.face, px);
}

/** CSS `font-family` of a laid-out text (SVG). */
export function boxFontFamily(box: TextBoxLayout): string {
  return (box.fontUrl && customFontCss(box.fontUrl)) || cssFontFamily(box.font);
}

export function useBoxFonts(elements: CanvasElement[], extra: PrintFontId[] = []): number {
  const [version, setVersion] = useState(0);
  const used = elements
    .filter((el) => el.type === "text")
    .map((el) => {
      const font = printFontOf(el.style?.fontFamily);
      return `${font}:${textFaceOf(el.style, font)}`;
    });
  const key = [...new Set([...used, ...extra.map((font) => `${font}:bold`)])]
    .sort()
    .join(",");
  // Uploaded fonts of the texts (docs/23 S13): family name from the text's font-family, file from its fontUrl.
  const customKey = JSON.stringify(
    [
      ...new Map(
        elements
          .filter((el) => el.type === "text" && el.style?.fontUrl)
          .map((el) => [el.style!.fontUrl!, (el.style!.fontFamily ?? "").split(",")[0].replace(/["']/g, "").trim()] as const)
      ),
    ].sort()
  );
  useEffect(() => {
    const fonts = JSON.parse(customKey) as [string, string][];
    if (!fonts.length) return;
    let cancelled = false;
    void Promise.all(fonts.map(([url, family]) => registerCustomFont({ family, url }))).then(() => {
      if (!cancelled) setVersion((value) => value + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [customKey]);
  useEffect(() => {
    if (!key || typeof document === "undefined" || !document.fonts) return;
    let cancelled = false;
    const faces = key.split(",").map((entry) => entry.split(":") as [PrintFontId, TextFace]);
    void Promise.all(faces.map(([font, face]) => document.fonts.load(cssFont(font, face, 16))))
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
