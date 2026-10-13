import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { ROUTES } from "@/constants";

/** Night-green page of the unboxing screens (the dark section of pack.ly), with the WrapFit links at the bottom. */
export function UnboxFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${landingFontVariables} relative flex min-h-screen flex-col items-center overflow-x-hidden bg-gradient-to-b from-landing-green-night via-[#1B3A0A] to-[#0B1604] px-4 pb-28 pt-4 font-landing-body text-white sm:px-8 md:pb-8`}>
      {/* Lime dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#98E665_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <header className="relative z-20 flex w-full max-w-6xl items-center justify-between gap-3">
        <LandingLogo tone="light" className="min-h-[44px]" />
      </header>

      <main className="relative z-10 flex w-full max-w-6xl flex-1 flex-col items-center justify-center py-6">{children}</main>

      <footer className="relative z-20 flex w-full max-w-xl flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={ROUTES.home}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/20 sm:w-auto"
        >
          Khám phá WrapFit
        </Link>
        <Link
          href={ROUTES.editorNew}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-landing-lime px-6 text-sm font-semibold text-landing-green-night transition-colors hover:bg-[#AFEC88] sm:w-auto"
        >
          Tự tay thiết kế hộp quà
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </footer>
    </div>
  );
}
