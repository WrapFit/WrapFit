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

/** Dark green card of the Gói copilot, with Mascot Gói showcased on the right. */
export function CopilotCard() {
  const [mascotSize, setMascotSize] = useState(190);

  useEffect(() => {
    const updateSize = () => {
      setMascotSize(window.innerWidth < 640 ? 140 : 190);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <Reveal>
      <Container>
        <FeatureCard className="bg-landing-green-night ring-white/10">
          <article id={COPILOT.id} className="grid scroll-mt-28 grid-cols-1 items-center gap-8 lg:grid-cols-2">
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
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-8 sm:p-12 text-center shadow-soft-16">
              {/* Subtle ambient glow behind Bé Gói */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-48 rounded-full bg-fpt-orange/10 blur-3xl"
              />
              <div className="relative z-10 py-2">
                <GoiMascot
                  pose="measuring"
                  size={mascotSize}
                  bubbleText={COPILOT.bubble}
                  bubblePlacement="top"
                  showBubbleOnBoop={true}
                  label="Bé Gói - Trợ lý AI Packaging Copilot (Bấm để tương tác!)"
                />
              </div>
              <div className="relative z-10 mt-5 flex flex-col items-center text-center">
                <span className="font-landing-heading text-base font-bold text-fpt-orange">
                  Bé Gói luôn sẵn sàng
                </span>
                <span className="mt-1 max-w-[280px] text-xs leading-relaxed text-white/80">
                  Bấm vào Gói để trò chuyện và nhận gợi ý kích thước tối ưu!
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
      <div className="overflow-hidden rounded-xl border border-landing-line bg-landing-tile/50 shadow-soft-8">
        <div className="flex snap-x overflow-x-auto px-2 py-2 [scrollbar-width:none] lg:justify-center [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Gói dịch vụ">
          {PLANS.options.map((option, index) => (
            <button
              key={option.unit}
              type="button"
              role="radio"
              aria-checked={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                "flex min-w-[88px] shrink-0 snap-start cursor-pointer flex-col items-center justify-center gap-1 px-2 py-4 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/25",
                index === selected ? "rounded-md bg-landing-accent" : "hover:bg-landing-accent/60"
              )}
            >
              <span className={cn("font-bold text-landing-ink", index === selected ? "text-base" : "text-sm")}>{option.price}</span>
              <span className="text-xs whitespace-nowrap text-landing-muted">{option.unit}</span>
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
