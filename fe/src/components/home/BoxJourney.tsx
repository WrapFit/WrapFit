"use client";

import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
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
    <section id="hanh-trinh" className="relative scroll-mt-24 bg-white py-12 lg:py-20 border-y border-stone-100">
      {/* Invisible anchor hooks for header links */}
      <div id={ANCHORS.fitcheck} className="absolute -top-28" />
      <div id={ANCHORS.export} className="absolute -top-28" />

      <Container>
        <Reveal variant="text" className="mb-8 text-center lg:mb-12 max-w-3xl mx-auto">
          <Eyebrow>{JOURNEY.eyebrow}</Eyebrow>
          <CardTitle className="mt-1">{JOURNEY.title}</CardTitle>
          {JOURNEY.subtitle && (
            <p className="mt-2 text-sm sm:text-base text-stone-600 leading-relaxed">
              {JOURNEY.subtitle}
            </p>
          )}
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)] lg:gap-12 items-center">
          {/* Left: Step Description Card */}
          <div className="flex flex-col justify-center gap-3.5 rounded-3xl border border-stone-200/80 bg-stone-50/60 p-6 sm:p-8 lg:p-10 shadow-2xs" aria-live="polite">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs sm:text-sm font-bold text-stone-500 tracking-wider">
                BƯỚC {step.stepNumber} / {total}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-[11px] font-bold shadow-2xs border",
                  active === 2
                    ? "bg-[#FEF1EA] text-[#F26522] border-[#F26522]/30"
                    : active === 3
                    ? "bg-[#EBF7E7] text-[#6DB33F] border-[#6DB33F]/30"
                    : "bg-[#E8F2FA] text-[#005CA9] border-[#005CA9]/30"
                )}
              >
                {step.badge}
              </span>
            </div>

            <h3 className="font-landing-heading text-xl sm:text-2xl font-bold text-landing-ink leading-snug">
              {step.title}
            </h3>

            <p className="text-sm sm:text-base leading-relaxed text-stone-600">
              {step.body}
            </p>

            {/* Key Engineering Metric / Value Chip */}
            {step.stat && (
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-stone-200/80 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-800 shadow-2xs">
                <CheckCircle2 className="size-4 shrink-0 text-[#6DB33F]" />
                <span>{step.stat}</span>
              </div>
            )}

            {/* CTA & Step Indicator */}
            <div className="mt-2 flex items-center justify-between border-t border-stone-200/70 pt-4">
              {step.cta && (
                <Link
                  href={step.cta.href}
                  className="group inline-flex items-center gap-1.5 text-xs font-bold text-[#F26522] transition-colors hover:text-[#D85314]"
                >
                  <span>{step.cta.label}</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              )}

              {/* Step indicator bar dots */}
              <div className="flex gap-1.5" aria-hidden>
                {JOURNEY.steps.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`Chuyển đến bước ${index + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === active ? "w-7 bg-[#F26522]" : "w-2.5 bg-stone-300 hover:bg-stone-400"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Expandable Photo Accordion */}
          <div className="flex h-[380px] gap-2 sm:h-[480px] lg:h-[540px] lg:gap-3" role="group" aria-label={JOURNEY.title}>
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
                    "group relative min-w-0 overflow-hidden rounded-2xl bg-stone-100 text-left outline-none transition-[flex-grow] duration-500 ease-out focus-visible:ring-[3px] focus-visible:ring-landing-ink/30 motion-reduce:transition-none shadow-sm",
                    open ? "grow-[5]" : "grow hover:grow-[1.5]"
                  )}
                  style={{ flexBasis: 0 }}
                >
                  <img src={item.image} alt={item.alt} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span
                    className={cn(
                      "absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent transition-opacity duration-500",
                      open ? "opacity-100" : "opacity-60"
                    )}
                  />
                  
                  {/* Step Number Badge */}
                  <span
                    className={cn(
                      "absolute bottom-3 inline-flex size-7 items-center justify-center rounded-full font-mono text-xs font-bold transition-all lg:size-8 lg:text-sm shadow-md",
                      open
                        ? "left-3 lg:left-4 bg-[#F26522] text-white"
                        : "left-1/2 -translate-x-1/2 bg-white/90 text-stone-900"
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
                    <p className="text-[11px] font-medium text-stone-300 truncate">
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
