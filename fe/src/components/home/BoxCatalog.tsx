"use client";

import Image from "next/image";
import { ArrowRight, Box, Hand, Ruler } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { BOX_STRUCTURES, type BoxStructureOption } from "@/features/studio/utils/boxStructures";
import { ROUTES } from "@/constants";
import { ANCHORS, STRUCTURES_SECTION } from "./content";
import { BoxQuickPreviewModal } from "./BoxQuickPreviewModal";
import { Container, SectionHeading } from "@/components/landing";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import { buttonClass } from "@/components/ui";

const CORE_BOX_IDS = ["tuck-top", "sleeve-drawer", "lid-base", "pillow"] as const;

interface StructureCardMeta {
  heroImage: string;
  imageAlt: string;
  /** One line: what the structure does well. */
  shortDesc: string;
}

const CARD_META: Record<(typeof CORE_BOX_IDS)[number], StructureCardMeta> = {
  "tuck-top": {
    heroImage: "/photos/kraft-boxes.jpg",
    imageAlt: "Hộp nắp gài đáy khóa bằng giấy kraft",
    shortDesc: "Nắp gài và đáy khóa đan chéo, gấp không cần keo.",
  },
  "sleeve-drawer": {
    heroImage: "/photos/kraft-drawer.jpg",
    imageAlt: "Hộp bao diêm với khay kéo",
    shortDesc: "Vỏ ngoài và khay trượt, tạo khoảnh khắc rút quà.",
  },
  "lid-base": {
    heroImage: "/photos/luxury-lid.jpg",
    imageAlt: "Hộp âm dương nắp rời cao cấp",
    shortDesc: "Nắp và đáy rời ôm khít, vuông vức cho quà cao cấp.",
  },
  pillow: {
    heroImage: "/photos/pillow-box.jpg",
    imageAlt: "Hộp gối với hai đầu cong",
    shortDesc: "Hai đầu cong tự khóa, gấp nhanh cho phụ kiện nhỏ.",
  },
};

/** The four structures of the MVP, each with its photo, default size and a way into the studio or the 3D preview. */
export function BoxCatalog() {
  const [previewStructure, setPreviewStructure] = useState<BoxStructureOption | null>(null);

  const openQuickPreview = (structure: BoxStructureOption) => {
    tactileAudio.playSquishyTap();
    setPreviewStructure(structure);
  };

  const coreStructures = CORE_BOX_IDS.map((id) => BOX_STRUCTURES.find((s) => s.id === id)).filter(
    (s): s is BoxStructureOption => Boolean(s),
  );

  return (
    <>
      <section className="overflow-x-clip pb-12 pt-8 lg:pb-16 lg:pt-12">
        <Container>
          <div id={ANCHORS.structures} className="flex scroll-mt-28 flex-col gap-8 lg:gap-10">
            <SectionHeading {...STRUCTURES_SECTION} />

            <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
              {coreStructures.map((structure) => (
                <li key={structure.id} className="flex">
                  <StructureCard
                    structure={structure}
                    meta={CARD_META[structure.id as (typeof CORE_BOX_IDS)[number]]}
                    onQuickPreview={() => openQuickPreview(structure)}
                  />
                </li>
              ))}
            </ol>
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

function StructureCard({
  structure,
  meta,
  onQuickPreview,
}: {
  structure: BoxStructureOption;
  meta: StructureCardMeta;
  onQuickPreview: () => void;
}) {
  const { length, width, height } = structure.defaultDims;
  const studioUrl = `${ROUTES.editorNew}?structure=${structure.id}&l=${length}&w=${width}&d=${height}`;
  const templatesUrl = `${ROUTES.templates}?structure=${structure.id}`;

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-card border border-line/70 bg-surface-raised shadow-soft-8 transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1 hover:border-line hover:shadow-soft-16 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        <Image
          src={meta.heroImage}
          alt={meta.imageAlt}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
        />
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
        <p className="mt-1.5 text-body-sm text-fg-muted">{meta.shortDesc}</p>

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
            Thiết kế hộp này
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
