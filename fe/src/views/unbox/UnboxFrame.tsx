import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { ROUTES } from "@/constants";

/** Night-forest page of the unboxing screens, with the WrapFit links at the bottom. */
export function UnboxFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden bg-gradient-to-b from-brand-forest-dark via-brand-forest to-[#0D1C16] px-4 pb-28 pt-4 font-sans text-white sm:px-8 md:pb-8">
      {/* Gold foil dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <header className="relative z-20 flex w-full max-w-6xl items-center justify-between gap-3">
        <Link href={ROUTES.home} className="inline-flex min-h-[44px] items-center gap-2.5 text-brand-gold transition hover:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-squircle border border-brand-gold/40 bg-brand-gold/20 font-serif font-bold">
            W
          </span>
          <span className="font-serif text-lg font-bold tracking-wide">WrapFit</span>
        </Link>
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
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-vibrant-cobalt px-6 text-sm font-bold text-white shadow-cobalt-glow transition hover:bg-vibrant-cobalt-dark sm:w-auto"
        >
          Tự tay thiết kế hộp quà
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </footer>
    </div>
  );
}
