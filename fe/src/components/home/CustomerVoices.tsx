"use client";

import React, { useState } from "react";
import { cn } from "@/utils/helpers";
import { VOICES } from "./content";
import { Carousel, Container, Reveal, Stars } from "@/components/landing";

/** Centred title and a full-width carousel of review cards. */
export function CustomerVoices() {
  return (
    <section className="overflow-x-clip py-12 lg:py-24">
      <Container>
        <Reveal variant="text" className="mb-10 flex flex-col items-center gap-1 text-center lg:mb-16">
          <h2 className="font-landing-heading text-3xl font-bold leading-tight tracking-tight text-landing-ink lg:text-4xl">{VOICES.title}</h2>
          <p className="font-landing-heading text-lg font-semibold text-landing-muted lg:text-xl">{VOICES.subtitle}</p>
          <Stars className="mt-2 text-2xl text-[#FFB900]" />
        </Reveal>
      </Container>
      <Carousel label={VOICES.title} bleed="full" slideClassName="w-[88vw] sm:w-[400px] 2xl:w-[520px]">
        {VOICES.reviews.map((review) => (
          <ReviewCard key={review.name} review={review} />
        ))}
      </Carousel>
    </section>
  );
}

function ReviewCard({ review }: { review: (typeof VOICES.reviews)[number] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-landing-ink/10">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 lg:gap-x-8">
        <span
          className="flex size-10 items-center justify-center rounded-full text-lg font-semibold text-white/90 opacity-80 lg:size-12"
          style={{ backgroundColor: review.color }}
          aria-hidden
        >
          {review.name.split(" ").pop()?.charAt(0)}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="line-clamp-1 font-landing-heading text-lg font-semibold text-landing-ink lg:text-xl">{review.name}</h3>
          <p className="text-xs text-landing-muted">{review.role}</p>
          <Stars className="my-1 text-lg" />
          <p className={cn("text-sm leading-5 text-landing-muted", !expanded && "line-clamp-4")}>{review.text}</p>
        </div>
      </div>
      <div className="mt-auto flex justify-end pt-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-landing-ink transition-colors hover:bg-landing-tile outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/25"
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      </div>
    </article>
  );
}
