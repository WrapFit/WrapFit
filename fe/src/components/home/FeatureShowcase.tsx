"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useState } from "react";
import { cn } from "@/utils/helpers";
import { useInView } from "@/hooks/dom";
import { CUSTOMIZE, PREVIEW_3D, PRODUCTION_ROWS, type ProductionRow } from "./content";
import { CardTitle, Container, Eyebrow, FeatureCard, Reveal, limeButton } from "@/components/landing";

// WebGL only in the browser, and only once the card is near the viewport.
const InteractiveFoldingBox3D = dynamic(
  () => import("@/features/studio/components/three/InteractiveFoldingBox3D").then((m) => m.InteractiveFoldingBox3D),
  { ssr: false, loading: () => <div className="size-full animate-pulse bg-landing-tile" /> }
);

/** The white feature cards: custom size, 3D preview, then production (export, FitCheck, QR unboxing). */
export function FeatureShowcase() {
  return (
    <section className="flex flex-col gap-8 py-8 lg:gap-14 lg:py-14">
      <Reveal>
        <Container>
          <FeatureCard className="bg-gradient-to-r from-white to-white/0">
            <article className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
              <TextBlock eyebrow={CUSTOMIZE.eyebrow} title={CUSTOMIZE.title} cta={CUSTOMIZE.cta}>
                {CUSTOMIZE.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </TextBlock>
              <div className="flex h-full w-full items-center justify-center">
                <SizeAndPaper />
              </div>
            </article>
          </FeatureCard>
        </Container>
      </Reveal>

      <Reveal>
        <Container>
          <FeatureCard>
            <article className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
              <Preview3D />
              <TextBlock eyebrow={PREVIEW_3D.eyebrow} title={PREVIEW_3D.title} cta={PREVIEW_3D.cta} className="lg:py-4">
                <p>{PREVIEW_3D.body}</p>
              </TextBlock>
            </article>
          </FeatureCard>
        </Container>
      </Reveal>

      <Reveal>
        <Container>
          <FeatureCard className="flex flex-col gap-12 lg:gap-16">
            {PRODUCTION_ROWS.map((row, index) => (
              <ProductionArticle key={row.title} row={row} mediaFirst={index % 2 === 1} />
            ))}
          </FeatureCard>
        </Container>
      </Reveal>
    </section>
  );
}

function TextBlock({
  eyebrow,
  title,
  cta,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  cta: { label: string; href: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Reveal variant="text">
        <Eyebrow>{eyebrow}</Eyebrow>
        <CardTitle>{title}</CardTitle>
      </Reveal>
      <div className="flex flex-col gap-4 text-base leading-7 text-landing-muted lg:text-lg">{children}</div>
      <Link href={cta.href} className={cn(limeButton("sm"), "w-fit")}>
        {cta.label}
      </Link>
    </div>
  );
}

const DIMENSIONS = [
  { key: "length", letter: "L", name: "Chiều dài", ring: "border-info", text: "text-info-fg" },
  { key: "width", letter: "W", name: "Chiều rộng", ring: "border-fpt-orange", text: "text-fpt-orange" },
  { key: "height", letter: "H", name: "Chiều cao", ring: "border-success", text: "text-success" },
] as const;

const PAPERS = [
  { id: "ivory", label: "Ivory 300 GSM", tone: "#FFFFFF", fold: "#E2E8F0" },
  { id: "kraft", label: "Kraft 300 GSM", tone: "#C9A57A", fold: "#9C7A52" },
] as const;

/** Size and paper pickers of the customisation card. They only preview: the studio opens with its own defaults. */
function SizeAndPaper() {
  const [size, setSize] = useState<Record<"length" | "width" | "height", string>>({
    length: String(CUSTOMIZE.dimensions.length),
    width: String(CUSTOMIZE.dimensions.width),
    height: String(CUSTOMIZE.dimensions.height),
  });
  const [paper, setPaper] = useState<(typeof PAPERS)[number]["id"]>("kraft");

  return (
    <div className="w-full max-w-[520px] -space-y-6">
      <div className="relative rounded-sheet bg-white p-4 pb-8 shadow-soft-8 ring-1 ring-landing-ink/10">
        <p className="mb-3 text-sm font-medium text-landing-ink">Kích thước món quà</p>
        <div className="flex min-w-full gap-1.5 md:gap-3">
          {DIMENSIONS.map((dim) => (
            <label
              key={dim.key}
              className={cn(
                "flex h-9 w-full cursor-text items-center gap-2 rounded-full border-2 bg-white px-3 transition-shadow focus-within:shadow-soft-16 md:h-10 md:gap-3 md:px-4",
                dim.ring
              )}
            >
              <span className={cn("w-3 text-center text-sm font-semibold md:text-lg", dim.text)} aria-hidden>
                {dim.letter}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={10}
                max={600}
                value={size[dim.key]}
                onChange={(event) => setSize((prev) => ({ ...prev, [dim.key]: event.target.value }))}
                aria-label={`${dim.name} (mm)`}
                className="w-full min-w-0 bg-transparent font-mono text-sm font-medium text-landing-ink [appearance:textfield] focus-visible:outline-offset-4 md:text-lg [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="hidden text-xs text-landing-muted md:block lg:text-base">mm</span>
            </label>
          ))}
        </div>
      </div>

      <div className="relative flex scale-95 flex-col gap-2 rounded-2xl border border-landing-line bg-gradient-to-t from-white to-white/0 p-3 shadow-soft-8 backdrop-blur-sm md:gap-3 md:rounded-3xl md:p-4">
        <span className="text-sm font-medium text-landing-ink">Chất liệu</span>
        <div className="flex flex-col gap-2 md:flex-row md:gap-3" role="radiogroup" aria-label="Chất liệu giấy">
          {PAPERS.map((item) => {
            const active = paper === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPaper(item.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm text-landing-ink transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/25",
                  active ? "border-landing-ink bg-line/30" : "border-landing-line bg-line/15 hover:bg-line/30"
                )}
              >
                <span>{item.label}</span>
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white md:size-12">
                  <PaperCurl tone={item.tone} fold={item.fold} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Sheet of paper with a curled corner, in the paper's colour. */
function PaperCurl({ tone, fold }: { tone: string; fold: string }) {
  return (
    <svg viewBox="0 0 40 40" className="size-8" aria-hidden>
      <path d="M8 6 L30 12 Q22 22 26 34 L6 30 Q12 18 8 6 Z" fill={tone} stroke="#94A3B8" strokeWidth="1" strokeLinejoin="round" />
      <path d="M30 12 Q22 22 26 34 Q34 24 30 12 Z" fill={fold} stroke="#94A3B8" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function Preview3D() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "200px 0px" });
  return (
    <div ref={ref} className="relative h-[340px] overflow-hidden rounded-2xl bg-landing-canvas sm:h-[420px] lg:h-auto lg:min-h-[488px]">
      {inView && (
        // The viewer fills its parent's height, which the grid sets on large screens: hence the absolute frame.
        <div className="absolute inset-0">
          <InteractiveFoldingBox3D
            dimensions={{ length: 80, width: 60, height: 130, paperThickness: 0.4 }}
            foldProgress={1}
            boxType="tuck-top"
            theme="forest"
            environment="marble"
            autoRotate
            enableMacroZoom={false}
            showStatusBar={false}
            minHeight={false}
          />
        </div>
      )}
    </div>
  );
}

function ProductionArticle({ row, mediaFirst }: { row: ProductionRow; mediaFirst: boolean }) {
  return (
    <article id={row.id} className="grid scroll-mt-28 grid-cols-1 items-center gap-8 lg:grid-cols-2">
      <div className={cn(mediaFirst && "lg:order-2")}>
        <TextBlock eyebrow={row.eyebrow} title={row.title} cta={row.cta}>
          <p>{row.body}</p>
        </TextBlock>
      </div>
      <div className={cn("grid gap-4", row.images.length > 1 && "grid-cols-2", mediaFirst && "lg:order-1")}>
        {row.images.map((image) => (
          <div
            key={image.src}
            className={cn("overflow-hidden rounded-2xl bg-landing-tile", row.images.length > 1 ? "aspect-[2/3]" : "aspect-[4/3]")}
          >
            <img src={image.src} alt={image.alt} loading="lazy" className="size-full object-cover" />
          </div>
        ))}
      </div>
    </article>
  );
}
