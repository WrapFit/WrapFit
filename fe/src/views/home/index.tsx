"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import {
  BoxCatalog,
  BoxJourney,
  CustomerVoices,
  FeatureShowcase,
  GreenBanner,
  HomeHero,
  MadeInVietnam,
  PhotoReel,
  PlansAndCopilot,
  StandardsStrip,
} from "@/components/home";
import { MainFooter, MainHeader } from "@/components/layout";

/**
 * `/`: the home page, laid out after the pack.ly home page (slate ink on a cool grey canvas, lime calls to action,
 * Be Vietnam Pro headings over Inter). The site header and footer stay the app's own.
 */
export default function HomePage() {
  return (
    <>
      <MainHeader />
      <main className={`${landingFontVariables} w-full bg-landing-canvas font-landing-body text-landing-ink antialiased`}>
        <HomeHero />
        <StandardsStrip />
        <BoxCatalog />
        <PhotoReel />
        <FeatureShowcase />
        <PlansAndCopilot />
        <BoxJourney />
        <CustomerVoices />
        <GreenBanner />
        <MadeInVietnam />
      </main>
      <MainFooter />
    </>
  );
}
