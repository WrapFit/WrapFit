"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { MainFooter, MainHeader } from "@/components/layout";
import { PlanComparison, PlanFaq, VisualSparkPricingCards } from "@/components/pricing";

/**
 * `/pricing`: Pricing page in the VisualSpark layout: the four plan cards (prices from @wrapfit/shared/billing), the
 * comparison table and the FAQ.
 */
export default function PricingPage() {
  return (
    <>
      <MainHeader />
      <main
        className={`${landingFontVariables} w-full bg-white font-landing-body text-landing-ink antialiased pb-12 sm:pb-16 lg:pb-24`}
      >
        <VisualSparkPricingCards />
        <PlanComparison />
        <PlanFaq />
      </main>
      <MainFooter />
    </>
  );
}
