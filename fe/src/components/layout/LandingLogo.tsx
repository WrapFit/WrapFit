/* ds-artwork: logo lockup: its sizes and the FPT orange are part of the mark. Raw colours and sizes here are allowed (docs/15_DESIGN_SYSTEM.md §2). */
import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";

export interface LandingLogoProps {
  tone?: "dark" | "light";
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * WrapFit mark: 3D Origami packaging box with 3 FPT facets (Orange, Blue, Green)
 * and neat brand wordmark "WrapFit".
 * `tone="light"` for dark backgrounds (footer, unbox).
 */
export function LandingLogo({ tone = "dark", className, size = "md" }: LandingLogoProps) {
  const iconPx = size === "sm" ? 28 : size === "lg" ? 40 : 34;
  const textClass =
    size === "sm"
      ? "text-[20px]"
      : size === "lg"
      ? "text-[26px]"
      : "text-[23px]";

  return (
    <Link
      href="/"
      aria-label="WrapFit — trang chủ"
      data-logo=""
      className={cn("group inline-flex shrink-0 items-center gap-2.5 select-none", className)}
      style={{ textDecoration: "none" }}
    >
      {/* 3D Box Origami Icon strictly locked to exact pixel bounding box */}
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden"
        style={{
          width: `${iconPx}px`,
          height: `${iconPx}px`,
          minWidth: `${iconPx}px`,
          minHeight: `${iconPx}px`,
          maxWidth: `${iconPx}px`,
          maxHeight: `${iconPx}px`,
        }}
      >
        <svg
          width={iconPx}
          height={iconPx}
          viewBox="0 0 32 32"
          style={{
            width: `${iconPx}px`,
            height: `${iconPx}px`,
            minWidth: `${iconPx}px`,
            minHeight: `${iconPx}px`,
            maxWidth: `${iconPx}px`,
            maxHeight: `${iconPx}px`,
            display: "block",
          }}
          className="shrink-0 drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
          aria-hidden="true"
        >
          {/* Top Facet: FPT Orange */}
          <path d="M16 2 L29 9 L16 16 L3 9 Z" fill="#F26522" />
          {/* Left Facet: FPT Blue */}
          <path d="M3 9 L16 16 L16 30 L3 23 Z" fill="#005CA9" />
          {/* Right Facet: FPT Green */}
          <path d="M16 16 L29 9 L29 23 L16 30 Z" fill="#6DB33F" />
          {/* Fold crease highlight */}
          <path d="M9.5 5.5 L22.5 12.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
        </svg>
      </span>

      <span className={cn("font-landing-heading font-bold leading-none tracking-tight", textClass)}>
        <span className={tone === "dark" ? "text-stone-900" : "text-white"}>Wrap</span>
        <span className="text-fpt-orange">Fit</span>
      </span>
    </Link>
  );
}
