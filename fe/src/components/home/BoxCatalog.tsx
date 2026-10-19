"use client";

import Image from "next/image";
import {
  ArrowRight,
  Award,
  Bookmark,
  Candy,
  CheckCircle2,
  Coffee,
  Droplets,
  Eye,
  Flame,
  Gem,
  Gift,
  Package,
  Shirt,
  ShoppingBag,
  Sparkles,
  Watch,
  type LucideIcon,
} from "lucide-react";
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

        {/* The "by industry" carousel left the home page: the industries are the photo tiles of the hero. */}
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
        {/* Blueprint Visual Area with CAD Grid, corner chips & Hover Action Overlay */}
        {/* ds-allow: dotted CAD grid of the blueprint tile. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-line/60 bg-surface-sunken/60 bg-[radial-gradient(#cad5e2_1px,transparent_1px)] [background-size:14px_14px]">
          {/* Corner chips: one line each, same height, same inset */}
          <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2">
            <span className="inline-flex h-7 min-w-0 items-center truncate whitespace-nowrap rounded-full bg-white px-3 text-label-sm text-fpt-blue shadow-xs ring-1 ring-inset ring-fpt-blue/20">
              {structure.badge}
            </span>
            <button
              type="button"
              onClick={handleBookmarkClick}
              aria-label={bookmarked ? "Bỏ lưu mẫu này" : "Lưu mẫu vào mục yêu thích"}
              aria-pressed={bookmarked}
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-full border shadow-xs transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                bookmarked
                  ? "border-fpt-orange bg-fpt-orange-light text-fpt-orange-ink"
                  : "border-line/80 bg-white text-fg-muted hover:text-fg"
              )}
            >
              <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
            </button>
          </div>

          {/* Structure CAD Illustration */}
          <div className="flex size-full items-center justify-center px-6 pb-8 pt-12 transition-transform duration-300 group-hover:scale-105">
            <StructureArt structure={structure.id} className="size-full max-h-[150px] drop-shadow-sm" />
          </div>

          <span className="absolute bottom-3 left-3 z-10 inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-success-bg px-2.5 text-label-sm text-success-fg">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Sẵn sàng cắt
          </span>

          <QuickActions compact onPreview={handlePreviewClick} studioUrl={studioUrl} />
        </div>

        {/* Content: Title, Subtitle, and Gift Chips (no dimensions, no material/time bar) */}
        <div className="flex flex-1 flex-col justify-between p-4 pt-3.5">
          <div className="flex flex-col gap-2">
            <div>
              {/* Two-line slot so every card's subtitle and chips start at the same height */}
              <h3 className="line-clamp-2 min-h-[2.8em] font-landing-heading text-title font-bold leading-snug text-landing-ink">
                {structure.vietnameseName}
              </h3>
              <p className="mt-1 line-clamp-1 text-caption text-landing-muted" title={structure.subtitle}>{structure.subtitle}</p>
            </div>

            {/* Gifts this box suits: an icon per gift kind, warm paper chips */}
            <div className="pt-1.5">
              <span className="text-overline uppercase text-fg-muted">Phù hợp cho</span>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {structure.recommendedGifts.slice(0, 3).map((gift) => {
                  const GiftIcon = giftIcon(gift);
                  return (
                    <li
                      key={gift}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-paper-cotton pl-1 pr-2.5 text-caption font-medium text-fg ring-1 ring-inset ring-paper-kraft"
                    >
                      <span className="flex size-5 items-center justify-center rounded-full bg-white text-fpt-orange-ink shadow-2xs">
                        <GiftIcon className="size-3" aria-hidden />
                      </span>
                      {gift}
                    </li>
                  );
                })}
              </ul>
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
                className="inline-flex h-9 items-center gap-1 rounded-control border border-line bg-white px-3 text-label-sm text-fg shadow-2xs"
              >
                <Eye className="size-3 text-fpt-blue" />
                <span>3D</span>
              </button>
              <Link
                href={studioUrl}
                className="inline-flex h-9 items-center gap-1 rounded-control bg-fpt-orange px-3 text-label-sm text-white shadow-2xs"
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

