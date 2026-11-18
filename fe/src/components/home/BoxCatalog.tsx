"use client";

import Image from "next/image";
import { StructureArt } from "./StructureArt";
import { ArrowRight, Box, ChevronLeft, ChevronRight, Hand, Ruler } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BOX_STRUCTURES, type BoxStructureOption } from "@/features/studio/utils/boxStructures";
import { ROUTES } from "@/constants";
import { ANCHORS, STRUCTURES_SECTION } from "./content";
import { BoxQuickPreviewModal } from "./BoxQuickPreviewModal";
import { Container, SectionHeading } from "@/components/landing";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import { buttonClass } from "@/components/ui";

/**
 * The structures in the studio's order. The row opens on the middle page (from the mailer: mailer, gable, cup carrier,
 * insert), so both arrows work at first; each arrow hides at its end of the list.
 */
const CAROUSEL_STRUCTURES = BOX_STRUCTURES;
const START_ID: BoxStructureOption["id"] = "mailer";

/** Arrow on a side of the row, centred on the cards; hidden at its end of the list. */
const NAV_BUTTON =
  "absolute top-1/2 z-10 -translate-y-1/2 hidden size-12 items-center justify-center rounded-full border border-line bg-surface-raised text-fg shadow-soft-8 transition-[opacity,color,border-color] hover:border-fpt-orange hover:text-fpt-orange disabled:pointer-events-none disabled:opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex";

/**
 * Real photos of the structures (belly band: Pexels, free licence; six chosen by the team); a structure added later
 * without a photo keeps WrapFit's drawing.
 */
const STRUCTURE_PHOTOS: Partial<Record<BoxStructureOption["id"], { src: string; alt: string }>> = {
  "tuck-top": { src: "/photos/tuck-top-box.jpg", alt: "Hộp nắp gài đáy khóa màu kem in logo nhũ vàng" },
  "sleeve-drawer": { src: "/photos/sleeve-drawer-box.jpg", alt: "Hộp bao diêm trắng với khay kéo" },
  "lid-base": { src: "/photos/lid-base-box.jpg", alt: "Hộp âm dương nắp rời giấy mỹ thuật ép nhũ" },
  pillow: { src: "/photos/pillow-box.jpg", alt: "Hộp gối giấy kraft hai đầu cong" },
  mailer: { src: "/photos/mailer-box.jpg", alt: "Hộp nắp cài in hoạ tiết, mở nắp" },
  gable: { src: "/photos/gable-box.jpg", alt: "Hộp quai xách in thương hiệu" },
  "cup-carrier": { src: "/photos/cup-carrier-box.jpg", alt: "Khay xách hai ly cà phê có quai" },
  "belly-band": { src: "/photos/belly-band.jpg", alt: "Đai giấy quấn quanh sản phẩm cạnh hộp kraft" },
  insert: { src: "/photos/chocolate.jpg", alt: "Khay chia ngăn đựng socola" },
  "hang-tag": { src: "/photos/christmas.jpg", alt: "Hộp quà có thẻ treo buộc dây" },
  "folded-card": { src: "/photos/valentine.jpg", alt: "Hộp quà kèm thiệp gấp" },
  "sticker-label": { src: "/photos/kraft-twine.jpg", alt: "Hộp kraft niêm phong bằng tem" },
};

