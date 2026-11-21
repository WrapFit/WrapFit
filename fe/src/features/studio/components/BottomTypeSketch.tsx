import { generateDielinePieces, type BoxDimensions } from "@wrapfit/shared";
import React, { useId, useMemo } from "react";
import { sheetPath } from "@/features/studio/utils/dielineOutline";

interface BottomTypeSketchProps {
  /** Size of the box being set: the sketch is the real dieline at that size. */
  dimensions: Pick<BoxDimensions, "length" | "width" | "height" | "paperThickness">;
  bottomType: "tuck" | "lock";
  className?: string;
}

/**
 * The bottom of a tuck-top dieline (docs/21 §8.4): the end of the body and the flaps that close the bottom, drawn from
 * the same formula as the print file, the bottom flaps tinted. The bottom picker shows the plain tuck bottom and the
 * crash-lock bottom side by side, so the difference is seen, not only read.
 */
export function BottomTypeSketch({ dimensions, bottomType, className = "" }: BottomTypeSketchProps) {
  const uid = useId().replace(/:/g, "");
  const { length, width, height, paperThickness } = dimensions;
  const sketch = useMemo(() => {
    try {
      const [{ geometry }] = generateDielinePieces("tuck-top", { length, width, height, paperThickness, bottomType });
      const front = geometry.panels.find((panel) => panel.id === "panel_front");
      if (!front) return null;
      const bodyEnd = front.bounds.y + front.bounds.height;
      // A strip of the body above the bottom, so the flaps read as hanging off the box.
      const top = bodyEnd - Math.min(front.bounds.height * 0.3, 24);
      return { geometry, sheet: sheetPath(geometry), bodyEnd, top, end: geometry.totalBoundingBox.height };
    } catch {
      return null;
    }
  }, [length, width, height, paperThickness, bottomType]);
  if (!sketch) return null;

  const { geometry, sheet, bodyEnd, top, end } = sketch;
  const sheetWidth = geometry.totalBoundingBox.width;
  const pad = sheetWidth * 0.02;
  const r = (n: number) => Math.round(n * 100) / 100;
  return (
    <svg
      viewBox={`${r(-pad)} ${r(top)} ${r(sheetWidth + pad * 2)} ${r(end - top + pad)}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id={`${uid}-sheet`}>
          <path d={sheet} />
        </clipPath>
      </defs>
      <path d={sheet} className="fill-surface-raised" />
      {/* The flaps below the body are the bottom: tinted inside the cut outline. */}
      <rect x={0} y={r(bodyEnd)} width={r(sheetWidth)} height={r(end - bodyEnd)} clipPath={`url(#${uid}-sheet)`} className="fill-fpt-orange/25" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {geometry.segments.map((segment) => {
          const cut = segment.type === "cut";
          if (!cut && segment.type !== "crease") return null;
          const stroke = {
            className: cut ? "stroke-fg" : "stroke-fg-muted",
            strokeWidth: cut ? 1.3 : 1,
            strokeDasharray: cut ? undefined : "3 3",
            vectorEffect: "non-scaling-stroke" as const,
          };
          return segment.pathString ? (
            <path key={segment.id} d={segment.pathString} {...stroke} />
          ) : (
            <line key={segment.id} x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} {...stroke} />
          );
        })}
      </g>
    </svg>
  );
}
