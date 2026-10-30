"use client";

import React from "react";
import { Container, Reveal } from "@/components/landing";
import { DataTable, type DataColumn } from "@/components/ui";
import { PLANS, PLAN_ORDER } from "@/features/pricing";
import { COMPARISON, type ComparisonRow } from "./content";

const COLUMNS: DataColumn<ComparisonRow>[] = [
  { key: "feature", label: "Tính năng", primary: true, render: (row) => <span className="font-medium text-fg">{row.feature}</span> },
  ...PLAN_ORDER.map((tier) => ({ key: tier, label: PLANS[tier].name, render: (row: ComparisonRow) => row.values[tier] })),
];

/** What each plan gives, row by row: makes clear that the free plan only exports a watermarked A4 PDF. */
export function PlanComparison() {
  return (
    <section aria-labelledby="plan-comparison" className="pb-12 lg:pb-16">
      <Reveal>
        <Container className="mx-auto max-w-7xl">
          <h2 id="plan-comparison" className="mb-6 text-center font-landing-heading text-heading-lg font-bold text-fg">
            So sánh các gói
          </h2>
          <DataTable label="So sánh các gói" columns={COLUMNS} rows={COMPARISON} rowKey={(row) => row.feature} mobile="cards" />
        </Container>
      </Reveal>
    </section>
  );
}
