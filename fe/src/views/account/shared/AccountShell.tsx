"use client";

import Link from "next/link";
import React from "react";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { ROUTES } from "@/constants";

interface AccountShellProps {
  /** Gói's pose for the current step (delivery = email sent, celebration = done…). */
  pose: MascotPose;
  /** Small mono label above the title. */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Page around the account cards: the paper of the login screen with a CAD dot grid, the logo on top and room for the
 * floating mobile navigation at the bottom.
 */
export function AccountFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col bg-[#fff8f5] font-sans text-stone-800 antialiased"
      style={{
        backgroundImage: "radial-gradient(rgba(28, 25, 23, 0.07) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-5 sm:px-8">
        <BrandLogo size="md" href={ROUTES.home} />
        <span className="hidden items-center gap-2 font-mono text-[11px] text-stone-500 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Tài khoản WrapFit
        </span>
      </header>

      {/* Bottom padding clears the floating mobile navigation bar. */}
      <main className="flex flex-1 items-center justify-center px-4 pb-28 pt-8 md:pb-12">{children}</main>

      <footer className="mx-auto hidden w-full max-w-5xl items-center justify-between px-8 pb-6 font-mono text-[11px] text-stone-400 md:flex">
        <span>Bảo mật TLS 256-Bit</span>
        <Link href="/support" className="transition-colors hover:text-stone-700">
          Trợ giúp
        </Link>
      </footer>
    </div>
  );
}

/** One account step: a squircle card with Gói on top, inside `AccountFrame`. */
export function AccountShell({ pose, eyebrow, title, description, children }: AccountShellProps) {
  return (
    <AccountFrame>
      <section
        aria-labelledby="account-title"
        className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/85 p-6 shadow-tactile backdrop-blur-md sm:p-8"
      >
        <div className="mb-4 flex justify-center">
          <GoiMascot pose={pose} size={84} label="Gói, trợ lý đóng gói của WrapFit" />
        </div>
        {eyebrow && (
          <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            {eyebrow}
          </p>
        )}
        <h1
          id="account-title"
          className="mt-1.5 text-center font-serif text-[26px] leading-tight tracking-tight text-stone-900 sm:text-[30px]"
        >
          {title}
        </h1>
        {description && <div className="mt-3 text-center text-sm leading-relaxed text-stone-600">{description}</div>}
        {children && <div className="mt-6">{children}</div>}
      </section>
    </AccountFrame>
  );
}

/** Placeholder inside the card while the page reads its query string. */
export function AccountLoading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-4">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-brand-forest motion-reduce:animate-none" />
      <span className="font-mono text-xs uppercase tracking-wider text-stone-500">{label}</span>
    </div>
  );
}

/** Secondary text link of the account pages. */
export const TEXT_LINK =
  "inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-brand-forest underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/30 rounded-full px-2";
