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
 * `/pricing`: Pricing page designed strictly matching the VisualSpark layout:
 * - Top: "Plans that fit your scale" with 3 3D-illustrated pastel cards (Basic, Premium, Enterprise)
 * - Middle: 2 side-by-side verified Testimonial cards (Kelly Williams & Maxine Bunton)
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
        <div className="bg-landing-canvas border-t border-stone-200/70">
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
