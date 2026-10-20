"use client";

import { BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { cn } from "@/utils/helpers";
import { COPILOT, PLANS } from "./content";
import { CardTitle, Container, Eyebrow, FeatureCard, Reveal, darkGhostButton, limeButton } from "@/components/landing";

/** Lime band: the plans card with its price picker, then the dark card of the Gói copilot. */
export function PlansAndCopilot() {
  return (
    <section className="space-y-8 bg-fpt-orange py-10 lg:space-y-14 lg:py-16">
      <Reveal>
        <Container>
          <FeatureCard>
            <article className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                <Reveal variant="text">
                  <Eyebrow>{PLANS.eyebrow}</Eyebrow>
                  <CardTitle>{PLANS.title}</CardTitle>
                </Reveal>
                <p className="text-base leading-7 text-landing-muted lg:text-lg">{PLANS.body}</p>
                <Link href={PLANS.cta.href} className={cn(limeButton("sm"), "w-fit")}>
                  {PLANS.cta.label}
                </Link>
              </div>
              <PricePicker />
            </article>
          </FeatureCard>
        </Container>
      </Reveal>

      <CopilotCard />
    </section>
  );
}

/** Slate card of the Gói copilot, with Bé Gói on a warm paper stage on the right. */
export function CopilotCard() {
  const [mascotSize, setMascotSize] = useState(190);

  useEffect(() => {
    // A media query fires once when the breakpoint is crossed, not on every pixel of a resize.
    const small = window.matchMedia("(max-width: 639px)");
    const updateSize = () => setMascotSize(small.matches ? 140 : 190);
    updateSize();
    small.addEventListener("change", updateSize);
    return () => small.removeEventListener("change", updateSize);
  }, []);

  return (
    <Reveal>
      <Container>
        <FeatureCard className="bg-landing-ink ring-white/10">
          <article id={COPILOT.id} data-tour="home-copilot" className="grid scroll-mt-28 grid-cols-1 items-center gap-8 lg:grid-cols-2">
            {/* Left column: Text & action buttons */}
            <div className="flex flex-col justify-center gap-6">
              <div className="flex flex-col gap-4">
                <Reveal variant="text">
                  <Eyebrow className="text-wf-orange-200">{COPILOT.eyebrow}</Eyebrow>
                  <CardTitle className="text-fpt-orange">{COPILOT.title}</CardTitle>
                </Reveal>
                <p className="text-base leading-7 text-white/90 lg:text-lg">{COPILOT.body}</p>
                <div className="flex flex-wrap gap-2.5">
                  {COPILOT.actions.map((action) => {
                    const Icon = action.icon === "chat" ? MessageCircle : BookOpen;
                    return (
                      <Link key={action.label} href={action.href} className={darkGhostButton}>
                        <Icon className="size-4" aria-hidden />
                        {action.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: Bé Gói Mascot Showcase */}
            {/* Warm paper stage: the kraft mascot reads on ivory; the top padding leaves room for the speech bubble. */}
            {/* ds-allow: dotted grid of the paper stage. */}
            <div className="relative isolate flex flex-col items-center justify-center rounded-panel bg-paper-ivory bg-[radial-gradient(#E8D8C8_1px,transparent_1px)] [background-size:16px_16px] px-6 pb-8 pt-32 text-center shadow-soft-16 ring-1 ring-inset ring-paper-kraft sm:px-10 sm:pb-10 sm:pt-36">
              {/* Soft glow and floor shadow behind Bé Gói */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[58%] -z-10 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fpt-orange/15 blur-3xl"
              />
              <div className="relative z-10">
                <GoiMascot
                  pose="measuring"
                  size={mascotSize}
                  bubbleText={COPILOT.bubble}
                  bubblePlacement="top"
                  showBubbleOnBoop={true}
                  label="Trợ lý Gói, bấm để trò chuyện"
                />
              </div>
              <div className="relative z-10 mt-5 flex flex-col items-center text-center">
                <span className="font-landing-heading text-title font-bold text-fpt-orange-ink">
                  Gói luôn sẵn sàng
                </span>
                <span className="mt-1 max-w-[300px] text-body-sm leading-relaxed text-fg-muted">
                  Bấm vào Gói để được gợi ý kích thước.
                </span>
              </div>
            </div>
          </article>
        </FeatureCard>
      </Container>
    </Reveal>
  );
}

/** Row of prices (the /pricing plans) and the chosen one in large. */
function PricePicker() {
  const [selected, setSelected] = useState(PLANS.selected);
  const current = PLANS.options[selected];

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-landing-line bg-landing-tile/50 p-2 shadow-soft-8">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3" role="radiogroup" aria-label="Gói dịch vụ">
          {PLANS.options.map((option, index) => (
            <button
              key={option.unit}
              type="button"
              role="radio"
              aria-checked={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md px-2 py-3 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/25",
                index === selected ? "bg-white shadow-soft-8 ring-1 ring-inset ring-accent" : "hover:bg-white/70"
              )}
            >
              <span className={cn("text-sm font-bold tabular-nums", index === selected ? "text-accent" : "text-landing-ink")}>{option.price}</span>
              <span className="text-xs leading-tight text-landing-muted">{option.unit}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-landing-line bg-gradient-to-t from-white to-landing-tile/50 p-4 text-center shadow-soft-8 backdrop-blur-sm" aria-live="polite">
        <p className="font-landing-heading text-3xl font-bold text-landing-ink lg:text-4xl">{current.price}</p>
        <p className="mt-1 text-base text-landing-muted lg:text-lg">{current.detail}</p>
      </div>
    </div>
  );
}
