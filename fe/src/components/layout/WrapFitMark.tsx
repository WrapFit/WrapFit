/* ds-artwork: the WrapFit hexagon mark. Its colours and shapes are part of the logo. */
import React, { useId } from "react";

/** viewBox of the mark: 330 × 352. */
export const MARK_W = 330;
export const MARK_H = 352;

/**
 * The three orange pieces of the mark, traced from the brand logo: a hexagon whose rounded inner window opens to the
 * right (where "WRAPFIT" starts), cut by a slanted fold at the upper left and a straight fold beside the bottom tip.
 */
export const MARK_PIECES = [
  // Top: the lid, tapering to a point on the right
  "M14 86 L160 7 Q165 4 170 7 L318 86 Q323 90 316 92 L140 92 Q85 92 85 128 Z",
  // Left side and bottom left
  "M5 96 L85 143 L85 207 Q85 262 140 262 L158 262 L158 347 L14 250 Q5 244 5 233 Z",
  // Bottom right corner
  "M183 262 L321 262 Q328 263 322 267 L183 347 Z",
];

export const MARK_ORANGE = ["#F9A23C", "#F7932A"] as const;

export interface WrapFitMarkProps {
  /** Height in px. */
  height?: number;
  className?: string;
}

/** The WrapFit mark alone (favicon, auth card tab, intro). Keep public/branding/wrapfit-mark.svg in sync. */
export function WrapFitMark({ height = 32, className }: WrapFitMarkProps) {
  const gradId = `wf-mark-orange-${useId().replace(/:/g, "")}`;

  return (
    <svg height={height} width={(height * MARK_W) / MARK_H} viewBox={`0 0 ${MARK_W} ${MARK_H}`} className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={MARK_ORANGE[0]} />
          <stop offset="1" stopColor={MARK_ORANGE[1]} />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`}>
        {MARK_PIECES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
