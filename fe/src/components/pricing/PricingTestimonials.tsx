"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container, Reveal } from "@/components/landing";
import { VOICES } from "@/components/home/content";
import { SampleBadge } from "@/components/site";

/** Two reviews of the trial sessions (sample copy of the home page, labelled as such) under the plans. */
const PICKS = [VOICES.reviews[0], VOICES.reviews[3]];

export function PricingTestimonials() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <Container>
        <div className="mb-6 flex justify-center">
          <SampleBadge />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PICKS.map((t) => (
            <Reveal key={t.name}>
              <div className="flex h-full flex-col justify-between items-center text-center rounded-3xl border border-line/90 bg-white p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                <div>
                  <div role="img" className="flex items-center justify-center gap-1.5 mb-5" aria-label="5 sao">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className="size-5 fill-warning text-warning" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="font-landing-heading text-lg sm:text-xl font-medium text-fg leading-relaxed max-w-md mx-auto">&ldquo;{t.text}&rdquo;</blockquote>
                </div>
                <div className="mt-8 flex flex-col items-center">
                  <span className="mb-3 inline-flex size-14 items-center justify-center rounded-full font-landing-heading text-lg font-bold text-white shadow-soft-8" style={{ background: t.color }}>
                    {t.name.split(" ").pop()?.[0]}
                  </span>
                  <h4 className="font-landing-heading text-base font-bold text-fg">{t.name}</h4>
                  <p className="text-xs text-fg-muted font-medium mt-0.5">{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-fg-muted">
          <Link href="/testimonials" className="font-semibold text-fg underline underline-offset-4">
            Xem thêm câu chuyện của người bán quà
          </Link>
        </p>
      </Container>
    </section>
  );
}
