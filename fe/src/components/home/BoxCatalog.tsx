"use client";

import { ArrowRight, Bookmark, CheckCircle2, Eye } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { BOX_STRUCTURES, type BoxStructureOption } from "@/features/studio/utils/boxStructures";
import { ROUTES } from "@/constants";
import { ANCHORS, INDUSTRIES_SECTION, INDUSTRY_CARDS, STRUCTURES_SECTION, type CatalogCard } from "./content";
import { StructureArt } from "./StructureArt";
import { BoxQuickPreviewModal } from "./BoxQuickPreviewModal";
import { Carousel, Container, SectionHeading } from "@/components/landing";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import { buttonClass } from "@/components/ui";

const SLIDE = "w-[85vw] sm:w-[340px] md:w-[380px] lg:w-[400px] xl:w-[420px]";

/** The two card carousels of the catalog: box structures, then industries and gift occasions. */
export function BoxCatalog() {
  const [previewStructure, setPreviewStructure] = useState<BoxStructureOption | null>(null);
  const [previewSize, setPreviewSize] = useState<"S" | "M" | "L">("M");

  const openQuickPreview = (structure: BoxStructureOption, size: "S" | "M" | "L" = "M") => {
    setPreviewStructure(structure);
    setPreviewSize(size);
  };

  const closeQuickPreview = () => {
    setPreviewStructure(null);
  };

  return (
    <>
      <section className="flex flex-col gap-10 overflow-x-clip pt-8 pb-8 lg:gap-14 lg:pt-12 lg:pb-10">
        {/* Section 1: Box Structures (Smart Multitasking Cards) */}
        <Container>
          <div id={ANCHORS.structures} className="flex scroll-mt-28 flex-col gap-5 sm:gap-6">
            <SectionHeading {...STRUCTURES_SECTION} />
            {/* Desktop: one row with every structure (five today); narrower screens scroll the carousel below */}
            <div className={BOX_STRUCTURES.length > 4 ? "hidden xl:grid xl:grid-cols-5 xl:gap-4" : "hidden lg:grid lg:grid-cols-4 lg:gap-5"}>
              {BOX_STRUCTURES.map((structure) => (
                <StructureSmartCard
                  key={structure.id}
                  structure={structure}
                  onQuickPreview={(size) => openQuickPreview(structure, size)}
                />
              ))}
            </div>
            {/* Mobile / Tablet: smooth container-bounded horizontal carousel */}
            <div className={BOX_STRUCTURES.length > 4 ? "block xl:hidden" : "block lg:hidden"}>
              <Carousel label={STRUCTURES_SECTION.title} bleed="none" slideClassName="w-[85vw] sm:w-[340px]">
                {BOX_STRUCTURES.map((structure) => (
                  <StructureSmartCard
                    key={structure.id}
                    structure={structure}
                    onQuickPreview={(size) => openQuickPreview(structure, size)}
                  />
                ))}
              </Carousel>
            </div>
          </div>
        </Container>

        {/* Section 2: Packaging by Industry & Occasions (Smart Multitasking Cards) */}
        <Container>
          <div id={ANCHORS.industries} className="flex scroll-mt-28 flex-col gap-5 sm:gap-6">
            <SectionHeading {...INDUSTRIES_SECTION} />
            <Carousel label={INDUSTRIES_SECTION.title} bleed="none" slideClassName="w-[82vw] sm:w-[280px] md:w-[300px] lg:w-[320px]">
              {INDUSTRY_CARDS.map((card) => (
                <IndustrySmartCard
                  key={card.title}
                  card={card}
                  onQuickPreview={(struct) => openQuickPreview(struct, "M")}
                />
              ))}
            </Carousel>
          </div>
        </Container>
      </section>

      {/* Interactive 3D Quick Preview Modal */}
      <BoxQuickPreviewModal
        isOpen={Boolean(previewStructure)}
        onClose={closeQuickPreview}
        structure={previewStructure}
        initialSizeLabel={previewSize}
      />
    </>
  );
}

/**
 * Smart Multitasking Card for Box Structures:
 * - Live S / M / L size switcher on card
 * - Blueprint CAD preview with hover action dock ("Xem 3D Nhanh" + "Studio 3D")
 * - Technical Packaging HUD (paper weight, folding time, CNC readiness)
 * - Recommended gift tags & quick bookmarking
 */
