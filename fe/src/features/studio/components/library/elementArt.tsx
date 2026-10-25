"use client";
/* ds-artwork: library art is printed artwork; its colours come from the art itself (docs/15_DESIGN_SYSTEM.md §2). */

import React from "react";
import QRCode from "qrcode";
import {
  barcodeArt,
  ean13Digits,
  IMAGE_ELEMENT_TYPES,
  libraryArt,
  PRINT_FONTS,
  TEXT_FONT_WEIGHT,
  type CanvasElement,
  type VectorArt,
} from "@wrapfit/shared";
import { cssFontFamily } from "../canvas/boxText";

/** Barcode element as vector art: white box, black modules, digits, like the print files. */
function barcodeVectorArt(content: string, width: number, height: number): VectorArt | null {
  let qr = null;
  if (!ean13Digits(content)) {
    try {
      qr = QRCode.create(content, { errorCorrectionLevel: "M" }).modules;
    } catch {
      return null;
    }
  }
  const art = barcodeArt(content, width, height, qr);
  if (!art) return null;
  const rect = (x: number, y: number, w: number, h: number) => `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  return {
    width,
    height,
    shapes: [
      { d: rect(0, 0, width, height), fill: "#FFFFFF" },
      { d: art.bars.map((b) => rect(b.x, b.y, b.width, b.height)).join(" "), fill: "#000000" },
    ],
    texts: art.digits.map((d) => ({ text: d.text, x: d.x, baseline: d.baseline, size: d.sizeMm, font: "inter", color: "#000000", anchor: "middle" })),
  };
}

const cache = new Map<string, VectorArt | null>();

/**
 * Vector art an element shows instead of a file: library art (`wf-art:` contents) and barcodes. Null for texts and
 * file images. Cached by content and size (QR codes are not free to compute).
 */
export function elementArt(el: Pick<CanvasElement, "type" | "content" | "width" | "height">): VectorArt | null {
  const isArt = IMAGE_ELEMENT_TYPES.has(el.type);
  if (!isArt && el.type !== "barcode") return null;
  const key = `${el.type}|${el.content}|${el.width}|${el.height}`;
  if (!cache.has(key)) {
    if (cache.size > 400) cache.clear();
    cache.set(key, isArt ? libraryArt(el.content, el.width, el.height) : barcodeVectorArt(el.content.trim(), el.width, el.height));
  }
  return cache.get(key) ?? null;
}

/** The art as SVG elements, at (x, y) in the parent's units (mm). Texts use the print fonts loaded by the page. */
export function ArtShapes({ art, x = 0, y = 0 }: { art: VectorArt; x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="pointer-events-none">
      {art.shapes.map((shape, i) => (
        <path
          key={i}
          d={shape.d}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.stroke ? shape.strokeWidth : undefined}
          strokeLinecap={shape.round ? "round" : undefined}
          strokeLinejoin={shape.round ? "round" : undefined}
        />
      ))}
      {art.texts.map((t, i) => (
        <text
          key={`t${i}`}
          x={t.x}
          y={t.baseline}
          fontSize={t.size}
          fontWeight={TEXT_FONT_WEIGHT}
          fill={t.color}
          textAnchor={t.anchor}
          style={{ fontFamily: cssFontFamily(t.font) }}
        >
          {t.text}
        </text>
      ))}
    </g>
  );
}

/** Draws the art on a 2D canvas whose units are mm, origin at the top-left of the element (3D box textures). */
export function drawArt(ctx: CanvasRenderingContext2D, art: VectorArt) {
  for (const shape of art.shapes) {
    const path = new Path2D(shape.d);
    if (shape.fill) {
      ctx.fillStyle = shape.fill;
      ctx.fill(path);
    }
    if (shape.stroke) {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth ?? 0.25;
      ctx.lineCap = shape.round ? "round" : "butt";
      ctx.lineJoin = shape.round ? "round" : "miter";
      ctx.stroke(path);
    }
  }
  for (const t of art.texts) {
    ctx.font = `${TEXT_FONT_WEIGHT} ${t.size}px ${cssFontFamily(t.font)}`;
    ctx.fillStyle = t.color;
    ctx.textAlign = t.anchor === "middle" ? "center" : "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(t.text, t.x, t.baseline);
  }
  ctx.textAlign = "left";
}

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The art as SVG markup at (x, y) (thumbnails drawn as an image: fonts by family name, as for texts). */
export function artMarkup(art: VectorArt, x: number, y: number, transform = ""): string {
  const shapes = art.shapes
    .map((s) => `<path d="${s.d}" fill="${s.fill ?? "none"}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth ?? 0.25}"` : ""}${s.round ? ` stroke-linecap="round" stroke-linejoin="round"` : ""}/>`)
    .join("");
  const texts = art.texts
    .map(
      (t) =>
        `<text x="${t.x}" y="${t.baseline}" font-size="${t.size}" font-weight="${TEXT_FONT_WEIGHT}" font-family="${escapeXml(PRINT_FONTS[t.font])}, sans-serif"` +
        ` fill="${t.color}" text-anchor="${t.anchor}">${escapeXml(t.text)}</text>`
    )
    .join("");
  return `<g${transform}><g transform="translate(${x} ${y})">${shapes}${texts}</g></g>`;
}
