"use client";

/**
 * Fonts the user uploads for a design (docs/23 S13, D11). In the browser a font is checked before it is uploaded
 * (it must open and draw every Vietnamese letter), then loaded as a FontFace under its family name, so the editor,
 * the 3D box and the offline print files measure and draw the texts with the very file the print worker uses.
 */
import { cleanFamilyName, missingVietnamese, type CustomFont, type GlyphFont } from "@wrapfit/shared";

const FONT_MIME: Record<string, string> = { ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2" };

/** Font files the studio accepts. */
export const FONT_ACCEPT = ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2";
export const MAX_FONT_BYTES = 10 * 1024 * 1024;

/** The file with the MIME type the API expects (browsers often send none for fonts). */
export function asFontFile(file: File): File | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = FONT_MIME[ext] ?? (Object.values(FONT_MIME).includes(file.type) ? file.type : null);
  return type ? new File([file], file.name, { type }) : null;
}

/** Opens a font file and checks the Vietnamese letters; the family name it will be listed under. */
export async function inspectFontFile(file: File): Promise<{ family: string; missing: string[] } | null> {
  try {
    // fontkit is large: loaded only when a font is checked.
    const { create: openFont } = await import("fontkit");
    const font = openFont(new Uint8Array(await file.arrayBuffer())) as unknown as GlyphFont;
    if (typeof font?.hasGlyphForCodePoint !== "function") return null;
    return { family: cleanFamilyName(font.familyName, file.name.replace(/\.[^.]+$/, "")), missing: missingVietnamese(font) };
  } catch {
    return null;
  }
}

/** Family name the page loaded each font file under. */
const families = new Map<string, string>();
const loading = new Map<string, Promise<void>>();

/** CSS family of an uploaded font file (its own name, quoted), or null when it is not registered. */
export function customFamilyOf(url: string | null | undefined): string | null {
  return url ? (families.get(url) ?? null) : null;
}

/** Loads an uploaded font on the page under its family name (once per file). */
export function registerCustomFont(font: CustomFont): Promise<void> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return Promise.resolve();
  if (!loading.has(font.url)) {
    // A family name unique to the file: two uploads with the same name never mix.
    const family = `${font.family} wf${families.size + 1}`;
    families.set(font.url, family);
    const face = new FontFace(family, `url(${JSON.stringify(font.url)})`);
    loading.set(
      font.url,
      face
        .load()
        .then((loaded) => {
          document.fonts.add(loaded);
        })
        .catch(() => {
          families.delete(font.url); // the built-in fallback font is used
        })
    );
  }
  return loading.get(font.url)!;
}

/** `font-family` of a text in an uploaded font, with a fallback. */
export const customFontCss = (url: string): string | null => {
  const family = customFamilyOf(url);
  return family ? `"${family}", sans-serif` : null;
};