function StructureSmartCard({
  structure,
  onQuickPreview,
}: {
  structure: BoxStructureOption;
  onQuickPreview: (size: "S" | "M" | "L") => void;
}) {
  const [bookmarked, setBookmarked] = useState<boolean>(false);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    tactileAudio.playSquishyTap();
    setBookmarked(!bookmarked);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickPreview("M");
  };

  const studioUrl = `${ROUTES.editorNew}?structure=${structure.id}&l=${structure.defaultDims.length}&w=${structure.defaultDims.width}&d=${structure.defaultDims.height}`;
  const templatesUrl = `${ROUTES.templates}?structure=${structure.id}`;

  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-line/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-landing-ink/20 hover:shadow-soft-16">
      {/* Card Header: Badges only (no size switcher) */}
        <div className="flex items-center justify-between border-b border-line/60 bg-surface-sunken/70 p-3.5">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-fpt-blue/25 bg-fpt-blue-light px-2.5 py-0.5 text-caption font-semibold text-fpt-blue shadow-xs">
              {structure.badge}
            </span>
            <span className="flex items-center gap-1 text-caption font-semibold text-fpt-orange-ink">
              <CheckCircle2 className="size-3" />
              CNC Ready
            </span>
          </div>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleBookmarkClick}
            aria-label={bookmarked ? "Bỏ lưu mẫu này" : "Lưu mẫu vào mục yêu thích"}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full border transition-all duration-200",
              bookmarked
                ? "border-fpt-orange bg-fpt-orange-light text-fpt-orange-ink shadow-xs"
                : "border-line/80 bg-white text-fg-muted hover:text-fg"
            )}
          >
            <Bookmark className={cn("size-3.5", bookmarked && "fill-current")} />
          </button>
        </div>

        {/* Blueprint Visual Area with CAD Grid & Hover Action Overlay */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-surface-sunken/50">
          {/* Structure CAD Illustration */}
          <div className="flex size-full items-center justify-center p-6 transition-transform duration-300 group-hover:scale-105">
            <StructureArt structure={structure.id} className="size-full max-h-[160px] drop-shadow-sm" />
          </div>

          {/* Quick Action Overlay (Reveals on Hover: FPT Blue 3D button + FPT Orange Customize button) */}
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2.5 bg-fg/20 backdrop-blur-[3px] opacity-0 transition-all duration-200 group-hover:opacity-100 p-3">
            <button
              type="button"
              onClick={handlePreviewClick}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line/90 bg-white/95 px-3.5 text-xs font-bold text-fg shadow-soft-8 backdrop-blur-md transition-all duration-200 hover:border-fpt-blue hover:text-fpt-blue hover:scale-105 active:scale-95"
            >
              <Eye className="size-3.5 text-fpt-blue" />
              <span>Xem 3D nhanh</span>
            </button>
            <Link
              href={studioUrl}
              className={buttonClass({ variant: "brand", size: "sm", shape: "rounded" })}
            >
              <span>Tùy chỉnh ngay</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Content: Title, Subtitle, and Gift Chips (no dimensions, no material/time bar) */}
        <div className="flex flex-1 flex-col justify-between p-4 pt-3.5">
          <div className="flex flex-col gap-2">
            <div>
              <h3 className="font-landing-heading text-base font-bold text-landing-ink lg:text-lg">
                {structure.vietnameseName}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-landing-muted">{structure.subtitle}</p>
            </div>

            {/* Gift Compatibility Chips */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              {structure.recommendedGifts.slice(0, 3).map((gift) => (
                <span
                  key={gift}
                  className="rounded-md border border-line/70 bg-white px-2 py-0.5 text-caption text-fg-muted shadow-2xs"
                >
                  {gift}
                </span>
              ))}
            </div>
          </div>

          {/* Card Footer */}
          <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-3">
            <Link
              href={templatesUrl}
              className="text-caption font-medium text-fg-muted transition-colors hover:text-fpt-orange-ink hover:underline"
            >
              Xem mẫu có sẵn →
            </Link>

            {/* Mobile-only Quick Action Buttons (since touch screens have no hover) */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                type="button"
                onClick={handlePreviewClick}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-white px-2 text-caption font-semibold text-fg shadow-2xs"
              >
                <Eye className="size-3 text-fpt-blue" />
                <span>3D</span>
              </button>
              <Link
                href={studioUrl}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-fpt-orange px-2 text-label-sm text-white shadow-2xs"
              >
                <span>Tùy chỉnh</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
  );
}

