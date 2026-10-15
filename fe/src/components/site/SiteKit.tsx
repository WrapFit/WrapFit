"use client";

import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { Container, Reveal, limeButton } from "@/components/landing";
import { MainFooter, MainHeader } from "@/components/layout";
import { Badge, Breadcrumb, buttonClass, cardClass, type BreadcrumbItem } from "@/components/ui";
import { cn } from "@/utils/helpers";

// Building blocks of the company and marketing pages (features, compare, press, careers, legal, status…), after the
// sub-pages of pack.ly (help center, blog, careers): a left-aligned display title with a muted second line, large
// photos with 2–3rem corners, section titles with the round arrow chip, the lime closing band, and the orange call to
// action of limeButton. Photos come from the project library (public/stitch/img, described in components/home/content).

/** A photo of public/stitch/img. */
export const photo = (id: string) => `/stitch/img/${id}.jpg`;

/** Header, page body on the landing canvas, footer. */
/**
 * Page frame of the site: header, main, footer. `theme` previews the main area in one theme (the /design-system page);
 * without it the page follows the default light theme.
 */
export function SitePage({ children, className, theme }: { children: React.ReactNode; className?: string; theme?: "light" | "dark" }) {
  return (
    <>
      <MainHeader />
      <main data-theme={theme} className={cn(landingFontVariables, "w-full overflow-x-clip bg-canvas font-landing-body text-fg antialiased", className)}>
        {children}
      </main>
      <MainFooter />
    </>
  );
}

export const PRIMARY_CTA = limeButton("md");
export const SECONDARY_CTA = buttonClass({ variant: "secondary" });

/** Grey line above a title (the eyebrow of pack.ly), with an optional icon. */
export function Kicker({ icon: Icon, children, tone = "light" }: { icon?: LucideIcon; children: React.ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={cn("inline-flex items-center gap-2 font-landing-heading text-title", tone === "light" ? "text-fg-muted" : "text-landing-lime-soft")}>
      {Icon && <Icon className="size-5" aria-hidden />}
      {children}
    </p>
  );
}

export interface HeroImage {
  src: string;
  alt: string;
  /** Short caption over the bottom of the photo. */
  caption?: string;
}

interface PageHeroProps {
  /** Path above the title for pages below the first level (blog post, legal page…). */
  breadcrumb?: BreadcrumbItem[];
  kicker?: React.ReactNode;
  kickerIcon?: LucideIcon;
  title: React.ReactNode;
  /** Second, muted line of the title (as in the help center: "Cần giúp? Tìm câu trả lời…"). */
  subtitle?: React.ReactNode;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  /** Large photo under the text, full width. */
  image?: HeroImage;
  /** Right column (photo, card) instead of the full-width photo. */
  aside?: React.ReactNode;
  /** Line under the actions (small print, last update…). */
  meta?: React.ReactNode;
  className?: string;
}

/** Top of a page, after pack.ly: left-aligned display title, muted second line, lead, actions, then a large photo. */
export function PageHero({ breadcrumb, kicker, kickerIcon, title, subtitle, lead, actions, image, aside, meta, className }: PageHeroProps) {
  const text = (
    <Reveal variant="text" className="flex max-w-4xl flex-col gap-5">
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      {kicker && <Kicker icon={kickerIcon}>{kicker}</Kicker>}
      <div>
        <h1 className="font-landing-heading text-display-xl text-fg">{title}</h1>
        {subtitle && <p className="mt-2 font-landing-heading text-heading-lg font-semibold text-fg-muted">{subtitle}</p>}
      </div>
      {lead && <p className="max-w-2xl text-body text-fg-muted sm:text-body-lg">{lead}</p>}
      {actions && <div className="flex flex-wrap gap-3 pt-1">{actions}</div>}
      {meta && <div className="text-caption text-fg-muted">{meta}</div>}
    </Reveal>
  );
  return (
    <section className={cn("pb-section pt-28 sm:pt-32 lg:pb-section-lg", className)}>
      <Container>
        {aside ? (
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
            {text}
            <Reveal>{aside}</Reveal>
          </div>
        ) : (
          text
        )}
        {image && (
          <Reveal className="mt-10 lg:mt-14">
            <PhotoFrame image={image} className="aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/6]" />
          </Reveal>
        )}
      </Container>
    </section>
  );
}

