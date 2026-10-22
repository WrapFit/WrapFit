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
 * The WrapFit mark: Gói, the orange gift-box mascot, inside a round badge (after the BeeWise badge). The figure is
 * public/mascots/goi-magnifier.webp; keep public/branding/wrapfit-goi-mark.svg in sync.
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

/** Gói alone (the orange gift-box character), in the 64 × 64 box of the mark. */
function GoiFigure() {
  return <image href="/mascots/goi-magnifier.webp" x="5" y="5" width="54" height="54" preserveAspectRatio="xMidYMid meet" />;
}
