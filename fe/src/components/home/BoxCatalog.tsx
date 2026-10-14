import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { formatDimensions } from "@/features/templates/labels";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import { ROUTES } from "@/constants";
import { ANCHORS, INDUSTRIES_SECTION, INDUSTRY_CARDS, STRUCTURES_SECTION } from "./content";
import { StructureArt } from "./StructureArt";
import { Carousel, Container, Reveal, SectionHeading, Tag } from "@/components/landing";

const SLIDE = "w-2/3 md:w-1/3 lg:w-1/4 xl:w-[378px] 2xl:w-[470px]";

/** The two card carousels of the catalog: box structures, then industries and gift occasions. */
export function BoxCatalog() {
  return (
    <section className="flex flex-col gap-12 overflow-x-clip pb-12 lg:gap-24 lg:pb-24">
      <Container>
        <div id={ANCHORS.structures} className="flex scroll-mt-28 flex-col gap-8">
          <SectionHeading {...STRUCTURES_SECTION} />
          <Carousel label={STRUCTURES_SECTION.title} slideClassName={SLIDE}>
            {BOX_STRUCTURES.map((structure) => (
              <CatalogTile
                key={structure.id}
                href={`/structures/${structure.id}`}
                title={structure.vietnameseName}
                meta={formatDimensions(structure.defaultDims)}
                tag={structure.badge}
                media={<StructureArt structure={structure.id} className="size-full p-[12%]" />}
              />
            ))}
          </Carousel>
        </div>
      </Container>

      <Container>
        <div className="flex flex-col gap-8">
          <SectionHeading {...INDUSTRIES_SECTION} />
          <Carousel label={INDUSTRIES_SECTION.title} slideClassName={SLIDE}>
            {INDUSTRY_CARDS.map((card) => (
              <CatalogTile
                key={card.title}
                href={card.href}
                title={card.title}
                meta={card.kind}
                media={<img src={card.image} alt="" loading="lazy" className="size-full object-cover" />}
              />
            ))}
          </Carousel>
        </div>
      </Container>
    </section>
  );
}

function CatalogTile({
  href,
  title,
  meta,
  tag,
  media,
}: {
  href: string;
  title: string;
  meta: string;
  tag?: string;
  media: React.ReactNode;
}) {
  return (
    <Reveal className="h-full">
      <Link
        href={href}
        className="group block h-full rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/25"
      >
        <div className="flex h-full flex-col gap-3 rounded-2xl bg-gradient-to-b from-white/20 to-white p-3.5 ring-1 ring-landing-ink/10 transition-shadow duration-200 group-hover:shadow-soft-16">
          <div className="aspect-square w-full overflow-hidden rounded-xl bg-landing-tile transition-[filter] duration-300 group-hover:brightness-[0.97]">
            {media}
          </div>
          <div className="flex flex-1 items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold text-landing-ink lg:text-base">{title}</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm text-landing-ink lg:text-base">{meta}</p>
                {tag && <Tag dot>{tag}</Tag>}
              </div>
            </div>
            <ArrowRight className="mb-0.5 size-5 shrink-0 text-landing-ink transition-transform group-hover:translate-x-0.5" aria-hidden />
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
