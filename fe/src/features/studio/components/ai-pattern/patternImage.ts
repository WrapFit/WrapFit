import type React from "react";

/** Print resolution of a pattern placed on a panel; lowered for big panels so the PNG stays under MAX_SIDE_PX. */
const TARGET_DPI = 300;
const MAX_SIDE_PX = 4800; // 300 DPI up to 406 mm
/** Printed size of one repeat of the tile. */
export const PATTERN_TILE_MM = 25;

/**
 * Repeats a seamless tile over an area of the box (mm) and returns it as a PNG. A PNG, not the SVG: the PDF of the
 * print shop embeds PNG and JPEG only (`be/src/export/rendering/print-renderers.ts`).
 */
export async function renderPatternPng(
  tile: { size: number; svg: string },
  widthMm: number,
  heightMm: number
): Promise<{ blob: Blob; dpi: number }> {
  const longest = Math.max(widthMm, heightMm) / 25.4;
  const dpi = Math.min(TARGET_DPI, Math.floor(MAX_SIDE_PX / longest));
  const pxPerMm = dpi / 25.4;
  const width = Math.max(1, Math.round(widthMm * pxPerMm));
  const height = Math.max(1, Math.round(heightMm * pxPerMm));
  const tilePx = PATTERN_TILE_MM * pxPerMm;

  // The tile at its printed size, so the browser rasterizes it sharp once instead of scaling a small bitmap.
  const sized =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tilePx}" height="${tilePx}" viewBox="0 0 ${tile.size} ${tile.size}">` +
    `${tile.svg}</svg>`;
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    for (let y = 0; y < height; y += tilePx) {
      for (let x = 0; x < width; x += tilePx) context.drawImage(image, x, y, tilePx, tilePx);
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("PNG encoding failed"))), "image/png")
    );
    return { blob, dpi };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** CSS background of a preview: the tile as a data URL (shown only, never saved). */
export function tileBackground(svg: string, sizePx: number): React.CSSProperties {
  return {
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`,
    backgroundSize: `${sizePx}px ${sizePx}px`,
    backgroundRepeat: "repeat",
  };
}
