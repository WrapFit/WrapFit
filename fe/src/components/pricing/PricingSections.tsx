"use client";

import { ChevronDown } from "lucide-react";
import React, { useId, useState } from "react";
import { Container, FeatureCard, Reveal } from "@/components/landing";
import { cn } from "@/utils/helpers";
import { FAQ } from "./content";

/** Two columns of questions in a white card; one answer open at a time per column. */
export function PlanFaq() {
  const half = Math.ceil(FAQ.length / 2);
  return (
    <section className="py-12 lg:py-24">
      <Reveal>
        <Container>
          <FeatureCard>
            <h2 className="mb-6 text-center font-landing-heading text-3xl font-bold text-landing-ink lg:text-4xl">Câu hỏi thường gặp</h2>
            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
              <FaqColumn items={FAQ.slice(0, half)} />
              <FaqColumn items={FAQ.slice(half)} />
            </div>
          </FeatureCard>
        </Container>
      </Reveal>
    </section>
  );
}

function FaqColumn({ items }: { items: typeof FAQ }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  return (
    <div className="flex flex-col">
      {items.map((item, index) => {
        const expanded = open === index;
        const panelId = `${baseId}-${index}`;
        return (
          <div key={item.question} className={cn("border-b border-landing-line transition-colors", expanded && "bg-landing-tile/40")}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left text-base text-landing-ink outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/20"
              >
                {item.question}
                <ChevronDown
                  className={cn("mt-1 size-4 shrink-0 text-landing-muted transition-transform duration-200", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
            </h3>
            <div id={panelId} role="region" hidden={!expanded} className="px-4 pb-4 text-sm leading-6 text-landing-muted">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
