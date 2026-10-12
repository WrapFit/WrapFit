"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { MainFooter, MainHeader } from "@/components/layout";
import { HelpCenter } from "@/components/support";

/** `/support`: the help center, laid out after pack.ly's (search, rows of articles by topic, need-support card). */
export default function SupportPage() {
  return (
    <>
      <MainHeader />
      <main className={`${landingFontVariables} w-full bg-landing-canvas font-landing-body text-landing-ink antialiased`}>
        <HelpCenter />
      </main>
      <MainFooter />
    </>
  );
}
