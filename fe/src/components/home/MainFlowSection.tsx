"use client";

import React, { useState } from "react";
import { Play } from "lucide-react";
import { Container, Reveal } from "@/components/landing";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { FLOW_STEPS, FlowStepModal } from "./FlowStepModal";

/** "Quy trình hoạt động": the six steps of the studio; each card shows a still of its step and plays the clip of the studio demo when clicked. */
export function MainFlowSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const open = (stepIndex: number) => {
    setSelectedStepIndex(stepIndex);
    setModalOpen(true);
    try {
      tactileAudio.playUnboxPop();
    } catch {
      // Ignored if audio context is not yet primed
    }
  };

  return (
    <>
      <section id="quy-trinh" className="relative scroll-mt-24 border-b border-line/60 bg-canvas py-14 lg:py-24">
        <Container>
          <Reveal variant="text" className="mx-auto mb-12 max-w-3xl text-center lg:mb-16">
            <div className="mb-4 inline-flex items-center rounded-full bg-fpt-orange px-4 py-1.5 shadow-soft-8">
              <span className="text-xs font-bold uppercase tracking-wider text-white">QUY TRÌNH HOẠT ĐỘNG</span>
            </div>
            <h2 className="font-landing-heading text-2xl font-bold leading-tight tracking-tight text-balance text-landing-ink sm:text-4xl lg:text-5xl">
              Thiết kế bao bì chỉ trong {FLOW_STEPS.length} bước
            </h2>
            <p className="mx-auto mt-3 max-w-xl font-landing-body text-sm leading-relaxed text-fg-muted sm:text-base">

            </p>
          </Reveal>

          <ol className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {FLOW_STEPS.map((step, index) => (
              <li key={step.number}>
                <button
                  type="button"
                  onClick={() => open(index)}
                  title={`Xem video bước ${step.number}: ${step.name}`}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-sheet border border-line/70 bg-white text-left outline-none transition-colors duration-300 hover:border-fpt-orange/60 focus-visible:ring-2 focus-visible:ring-fpt-orange"
                >
                  <div className="relative aspect-video w-full overflow-hidden border-b border-line/60 bg-white">
                    <img
                      src={`${step.clip}.webp`}
                      alt={step.imageAlt}
                      loading="lazy"
                      className="size-full select-none object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-fpt-orange shadow-soft-8 transition-transform duration-300 group-hover:scale-110 group-hover:bg-fpt-orange group-hover:text-white">
                        <Play className="ml-0.5 size-5 fill-current" aria-hidden />
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fpt-orange-light font-mono text-xs font-bold text-fpt-orange-ink">
                      {step.number}
                    </span>
                    <h3 className="font-landing-heading text-lg font-bold leading-snug text-landing-ink">{step.name}</h3>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <FlowStepModal isOpen={modalOpen} onClose={() => setModalOpen(false)} stepIndex={selectedStepIndex} />
    </>
  );
}
