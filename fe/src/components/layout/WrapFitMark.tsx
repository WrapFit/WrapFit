/* ds-artwork: the WrapFit "W" mark. Its colours and shapes are part of the logo. */
import React from "react";

export interface WrapFitMarkProps {
  /** Height in px; the mark is 64 × 52. */
  height?: number;
  className?: string;
}

/**
 * The WrapFit "W": a box opened flat. The two arms are the side panels (FPT blue on the left, FPT green on the right),
 * the orange Λ in the middle is the front panel, and the two flaps on top are the open lid. In the lockup it stands for
 * the W of "WrapFit", as the P of Pacdora does. Keep public/branding/wrapfit-mark.svg in sync.
 */
export function WrapFitMark({ height = 32, className }: WrapFitMarkProps) {
  return (
    <svg height={height} width={(height * 64) / 52} viewBox="0 0 64 52" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="wf-mark-blue" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#3FA2EE" />
          <stop offset="1" stopColor="#005CA9" />
        </linearGradient>
        <linearGradient id="wf-mark-green" x1="1" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#9BD36A" />
          <stop offset="1" stopColor="#2F8F6A" />
        </linearGradient>
        <linearGradient id="wf-mark-orange" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#F9A54A" />
          <stop offset="1" stopColor="#F26522" />
        </linearGradient>
      </defs>
      <g strokeLinejoin="round">
        {/* Lid flaps */}
        <path d="M2 9 L15 2.5 L31.5 7.5 L23 13 L12.5 9 Z" fill="#7CC0F2" stroke="#005CA9" strokeWidth="1.6" />
        <path d="M32.5 7.5 L49 2.5 L62 9 L51.5 9 L41 13 Z" fill="#C3E59E" stroke="#3B9A55" strokeWidth="1.6" />
        {/* Side panels */}
        <path d="M2 9 L12.5 9 L24.5 49 L15 49 Z" fill="url(#wf-mark-blue)" stroke="#004E91" strokeWidth="1.6" />
        <path d="M51.5 9 L62 9 L49 49 L39.5 49 Z" fill="url(#wf-mark-green)" stroke="#2A7F55" strokeWidth="1.6" />
        {/* Front panel: the orange Λ */}
        <path d="M15 49 L28 15 L36 15 L49 49 L39.5 49 L32 28 L24.5 49 Z" fill="url(#wf-mark-orange)" stroke="#D85314" strokeWidth="1.6" />
        <path d="M29.5 17.5 L19 46" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
