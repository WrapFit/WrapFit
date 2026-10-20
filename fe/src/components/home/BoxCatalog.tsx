"use client";

import Image from "next/image";
import {
  ArrowRight,
  Award,
  Candy,
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
import { ANCHORS, STRUCTURES_SECTION } from "./content";
import { BoxQuickPreviewModal } from "./BoxQuickPreviewModal";
import { Container, SectionHeading } from "@/components/landing";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import { buttonClass } from "@/components/ui";

const CORE_BOX_IDS = ["tuck-top", "sleeve-drawer", "lid-base", "pillow"] as const;

interface BentoStructureCardData {
  id: string;
  categoryPill: string;
  pillColor: string;
  heroImage: string;
  imageAlt: string;
  shortDesc: string;
  templateCount: string;
}

const BENTO_CARDS_DATA: Record<string, BentoStructureCardData> = {
  "tuck-top": {
    id: "tuck-top",
    categoryPill: "Phổ biến nhất",
    pillColor: "text-fpt-orange-ink ring-fpt-orange/40 bg-fpt-orange-light/95",
    heroImage: "/photos/kraft-boxes.jpg",
    imageAlt: "Hộp Nắp Gài Đáy Khóa (Tuck Top Box)",
    shortDesc: "Khóa đáy đan chéo chịu lực đến 1.5kg, nắp gài tiện lợi không cần dùng keo dán.",
    templateCount: "45+",
  },
  "sleeve-drawer": {
    id: "sleeve-drawer",
    categoryPill: "Trải nghiệm mở quà",
    pillColor: "text-fpt-blue ring-fpt-blue/40 bg-fpt-blue/10",
    heroImage: "/photos/kraft-drawer.jpg",
    imageAlt: "Hộp Bao Diêm (Sleeve & Drawer Box)",
    shortDesc: "Cơ chế trượt 2 mảnh êm ái, tạo ấn tượng tò mò và bất ngờ khi rút quà.",
    templateCount: "32+",
  },
  "lid-base": {
    id: "lid-base",
    categoryPill: "Cao cấp · VIP",
    pillColor: "text-brand-forest ring-brand-forest/40 bg-brand-forest/10",
    heroImage: "/photos/luxury-lid.jpg",
    imageAlt: "Hộp Âm Dương (Lid & Base Box)",
    shortDesc: "Thân và nắp độc lập ôm khít, kết cấu vuông vức bề thế chuẩn quà tặng VIP.",
    templateCount: "28+",
  },
  "pillow": {
    id: "pillow",
    categoryPill: "Gấp nhanh 3s",
    pillColor: "text-purple-700 ring-purple-300 bg-purple-50",
    heroImage: "/photos/pillow-box.jpg",
    imageAlt: "Hộp Gối (Pillow Box)",
    shortDesc: "Đường gân cong bán nguyệt tự khóa, gấp thành phẩm siêu nhanh không tốn keo.",
    templateCount: "24+",
  },
};

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

/**
 * Clean & Minimal Bento Grid Showcase for 4 Core Box Structures:
 * - Tuck Top Box (Hộp Nắp Gài Đáy Khóa)
 * - Sleeve & Drawer Box (Hộp Bao Diêm)
 * - Lid & Base Box (Hộp Âm Dương)
 * - Pillow Box (Hộp Gối)
 */
export function BoxCatalog() {
  const [previewStructure, setPreviewStructure] = useState<BoxStructureOption | null>(null);

  const openQuickPreview = (structure: BoxStructureOption) => {
    tactileAudio.playSquishyTap();
    setPreviewStructure(structure);
  };

  const closeQuickPreview = () => {
    setPreviewStructure(null);
  };

  const coreStructures = CORE_BOX_IDS.map((id) =>
    BOX_STRUCTURES.find((s) => s.id === id)
  ).filter((s): s is BoxStructureOption => Boolean(s));

  return (
    <>
      <section className="flex flex-col gap-8 overflow-x-clip pt-8 pb-12 lg:gap-10 lg:pt-12 lg:pb-16">
        <Container>
          <div id={ANCHORS.structures} className="flex scroll-mt-28 flex-col gap-6 sm:gap-8">
            {/* Section Header */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-fpt-orange-light px-3 py-1 text-label-sm font-semibold text-fpt-orange-ink ring-1 ring-inset ring-fpt-orange/30">
                  <Package className="size-3.5" aria-hidden />
                  CẤU TRÚC HỘP VẬT LÝ
                </span>
              </div>
              <SectionHeading {...STRUCTURES_SECTION} />
            </div>

            {/* 2x2 Clean Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {coreStructures.map((structure) => {
                const meta = BENTO_CARDS_DATA[structure.id];
                if (!meta) return null;
                return (
                  <BentoBoxCard
                    key={structure.id}
                    structure={structure}
                    meta={meta}
                    onQuickPreview={() => openQuickPreview(structure)}
                  />
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* Interactive 3D Quick Preview Modal */}
      <BoxQuickPreviewModal
        isOpen={Boolean(previewStructure)}
        onClose={closeQuickPreview}
        structure={previewStructure}
        initialSizeLabel="M"
      />
    </>
  );
}

/**
 * Minimalist Bento Grid Card:
 * - High-resolution packaging photography
 * - Category badge & 3D Interactive Modal trigger
 * - Single punchy description line
 * - Subtle gift tags
 * - Direct "May đo ngay" CTA
 */
function BentoBoxCard({
  structure,
  meta,
  onQuickPreview,
}: {
  structure: BoxStructureOption;
  meta: BentoStructureCardData;
  onQuickPreview: () => void;
}) {
  const studioUrl = `${ROUTES.editorNew}?structure=${structure.id}&l=${structure.defaultDims.length}&w=${structure.defaultDims.width}&d=${structure.defaultDims.height}`;
  const templatesUrl = `${ROUTES.templates}?structure=${structure.id}`;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] sm:rounded-[32px] border border-line/80 bg-white shadow-soft-8 transition-all duration-300 hover:-translate-y-1 hover:border-fpt-orange/50 hover:shadow-soft-16">
      {/* Visual Header: 100% clean photo, no dark bottom pills */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-surface-sunken">
        <Image
          src={meta.heroImage}
          alt={meta.imageAlt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Top Floating Bar */}
        <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-semibold shadow-xs ring-1 backdrop-blur-md",
              meta.pillColor
            )}
          >
            {meta.categoryPill}
          </span>

          <button
            type="button"
            onClick={onQuickPreview}
            aria-label={`Xem mô hình 3D gập ${structure.vietnameseName}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-label-sm font-medium text-fg shadow-soft-8 backdrop-blur-md ring-1 ring-line/80 transition-all hover:scale-105 hover:bg-white hover:text-fpt-orange-ink active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
          >
            <Eye className="size-3.5 text-fpt-orange" aria-hidden />
            <span>Xem 3D</span>
          </button>
        </div>
      </div>

      {/* Body Content: Minimal, breathable, zero clutter */}
      <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
        <div className="flex flex-col gap-3">
          {/* Title & English Subtitle */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-landing-heading text-xl sm:text-2xl font-bold tracking-tight text-landing-ink transition-colors group-hover:text-fpt-orange-ink">
                {structure.vietnameseName}
              </h3>
              <span className="shrink-0 text-caption font-mono uppercase tracking-wider text-fg-muted">
                {structure.name}
              </span>
            </div>
            <p className="mt-1.5 text-body-sm text-fg-muted line-clamp-1" title={meta.shortDesc}>
              {meta.shortDesc}
            </p>
          </div>

          {/* Clean Gift Tags with matching min-height */}
          <div className="flex min-h-[50px] flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-caption font-medium text-fg-muted mr-1">Phù hợp:</span>
            {structure.recommendedGifts.slice(0, 4).map((gift) => {
              const GiftIcon = giftIcon(gift);
              return (
                <span
                  key={gift}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2.5 py-0.5 text-caption font-medium text-fg ring-1 ring-inset ring-line/60"
                >
                  <GiftIcon className="size-3 text-fpt-orange-ink" aria-hidden />
                  {gift}
                </span>
              );
            })}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
          <Link
            href={templatesUrl}
            className="inline-flex items-center gap-1 text-body-sm font-semibold text-fg-muted transition-colors hover:text-fpt-orange-ink"
          >
            <span>Mẫu sẵn ({meta.templateCount})</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href={studioUrl}
            onClick={() => tactileAudio.playSquishyTap()}
            className={cn(
              buttonClass({ variant: "brand", size: "sm" }),
              "shadow-soft-8 transition-transform group-hover:scale-102"
            )}
          >
            <span>May đo ngay</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
