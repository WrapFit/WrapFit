/**
 * One palette for the whole design (studio step 4, "Bảng màu"): recolours what the library drew and the free texts,
 * so the print file changes with what the screen shows. Uploaded images, logos files and barcodes keep their colours.
 *
 * Backgrounds take the palette itself; stickers and labels on top of a background take its partner palette, so a red
 * seal never vanishes into a red box. Free texts take the ink of the palette on a background, its main colour on paper.
 */
import type { CanvasElement } from "../types/project";
import { ART_PALETTES, artPaletteOf, libraryArtContent, parseLibraryArt } from "./art";

/** A palette that stands out on each palette (stickers on a background of that palette). */
export const PALETTE_PARTNERS: Record<string, string> = {
  "son-do": "kim-ngan",
  "kim-ngan": "son-do",
  "rung-thong": "kim-ngan",
  "hong-phan": "kem-sua",
  "kraft-moc": "kem-sua",
  "toi-gian": "den-sang",
  "xanh-reu": "kem-sua",
  "oai-huong": "kem-sua",
  "cam-fpt": "bien-xanh",
  "bien-xanh": "cam-fpt",
  "kem-sua": "cam-fpt",
  "den-sang": "kim-ngan",
};

const isLight = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.85;
};

/** Library backgrounds of the design (`pattern` elements drawn from `wf-art:`). */
export const hasLibraryBackground = (elements: CanvasElement[]) =>
  elements.some((el) => el.type === "pattern" && parseLibraryArt(el.content) !== null);

/** The design in another palette (see the file header). Unknown palette: unchanged. */
export function recolorDesign(elements: CanvasElement[], paletteId: string): CanvasElement[] {
  const palette = artPaletteOf(paletteId);
  if (!palette) return elements;
  const background = hasLibraryBackground(elements);
  const partner = PALETTE_PARTNERS[palette.id] ?? ART_PALETTES[0].id;
  const textColor = background ? palette.ink : isLight(palette.base) ? palette.ink : palette.base;
  return elements.map((el) => {
    const ref = parseLibraryArt(el.content);
    if (ref) {
      const target = el.type === "pattern" || !background ? palette.id : partner;
      return target === ref.palette ? el : { ...el, content: libraryArtContent({ ...ref, palette: target }) };
    }
    if (el.type === "text") return { ...el, style: { ...el.style, color: textColor } };
    return el;
  });
}
