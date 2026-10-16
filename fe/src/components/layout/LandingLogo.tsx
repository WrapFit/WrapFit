/* ds-artwork: logo lockup: its sizes and gradient colours are part of the mark. Raw colours and sizes here are allowed (docs/15_DESIGN_SYSTEM.md §2). */
import Link from "next/link";
import React, { useId } from "react";
import { cn } from "@/utils/helpers";
import { MARK_H, MARK_ORANGE, MARK_PIECES } from "./WrapFitMark";

export interface LandingLogoProps {
  /** "white" sets the word in white, for saturated blue backgrounds where the gradient word fades (sign-in panel). */
  tone?: "dark" | "light" | "white";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/** Height of the lockup in px. */
const HEIGHT_PX = { sm: 46, md: 54, lg: 64, xl: 150 } as const;

/** Lockup viewBox: the mark (330 × 352) and the word, which starts inside the mark's opening as in the brand file. */
const VIEW_W = 660;

/** Blue → teal → green of the brand wordmark, letter by letter. */
const WORD_STOPS = [
  ["0", "#2183C3"],
  ["0.3", "#3398C2"],
  ["0.55", "#52BAB0"],
  ["0.78", "#7BD59E"],
  ["1", "#9CE88D"],
] as const;

/** WrapFit logo (brand file): the orange hexagon opened on the right, with "WRAPFIT" in a blue to green gradient. */
export function LandingLogo({ tone = "dark", className, size = "md" }: LandingLogoProps) {
  const height = HEIGHT_PX[size];
  const uid = useId().replace(/:/g, "");

  return (
    <Link
      href="/"
      aria-label="WrapFit — trang chủ"
      data-logo=""
      data-tone={tone}
      className={cn("group inline-flex shrink-0 items-center select-none", className)}
      style={{ textDecoration: "none" }}
    >
      <svg height={height} width={(height * VIEW_W) / MARK_H} viewBox={`0 0 ${VIEW_W} ${MARK_H}`} aria-hidden focusable="false" className="overflow-visible">
        <defs>
          <linearGradient id={`wf-o-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor={MARK_ORANGE[0]} />
            <stop offset="1" stopColor={MARK_ORANGE[1]} />
          </linearGradient>
          <linearGradient id={`wf-t-${uid}`} gradientUnits="userSpaceOnUse" x1="130" y1="0" x2="650" y2="0">
            {WORD_STOPS.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <g fill={`url(#wf-o-${uid})`}>
          {MARK_PIECES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <text
          x="130"
          y="211"
          textLength="520"
          lengthAdjust="spacing"
          fill={tone === "white" ? "#FFFFFF" : `url(#wf-t-${uid})`}
          className="font-landing-heading"
          style={{ fontSize: 86, fontWeight: 700 }}
        >
          WRAPFIT
        </text>
      </svg>
    </Link>
  );
}
