"use client";

import { ArrowRight, Bookmark, Eye, Plus, Ruler, Wand2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { BOX_STRUCTURES, type BoxStructureOption } from "@/features/studio/utils/boxStructures";
import { ROUTES } from "@/constants";
import { PHOTOS } from "@/features/site/photos";
import { Container } from "@/components/landing";
import { BoxQuickPreviewModal } from "./BoxQuickPreviewModal";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";

export interface AlmanacProduct {
  id: string;
  structureId: "tuck-top" | "sleeve-drawer" | "lid-base" | "pillow";
  title: string;
  subtitle: string;
  description: string;
  publishedMeta: string;
  tag: string;
  dims: { length: number; width: number; height: number; paperThickness: number };
  paper: string;
  foldDifficulty: string;
  foldTimeSec: number;
  image: string;
  alt: string;
}

export const ALMANAC_PRODUCTS: AlmanacProduct[] = [
  {
    id: "almanac-tuck-top",
    structureId: "tuck-top",
    title: "Hộp nắp gài đáy khóa",
    subtitle: "Mỹ phẩm, nến thơm",
    description: "Một mảnh giấy, đáy khóa chịu lực cho hũ thủy tinh.",
    publishedMeta: "Mỹ phẩm, nến thơm · Ivory 300 GSM",
    tag: "nắp gài",
    dims: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
    paper: "Ivory 300–350 GSM",
    foldDifficulty: "Dễ",
    foldTimeSec: 3,
    image: PHOTOS.kraftTuck.src,
    alt: PHOTOS.kraftTuck.alt,
  },
  {
    id: "almanac-sleeve-drawer",
    structureId: "sleeve-drawer",
    title: "Hộp bao diêm",
    subtitle: "Tinh dầu, phụ kiện",
    description: "Vỏ ngoài trượt, khay rút bên trong tạo bất ngờ khi mở.",
    publishedMeta: "Tinh dầu, phụ kiện · Duplex 350 GSM",
    tag: "bao diêm",
    dims: { length: 140, width: 90, height: 45, paperThickness: 0.4 },
    paper: "Duplex 350 GSM",
    foldDifficulty: "Trung bình",
    foldTimeSec: 8,
    image: PHOTOS.kraftDrawer.src,
    alt: PHOTOS.kraftDrawer.alt,
  },
  {
    id: "almanac-chocolate-tray",
    structureId: "sleeve-drawer",
    title: "Hộp socola khay chia ngăn",
    subtitle: "Bánh kẹo thủ công",
    description: "Khay kraft chia ngăn giữ trọn hình dáng từng viên.",
    publishedMeta: "Bánh kẹo thủ công · Kraft 300 GSM",
    tag: "khay chia ngăn",
    dims: { length: 150, width: 150, height: 35, paperThickness: 0.42 },
    paper: "Kraft 300 GSM",
    foldDifficulty: "Trung bình",
    foldTimeSec: 6,
    image: PHOTOS.chocolate.src,
    alt: PHOTOS.chocolate.alt,
  },
  {
    id: "almanac-lid-base",
    structureId: "lid-base",
    title: "Hộp âm dương",
    subtitle: "Quà Tết, đồng hồ",
    description: "Nắp và đáy rời chụp khít, vuông vức và sang trọng.",
    publishedMeta: "Quà Tết, đồng hồ · Carton bồi giấy",
    tag: "âm dương",
    dims: { length: 180, width: 180, height: 70, paperThickness: 0.48 },
    paper: "Carton bồi giấy mỹ thuật",
    foldDifficulty: "Cao cấp",
    foldTimeSec: 12,
    image: PHOTOS.luxuryLid.src,
    alt: PHOTOS.luxuryLid.alt,
  },
  {
    id: "almanac-pillow",
    structureId: "pillow",
    title: "Hộp gối",
    subtitle: "Trang sức, khăn lụa",
    description: "Hai đầu cong tự khóa, không cần keo, gấp trong 3 giây.",
    publishedMeta: "Trang sức, khăn lụa · Kraft 250 GSM",
    tag: "hộp gối",
    dims: { length: 160, width: 110, height: 35, paperThickness: 0.35 },
    paper: "Kraft 250–300 GSM",
    foldDifficulty: "Dễ",
    foldTimeSec: 3,
    image: PHOTOS.pillowBox.src,
    alt: PHOTOS.pillowBox.alt,
  },
];

/**
 * Cards Almanac Section:
 * A premium sticky card-stack where big dispatch cards pin to the screen and pile up as you scroll,
 * inspired by getlayers.ai Cards Almanac with WrapFit packaging intelligence.
 */
export function CardsAlmanacSection() {
  const [previewStructure, setPreviewStructure] = useState<BoxStructureOption | null>(null);

  const openQuickPreview = (structureId: string) => {
    const structure = BOX_STRUCTURES.find((s) => s.id === structureId) ?? BOX_STRUCTURES[0];
    setPreviewStructure(structure);
  };

  const closeQuickPreview = () => {
    setPreviewStructure(null);
  };

  return (
    <>
      <section className="relative overflow-visible py-8 lg:py-14" aria-label="Bộ sưu tập mẫu hộp">
        <Container>
          {/* Section Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line/70 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block size-2 rounded-full bg-landing-ink" />
                <span className="font-mono text-xs uppercase tracking-widest text-fg-muted font-semibold">
                  Bộ sưu tập
                </span>
              </div>
              <h2 className="font-landing-heading text-3xl font-bold tracking-tight text-landing-ink lg:text-4xl">
                Năm mẫu hộp tiêu biểu
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm sm:text-base text-fg-muted">
                May đo theo món quà, xem 3D trước khi in.
              </p>
            </div>
          </div>

          {/* Sticky Card-Stack Almanac Deck */}
          <div className="relative flex flex-col gap-6 pb-12">
            {ALMANAC_PRODUCTS.map((item, index) => (
              <div
                key={item.id}
                className="sticky transition-all duration-300"
                style={{
                  top: `calc(4.75rem + ${index * 16}px)`,
                  zIndex: index + 10,
                }}
              >
                <AlmanacCard
                  item={item}
                  index={index}
                  total={ALMANAC_PRODUCTS.length}
                  onQuickPreview={() => openQuickPreview(item.structureId)}
                />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 3D Quick Preview Modal */}
      <BoxQuickPreviewModal
        isOpen={Boolean(previewStructure)}
        onClose={closeQuickPreview}
        structure={previewStructure}
      />
    </>
  );
}

/**
 * Single Almanac Card:
 * Replicating the exact getlayers.ai Cards Almanac format:
 * - Left: Large rounded squircle cover photo with subtle zoom
 * - Right: Metadata date line + bold headline + clean body + CAD specs + tag pill + signature round black "+" button
 */
function AlmanacCard({
  item,
  index,
  total,
  onQuickPreview,
}: {
  item: AlmanacProduct;
  index: number;
  total: number;
  onQuickPreview: () => void;
}) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const toggleActions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    tactileAudio.playSquishyTap();
    setIsActionsOpen(!isActionsOpen);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    tactileAudio.playSquishyTap();
    setBookmarked(!bookmarked);
  };

  const studioUrl = `${ROUTES.editorNew}?structure=${item.structureId}&l=${item.dims.length}&w=${item.dims.width}&d=${item.dims.height}`;
  const templatesUrl = `${ROUTES.templates}?structure=${item.structureId}`;

  return (
    <article className="group relative overflow-hidden rounded-sheet sm:rounded-stitch-30 border border-line/90 bg-white p-3.5 sm:p-5 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.07)] transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-6 lg:gap-8">
        {/* Cover Photo (Left) */}
        <div className="relative aspect-[4/3] w-full sm:w-[42%] lg:w-[40%] shrink-0 overflow-hidden rounded-2xl bg-surface-sunken">
          <img
            src={item.image}
            alt={item.alt}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Quick 3D Peek Badge on Image */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/40 bg-fg/60 px-2.5 py-1 text-caption font-medium text-white backdrop-blur-md">
            <span className="size-2 rounded-full bg-fpt-green animate-pulse" />
            <span>Đạt FitCheck™</span>
          </div>

          {/* Hover Button on Photo */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onQuickPreview();
            }}
            className="absolute inset-0 flex items-center justify-center bg-fg/20 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
            aria-label="Xem trước 3D hộp"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-fg shadow-lg hover:scale-105 transition-transform">
              <Eye className="size-3.5 text-landing-indigo" />
              <span>Xem 3D</span>
            </span>
          </button>
        </div>

        {/* Content & Editorial Details (Right) */}
        <div className="flex flex-1 flex-col justify-between py-1">
          <div>
            {/* Top Metadata Line */}
            <div className="flex items-center justify-between text-fg-muted">
              <span className="font-mono text-cad-spec-micro uppercase tracking-wider font-medium text-fg-muted">
                {item.publishedMeta}
              </span>
              <span className="font-mono text-cad-spec-micro text-fg-muted">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            {/* Headline Title */}
            <h3 className="mt-2 font-landing-heading text-xl sm:text-2xl font-bold tracking-tight text-fg leading-snug">
              {item.title}
            </h3>

            {/* Description */}
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-fg-muted">
              {item.description}
            </p>

            {/* CAD Specs Readout Bar */}
            <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-line/60 bg-surface-sunken/70 p-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-1.5 truncate">
                <Ruler className="size-3.5 text-fg-muted shrink-0" />
                <span className="font-mono font-medium text-fg">
                  {item.dims.length} × {item.dims.width} × {item.dims.height} mm
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-fg-muted truncate sm:justify-end sm:text-right">
                <span className="text-fg-muted">Giấy:</span>
                <span className="font-medium text-fg truncate">{item.paper}</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Tag Pill (Left) and Round Black "+" Button (Right) */}
          <div className="relative mt-4 flex items-center justify-between border-t border-line/60 pt-3">
            {/* Tag Pill (matching 'radial' tag in getlayers.ai screenshot) */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-surface-sunken px-3 py-1 font-mono text-cad-spec-micro font-semibold text-fg-muted">
                {item.tag}
              </span>
              <span className="hidden sm:inline-block text-caption text-fg-muted">
                Gập {item.foldTimeSec} giây · {item.foldDifficulty}
              </span>
            </div>

            {/* Signature Round Black "+" Button */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleActions}
                aria-expanded={isActionsOpen}
                aria-label={isActionsOpen ? "Đóng tùy chọn" : "Mở tùy chọn"}
                className={cn(
                  "inline-flex size-9 sm:size-10 items-center justify-center rounded-full text-white shadow-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange active:scale-95",
                  isActionsOpen
                    ? "bg-fg rotate-45"
                    : "bg-fg hover:bg-fpt-orange hover:text-white"
                )}
              >
                <Plus className="size-5 transition-transform" />
              </button>

              {/* Multitasking Popover Menu (Expands from "+" button) */}
              {isActionsOpen && (
                <div className="absolute right-0 bottom-12 z-30 flex w-56 flex-col gap-1 rounded-2xl border border-line bg-white p-2 text-xs shadow-xl animate-pop-in">
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsOpen(false);
                      onQuickPreview();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl p-2 text-left font-medium text-fg transition hover:bg-surface-sunken"
                  >
                    <Eye className="size-4 text-landing-indigo" />
                    <span>Xem 3D nhanh</span>
                  </button>
                  <Link
                    href={studioUrl}
                    onClick={() => setIsActionsOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl bg-fpt-orange/20 p-2 font-bold text-fg transition hover:bg-fpt-orange"
                  >
                    <Wand2 className="size-4 text-fpt-orange-ink" />
                    <span>Tùy biến trong Studio</span>
                  </Link>
                  <Link
                    href={templatesUrl}
                    onClick={() => setIsActionsOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl p-2 text-fg-muted transition hover:bg-surface-sunken"
                  >
                    <ArrowRight className="size-4 text-fg-muted" />
                    <span>Xem các mẫu tương tự</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleBookmark(e);
                      setIsActionsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl p-2 text-fg-muted transition hover:bg-surface-sunken"
                  >
                    <Bookmark className={cn("size-4 text-warning", bookmarked && "fill-warning")} />
                    <span>{bookmarked ? "Đã lưu vào bộ sưu tập" : "Lưu mẫu vào yêu thích"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
