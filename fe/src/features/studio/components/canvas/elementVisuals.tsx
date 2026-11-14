"use client";

/**
 * How texts and photos look on screen (docs/23 S9, S10), the same model as the print files: letter spacing, outline and
 * curved texts; crop, fill, frame mask and photo adjustments. Used by the 2D canvas (SVG) and the 3D box (canvas 2D).
 */
import React, { useEffect, useState } from "react";
import {
  arcPlacements,
  filterCss,
  imageDraw,
  isCropped,
  maskPath,
  underlineOf,
  type CanvasElement,
  type TextBoxLayout,
} from "@wrapfit/shared";
import { boxFontCss, boxFontFamily, faceAttributes, layoutBoxText, measureInBrowser } from "./boxText";
import { displaySrcOf, elementImageKey, loadRecolored } from "../../utils/svgRecolor";

const sizes = new Map<string, { width: number; height: number } | null>();
const waiting = new Map<string, Promise<void>>();

/** Natural size of an image (cached); null until it is known or when it cannot load. */
export function imageSizeOf(url: string): { width: number; height: number } | null {
  return sizes.get(url) ?? null;
}

function loadSize(url: string): Promise<void> {
  if (sizes.has(url)) return Promise.resolve();
  if (!waiting.has(url)) {
    waiting.set(
      url,
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          sizes.set(url, img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null);
          resolve();
        };
        img.onerror = () => {
          sizes.set(url, null);
          resolve();
        };
        img.src = url;
      })
    );
  }
  return waiting.get(url)!;
}

/**
 * Loads the sizes of the cropped / filled photos and the recoloured SVG logos (docs/23 S14); the number changes once
 * they are known (re-render).
 */
