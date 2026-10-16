"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import React, { useId, useState } from "react";
import { CardTitle, Container, FeatureCard, Reveal, limeButton } from "@/components/landing";
import { cn } from "@/utils/helpers";
import { CTA_BAND, FAQ, HERO, WHY } from "./content";

/** Left-aligned title of the page, as on pack.ly. */
export function PricingHero() {
  return (
    <header className="pt-28 sm:pt-32">
      <Container>
        <h1 className="whitespace-pre-line font-landing-heading text-4xl font-bold leading-[110%] tracking-tight text-landing-ink lg:text-6xl">
          {HERO.title}
        </h1>
        <p className="mt-2 font-landing-heading text-2xl font-semibold leading-tight text-landing-muted lg:text-4xl">{HERO.subtitle}</p>
        <p className="mt-2 text-base text-landing-muted">{HERO.lead}</p>
      </Container>
    </header>
  );
}

/** Two columns of questions in a white card; one answer open at a time per column. */
export function PlanFaq() {
  const half = Math.ceil(FAQ.length / 2);
  return (
    <section className="py-12 lg:py-24">
      <Reveal>
        <Container>
          <FeatureCard>
            <h2 className="mb-6 text-center font-landing-heading text-3xl font-bold text-landing-ink lg:text-4xl">Câu hỏi thường gặp</h2>
            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
              <FaqColumn items={FAQ.slice(0, half)} />
              <FaqColumn items={FAQ.slice(half)} />
            </div>
          </FeatureCard>
        </Container>
      </Reveal>
    </section>
  );
}

function FaqColumn({ items }: { items: typeof FAQ }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  return (
    <div className="flex flex-col">
      {items.map((item, index) => {
        const expanded = open === index;
        const panelId = `${baseId}-${index}`;
        return (
          <div key={item.question} className={cn("border-b border-landing-line transition-colors", expanded && "bg-landing-tile/40")}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left text-base text-landing-ink outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/20"
              >
                {item.question}
                <ChevronDown
                  className={cn("mt-1 size-4 shrink-0 text-landing-muted transition-transform duration-200", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
            </h3>
            <div id={panelId} role="region" hidden={!expanded} className="px-4 pb-4 text-sm leading-6 text-landing-muted">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** White card with the title across and two columns of text. */
export function WhyWrapFit() {
  return (
    <section className="pb-12 lg:pb-24">
      <Reveal>
        <Container>
          <FeatureCard className="flex flex-col gap-6">
            <CardTitle>{WHY.title}</CardTitle>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
              {WHY.columns.map((column, index) => (
                <div key={index} className="flex flex-col gap-4 text-base leading-7 text-landing-muted lg:text-lg">
                  {column.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ))}
            </div>
            <Link href={WHY.cta.href} className={cn(limeButton("sm"), "w-fit")}>
              {WHY.cta.label}
            </Link>
          </FeatureCard>
        </Container>
      </Reveal>
    </section>
  );
}

/** Light green band with a large translucent box behind the closing call to action. */
export function CtaBand() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-fpt-orange-light to-wf-orange-100 py-28 lg:py-40">
      <svg
        viewBox="0 0 200 200"
        className="absolute top-1/2 left-1/2 -z-10 size-[420px] -translate-x-1/2 -translate-y-1/2 opacity-70 lg:size-[560px]"
        aria-hidden
      >
        <path d="M100 18 L172 58 L100 98 L28 58 Z" fill="#AFEC88" />
        <path d="M28 58 L100 98 L100 182 L28 142 Z" fill="#98E665" />
        <path d="M100 98 L172 58 L172 142 L100 182 Z" fill="#7BCB4A" />
      </svg>
      <Container className="flex flex-col items-center gap-4 text-center">
        <h2 className="font-landing-heading text-2xl font-bold text-fg lg:text-4xl">{CTA_BAND.title}</h2>
        <p className="max-w-xl text-base text-fg/80">{CTA_BAND.body}</p>
        <Link
          href={CTA_BAND.cta.href}
          className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-landing-ink shadow-soft-8 transition-colors hover:bg-fpt-orange-light"
        >
          {CTA_BAND.cta.label}
        </Link>
      </Container>
    </section>
  );
}
