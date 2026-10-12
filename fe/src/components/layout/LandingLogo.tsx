import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";

/**
 * WrapFit mark in the pack.ly manner: a box in three greens and a bold lower-case word. `tone="light"` for the dark
 * green footer.
 */
export function LandingLogo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href="/" aria-label="WrapFit — trang chủ" className={cn("inline-flex shrink-0 items-center gap-1.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <path d="M16 2 L29 9 L16 16 L3 9 Z" fill="#AFEC88" />
        <path d="M3 9 L16 16 L16 30 L3 23 Z" fill="#98E665" />
        <path d="M16 16 L29 9 L29 23 L16 30 Z" fill={tone === "dark" ? "#458C17" : "#7BCB4A"} />
        <path d="M9.5 5.5 L22.5 12.5" stroke={tone === "dark" ? "#2D5C0F" : "#152B07"} strokeWidth="1.6" opacity="0.5" />
      </svg>
      <span
        className={cn(
          "font-landing-heading text-[26px] font-bold leading-none tracking-tight",
          tone === "dark" ? "text-landing-green-deep" : "text-landing-lime"
        )}
      >
        wrapfit
      </span>
    </Link>
  );
}
