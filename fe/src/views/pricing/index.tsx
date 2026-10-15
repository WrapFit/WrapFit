"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { CopilotCard } from "@/components/home";
import { MainFooter, MainHeader } from "@/components/layout";
import {
  CtaBand,
  PlanFaq,
  PricingTestimonials,
  VisualSparkPricingCards,
  WhyWrapFit,
} from "@/components/pricing";

/**
 * `/pricing`: Pricing page in the VisualSpark layout:
 * - Top: the paid plans of features/pricing on 3 3D-illustrated pastel cards (monthly or yearly, free way in,
 *   payment methods, refund rule)
 * - Middle: 2 reviews of the trial sessions (sample copy, labelled)
 * - Bottom: Plan FAQ, Why WrapFit, AI Copilot Bé Gói, and Call-to-action banner.
 */
export default function PricingPage() {
  return (
    <>
      <MainHeader />
      <main
        className={`${landingFontVariables} w-full bg-white font-landing-body text-landing-ink antialiased`}
      >
        {/* Main 3-Tier VisualSpark Pricing Cards */}
        <VisualSparkPricingCards />

        {/* 2-Column Social Proof Testimonials */}
        <PricingTestimonials />

        {/* Comprehensive Packaging FAQ & WrapFit Guarantees */}
        <div className="bg-landing-canvas border-t border-line/70">
          <PlanFaq />
          <WhyWrapFit />
          <section className="bg-landing-lime py-12 lg:py-24">
            <CopilotCard />
          </section>
          <CtaBand />
        </div>
      </main>
      <MainFooter />
    </>
  );
}
