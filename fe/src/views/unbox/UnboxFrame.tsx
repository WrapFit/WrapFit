import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { ROUTES } from "@/constants";

/** Page of the unboxing screens in the pack.ly style: logo bar, the content, then the WrapFit links. */
export function UnboxFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${landingFontVariables} flex min-h-screen flex-col bg-mist-100 font-landing-body text-landing-ink antialiased`}>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-5 lg:px-8">
        <LandingLogo />
        <Link
          href={ROUTES.editorNew}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-landing-lime px-4 text-sm font-semibold text-landing-green-night transition-colors hover:bg-action-hover"
        >
          Tự thiết kế hộp quà
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      {/* Bottom padding below md clears the floating mobile navigation bar. */}
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center px-4 pb-28 pt-4 md:pb-12 lg:px-8">{children}</main>

      <footer className="hidden items-center justify-center gap-6 pb-6 text-sm text-landing-muted md:flex">
        <Link href={ROUTES.home} className="hover:text-landing-ink hover:underline">
          Khám phá WrapFit
        </Link>
        <Link href={ROUTES.templates} className="hover:text-landing-ink hover:underline">
          Thư viện mẫu hộp
        </Link>
        <Link href="/support" className="hover:text-landing-ink hover:underline">
          Trợ giúp
        </Link>
      </footer>
    </div>
  );
}
