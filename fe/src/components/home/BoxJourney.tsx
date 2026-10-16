"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { cn } from "@/utils/helpers";
import { ANCHORS, JOURNEY } from "./content";
import { CardTitle, Container, Eyebrow, Reveal } from "@/components/landing";

/**
 * The five production steps of WrapFit, directly grounded in the EXE101 Research Report:
 * Gift-to-Box math, 3D WebGL Origami, FitCheck™ prepress, Zero MOQ digital cutting, and 1-unit physical proofing.
 */
export function BoxJourney() {
  const [active, setActive] = useState(0);
  const step = JOURNEY.steps[active];
  const total = String(JOURNEY.steps.length).padStart(2, "0");

  return (
    <section id="hanh-trinh" className="relative scroll-mt-24 bg-white py-12 lg:py-20 border-y border-line/60">
      {/* Invisible anchor hooks for header links */}
      <div id={ANCHORS.fitcheck} className="absolute -top-28" />
      <div id={ANCHORS.export} className="absolute -top-28" />

      <Container>
        <Reveal variant="text" className="mb-8 text-center lg:mb-12 max-w-3xl mx-auto">
          <Eyebrow>{JOURNEY.eyebrow}</Eyebrow>
          <CardTitle className="mt-1">{JOURNEY.title}</CardTitle>
          {JOURNEY.subtitle && (
            <p className="mt-2 text-sm sm:text-base text-fg-muted leading-relaxed">
              {JOURNEY.subtitle}
            </p>
          )}
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)] lg:gap-12 lg:items-stretch">
          {/* Left: Step Description Card */}
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-line/80 bg-surface-sunken/60 p-6 sm:p-8 lg:p-10 shadow-2xs" aria-live="polite">
            <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs sm:text-sm font-bold text-fg-muted tracking-wider">
                BƯỚC {step.stepNumber} / {total}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-cad-spec-micro font-bold shadow-2xs border",
                  active === 2
                    ? "bg-fpt-orange-light text-fpt-orange-ink border-fpt-orange/30"
                    : active === 3
                    ? "bg-fpt-green-light text-success-fg border-fpt-green/30"
                    : "bg-fpt-blue-light text-fpt-blue border-fpt-blue/30"
                )}
              >
                {step.badge}
              </span>
            </div>

            <h3 className="font-landing-heading text-2xl sm:text-3xl font-bold text-landing-ink leading-snug text-balance">
              {step.title}
            </h3>

            <p className="text-base sm:text-lg leading-relaxed text-fg-muted">
              {step.body}
            </p>

            {/* Key Engineering Metric / Value Chip */}
            {step.stat && (
              <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-3 text-sm font-semibold text-fg shadow-2xs">
                <CheckCircle2 className="size-4 shrink-0 text-success" />
                <span>{step.stat}</span>
              </div>
            )}
            </div>

            {/* CTA & Step Indicator */}
            <div className="flex items-center justify-between border-t border-line/70 pt-4">
              {step.cta && (
                <Link
                  href={step.cta.href}
                  className="group inline-flex items-center gap-1.5 text-label-sm font-bold text-fpt-orange-ink underline-offset-4 transition-colors hover:text-fpt-orange-dark hover:underline"
                >
                  <span>{step.cta.label}</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              )}

              {/* Step indicator bar dots */}
              <div className="flex gap-0.5" role="group" aria-label="Các bước">
                {JOURNEY.steps.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`Bước ${index + 1}: ${item.title}`}
                    aria-current={index === active ? "step" : undefined}
                    className="group/dot flex h-6 min-w-6 items-center justify-center rounded-full px-1"
                  >
                    {/* The dot stays small; the button around it is the 24 px target. */}
                    <span
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === active ? "w-7 bg-fpt-orange" : "w-2.5 bg-line-strong/50 group-hover/dot:bg-line-strong"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Expandable Photo Accordion */}
          <div className="flex h-[340px] gap-2 sm:h-[420px] lg:h-[460px] lg:gap-3" role="group" aria-label={JOURNEY.title}>
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
                    "group relative min-w-0 overflow-hidden rounded-2xl bg-surface-sunken text-left outline-none transition-[flex-grow] duration-500 ease-out focus-visible:ring-[3px] focus-visible:ring-landing-ink/30 motion-reduce:transition-none shadow-sm",
                    open ? "grow-[5]" : "grow hover:grow-[1.5]"
                  )}
                  style={{ flexBasis: 0 }}
                >
                  <img src={item.image} alt={item.alt} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span
                    className={cn(
                      "absolute inset-0 bg-gradient-to-t from-fg/80 via-fg/20 to-transparent transition-opacity duration-500",
                      open ? "opacity-100" : "opacity-60"
                    )}
                  />
                  
                  {/* Step Number Badge */}
                  <span
                    className={cn(
                      "absolute bottom-3 inline-flex size-7 items-center justify-center rounded-full font-mono text-xs font-bold transition-all lg:size-8 lg:text-sm shadow-md",
                      open
                        ? "left-3 lg:left-4 bg-fpt-orange text-white"
                        : "left-1/2 -translate-x-1/2 bg-white/90 text-fg"
                    )}
                  >
                    {index + 1}
                  </span>

                  {/* Open Step Label */}
                  <div
                    className={cn(
                      "absolute bottom-3 left-12 right-4 hidden truncate lg:bottom-4 lg:left-14 text-white transition-opacity duration-300 sm:block",
                      open ? "opacity-100 delay-150" : "opacity-0"
                    )}
                  >
                    <p className="font-landing-heading text-base lg:text-lg font-bold drop-shadow-sm truncate">
                      {item.title}
                    </p>
                    <p className="text-caption font-medium text-white/75 truncate">
                      {item.badge}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
