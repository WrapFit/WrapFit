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
    <section className="space-y-8 bg-landing-lime py-10 lg:space-y-14 lg:py-16">
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

/** Dark green card of the Gói copilot, with a photo and Mascot Gói standing in corner. */
export function CopilotCard() {
  const [mascotSize, setMascotSize] = useState(128);

  useEffect(() => {
    const updateSize = () => {
      setMascotSize(window.innerWidth < 640 ? 104 : 128);
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
            <div className="flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-4">
                <Reveal variant="text">
                  <Eyebrow className="text-landing-lime-soft">{COPILOT.eyebrow}</Eyebrow>
                  <CardTitle className="text-landing-lime">{COPILOT.title}</CardTitle>
                </Reveal>
                <p className="text-base leading-7 text-landing-lime-mist lg:text-lg">{COPILOT.body}</p>
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

              {/* Mascot Gói standing prominently on the text side (dark green background), high contrast & distinct */}
              <div className="pt-2 flex items-center gap-4">
                <GoiMascot
                  pose="measuring"
                  size={mascotSize}
                  bubbleText={COPILOT.bubble}
                  bubblePlacement="top-right"
                  showBubbleOnBoop={true}
                  label="Bé Gói - Trợ lý AI Packaging Copilot (Bấm để trò chuyện!)"
                />
                <div className="hidden sm:flex flex-col text-xs text-landing-lime-mist/80 leading-relaxed max-w-[210px]">
                  <span className="font-semibold text-landing-lime">Bé Gói luôn sẵn sàng</span>
                  <span>Bấm vào Gói để trò chuyện và nhận gợi ý kích thước tối ưu!</span>
                </div>
              </div>
            </div>

            {/* Right column: Designer studio photo cleanly presented */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-soft-16">
              <img
                src={COPILOT.image.src}
                alt={COPILOT.image.alt}
                loading="lazy"
                className="aspect-[16/10] w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
              />
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
