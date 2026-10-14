"use client";

import React, { useState } from "react";
import { cn } from "@/utils/helpers";
import { JOURNEY } from "./content";
import { CardTitle, Container, Eyebrow, Reveal } from "@/components/landing";

/**
 * The five steps of a box, from the idea to the recipient, as the photo accordion of pack.ly's case history:
 * hovering or choosing a photo widens it and shows its text on the left.
 */
export function BoxJourney() {
  const [active, setActive] = useState(0);
  const step = JOURNEY.steps[active];
  const total = String(JOURNEY.steps.length).padStart(2, "0");

  return (
    <section className="bg-white py-10 lg:py-16">
      <Container>
        <Reveal variant="text" className="mb-8 text-center lg:mb-12">
          <Eyebrow>{JOURNEY.eyebrow}</Eyebrow>
          <CardTitle>{JOURNEY.title}</CardTitle>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
          <div className="flex flex-col justify-center gap-3 lg:py-8" aria-live="polite">
            <p className="font-mono text-sm font-medium text-landing-muted">
              {String(active + 1).padStart(2, "0")} / {total}
            </p>
            <h3 className="font-landing-heading text-2xl font-semibold text-landing-ink">{step.title}</h3>
            <p className="text-base leading-7 text-landing-muted lg:text-lg">{step.body}</p>
            <div className="mt-2 flex gap-1.5" aria-hidden>
              {JOURNEY.steps.map((item, index) => (
                <span
                  key={item.title}
                  className={cn("h-1 rounded-full transition-all duration-300", index === active ? "w-8 bg-landing-ink" : "w-3 bg-landing-line")}
                />
              ))}
            </div>
          </div>

          <div className="flex h-[360px] gap-2 sm:h-[460px] lg:h-[560px] lg:gap-4" role="group" aria-label={JOURNEY.title}>
            {JOURNEY.steps.map((item, index) => {
              const open = index === active;
              return (
                <button
                  key={item.title}
                  type="button"
                  aria-pressed={open}
                  aria-label={`${index + 1}. ${item.title}`}
                  onClick={() => setActive(index)}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  className={cn(
                    "group relative min-w-0 overflow-hidden rounded-2xl bg-landing-tile text-left outline-none transition-[flex-grow] duration-500 ease-out focus-visible:ring-[3px] focus-visible:ring-landing-ink/30 motion-reduce:transition-none",
                    open ? "grow-[5]" : "grow"
                  )}
                  style={{ flexBasis: 0 }}
                >
                  <img src={item.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                  <span
                    className={cn(
                      "absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-opacity duration-500",
                      open ? "opacity-100" : "opacity-60"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute bottom-3 inline-flex size-7 items-center justify-center rounded-full bg-white/90 font-mono text-xs font-semibold text-landing-ink lg:size-8 lg:text-sm",
                      open ? "left-3 lg:left-4" : "left-1/2 -translate-x-1/2"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    title={item.title}
                    className={cn(
                      "absolute bottom-3.5 left-12 right-4 hidden truncate lg:bottom-4 lg:left-14 font-landing-heading text-lg font-semibold text-white transition-opacity duration-300 sm:block",
                      open ? "opacity-100 delay-200" : "opacity-0"
                    )}
                  >
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
