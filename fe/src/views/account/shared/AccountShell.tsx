"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { cn } from "@/utils/helpers";
import { buttonClass } from "@/components/ui";

// Account pages in the pack.ly style of the login screen: logo bar, then the step in a white card in the middle.

/** Logo bar and the centred card. */
export function AccountFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${landingFontVariables} flex min-h-screen flex-col bg-mist-100 font-landing-body text-landing-ink antialiased`}>
      <header className="flex h-16 shrink-0 items-center justify-between px-5 lg:px-8">
        <LandingLogo />
        <Link href="/support" className="py-2 text-sm font-medium text-landing-muted hover:text-landing-ink">
          Trợ giúp
        </Link>
      </header>

      {/* Bottom padding below md clears the floating mobile navigation bar. */}
      <main className="flex flex-1 items-center justify-center px-4 pb-24 pt-4 md:pb-12">
        <div className="w-full max-w-[480px] rounded-sheet border border-landing-line bg-white px-6 py-8 sm:px-10 sm:py-10">{children}</div>
      </main>
    </div>
  );
}

const ICON_TONES = {
  lime: "bg-landing-lime text-landing-green-night",
  amber: "bg-warning-bg text-warning-fg",
  red: "bg-danger-bg text-danger-fg",
} as const;

interface AccountShellProps {
  /** Status of the step: mail sent, key, check… */
  icon: LucideIcon;
  /** `amber` / `red` when the link has a problem. */
  tone?: keyof typeof ICON_TONES;
  /** Small label above the title. */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/** One account step: status icon, eyebrow, big title, text, then the form or the actions. */
export function AccountShell({ icon: Icon, tone = "lime", eyebrow, title, description, children }: AccountShellProps) {
  return (
    <AccountFrame>
      <section aria-labelledby="account-title">
        <div className="text-center">
          <span className={cn("mx-auto flex size-14 items-center justify-center rounded-2xl", ICON_TONES[tone])}>
            <Icon className="size-6" strokeWidth={2} aria-hidden />
          </span>
          {eyebrow && <p className="mt-5 text-sm font-semibold text-landing-green">{eyebrow}</p>}
          <h1 id="account-title" className={cn("font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl", eyebrow ? "mt-1" : "mt-5")}>
            {title}
          </h1>
          {description && <div className="mt-3 text-base leading-7 text-landing-muted">{description}</div>}
        </div>
        {children && <div className="mt-7">{children}</div>}
      </section>
    </AccountFrame>
  );
}

/** Placeholder while the page reads its query string. */
export function AccountLoading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm text-landing-muted ring-1 ring-landing-ink/10">
      <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-landing-line border-t-landing-green motion-reduce:animate-none" />
      {label}
    </div>
  );
}

/** Secondary text link of the account pages. */
export const TEXT_LINK =
  "inline-flex min-h-[44px] items-center justify-center rounded-lg px-1 text-sm font-semibold text-landing-green-deep underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-green/40";

/** Main action as a link (same pill as the submit button). */
export const PRIMARY_LINK = buttonClass({ variant: "primary", size: "xl", block: true });

/** White pill with a hairline: resend, retry. */
export const SECONDARY_BUTTON = buttonClass({ variant: "secondary", size: "xl", block: true, className: "font-medium" });
