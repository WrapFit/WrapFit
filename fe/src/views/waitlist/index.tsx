"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { MainFooter, MainHeader } from "@/components/layout";
import { WaitlistSection } from "@/components/waitlist";

/**
 * `/waitlist`: The dedicated Waitlist & Early Access page for WrapFit Beta.
 * Features live queue, referral tracking, and toggleable skeleton loader.
 */
export default function WaitlistPage() {
  return (
    <>
      <MainHeader />
      <main
        className={`${landingFontVariables} w-full bg-landing-canvas font-landing-body text-landing-ink antialiased`}
      >
        <WaitlistSection isStandalone={true} />
      </main>
      <MainFooter />
    </>
  );
}
