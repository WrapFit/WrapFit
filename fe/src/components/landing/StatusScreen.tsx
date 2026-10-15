import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { buttonClass } from "@/components/ui";

interface Shortcut {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
}

interface StatusScreenProps {
  /** Big number or word above the title (404, "Lỗi"). */
  code: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  shortcuts?: Shortcut[];
}

/** Full page for a missing page or a crash, in the pack.ly style: big code, bold title, lime action, shortcuts. */
export function StatusScreen({ code, title, description, actions, shortcuts = [] }: StatusScreenProps) {
  return (
    <div className={`${landingFontVariables} flex min-h-screen flex-col bg-mist-100 font-landing-body text-landing-ink antialiased`}>
      <header className="flex h-16 items-center px-5 lg:px-8">
        <LandingLogo />
      </header>
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-center px-4 pb-24 pt-6 md:pb-12 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="font-landing-heading text-7xl font-bold leading-none tracking-tight text-landing-green sm:text-8xl">{code}</p>
            <h1 className="mt-4 font-landing-heading text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-landing-muted">{description}</p>
            <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
          </div>
          {/* A flat dieline that "unfolded" off the page: the drawing of a missing box. */}
          <svg viewBox="0 0 360 260" className="mx-auto w-full max-w-md" aria-hidden>
            <rect x="0" y="0" width="360" height="260" rx="28" fill="#FFFFFF" />
            <g fill="none" strokeWidth="2" transform="translate(40 40)">
              <path d="M70 40 H150 V0 H230 V40 H280 V140 H230 V180 H150 V140 H70 Z M0 40 H70 V140 H0 Z" stroke="#E53E3E" />
              <path d="M70 40 V140 M150 40 V140 M230 40 V140 M150 40 H230 M150 140 H230" stroke="#3182CE" strokeDasharray="6 5" />
              <text x="190" y="98" textAnchor="middle" fontFamily="monospace" fontSize="22" fill="#98A2B3" stroke="none">
                ?
              </text>
            </g>
          </svg>
        </div>
        {shortcuts.length > 0 && (
          <ul className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex h-full items-start gap-3 rounded-sheet bg-white p-5 transition-shadow hover:ring-2 hover:ring-landing-ink/10">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-landing-lime text-landing-green-night">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-landing-heading text-base font-bold">{item.title}</span>
                    <span className="mt-0.5 block text-sm leading-6 text-landing-muted">{item.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export const LIME_PILL = buttonClass({ variant: "primary", size: "xl" });
export const WHITE_PILL = buttonClass({ variant: "secondary", size: "xl", className: "font-medium" });
