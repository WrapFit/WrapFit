"use client";

import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import React from "react";
import { buttonClass, cardClass } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { useInView } from "@/hooks/dom";

/** Width of the home page content: 1280 px, 1536 px from 2xl, with the side padding inside. */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-screen-xl px-4 lg:px-8 2xl:max-w-screen-2xl", className)}>{children}</div>;
}

/**
 * Primary call to action of pack.ly: lime pill, dark green text (10:1). `size="sm"` is the 36 px button of the cards.
 * The shared Button (components/ui) in its primary variant.
 */
export function limeButton(size: "md" | "sm" = "md") {
  return buttonClass({ variant: "primary", size });
}

/** Outline pill on the dark green card. */
export const darkGhostButton = buttonClass({ variant: "ghost-dark", size: "sm" });

/** Round white arrow button of the carousels. */
export const roundButton =
  "inline-flex size-11 items-center justify-center rounded-full border-2 border-line/25 bg-white text-fg shadow-soft-8 transition-[opacity,transform] hover:scale-105 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:pointer-events-none";

/** Title of a section that links to its full list, with the arrow chip of pack.ly, and its subtitle. */
export function SectionHeading({ title, subtitle, href }: { title: string; subtitle?: string; href: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Link href={href} className="group flex w-fit items-center gap-2 text-landing-ink">
        <h2 className="relative font-landing-heading text-heading-lg after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-landing-ink after:transition-all after:duration-300 group-hover:after:w-full">
          {title}
        </h2>
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface-sunken transition-transform group-hover:translate-x-1">
          <ArrowRight className="size-5" aria-hidden />
        </span>
      </Link>
      {subtitle && <p className="text-body text-fg-muted">{subtitle}</p>}
    </div>
  );
}

/** Small grey line above a card title. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-landing-heading text-title text-fg-muted lg:text-heading-sm", className)}>{children}</p>;
}

/** Big title of a feature card. */
export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-landing-heading text-heading-lg text-fg", className)}>
      {children}
    </h2>
  );
}

export function Stars({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-landing-star", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} className="size-[1em] fill-current" strokeWidth={1.75} />
      ))}
    </span>
  );
}

/** Small rounded label: white with an indigo ring on photos, tinted with a dot under a card title. */
export function Tag({ children, dot = false, className }: { children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full border px-2 text-caption font-medium whitespace-nowrap text-landing-indigo",
        dot ? "border-landing-indigo/20 bg-landing-indigo/[0.04]" : "border-landing-indigo bg-white",
        className
      )}
    >
      {dot && (
        <span className="relative inline-flex size-2.5 shrink-0 items-center justify-center" aria-hidden>
          <span className="relative inline-flex size-2 rounded-full bg-landing-indigo" />
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * Shows its content when it scrolls into view, like the blocks of pack.ly: a card grows from 90 % and rises,
 * a text only rises. Nothing moves for visitors who asked for reduced motion.
 */
export function Reveal({
  as: Tag = "div",
  variant = "card",
  className,
  children,
}: {
  as?: "div" | "section" | "article";
  variant?: "card" | "text";
  className?: string;
  children: React.ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "0px 0px -8% 0px" });
  const hidden = variant === "card" ? "translate-y-16 scale-90 opacity-0" : "translate-y-8 opacity-0";
  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none",
        inView ? "translate-y-0 scale-100 opacity-100" : hidden,
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** White card of the feature blocks: the shared Card, soft variant, large (32 → 48 px corners). */
export function FeatureCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cardClass({ variant: "soft", padding: "lg", className: cn("overflow-hidden", className) })}>
      {children}
    </div>
  );
}
