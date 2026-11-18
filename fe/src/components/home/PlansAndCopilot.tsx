"use client";

import { ArrowRight, BookOpen, Check, MessageCircle } from "lucide-react";
import Link from "next/link";
import React from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { cn } from "@/utils/helpers";
import { COPILOT, PLANS } from "./content";
import { Container, Eyebrow, Reveal } from "@/components/landing";
import { buttonClass } from "@/components/ui";

/**
 * Plans and the Gói copilot side by side on the page itself: one flat panel each, no band or nested frames around them.
 */
export function PlansAndCopilot() {
  return (
    <section className="border-y border-line/60 bg-canvas py-14 lg:py-20">
      <Container>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <Reveal className="flex">
            <PlansPanel />
          </Reveal>
          <Reveal className="flex">
            <CopilotCard />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/** The three plans of /pricing as one list; the recommended one carries the brand colour. */
function PlansPanel() {
  return (
    <article className="flex w-full flex-col rounded-sheet border border-line/70 bg-white p-6 sm:p-8">
      <Eyebrow>{PLANS.eyebrow}</Eyebrow>
      <h2 className="mt-2 font-landing-heading text-2xl font-bold leading-tight tracking-tight text-landing-ink sm:text-3xl">{PLANS.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{PLANS.body}</p>

      <ul className="mt-6 divide-y divide-line/70 border-y border-line/70">
        {PLANS.options.map((option, index) => {
          const featured = index === PLANS.selected;
          return (
            <li key={option.unit} className="flex items-center gap-4 py-4">
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  featured ? "bg-fpt-orange text-white" : "bg-surface-sunken text-fg-muted"
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-landing-ink">
                  {option.unit}
                  {featured && <span className="rounded-full bg-fpt-orange-light px-2 py-0.5 text-[11px] font-bold text-fpt-orange-ink">Phổ biến</span>}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{option.detail}</p>
              </div>
              <span className={cn("shrink-0 font-landing-heading text-lg font-bold tabular-nums", featured ? "text-fpt-orange-ink" : "text-landing-ink")}>
                {option.price}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-6">
        <Link href={PLANS.cta.href} className={cn(buttonClass({ variant: "brand", size: "md" }), "gap-1.5")}>
          {PLANS.cta.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

/** Dark card of the Gói copilot: what it does, a sample exchange in the studio, and Bé Gói in the corner. */
export function CopilotCard() {
  return (
    <article
      id={COPILOT.id}
      data-tour="home-copilot"
      className="relative flex w-full scroll-mt-28 flex-col overflow-hidden rounded-sheet bg-landing-ink p-6 text-white sm:p-8"
    >
      <Eyebrow className="text-wf-orange-200">{COPILOT.eyebrow}</Eyebrow>
      <h2 className="mt-2 font-landing-heading text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{COPILOT.title}</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">{COPILOT.body}</p>

      {/* A sample exchange, read as chat messages rather than a framed stage. */}
      <div className="mt-6 flex flex-col gap-2.5 pr-24 sm:pr-36" aria-label="Ví dụ trò chuyện với Gói">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-4 py-2.5 text-sm text-white/90">
          Hộp cho chai nước hoa 50 ml thì nên chọn kiểu nào?
        </p>
        <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-landing-ink">
          Hộp nắp gài đáy khóa, lọt lòng 65 × 40 × 120 mm, giấy Ivory 300 GSM là vừa.
        </p>
        <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-landing-ink">{COPILOT.bubble}</p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
        {COPILOT.actions.map((action, index) => {
          const Icon = action.icon === "chat" ? MessageCircle : BookOpen;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-white/40",
                index === 0 ? "bg-fpt-orange text-white hover:bg-fpt-orange-dark" : "text-white/85 ring-1 ring-inset ring-white/25 hover:bg-white/10"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {action.label}
            </Link>
          );
        })}
      </div>

      <div className="pointer-events-none absolute -bottom-3 right-2 sm:right-4" aria-hidden>
        <GoiMascot pose="measuring" size={150} interactive={false} showPhotoBadge={false} enableTracking={false} label="Trợ lý Gói" />
      </div>
    </article>
  );
}
