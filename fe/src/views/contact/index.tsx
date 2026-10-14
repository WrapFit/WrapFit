"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { ContactFormSection, ContactHero } from "@/components/contact";
import { MainFooter, MainHeader } from "@/components/layout";

/**
 * `/contact`: The official Contact Us & Consultation page for WrapFit Platform.
 * Features 3 segmented channels (Docs, Tech Support, Sales/Print-Shop),
 * trust marks, direct channels (Hotline, Email, Address, Socials), and contact form.
 */
export default function ContactPage() {
  return (
    <>
      <MainHeader />
      <main
        className={`${landingFontVariables} w-full bg-landing-canvas font-landing-body text-landing-ink antialiased`}
      >
        <ContactHero />
        <ContactFormSection />
      </main>
      <MainFooter />
    </>
  );
}
