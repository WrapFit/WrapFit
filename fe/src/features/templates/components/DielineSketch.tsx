"use client";

import { CURRENT_FORMULA_VERSION, generateDielinePieces, type BoxDimensions, type BoxStructureType } from "@wrapfit/shared";
import React, { useId, useMemo } from "react";
import { sheetPath } from "@/features/studio/utils/dielineOutline";

interface DielineSketchProps {
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  className?: string;
  /** Accessible name; the drawing is decorative without it. */
  label?: string;
  /** Colour of the die-cut sheet (white paper by default); "none" draws the lines only. */
  paper?: string;
}

const GAP_MM = 12;

/**
 * The flat dieline of a box at its real size, drawn from the same formulas as the print file: the die-cut sheet
 * (cut lines joined into its outline) lifted off the page, cut lines solid red, creases dashed blue (the dieline
 * layer colours), glue flaps hatched. Boxes made of several pieces (lid & base, sleeve & tray) are laid side by side.
 * Nothing is drawn for a structure the formulas do not know.
 */
export function DielineSketch({ structure, dimensions, className = "", label, paper = "#FFFFFF" }: DielineSketchProps) {
  const uid = useId().replace(/:/g, "");
  const { length, width, height, paperThickness } = dimensions;
  const layout = useMemo(() => {
    try {
      const pieces = generateDielinePieces(structure, { length, width, height, paperThickness }, CURRENT_FORMULA_VERSION);
      let x = 0;
      const placed = pieces.map((piece) => {
        const at = x;
        x += piece.geometry.totalBoundingBox.width + GAP_MM;
        return { piece, at, sheet: sheetPath(piece.geometry) };
      });
      const viewWidth = Math.max(1, x - GAP_MM);
      const viewHeight = Math.max(1, ...pieces.map((piece) => piece.geometry.totalBoundingBox.height));
      return { placed, viewWidth, viewHeight };
    } catch {
      return null;
    }
  }, [structure, length, width, height, paperThickness]);

  if (!layout) return null;
  const pad = Math.max(layout.viewWidth, layout.viewHeight) * 0.04;
  const filled = paper !== "none";

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${layout.viewWidth + pad * 2} ${layout.viewHeight + pad * 2}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* data-preview: on-screen layers (paper, shadow, glue hatching), left out of the downloaded dieline */}
      <defs data-preview="">
        <filter id={`${uid}-lift`} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy={pad * 0.18} stdDeviation={pad * 0.3} floodColor="#0F172A" floodOpacity="0.12" />
        </filter>
        <pattern id={`${uid}-glue`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#94A3B8" strokeWidth="0.8" strokeOpacity="0.6" />
        </pattern>
      </defs>
      {layout.placed.map(({ piece, at, sheet }) => (
        <g key={piece.name} transform={`translate(${at} ${(layout.viewHeight - piece.geometry.totalBoundingBox.height) / 2})`}>
          {filled && <path data-preview="" d={sheet} fill={paper} filter={`url(#${uid}-lift)`} />}
          {filled &&
            piece.geometry.glueAreas?.map((area, index) => (
              <rect data-preview="" key={index} x={area.x} y={area.y} width={area.width} height={area.height} fill={`url(#${uid}-glue)`} />
            ))}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {piece.geometry.segments.map((segment) => {
              const cut = segment.type === "cut";
              if (!cut && segment.type !== "crease") return null;
              const stroke = {
                stroke: cut ? "#E53E3E" : "#3182CE",
                strokeWidth: cut ? 1.4 : 1.1,
                strokeDasharray: cut ? undefined : "4 4",
                vectorEffect: "non-scaling-stroke" as const,
              };
              return segment.pathString ? (
                <path key={segment.id} d={segment.pathString} {...stroke} />
              ) : (
                <line key={segment.id} x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} {...stroke} />
              );
            })}
          </g>
        </g>
      ))}
    </svg>
  );
}
