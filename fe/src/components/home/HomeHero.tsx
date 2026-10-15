import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";
import { HERO, HERO_FEATURES, INDUSTRY_TILES, type IndustryTile } from "./content";
import { Container, Stars, Tag, limeButton } from "@/components/landing";

/** Hero of the home page: badges, two-line title, lead, the five strengths, and the bento of industries. */
export function HomeHero() {
  return (
    <header className="bg-gradient-to-b from-white to-landing-canvas pt-28 sm:pt-32">
      <Container className="flex flex-col items-center gap-3.5 text-center lg:gap-7">
        {/* Official Slogan & FPT Identity */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4">
          <div className="group inline-flex items-center gap-2.5 rounded-full border border-line/90 bg-white/95 px-4 py-1.5 shadow-2xs backdrop-blur-md transition-all duration-300 hover:border-fpt-orange/40 hover:shadow-soft-8">
            {/* 3 iconic FPT colored frames/dots */}
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="size-2 rounded-full bg-fpt-blue ring-2 ring-fpt-blue/25" title="FPT Blue" />
              <span className="size-2 rounded-full bg-fpt-orange ring-2 ring-fpt-orange/25 animate-pulse" title="FPT Orange" />
              <span className="size-2 rounded-full bg-fpt-green ring-2 ring-fpt-green/25" title="FPT Green" />
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-fg">
              WrapFit · Nền tảng thiết kế hộp quà thông minh
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {HERO.badges.map((badge, idx) => (
              <span key={badge} className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-sunken/90 px-2.5 text-xs font-medium text-fg-muted">
                <Stars className={cn("text-xs", idx === 0 ? "text-fpt-blue" : "text-fpt-green-dark")} />
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5 lg:gap-5">
          <h1 className="font-landing-heading text-3xl font-bold leading-tight tracking-tight text-landing-ink lg:text-5xl 2xl:text-6xl">
            {HERO.title}
            <br />
            <span
              className={cn(
                "inline-block bg-clip-text py-1 text-[2.75rem] leading-[1.15] text-transparent md:text-6xl xl:text-7xl 2xl:text-8xl",
                // pack.ly green headline; the lightest stop stays ≥ 3:1 for large text.
                "bg-gradient-to-r from-landing-green-deep via-landing-green to-landing-green-deep"
              )}
            >
              {HERO.highlight}
            </span>
          </h1>
          <p className="max-w-3xl text-balance text-body-sm text-fg-muted lg:text-body-lg lg:font-medium">{HERO.lead}</p>
        </div>

        <ul className="grid w-full grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:justify-center lg:flex-nowrap lg:gap-2">
          {HERO_FEATURES.map(({ icon: Icon, label, href }) => (
            <li key={label} className="lg:flex-1 lg:max-w-fit">
              <Link
                href={href}
                className="flex h-full items-center gap-1.5 rounded-2xl p-2 text-left transition-colors duration-300 hover:bg-landing-tile/50 lg:gap-2 lg:p-3"
              >
                <Icon className="size-5 shrink-0 text-landing-ink lg:size-6" strokeWidth={1.75} aria-hidden />
                <span className="font-landing-heading text-xs font-semibold leading-4 text-landing-ink lg:text-sm lg:leading-[18px]">
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link href={HERO.cta.href} className={limeButton()}>
          {HERO.cta.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Container>

      <Container className="pt-8 pb-6 lg:pt-12 lg:pb-10">
        <section aria-label="Ngành hàng nổi bật" className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-5">
          {INDUSTRY_TILES.map((tile, index) => (
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
        "group relative isolate flex aspect-square flex-col justify-end overflow-hidden rounded-2xl transition-shadow duration-300 hover:shadow-soft-16",
        featured ? "col-span-2 p-5 lg:row-span-2" : "p-3"
      )}
    >
      <img
        src={tile.image}
        alt=""
        loading={featured ? "eager" : "lazy"}
        className="absolute inset-0 -z-10 size-full object-cover"
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
            featured ? "text-base leading-6 lg:text-2xl lg:leading-8" : "text-base leading-6 lg:text-xl lg:leading-7"
          )}
        >
          {tile.title}
        </h3>
        {tile.description && (
          <p className="mt-1 line-clamp-4 text-sm font-medium leading-5 text-white/80 lg:line-clamp-3 lg:text-base lg:leading-6">
            {tile.description}
          </p>
        )}
      </div>
    </Link>
  );
}
