"use client";

import React, { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Container, Reveal } from "@/components/landing";
import { StructureArt } from "./StructureArt";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { FLOW_STEPS, FlowStepModal } from "./FlowStepModal";

/** Papers of step 3, as a fanned stack of swatches. */
const PAPERS = [
  { name: "Ivory", fill: "#FBF7EE" },
  { name: "Duplex", fill: "#F1F1EC" },
  { name: "Carton bồi", fill: "#E9E2D3" },
  { name: "Kraft", fill: "#C9A273" },
];

/**
 * Illustration of each step on the card; the screenshot of the studio opens with the card. Same family as the rest of
 * the home page: WrapFit's box drawings, Gói, flat paper tones.
 */
function StepArt({ index, label }: { index: number; label: string }) {
  const img = (src: string) => <img src={src} alt="" aria-hidden loading="lazy" className="max-h-full w-auto object-contain" />;
  switch (index) {
    case 0:
      return <StructureArt structure="tuck-top" className="h-full w-auto" />;
    case 1:
      return img("/branding/flow-art-1.png");
    case 2:
      return (
        <svg viewBox="0 0 200 140" className="h-full w-auto" role="img" aria-label={label}>
          <ellipse cx="100" cy="122" rx="70" ry="8" fill="#000" opacity="0.06" />
          {PAPERS.map((paper, i) => (
            <g key={paper.name} transform={`rotate(${(i - 1.5) * 9} 100 120)`}>
              <rect x="62" y="22" width="76" height="96" rx="6" fill={paper.fill} stroke="#A98A5B" strokeOpacity="0.45" />
              <path d="M124 118 L138 104 L138 118 Z" fill="#000" opacity="0.06" />
            </g>
          ))}
          <rect x="62" y="22" width="76" height="12" rx="6" transform="rotate(13.5 100 120)" className="fill-fpt-orange" opacity="0.9" />
        </svg>
      );
    case 3:
      return img("/branding/flow-art-2.png");
    case 4:
      return img("/mascots/goi-cheer.webp");
    default:
      return img("/branding/flow-art-4.png");
  }
}

/** "Quy trình hoạt động": the six steps of the studio; each card opens a screenshot of its step. */
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
                  title={`Xem giao diện bước ${step.number}: ${step.name}`}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-sheet border border-line/70 bg-white text-left outline-none transition-colors duration-300 hover:border-fpt-orange/60 focus-visible:ring-2 focus-visible:ring-fpt-orange"
                >
                  <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden border-b border-line/60 bg-white">
                    <div className="flex h-[78%] w-full items-center justify-center transition-transform duration-500 group-hover:scale-105">
                      <StepArt index={index} label={step.name} />
                    </div>
                    <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-line/80 bg-white/90 text-fg-muted opacity-0 shadow-2xs transition-opacity group-hover:opacity-100 group-hover:text-fpt-orange">
                      <Maximize2 className="size-3.5" aria-hidden />
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
