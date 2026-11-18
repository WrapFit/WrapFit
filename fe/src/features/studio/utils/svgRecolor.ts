"use client";

/**
 * SVG logos with their colours swapped (docs/23 S14, `style.colorMap`) in the browser: the editor, the 3D box, the
 * thumbnail and the offline print files draw the recoloured copy, rewritten by the same shared recolorSvg as the print
 * worker. A file that is not an SVG, or cannot be read (no CORS), is drawn as it is.
 */
import { cleanColorMap, recolorSvg, svgColorsOf, svgDataUri, type CanvasElement, type ColorSwap } from "@wrapfit/shared";

const texts = new Map<string, Promise<string | null>>();

const isSvgText = (text: string) => /^\s*(<\?xml|<svg|<!--)/i.test(text) && /<svg\b/i.test(text);

/** Text of an SVG file (cached), or null when the file is not an SVG or cannot be read. */
export function svgTextOf(url: string): Promise<string | null> {
  if (!texts.has(url)) {
    const load = async (): Promise<string | null> => {
      if (url.startsWith("data:")) {
        const match = /^data:image\/svg\+xml(;base64)?(?:;charset=[^,]*)?,([\s\S]*)$/.exec(url);
        if (!match) return null;
        return match[1] ? new TextDecoder().decode(Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))) : decodeURIComponent(match[2]);
      }
      try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const type = response.headers.get("content-type") ?? "";
        if (type && !type.includes("svg") && !type.includes("xml") && !type.includes("text/plain") && !type.includes("octet-stream")) return null;
        const text = await response.text();
        return isSvgText(text) ? text : null;
      } catch {
        return null;
      }
    };
    texts.set(url, load());
  }
  return texts.get(url)!;
}

/** Colours of an SVG file, the most used first (empty for other files). */
export async function svgColorsOfUrl(url: string): Promise<string[]> {
  const text = await svgTextOf(url);
  return text ? svgColorsOf(text) : [];
}

/** Key of an image as it is drawn: its URL, plus its colour swaps when it has some. */
export function imageKey(url: string, colorMap: readonly ColorSwap[] | null | undefined): string {
  const swaps = cleanColorMap(colorMap);
  return swaps.length ? `${url}#wf-colors=${swaps.map((s) => `${s.from}${s.to}`).join("")}` : url;
}

export const elementImageKey = (el: Pick<CanvasElement, "content" | "style">) => imageKey(el.content, el.style?.colorMap);

const ready = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** URL to draw an image from: the recoloured SVG as a data URI, or the file itself. */
export function recoloredSrc(url: string, colorMap: readonly ColorSwap[] | null | undefined): Promise<string> {
  const key = imageKey(url, colorMap);
  if (key === url) return Promise.resolve(url);
  if (ready.has(key)) return Promise.resolve(ready.get(key)!);
  if (!pending.has(key)) {
    pending.set(
      key,
      svgTextOf(url).then((text) => {
        const src = text ? svgDataUri(recolorSvg(text, colorMap)) : url;
        ready.set(key, src);
        return src;
      })
    );
  }
  return pending.get(key)!;
}

/** The source to draw now (the file itself until the recoloured copy is ready; see loadRecolored). */
export function displaySrcOf(el: Pick<CanvasElement, "content" | "style">): string {
  const key = elementImageKey(el);
  return key === el.content ? el.content : (ready.get(key) ?? el.content);
}

/** Prepares the recoloured copies the elements need; resolves true when one was new (draw again). */
export async function loadRecolored(elements: readonly CanvasElement[]): Promise<boolean> {
  const wanted = elements.filter((el) => (el.type === "logo" || el.type === "image") && elementImageKey(el) !== el.content && !ready.has(elementImageKey(el)));
  if (!wanted.length) return false;
  await Promise.all(wanted.map((el) => recoloredSrc(el.content, el.style?.colorMap)));
  return true;
}
