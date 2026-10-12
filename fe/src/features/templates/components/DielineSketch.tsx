"use client";

import { CURRENT_FORMULA_VERSION, generateDielinePieces, type BoxDimensions, type BoxStructureType } from "@wrapfit/shared";
import React, { useMemo } from "react";

interface DielineSketchProps {
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  className?: string;
  /** Accessible name; the drawing is decorative without it. */
  label?: string;
}

const GAP_MM = 12;

/**
 * The flat dieline of a box at its real size, drawn from the same formulas as the print file: cut lines solid red,
 * creases dashed blue (the dieline layer colours). Boxes made of several pieces (lid & base, sleeve & tray) are laid
 * side by side. Nothing is drawn for a structure the formulas do not know.
 */
export function DielineSketch({ structure, dimensions, className = "", label }: DielineSketchProps) {
  const { length, width, height, paperThickness } = dimensions;
  const layout = useMemo(() => {
    try {
      const pieces = generateDielinePieces(structure, { length, width, height, paperThickness }, CURRENT_FORMULA_VERSION);
      let x = 0;
      const placed = pieces.map((piece) => {
        const at = x;
        x += piece.geometry.totalBoundingBox.width + GAP_MM;
        return { piece, at };
      });
      const viewWidth = Math.max(1, x - GAP_MM);
      const viewHeight = Math.max(1, ...pieces.map((piece) => piece.geometry.totalBoundingBox.height));
      return { placed, viewWidth, viewHeight };
    } catch {
      return null;
    }
  }, [structure, length, width, height, paperThickness]);

  if (!layout) return null;
  const pad = Math.max(layout.viewWidth, layout.viewHeight) * 0.02;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${layout.viewWidth + pad * 2} ${layout.viewHeight + pad * 2}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {layout.placed.map(({ piece, at }) => (
        <g key={piece.name} transform={`translate(${at} ${(layout.viewHeight - piece.geometry.totalBoundingBox.height) / 2})`} fill="none">
          {piece.geometry.segments.map((segment) => {
            const cut = segment.type === "cut";
            if (!cut && segment.type !== "crease") return null;
            const stroke = {
              stroke: cut ? "#E53E3E" : "#3182CE",
              strokeWidth: 1,
              strokeDasharray: cut ? undefined : "4 3",
              vectorEffect: "non-scaling-stroke" as const,
            };
            return segment.pathString ? (
              <path key={segment.id} d={segment.pathString} {...stroke} />
            ) : (
              <line key={segment.id} x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} {...stroke} />
            );
          })}
        </g>
      ))}
    </svg>
  );
}
