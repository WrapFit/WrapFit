import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";
import { HERO, HERO_FEATURES, INDUSTRY_TILES } from "./content";
import { Container, limeButton } from "@/components/landing";
import { TourReplayButton } from "@/components/ui";
import { ONBOARDING_TOUR_ID } from "@/features/auth";
import { HeroFoldBox } from "./HeroFoldBox";
import styles from "./HeroFoldBox.module.css";

/** Staggered entrance of the text blocks, in ms. */
const rise = (delay: number) => ({ style: { animationDelay: `${delay}ms` } });

/**
 * Hero of the home page. Left: badge, two-line title, what WrapFit does, the five strengths, the call to action and
 * three figures, rising in turn. Right: the fold stage, where a box net folds into a box printed for each industry
 * (HeroFoldBox). Stacked on phones, text first.
 */
export function HomeHero() {
  return (
    <header className="relative isolate overflow-hidden bg-gradient-to-b from-white to-landing-canvas pb-12 pt-28 sm:pt-32 lg:pb-20">
      {/* Backdrop: millimetre grid and three soft FPT-coloured glows. */}
      <div aria-hidden className={cn(styles.heroGrid, "pointer-events-none absolute inset-0 -z-10")} />
      <div aria-hidden className="pointer-events-none absolute -left-40 top-10 -z-10 size-[30rem] rounded-full bg-fpt-blue/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute right-[-8rem] top-24 -z-10 size-[34rem] rounded-full bg-fpt-orange/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-12rem] left-1/3 -z-10 size-[28rem] rounded-full bg-fpt-green/10 blur-3xl" />

      <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <div
            {...rise(0)}
            className={cn(
              styles.rise,
              "group inline-flex items-center gap-2.5 rounded-full border border-line/90 bg-white/95 px-4 py-1.5 shadow-2xs backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-fpt-orange/40 hover:shadow-soft-8"
            )}
          >
            {/* The three FPT colours */}
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="size-2 rounded-full bg-fpt-blue ring-2 ring-fpt-blue/25" />
              <span className="size-2 animate-pulse rounded-full bg-fpt-orange ring-2 ring-fpt-orange/25" />
              <span className="size-2 rounded-full bg-fpt-green ring-2 ring-fpt-green/25" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-fg sm:text-sm">Nền tảng thiết kế hộp quà thông minh</span>
          </div>

          <h1 {...rise(90)} className={cn(styles.rise, "font-landing-heading text-4xl font-bold leading-tight tracking-tight text-landing-ink lg:text-5xl 2xl:text-6xl")}>
            {HERO.title}
            <br />
            <span
              className={cn(
                "inline-block bg-clip-text pb-3 pt-2 text-[2.75rem] leading-[1.35] text-transparent md:text-6xl xl:text-7xl 2xl:text-8xl",
                // Tall line box and padding: the gradient is clipped to the box, Vietnamese stacked marks (ý, ọ, ẹ) need the room.
                // FPT blue, orange and green drifting through the word (globals.css .text-tricolor); every stop is ≥ 3:1 for large text.
                "text-tricolor bg-gradient-to-r from-fpt-blue from-15% via-fpt-orange via-50% to-fpt-green-dark to-85%"
              )}
            >
              {HERO.highlight}
            </span>
          </h1>

          <p {...rise(180)} className={cn(styles.rise, "-mt-3 max-w-xl text-base leading-relaxed text-landing-muted sm:text-lg")}>
            {HERO.lead}
          </p>

          <ul {...rise(270)} data-tour="home-features" className={cn(styles.rise, "flex flex-wrap justify-center gap-2 lg:justify-start")}>
            {HERO_FEATURES.map(({ icon: Icon, label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line/80 bg-white/80 px-3.5 py-2 text-sm font-semibold text-landing-ink shadow-2xs backdrop-blur-md transition-[border-color,color,transform] duration-300 hover:-translate-y-0.5 hover:border-fpt-orange/50 hover:text-fpt-orange-ink"
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div {...rise(360)} className={cn(styles.rise, "flex flex-wrap items-center justify-center gap-3 lg:justify-start")}>
            <Link href={HERO.cta.href} className={limeButton()} data-tour="home-cta">
              {HERO.cta.label}
            </Link>
            <TourReplayButton tourId={ONBOARDING_TOUR_ID} variant="ghost" className="min-h-11 sm:min-h-0" />
          </div>

          <dl {...rise(450)} className={cn(styles.rise, "grid w-full max-w-xl grid-cols-3 divide-x divide-line/80 border-t border-line/70 pt-5")}>
            {HERO.stats.map((stat) => (
              <div key={stat.value} className="flex flex-col gap-1 px-3 first:pl-0 lg:px-5">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-landing-heading text-xl font-bold text-landing-ink sm:text-2xl">{stat.value}</dd>
                <dd className="text-xs leading-4 text-landing-muted sm:text-sm sm:leading-5">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div {...rise(200)} className={styles.rise}>
          <HeroFoldBox tiles={INDUSTRY_TILES} />
        </div>
      </Container>
    </header>
  );
}