/** A photo in a rounded frame (2rem, 3rem from lg), with an optional caption over a dark fade. */
export function PhotoFrame({ image, className, children }: { image: HeroImage; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden rounded-card bg-surface-sunken lg:rounded-card-lg", className)}>
      <img src={image.src} alt={image.alt} loading="lazy" className="absolute inset-0 size-full object-cover" />
      {image.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5 pt-16 sm:p-8 sm:pt-20">
          <p className="max-w-xl font-landing-heading text-title font-semibold text-white sm:text-heading-sm">{image.caption}</p>
        </div>
      )}
      {children}
    </div>
  );
}

interface SectionProps {
  id?: string;
  kicker?: string;
  title?: React.ReactNode;
  lead?: React.ReactNode;
  /** The title links there, with the round arrow chip of pack.ly. */
  href?: string;
  /** Link or button at the right of the title. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** White band instead of the canvas. */
  band?: boolean;
}

export function Section({ id, kicker, title, lead, href, action, children, className, band }: SectionProps) {
  const heading = title && <h2 className="font-landing-heading text-heading-lg">{title}</h2>;
  return (
    <section id={id} className={cn("scroll-mt-24 py-section lg:py-section-lg", band && "bg-surface-raised", className)}>
      <Container>
        {(title || kicker) && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
            <Reveal variant="text" className="flex max-w-3xl flex-col gap-1">
              {kicker && <p className="font-landing-heading text-title text-fg-muted">{kicker}</p>}
              {href ? (
                <Link href={href} className="group flex w-fit items-center gap-2 text-fg">
                  {heading}
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken transition-transform group-hover:translate-x-1">
                    <ArrowRight className="size-5" aria-hidden />
                  </span>
                </Link>
              ) : (
                heading
              )}
              {lead && <p className="mt-1 text-body text-fg-muted">{lead}</p>}
            </Reveal>
            {action}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

/** White card, hairline ring, 2rem corners: the shared Card (soft variant). */
export function Card({ className, children, as: Tag = "div" }: { className?: string; children?: React.ReactNode; as?: "div" | "article" | "li" }) {
  return <Tag className={cardClass({ variant: "soft", padding: "md", className })}>{children}</Tag>;
}

/** Icon in a rounded lime tile. */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-bg text-success-fg", className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export interface Stat {
  value: string;
  label: string;
  /** Where the figure comes from (survey, interview…). */
  source?: string;
}

export function StatGrid({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-3xl bg-surface-raised p-card-sm ring-1 ring-fg/10">
          <dt className="sr-only">{stat.label}</dt>
          <dd className="font-landing-heading text-heading-lg text-fg">{stat.value}</dd>
          <dd className="mt-1 text-body-sm text-fg-muted">{stat.label}</dd>
          {stat.source && <dd className="mt-2 text-caption text-fg-muted">{stat.source}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Ticked list. */
export function CheckList({ items, className, tone = "light" }: { items: React.ReactNode[]; className?: string; tone?: "light" | "dark" }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item, index) => (
        <li key={index} className={cn("flex items-start gap-2.5 text-body-sm leading-relaxed", tone === "light" ? "text-fg" : "text-landing-lime-mist")}>
          <span className={cn("mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full", tone === "light" ? "bg-landing-lime text-landing-green-night" : "bg-landing-lime/20 text-landing-lime")}>
            <Check className="size-3" strokeWidth={3} aria-hidden />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Closing band of pack.ly: lime gradient over a big isometric box, centred title, one or two pill actions. */
export function CtaPanel({ title, body, actions }: { title: React.ReactNode; body?: React.ReactNode; actions: React.ReactNode }) {
  return (
    <section className="relative isolate mt-6 overflow-hidden bg-gradient-to-b from-landing-lime-mist to-landing-lime-soft py-20 lg:py-32">
      <svg viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 -z-10 size-[420px] -translate-x-1/2 -translate-y-1/2 opacity-60 lg:size-[560px]" aria-hidden>
        <path d="M100 18 L172 58 L100 98 L28 58 Z" fill="#AFEC88" />
        <path d="M28 58 L100 98 L100 182 L28 142 Z" fill="#98E665" />
        <path d="M100 98 L172 58 L172 142 L100 182 Z" fill="#7BCB4A" />
      </svg>
      <Container>
        <Reveal variant="text" className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2 className="font-landing-heading text-display text-landing-green-night">{title}</h2>
          {body && <div className="text-body text-landing-green-night/85 lg:text-body-lg">{body}</div>}
          <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>
        </Reveal>
      </Container>
    </section>
  );
}

/** White pill of the lime band. */
export const WHITE_PILL = buttonClass({ variant: "white" });

/** Link with an arrow, for "Xem thêm". */
export function ArrowLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-1.5 rounded-md text-label font-semibold text-success-fg underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-focus/40", className)}>
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface EmailCaptureProps {
  /** Name of the list, kept with the address on this device until the mailing service is connected. */
  list: string;
  cta: string;
  placeholder?: string;
  /** Small print under the field. */
  note?: React.ReactNode;
  done: string;
  tone?: "light" | "dark";
  className?: string;
}

/**
 * Email sign-up of the marketing pages (newsletter, launch alerts, status updates). The API has no mailing list yet:
 * the address is checked and kept on this device, and the page says so instead of pretending a mail was sent.
 */
export function EmailCapture({ list, cta, placeholder = "email@cuahang.vn", note, done, tone = "light", className }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const id = `email-${list}`;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError("Email chưa đúng định dạng, ví dụ: ten@cuahang.vn");
      return;
    }
    try {
      const key = `wrapfit:list:${list}`;
      const current = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      localStorage.setItem(key, JSON.stringify([...new Set([...current, value])]));
    } catch {
      // Private mode: the confirmation still shows; nothing else depends on it.
    }
    setError(null);
    setSaved(true);
  };

  if (saved) {
    return (
      <p role="status" className={cn("rounded-2xl px-4 py-3 text-body-sm font-medium", tone === "light" ? "bg-landing-lime-mist text-landing-green-deep" : "bg-white/10 text-landing-lime-soft", className)}>
        {done}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="sr-only">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-full px-4 text-body-sm outline-none transition focus-visible:ring-[3px]",
            tone === "light"
              ? "bg-surface-raised text-fg ring-1 ring-line-strong/70 placeholder:text-fg-muted focus-visible:ring-focus/30 aria-[invalid=true]:ring-danger"
              : "bg-white/10 text-white ring-1 ring-white/20 placeholder:text-white/50 focus-visible:ring-landing-lime/40"
          )}
        />
        <button type="submit" className={cn(limeButton("md"), "h-11")}>
          {cta}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-caption font-medium text-danger-fg">
          {error}
        </p>
      )}
      {note && <p className={cn("text-caption", tone === "light" ? "text-fg-muted" : "text-landing-lime-mist/70")}>{note}</p>}
    </form>
  );
}

/** Label "Dữ liệu mẫu" for blocks the API does not serve yet (shared Badge, warning). */
export function SampleBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" dot className={className}>
      Dữ liệu mẫu
    </Badge>
  );
}

/** Table of contents of a long page (legal, security), sticky on large screens. */
export function Toc({ items, className }: { items: { id: string; label: string }[]; className?: string }) {
  return (
    <nav aria-label="Mục lục" className={cn("rounded-3xl bg-surface-raised p-5 ring-1 ring-fg/10 lg:sticky lg:top-24", className)}>
      <p className="mb-3 text-overline uppercase text-fg-muted">Mục lục</p>
      <ol className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="flex gap-2 rounded-xl px-2 py-1.5 text-body-sm text-fg outline-none transition-colors hover:bg-canvas focus-visible:ring-[3px] focus-visible:ring-focus/40">
              <span className="font-mono text-caption text-fg-muted">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