export function useImageSizes(elements: CanvasElement[]): number {
  const [version, setVersion] = useState(0);
  const recolorKey = elements
    .filter((el) => el.style?.colorMap?.length)
    .map(elementImageKey)
    .sort()
    .join("|");
  useEffect(() => {
    if (!recolorKey) return;
    let cancelled = false;
    void loadRecolored(elements).then((fresh) => {
      if (fresh && !cancelled) setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key lists what the elements need
  }, [recolorKey]);
  const key = [...new Set(elements.filter((el) => isCropped(el) && (el.type === "image" || el.type === "logo" || el.type === "pattern")).map((el) => el.content))]
    .sort()
    .join("|");
  useEffect(() => {
    if (!key || typeof window === "undefined") return;
    let cancelled = false;
    void Promise.all(key.split("|").map(loadSize)).then(() => {
      if (!cancelled) setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return version;
}

/** Natural size of one image, loaded on demand (photo settings); re-renders once it is known. */
export function useImageSize(url: string): { width: number; height: number } | null {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!url || typeof window === "undefined") return;
    let cancelled = false;
    void loadSize(url).then(() => {
      if (!cancelled) setVersion((value) => value + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return imageSizeOf(url);
}

let maskIds = 0;

/** A photo / logo / pattern file in its box at (x, y), with crop, fill, frame and adjustments. */
export function FramedImage({ el, x, y }: { el: CanvasElement; x: number; y: number }) {
  const [maskId] = useState(() => `frame-${++maskIds}`);
  const mask = maskPath(el.mask, el.width, el.height);
  const filter = filterCss(el.style?.filters);
  const size = isCropped(el) ? imageSizeOf(el.content) : null;
  const style = filter !== "none" ? { filter } : undefined;
  let picture: React.ReactNode;
  if (size) {
    const draw = imageDraw(el, size);
    picture = (
      <svg x={x + draw.dx} y={y + draw.dy} width={draw.dw} height={draw.dh} viewBox={`${draw.sx} ${draw.sy} ${draw.sw} ${draw.sh}`} preserveAspectRatio="none" overflow="hidden">
        <image href={displaySrcOf(el)} width={size.width} height={size.height} style={style} />
      </svg>
    );
  } else {
    picture = <image href={displaySrcOf(el)} x={x} y={y} width={el.width} height={el.height} preserveAspectRatio="xMidYMid meet" style={style} />;
  }
  if (!mask) return <g className="pointer-events-none">{picture}</g>;
  return (
    <g className="pointer-events-none">
      <clipPath id={maskId}>
        <path d={mask} transform={`translate(${x} ${y})`} />
      </clipPath>
      <g clipPath={`url(#${maskId})`}>{picture}</g>
    </g>
  );
}

/** Centres and turns of the characters of a curved line, measured with the page's fonts. */
export function curvedChars(box: TextBoxLayout, text: string, cx: number, baseline: number) {
  const chars = Array.from(text);
  const advances = chars.map((char) => measureInBrowser(char, box.font, box.fontSizeMm, box.face, box.fontUrl ?? undefined) + box.spacingMm);
  return arcPlacements(advances, box.curve, cx, baseline).map((place, i) => ({ ...place, char: chars[i] }));
}

/** A text element drawn in SVG at (x, y): the lines of the print files, its face, spacing, outline, curve, underline. */
export function TextVisual({ el, x, y, ink = "#1C1917", fontsVersion }: { el: CanvasElement; x: number; y: number; ink?: string; fontsVersion?: number }) {
  const box = layoutBoxText(el);
  // An uploaded font is one face (docs/23 S13): drawn as it is, never synthesised bold or italic.
  const face = box.fontUrl ? { fontWeight: 400 as const, fontStyle: "normal" as const } : faceAttributes(box.font, box.face);
  const outline = box.stroke
    ? { stroke: box.stroke.color, strokeWidth: box.stroke.widthMm * 2, strokeLinejoin: "round" as const, paintOrder: "stroke" }
    : {};
  return (
    <g
      data-fonts={fontsVersion}
      fontSize={box.fontSizeMm}
      fontWeight={face.fontWeight}
      fontStyle={face.fontStyle}
      fill={el.style?.color || ink}
      letterSpacing={box.spacingMm || undefined}
      style={{ fontFamily: boxFontFamily(box) }}
      className="pointer-events-none select-none"
      {...outline}
    >
      {box.lines.map((line, index) => {
        if (!line.text) return null;
        if (box.curve) {
          return (
            <g key={index}>
              {curvedChars(box, line.text, x + el.width / 2, y + line.baseline).map((c, i) => (
                <text key={i} x={c.x} y={c.y} textAnchor="middle" transform={`rotate(${c.angle} ${c.x} ${c.y})`} letterSpacing={0}>
                  {c.char}
                </text>
              ))}
            </g>
          );
        }
        const u = box.underline ? underlineOf(line, box.fontSizeMm) : null;
        return (
          <React.Fragment key={index}>
            <text x={x + line.x} y={y + line.baseline} xmlSpace="preserve">
              {line.text}
            </text>
            {u && <rect x={x + u.x} y={y + u.y} width={u.width} height={u.height} stroke="none" />}
          </React.Fragment>
        );
      })}
    </g>
  );
}

/** Draws a text element on a canvas 2D whose units are mm, origin at the top-left of the element (3D box). */
export function drawTextOnCanvas(ctx: CanvasRenderingContext2D, el: CanvasElement, ink: string) {
  const box = layoutBoxText(el);
  ctx.font = boxFontCss(box, box.fontSizeMm);
  ctx.fillStyle = el.style?.color || ink;
  ctx.textBaseline = "alphabetic";
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const paint = (text: string, px: number, py: number) => {
    if (box.stroke) {
      ctx.strokeStyle = box.stroke.color;
      ctx.lineWidth = box.stroke.widthMm * 2;
      ctx.lineJoin = "round";
      ctx.strokeText(text, px, py);
    }
    ctx.fillText(text, px, py);
  };
  for (const line of box.lines) {
    if (!line.text) continue;
    if (box.curve) {
      ctx.textAlign = "center";
      spaced.letterSpacing = "0px";
      for (const c of curvedChars(box, line.text, el.width / 2, line.baseline)) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.angle * Math.PI) / 180);
        paint(c.char, 0, 0);
        ctx.restore();
      }
      continue;
    }
    ctx.textAlign = "left";
    spaced.letterSpacing = `${box.spacingMm}px`;
    paint(line.text, line.x, line.baseline);
    if (box.underline) {
      const u = underlineOf(line, box.fontSizeMm);
      ctx.fillRect(u.x, u.y, u.width, u.height);
    }
  }
  spaced.letterSpacing = "0px";
  ctx.textAlign = "left";
}

/** Draws a photo / logo / pattern on a canvas 2D in mm, origin at the top-left of the element (3D box). */
export function drawImageOnCanvas(ctx: CanvasRenderingContext2D, el: CanvasElement, image: HTMLImageElement) {
  const source = image.naturalWidth && image.naturalHeight ? { width: image.naturalWidth, height: image.naturalHeight } : { width: el.width, height: el.height };
  const draw = imageDraw(el, source);
  ctx.save();
  const mask = maskPath(el.mask, el.width, el.height);
  if (mask) ctx.clip(new Path2D(mask));
  ctx.filter = filterCss(el.style?.filters);
  ctx.drawImage(image, draw.sx, draw.sy, draw.sw, draw.sh, draw.dx, draw.dy, draw.dw, draw.dh);
  ctx.restore();
}
