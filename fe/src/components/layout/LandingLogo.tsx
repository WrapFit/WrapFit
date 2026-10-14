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
      <svg viewBox="0 0 32 32" className="size-8 drop-shadow-xs" aria-hidden>
        {/* Top Facet: FPT Orange */}
        <path d="M16 2 L29 9 L16 16 L3 9 Z" fill="#F26522" />
        {/* Left Facet: FPT Blue */}
        <path d="M3 9 L16 16 L16 30 L3 23 Z" fill="#005CA9" />
        {/* Right Facet: FPT Green */}
        <path d="M16 16 L29 9 L29 23 L16 30 Z" fill="#6DB33F" />
        {/* Fold crease highlight */}
        <path d="M9.5 5.5 L22.5 12.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </svg>
      <span className="font-landing-heading text-[26px] font-bold leading-none tracking-tight">
        <span className={tone === "dark" ? "text-stone-900" : "text-white"}>wrap</span>
        <span className="text-[#F26522]">fit</span>
      </span>
    </Link>
  );
}