/** Helper to match industry card to the most relevant BoxStructureOption */
function getStructureForIndustry(card: CatalogCard): BoxStructureOption {
  const title = card.title.toLowerCase();
  const rec = (card.recommendedStructure ?? "").toLowerCase();
  if (rec.includes("bao diêm") || rec.includes("khay rút") || title.includes("bánh") || title.includes("socola")) {
    return BOX_STRUCTURES.find((s) => s.id === "sleeve-drawer") ?? BOX_STRUCTURES[1];
  }
  if (rec.includes("âm dương") || title.includes("trang sức") || title.includes("đồng hồ")) {
    return BOX_STRUCTURES.find((s) => s.id === "lid-base") ?? BOX_STRUCTURES[2];
  }
  if (rec.includes("gối") || title.includes("khăn") || title.includes("phụ kiện")) {
    return BOX_STRUCTURES.find((s) => s.id === "pillow") ?? BOX_STRUCTURES[3];
  }
  return BOX_STRUCTURES[0]; // tuck-top
}

/**
 * Smart Multitasking Card for Industry & Occasion:
 * - High-craft photography without dark text cramming
 * - Floating FPT Orange badge in safe corner
 * - Hover quick action dock: "Xem 3D nhanh" (FPT Blue) + "Tùy chỉnh ngay" (FPT Orange)
 * - Clear title and category below the photo
 * - Recommended packaging structure box
 * - "Xem bộ mẫu" footer link
 */
function IndustrySmartCard({
  card,
  onQuickPreview,
}: {
  card: CatalogCard;
  onQuickPreview: (structure: BoxStructureOption) => void;
}) {
  const structure = getStructureForIndustry(card);
  const studioUrl = `${ROUTES.editorNew}?structure=${structure.id}&l=${structure.defaultDims.length}&w=${structure.defaultDims.width}&d=${structure.defaultDims.height}`;

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickPreview(structure);
  };

  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-line/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-landing-ink/20 hover:shadow-soft-16">
      {/* Cover Image & Hover Quick Action Overlay */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-landing-tile">
        <img
          src={card.image}
          alt={card.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badge: Safe inside top-3.5 right-3.5, never clipped */}
        {card.badge && (
          <div className="absolute top-3.5 right-3.5 z-10">
            <span className="rounded-full bg-fpt-orange px-2.5 py-1 text-label-sm text-white shadow-soft-8 backdrop-blur-md">
              {card.badge}
            </span>
          </div>
        )}

        {/* Quick Action Overlay (Reveals on Hover: FPT Blue 3D button + FPT Orange Customize button) */}
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-fg/25 p-3 opacity-0 backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={handlePreviewClick}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line/90 bg-white/95 px-3 text-xs font-bold text-fg shadow-soft-8 backdrop-blur-md transition-all duration-200 hover:border-fpt-blue hover:text-fpt-blue hover:scale-105 active:scale-95"
          >
            <Eye className="size-3.5 text-fpt-blue" />
            <span>Xem 3D nhanh</span>
          </button>
          <Link
            href={studioUrl}
            className={buttonClass({ variant: "brand", size: "sm", shape: "rounded" })}
          >
            <span>Tùy chỉnh ngay</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Info & Typography: Clean layout below image */}
      <div className="flex flex-1 flex-col justify-between p-4 pt-3.5">
        <div className="flex flex-col gap-2.5">
          <div>
            <h3 className="font-landing-heading text-lg font-bold text-landing-ink transition-colors group-hover:text-fpt-orange-ink">
              {card.title}
            </h3>
            {card.categoryTag && (
              <p className="mt-0.5 text-xs font-medium text-landing-muted">{card.categoryTag}</p>
            )}
          </div>

          {/* Recommended Packaging Structure */}
          {card.recommendedStructure && (
            <div className="rounded-xl border border-line/60 bg-surface-sunken/80 p-2.5 text-xs">
              <span className="block font-mono text-cad-spec-micro font-semibold uppercase tracking-wider text-fg-muted">
                Cấu trúc khuyên dùng
              </span>
              <span className="mt-0.5 block font-semibold text-fg">
                {card.recommendedStructure}
              </span>
            </div>
          )}
        </div>

        {/* Footer: Template Count Link & Mobile Buttons */}
        <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-3">
          <Link
            href={card.href}
            className="inline-flex items-center gap-1.5 text-caption font-semibold text-fg-muted transition-colors hover:text-fpt-orange-ink"
          >
            <span>Xem bộ mẫu ({card.templateCount ?? "30+"})</span>
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          {/* Mobile-only Quick Action Buttons (for touch screens without hover) */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              type="button"
              onClick={handlePreviewClick}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-white px-2 text-caption font-semibold text-fg shadow-2xs"
            >
              <Eye className="size-3 text-fpt-blue" />
              <span>3D</span>
            </button>
            <Link
              href={studioUrl}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-fpt-orange px-2 text-label-sm text-white shadow-2xs"
            >
              <span>Tùy chỉnh</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
