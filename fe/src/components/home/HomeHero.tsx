import Image from "next/image";
import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";
import { HERO, HERO_FEATURES, INDUSTRY_TILES, type IndustryTile } from "./content";
import { Container, Tag, limeButton } from "@/components/landing";

/**
 * Hero of the home page, in two balanced columns from lg: the text on the left (badge, two-line title, the five
 * strengths, the call to action), four industry photos on the right. Stacked on phones, text first.
 */
export function HomeHero() {
  return (
    <header className="bg-gradient-to-b from-white to-landing-canvas pb-10 pt-28 sm:pt-32 lg:pb-16">
      <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:gap-7 lg:text-left">
          {/* Official Slogan & FPT Identity */}
          <div className="group inline-flex items-center gap-2.5 rounded-full border border-line/90 bg-white/95 px-4 py-1.5 shadow-2xs backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-fpt-orange/40 hover:shadow-soft-8">
            {/* 3 iconic FPT colored frames/dots */}
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="size-2 rounded-full bg-fpt-blue ring-2 ring-fpt-blue/25" title="FPT Blue" />
              <span className="size-2 rounded-full bg-fpt-orange ring-2 ring-fpt-orange/25 animate-pulse" title="FPT Orange" />
              <span className="size-2 rounded-full bg-fpt-green ring-2 ring-fpt-green/25" title="FPT Green" />
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-fg">
              Nền tảng thiết kế hộp quà thông minh
            </span>
          </div>

          <h1 className="font-landing-heading text-3xl font-bold leading-tight tracking-tight text-landing-ink lg:text-5xl 2xl:text-6xl">
            {HERO.title}
            <br />
            <span
              className={cn(
                "inline-block bg-clip-text py-1 text-[2.75rem] leading-[1.15] text-transparent md:text-6xl xl:text-7xl 2xl:text-8xl",
                // FPT blue, orange and green drifting through the word (globals.css .text-tricolor); every stop is ≥ 3:1 for large text.
                "text-tricolor bg-gradient-to-r from-fpt-blue from-15% via-fpt-orange via-50% to-fpt-green-dark to-85%"
              )}
            >
              {HERO.highlight}
            </span>
          </h1>

          <ul data-tour="home-features" className="grid w-full grid-cols-2 gap-1 sm:gap-2">
            {HERO_FEATURES.map(({ icon: Icon, label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex h-full items-center gap-2 rounded-2xl p-2 text-left transition-colors duration-300 hover:bg-landing-tile/50 lg:p-3"
                >
                  <Icon className="size-5 shrink-0 text-landing-ink lg:size-6" strokeWidth={1.75} aria-hidden />
                  <span className="font-landing-heading text-xs font-semibold leading-4 text-landing-ink lg:text-sm lg:leading-[18px]">
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link href={HERO.cta.href} className={limeButton()} data-tour="home-cta">
            {HERO.cta.label}
          </Link>
        </div>

        <section aria-label="Ngành hàng nổi bật" data-tour="home-industries" className="grid grid-cols-2 gap-2 lg:gap-4">
          {/* Four equal tiles: a 2 × 2 block about as tall as the text beside it. */}
          {INDUSTRY_TILES.slice(0, 4).map((tile, index) => (
            <BentoTile key={tile.title} tile={tile} featured={index === 0} />
          ))}
        </section>
      </Container>
    </header>
  );
}

function BentoTile({ tile, featured }: { tile: IndustryTile; featured: boolean }) {
  return (
    <Link
      href={tile.href}
      className={cn(
        "group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-soft-16",
        "p-4"
      )}
    >
      <Image
        src={tile.image}
        alt=""
        fill
        priority={featured}
        sizes="(min-width: 1024px) 24vw, 50vw"
        className="-z-10 object-cover"
      />
      {/* Frosted band at the bottom, then a dark gradient, so the caption reads on any photo */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-lg [mask-image:linear-gradient(transparent_0%,transparent_75%,black_90%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent" />
      {/* Hover darkens the photo a touch instead of zooming it: scaling these photos repaints them blurry mid-animation */}
      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
      {tile.tag && <Tag className="absolute top-3 right-3">{tile.tag}</Tag>}
      <div className="relative">
        <h3
          className={cn(
            "font-landing-heading font-semibold text-white/95",
            // Same size on all four equal tiles; long names stay on the photo.
            "line-clamp-2 text-base leading-6 xl:text-xl xl:leading-7"
          )}
        >
          {tile.title}
        </h3>
        {tile.description && (
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-white/80">
            {tile.description}
          </p>
        )}
      </div>
    </Link>
  );
}
