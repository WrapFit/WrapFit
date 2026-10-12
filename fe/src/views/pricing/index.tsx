"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { CopilotCard } from "@/components/home";
import { MainFooter, MainHeader } from "@/components/layout";
import { CtaBand, PlanCards, PlanFaq, PricingHero, WhyWrapFit } from "@/components/pricing";

/**
 * `/pricing`: the three plans of the API tiers with their real quotas, laid out after pack.ly's subscription plan
 * page (plan cards, FAQ, why WrapFit, the copilot card, closing band). The signed-in user sees their plan and usage.
 */
export default function PricingPage() {
  return (
    <>
      <MainHeader />
      <main className={`${landingFontVariables} w-full bg-landing-canvas font-landing-body text-landing-ink antialiased`}>
        <PricingHero />
        <PlanCards />
        <PlanFaq />
        <WhyWrapFit />
        <section className="bg-landing-lime py-12 lg:py-24">
          <CopilotCard />
        </section>
        <CtaBand />
      </main>
      <MainFooter />
    </>
  );
}