/** Every structure of the studio, each with WrapFit's drawing, default size and a way into the studio or the 3D preview. */
export function BoxCatalog() {
  const [previewStructure, setPreviewStructure] = useState<BoxStructureOption | null>(null);

  const trackRef = useRef<HTMLOListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const updateEnds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    // Open on the middle page, without the smooth scroll of the arrows.
    const el = trackRef.current;
    const start = el?.querySelector<HTMLElement>(`[data-structure="${START_ID}"]`);
    if (el && start) {
      el.style.scrollBehavior = "auto";
      el.scrollLeft = start.offsetLeft - el.offsetLeft;
      el.style.scrollBehavior = "";
    }
    updateEnds();
    window.addEventListener("resize", updateEnds);
    return () => window.removeEventListener("resize", updateEnds);
  }, [updateEnds]);
  /** One page: as many cards as fit on the row. */
  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  };

  const openQuickPreview = (structure: BoxStructureOption) => {
    tactileAudio.playSquishyTap();
    setPreviewStructure(structure);
  };

  return (
    <>
      <section className="overflow-x-clip pb-12 pt-8 lg:pb-16 lg:pt-12">
        <Container>
          <div id={ANCHORS.structures} className="flex scroll-mt-28 flex-col gap-8 lg:gap-10">
            <SectionHeading title={STRUCTURES_SECTION.title} href={STRUCTURES_SECTION.href} />

            {/* One row of four (fewer on small screens), scrolled a page at a time by the arrows on both sides or by swiping. */}
            <div className="relative">
            <button type="button" onClick={() => scrollBy(-1)} disabled={atStart} aria-label="Cấu trúc trước" className={cn(NAV_BUTTON, "-left-4 lg:-left-16")}>
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => scrollBy(1)} disabled={atEnd} aria-label="Cấu trúc tiếp theo" className={cn(NAV_BUTTON, "-right-4 lg:-right-16")}>
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <ol
              ref={trackRef}
              onScroll={updateEnds}
              className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden"
            >
              {CAROUSEL_STRUCTURES.map((structure) => (
                <li
                  key={structure.id}
                  data-structure={structure.id}
                  className="flex w-full shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]"
                >
                  <StructureCard structure={structure} onQuickPreview={() => openQuickPreview(structure)} />
                </li>
              ))}
            </ol>
            </div>
          </div>
        </Container>
      </section>

      <BoxQuickPreviewModal
        isOpen={Boolean(previewStructure)}
        onClose={() => setPreviewStructure(null)}
        structure={previewStructure}
        initialSizeLabel="M"
      />
    </>
  );
}

function StructureCard({ structure, onQuickPreview }: { structure: BoxStructureOption; onQuickPreview: () => void }) {
  const photo = STRUCTURE_PHOTOS[structure.id];
  const { length, width, height } = structure.defaultDims;
  const studioUrl = `${ROUTES.editorDemo}?structure=${structure.id}&l=${length}&w=${width}&d=${height}`;
  const templatesUrl = `${ROUTES.templates}?structure=${structure.id}`;

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-card border border-line/70 bg-surface-raised transition-[transform,box-shadow,border-color] duration-500 ease-out hover:border-line motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Photo */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface-sunken/70">
        {photo ? (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        ) : (
          <StructureArt
            structure={structure.id}
            className="h-[82%] w-auto transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none"
          />
        )}
        <button
          type="button"
          onClick={onQuickPreview}
          aria-label={`Xem hộp 3D: ${structure.vietnameseName}`}
          className="absolute right-3 top-3 inline-flex h-11 items-center gap-1.5 rounded-full bg-white/90 px-3.5 text-label font-semibold text-fg shadow-soft-8 backdrop-blur-sm transition-colors hover:bg-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Box className="size-4" aria-hidden />
          3D
        </button>

      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-landing-heading text-heading-sm font-bold tracking-tight text-fg">{structure.vietnameseName}</h3>
        <p className="mt-1.5 text-body-sm text-fg-muted">{structure.description}</p>

        <dl className="mt-5 divide-y divide-line/60 border-y border-line/60 text-body-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="flex items-center gap-2 text-fg-muted">
              <Ruler className="size-4 text-fg-muted" aria-hidden />
              Cỡ chuẩn
            </dt>
            <dd className="whitespace-nowrap font-semibold tabular-nums text-fg">
              {length} × {width} × {height} mm
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="flex items-center gap-2 text-fg-muted">
              <Hand className="size-4 text-fg-muted" aria-hidden />
              Độ khó gấp
            </dt>
            <dd className="font-semibold text-fg">{structure.foldDifficulty}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <Link
            href={templatesUrl}
            className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-body-sm font-semibold text-fg-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            Xem mẫu
          </Link>
          <Link
            href={studioUrl}
            onClick={() => tactileAudio.playSquishyTap()}
            className={cn(buttonClass({ variant: "brand", size: "sm" }), "gap-1.5")}
          >
            Thiết kế
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
