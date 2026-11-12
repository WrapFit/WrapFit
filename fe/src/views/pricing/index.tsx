"use client";

import React, { useState } from "react";
import { Coins, Table2 } from "lucide-react";
import { Container } from "@/components/landing";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui";
import { landingFontVariables } from "@/assets/fonts/landing";
import { MainFooter, MainHeader } from "@/components/layout";
import { PlanComparison, PlanFaq, VisualSparkPricingCards, XuWrapSection } from "@/components/pricing";

/**
 * `/pricing`: Pricing page in the VisualSpark layout: the four plan cards (prices from @wrapfit/shared/billing), the
 * comparison table, Xu Wrap (packs and what 1.000 xu buy) and the FAQ.
 */
type DetailTab = "compare" | "xu";

/** The comparison and the xu packs share one block with two tabs, so the page stays short. */
function PlanDetails() {
  const [tab, setTab] = useState<DetailTab>("compare");
  return (
    <section aria-labelledby="plan-details" className="pb-12 lg:pb-16">
      <Container className="mx-auto max-w-7xl">
        <h2 id="plan-details" className="mb-5 text-center font-landing-heading text-heading-lg font-bold text-fg">
          Chi tiết các gói
        </h2>
        <Tabs<DetailTab> value={tab} onValueChange={setTab}>
          <div className="mb-6 flex justify-center">
            <TabList label="Chi tiết các gói">
              <Tab value="compare" icon={<Table2 aria-hidden />}>
                So sánh các gói
              </Tab>
              <Tab value="xu" icon={<Coins aria-hidden />}>
                Xu Wrap cho tác vụ AI
              </Tab>
            </TabList>
          </div>
          <TabPanel value="compare">
            <PlanComparison embedded />
          </TabPanel>
          <TabPanel value="xu">
            <XuWrapSection embedded />
          </TabPanel>
        </Tabs>
      </Container>
    </section>
  );
}

export default function PricingPage() {
  return (
    <>
      <MainHeader />
      <main
        className={`${landingFontVariables} w-full bg-white font-landing-body text-landing-ink antialiased pb-12 sm:pb-16 lg:pb-24`}
      >
        <VisualSparkPricingCards />
        <PlanDetails />
        <PlanFaq />
      </main>
      <MainFooter />
    </>
  );
}
