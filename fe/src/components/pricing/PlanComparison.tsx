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

/** What each plan gives, row by row: makes clear that the free plan cannot export a print file without a purchase. */
/** Rows shown before "Xem toàn bộ": the ones that decide a plan. */
const FIRST_ROWS = 6;

/** `embedded`: inside the pricing tabs (no own heading or section spacing). */
export function PlanComparison({ embedded = false }: { embedded?: boolean }) {
  const [all, setAll] = React.useState(false);
  const rows = all ? COMPARISON : COMPARISON.slice(0, FIRST_ROWS);
  return (
    <section aria-labelledby="plan-comparison" className={embedded ? "" : "pb-12 lg:pb-16"}>
      <Reveal>
        <Container className={embedded ? "mx-auto max-w-7xl !px-0" : "mx-auto max-w-7xl"}>
          <h2 id="plan-comparison" className={embedded ? "sr-only" : "mb-6 text-center font-landing-heading text-heading-lg font-bold text-fg"}>
            So sánh các gói
          </h2>
          <DataTable label="So sánh các gói" columns={COLUMNS} rows={rows} rowKey={(row) => row.feature} mobile="cards" />
          {COMPARISON.length > FIRST_ROWS && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                aria-expanded={all}
                onClick={() => setAll((v) => !v)}
                className="min-h-11 rounded-full px-5 text-body-sm font-semibold text-accent underline-offset-4 hover:underline"
              >
                {all ? "Thu gọn" : `Xem toàn bộ ${COMPARISON.length} tiêu chí`}
              </button>
            </div>
          )}
        </Container>
      </Reveal>
    </section>
  );
}