/**
 * Hover (and keyboard focus) actions over a card's picture: white "Xem 3D" and orange "Tùy chỉnh" side by side, one line
 * each. `compact` shortens the labels for the five-column row of structure cards (about 230 px wide). Touch screens use
 * the buttons in the card footer instead.
 */
function QuickActions({ onPreview, studioUrl, compact = false }: { onPreview: (e: React.MouseEvent) => void; studioUrl: string; compact?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-center gap-1.5 bg-fg/20 px-2 opacity-0 backdrop-blur-[3px] transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none lg:flex">
      <button
        type="button"
        onClick={onPreview}
        className="inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-line/90 bg-white/95 px-2.5 text-label-sm text-fg shadow-soft-8 backdrop-blur-md transition-[color,border-color,transform] duration-200 hover:scale-105 hover:border-fpt-blue hover:text-fpt-blue active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 motion-reduce:hover:scale-100"
      >
        <Eye className="size-3.5 shrink-0 text-fpt-blue" aria-hidden />
        {compact ? "Xem 3D" : "Xem 3D nhanh"}
      </button>
      <Link
        href={studioUrl}
        className="inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-fpt-orange px-2.5 text-label-sm text-white shadow-soft-8 transition-[background-color,transform] duration-200 hover:scale-105 hover:bg-fpt-orange-dark active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 motion-reduce:hover:scale-100"
      >
        {compact ? "Tùy chỉnh" : "Tùy chỉnh ngay"}
        <ArrowRight className="size-3.5 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}

/** Icon of a recommended gift, picked from its Vietnamese name. */
const GIFT_ICONS: Array<[RegExp, LucideIcon]> = [
  [/nến/i, Flame],
  [/nước hoa|tinh dầu/i, Droplets],
  [/mỹ phẩm|dưỡng/i, Sparkles],
  [/đồng hồ/i, Watch],
  [/trang sức|vòng|nhẫn/i, Gem],
  [/kỷ niệm|chương/i, Award],
  [/socola|macaron|kẹo|bánh/i, Candy],
  [/khăn|cà vạt|lụa/i, Shirt],
  [/cốc|gốm/i, Coffee],
  [/túi/i, ShoppingBag],
  [/hộp|lọ/i, Package],
];

function giftIcon(gift: string): LucideIcon {
  return GIFT_ICONS.find(([pattern]) => pattern.test(gift))?.[1] ?? Gift;
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
        <Image
          src={card.image}
          alt={card.title}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badge: Safe inside top-3.5 right-3.5, never clipped */}
        {card.badge && (
          <div className="absolute top-3.5 right-3.5 z-10">
            <span className="rounded-full bg-fpt-orange px-2.5 py-1 text-label-sm text-white shadow-soft-8 backdrop-blur-md">
              {card.badge}
            </span>
          </div>
        )}

        <QuickActions onPreview={handlePreviewClick} studioUrl={studioUrl} />
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
            <button
              type="button"
              onClick={handlePreviewClick}
              aria-label={`Xem 3D cấu trúc khuyên dùng: ${card.recommendedStructure}`}
              className="group/rec relative z-30 flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-surface-sunken/60 p-2 pr-3 text-left transition-colors hover:border-fpt-orange/40 hover:bg-fpt-orange-light/50 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-inset ring-line/70">
                <StructureArt structure={structure.id} className="size-full" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-caption font-medium text-fg-muted">Cấu trúc khuyên dùng</span>
                <span className="line-clamp-2 text-body-sm font-semibold leading-snug text-fg">{card.recommendedStructure}</span>
              </span>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-fg-muted ring-1 ring-inset ring-line/70 transition-colors group-hover/rec:text-fpt-orange-ink">
                <Eye className="size-4" aria-hidden />
              </span>
            </button>
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
              className="inline-flex h-9 items-center gap-1 rounded-control border border-line bg-white px-3 text-label-sm text-fg shadow-2xs"
            >
              <Eye className="size-3 text-fpt-blue" />
              <span>3D</span>
            </button>
            <Link
              href={studioUrl}
              className="inline-flex h-9 items-center gap-1 rounded-control bg-fpt-orange px-3 text-label-sm text-white shadow-2xs"
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
