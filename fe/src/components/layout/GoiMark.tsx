/* ds-artwork: the WrapFit mark, Gói in a round badge. Its colours and shapes are part of the logo. */
import React from "react";

export interface GoiMarkProps {
  /** Pixel size of the square mark. */
  size?: number;
  /**
   * `dark`: FPT blue badge, for light backgrounds (header, cards). `light`: white badge, for dark or blue
   * backgrounds (footer, sign-in panel).
   */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * The WrapFit mark: Gói, the kraft box mascot, waving inside a round badge (after the BeeWise badge). Drawn as
 * vectors so it stays sharp from the 16 px favicon to the hero; keep public/branding/wrapfit-goi-mark.svg in sync.
 */
export function GoiMark({ size = 32, tone = "dark", className }: GoiMarkProps) {
  // One gradient per tone; repeated marks on a page share the same, identical definition.
  const badge = `goi-badge-${tone}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <defs>
        <radialGradient id={badge} cx="30%" cy="22%" r="85%">
          {tone === "dark" ? (
            <>
              <stop offset="0" stopColor="#2A8BE0" />
              <stop offset="0.55" stopColor="#005CA9" />
              <stop offset="1" stopColor="#003E78" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#EEF4FA" />
            </>
          )}
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${badge})`} />
      <GoiFigure />
    </svg>
  );
}

/** Gói alone, in the 64 × 64 box of the mark. */
function GoiFigure() {
  const ink = "#3A230F";
  return (
    <g strokeLinecap="round" strokeLinejoin="round" transform="translate(32 33) scale(1.12) translate(-32 -33)">
      {/* Arms and legs behind the box */}
      <g fill="none" stroke={ink} strokeWidth="1.8">
        <path d="M19 32 Q14.5 30 12.8 25.2 M12.8 25.2 l-1.6 -2.3 M12.8 25.2 l0.6 -2.8" />
        <path d="M46.5 30.5 Q50.5 28 51.6 23.2 M51.6 23.2 l-0.7 -2.8 M51.6 23.2 l1.7 -2.2" />
        <path d="M25.5 43.5 L24 49 L21.8 49.4 M35 43.5 L36.5 49 L38.7 49.4" />
      </g>
      {/* Box: top, side, front, with the orange tape across the lid */}
      <path d="M18 22 L24 16.5 L48 16.5 L42 22 Z" fill="#FCDBA2" />
      <path d="M42 22 L48 16.5 L48 37.5 L42 43.5 Z" fill="#DA9549" />
      <rect x="18" y="22" width="24" height="21.5" rx="2.2" fill="#F6BF76" />
      <path d="M29 22 L35 16.5 L38.2 16.5 L32.2 22 Z" fill="#F26522" />
      <path d="M29 22 h3.2 v4.2 h-3.2 Z" fill="#F26522" />
      {/* Face: closed happy eyes, open smile, blush */}
      <g fill="none" stroke={ink} strokeWidth="1.7">
        <path d="M22.6 31.4 q2.2 -2.6 4.4 0" />
        <path d="M33 31.4 q2.2 -2.6 4.4 0" />
      </g>
      <path d="M27.4 34.6 q2.6 3.6 5.2 0 Z" fill={ink} />
      <ellipse cx="23.2" cy="35.2" rx="2" ry="1.25" fill="#F38C86" opacity="0.9" />
      <ellipse cx="36.8" cy="35.2" rx="2" ry="1.25" fill="#F38C86" opacity="0.9" />
    </g>
  );
}
