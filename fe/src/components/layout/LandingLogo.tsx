/* ds-artwork: logo lockup: its sizes and the FPT orange are part of the mark. Raw colours and sizes here are allowed (docs/15_DESIGN_SYSTEM.md §2). */
import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";
import { WrapFitMark } from "./WrapFitMark";

export interface LandingLogoProps {
  tone?: "dark" | "light";
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * WrapFit logo: the folded-box W mark, then "rap" + orange "Fit", read as one word (as the P of Pacdora).
 * `tone="light"` for dark backgrounds (footer, sign-in panel, unbox): white "rap".
 */
export function LandingLogo({ tone = "dark", className, size = "md" }: LandingLogoProps) {
  const iconPx = size === "sm" ? 22 : size === "lg" ? 29 : 26;
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
      className={cn("group inline-flex shrink-0 items-center gap-0 select-none", className)}
      style={{ textDecoration: "none" }}
    >
      {/* Pacdora-style lockup: the W mark is the first letter, the word goes on as "rapFit". */}
      <WrapFitMark height={iconPx} className="-mr-0.5 shrink-0 -translate-y-px transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none" />

      <span className={cn("font-landing-heading font-bold leading-none tracking-tight", textClass)}>
        <span className={tone === "dark" ? "text-fg" : "text-white"}>rap</span>
        <span className="text-fpt-orange">Fit</span>
      </span>
    </Link>
  );
}
