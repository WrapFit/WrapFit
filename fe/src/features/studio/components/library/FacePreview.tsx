"use client";

import React, { useMemo } from "react";
import { generateDielinePieces, mainPanelOf, TEXT_FONT_WEIGHT, type BoxDimensions, type CanvasElement } from "@wrapfit/shared";
import { cssFontFamily, layoutBoxText } from "../canvas/boxText";
import { ArtShapes, elementArt } from "./elementArt";

interface FacePreviewProps {
  structure: string;
  dimensions: BoxDimensions;
  formulaVersion?: number;
  elements: CanvasElement[];
  /** Colour of the printed side of the paper. */
  paper: string;
  className?: string;
}

/**
 * The face that sells the box, with its artwork (library art and texts; uploaded images are left out): a light SVG
 * preview for pickers and thumbnails, no WebGL. Load the fonts of the texts with `useBoxFonts`.
 */
export function FacePreview({ structure, dimensions, formulaVersion, elements, paper, className }: FacePreviewProps) {
  const face = useMemo(() => {
    const id = mainPanelOf(structure);
    for (const piece of generateDielinePieces(structure, dimensions, formulaVersion)) {
      const panel = piece.geometry.panels.find((p) => p.id === id);
      if (panel) return panel;
    }
    return null;
  }, [structure, dimensions, formulaVersion]);
  const clipId = React.useId();
  if (!face) return null;
  const { width, height } = face.bounds;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width={width} height={height} fill={paper} />
        {elements
          .filter((el) => el.panelId === face.id)
          .map((el) => {
            const turn = el.rotation ? `rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})` : undefined;
            const art = elementArt(el);
            if (art)
              return (
                <g key={el.id} transform={turn}>
                  <ArtShapes art={art} x={el.x} y={el.y} />
                </g>
              );
            if (el.type !== "text") return null;
            const box = layoutBoxText(el);
            return (
              <g key={el.id} transform={turn} fontSize={box.fontSizeMm} fontWeight={TEXT_FONT_WEIGHT} fill={el.style?.color ?? "#1C1917"} style={{ fontFamily: cssFontFamily(box.font) }}>
                {box.lines.map((line, i) => (line.text ? <text key={i} x={el.x + line.x} y={el.y + line.baseline}>{line.text}</text> : null))}
              </g>
            );
          })}
      </g>
    </svg>
  );
}
