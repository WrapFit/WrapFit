"use client";

import { ArrowRight, Bookmark, Box, Check, CheckCircle2, Eye, Layers, Maximize2, Plus, Ruler, Sparkles, Wand2, X } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { BOX_STRUCTURES, type BoxStructureOption } from "@/features/studio/utils/boxStructures";
import { ROUTES } from "@/constants";
import { Container, SectionHeading } from "@/components/landing";
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
    title: "Hộp Nắp Gài Đáy Khóa · Mỹ Phẩm & Nến Thơm",
    subtitle: "Mẫu hộp bán lẻ & quà tặng quốc dân",
    description:
      "Cấu trúc một mảnh tích hợp nắp gài trên và khóa đáy đan chéo chịu lực cao cho hũ thuỷ tinh nặng. Tự động tính toán dung sai an toàn 3mm, tiết kiệm keo dán, sản xuất siêu tốc.",
    publishedMeta: "TIÊU CHUẨN ECMA · FEFCO 0215 · 300 GSM",
    tag: "tuck-top",
    dims: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
    paper: "Ivory 300–350 GSM cán mờ",
    foldDifficulty: "Dễ",
    foldTimeSec: 3,
    image: "/stitch/img/8f3cf51318eaf072.jpg",
    alt: "Hộp nắp gài giấy kraft và ivory WrapFit",
  },
  {
    id: "almanac-sleeve-drawer",
    structureId: "sleeve-drawer",
    title: "Hộp Bao Diêm Khay Rút · Tinh Dầu & Phụ Kiện",
    subtitle: "Trải nghiệm mở quà trượt tinh tế",
    description:
      "Gồm bao vỏ ngoài trượt kết hợp khay kéo bên trong có dải ruy băng lụa. Tạo cảm giác tò mò và bất ngờ khi người nhận từ từ rút món quà ra khỏi vỏ bọc. Khay chia ngăn chống va đập.",
    publishedMeta: "THIẾT KẾ KHAY KÉO · DUPLEX CÁN MỜ",
    tag: "sleeve-drawer",
    dims: { length: 140, width: 90, height: 45, paperThickness: 0.4 },
    paper: "Duplex 350 GSM hoặc Carton lạnh",
    foldDifficulty: "Trung bình",
    foldTimeSec: 8,
    image: "/stitch/img/f958a0d1ac6f013b.jpg",
    alt: "Hộp khay rút bao diêm WrapFit màu vàng",
  },
  {
    id: "almanac-chocolate-tray",
    structureId: "sleeve-drawer",
    title: "Hộp Socola Khay Mộc · Artisan Confectionery",
    subtitle: "Bao bì mộc mạc lưu giữ hương thơm bánh ngọt",
    description:
      "Thiết kế khay ngăn định hình bằng chất liệu giấy Kraft tự nhiên chuẩn an toàn thực phẩm. Khóa trượt khít giữ trọn hình dáng bánh và mùi hương của socola nghệ nhân.",
    publishedMeta: "FOOD SAFE CERTIFIED · KRAFT MỘC 100%",
    tag: "artisan-kraft",
    dims: { length: 150, width: 150, height: 35, paperThickness: 0.42 },
    paper: "Kraft Linen 300 GSM chuẩn thực phẩm",
    foldDifficulty: "Trung bình",
    foldTimeSec: 6,
    image: "/stitch/img/3729dc5394915422.jpg",
    alt: "Hộp socola khay rút kraft A la Maison",
  },
  {
    id: "almanac-lid-base",
    structureId: "lid-base",
    title: "Hộp Âm Dương Nắp Rời · Quà Tết & Đồng Hồ VIP",
    subtitle: "Đẳng cấp quà tặng cao cấp & VIP",
    description:
      "Hai cấu trúc âm dương độc lập chụp khít vào nhau tạo ấn tượng bề thế, vững chãi bậc nhất. Kết cấu carton lạnh vuông vức tuyệt đối, ép kim vàng Champagne sang trọng.",
    publishedMeta: "KẾT CẤU 2 MẢNH ĐỘC LẬP · ÉP KIM GOLD",
    tag: "lid-base",
    dims: { length: 180, width: 180, height: 70, paperThickness: 0.48 },
    paper: "Carton lạnh bồi giấy mỹ thuật ép kim",
    foldDifficulty: "Cao cấp",
    foldTimeSec: 12,
    image: "/stitch/img/0d6ad47bfba44c5b.jpg",
    alt: "Hộp nắp rời âm dương xanh rêu ép kim WrapFit",
  },
  {
    id: "almanac-pillow",
    structureId: "pillow",
    title: "Hộp Gối Cánh Cung · Khăn Lụa & Trang Sức",
    subtitle: "Đường cong mềm mại, đóng gói siêu tốc 3 giây",
    description:
      "Hình dáng chiếc gối duyên dáng uốn lượn hai đầu bán nguyệt tự khóa. Không cần dùng keo dán phức tạp, gấp lại trong 3 giây. Hoàn hảo cho quà cưới, khăn lụa tơ tằm và phụ kiện.",
    publishedMeta: "ZERO-GLUE CURVED · GẬP TRONG 3 GIÂY",
    tag: "pillow-curve",
    dims: { length: 160, width: 110, height: 35, paperThickness: 0.35 },
    paper: "Kraft mộc 250 – 300 GSM dẻo dai",
    foldDifficulty: "Dễ",
    foldTimeSec: 3,
    image: "/stitch/img/1a2b00bef63aaaf6.jpg",
    alt: "Hộp gối cánh cung giấy kraft in logo WrapFit",
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
      <section className="relative overflow-visible py-8 lg:py-14" aria-label="Bộ sưu tập bao bì Cards Almanac">
        <Container>
          {/* Section Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/70 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block size-2 rounded-full bg-landing-ink" />
                <span className="font-mono text-xs uppercase tracking-widest text-stone-500 font-semibold">
                  WRAPFIT SHOWCASE · STICKY CARDS ALMANAC
                </span>
              </div>
              <h2 className="font-landing-heading text-3xl font-bold tracking-tight text-landing-ink lg:text-4xl">
                Bộ Sưu Tập Bao Bì Chuẩn Bế
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm sm:text-base text-stone-600">
                Mỗi hộp quà đều được may đo chính xác theo milimét món quà của bạn, tích hợp công nghệ xem trước 3D và bảo đảm 100% khả thi in ấn.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full border border-stone-200 bg-white/80 px-3 py-1 font-mono text-xs text-stone-600 backdrop-blur-md">
                5 Dòng Hộp Tiêu Biểu
              </span>
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
    <article className="group relative overflow-hidden rounded-[26px] sm:rounded-[30px] border border-stone-200/90 bg-white p-3.5 sm:p-5 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.07)] transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-6 lg:gap-8">
        {/* Cover Photo (Left) */}
        <div className="relative aspect-[4/3] sm:aspect-square w-full sm:w-[42%] lg:w-[44%] shrink-0 overflow-hidden rounded-2xl bg-stone-100">
          <img
            src={item.image}
            alt={item.alt}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Quick 3D Peek Badge on Image */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/40 bg-stone-900/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            <span className="size-2 rounded-full bg-[#6DB33F] animate-pulse" />
            <span>FitCheck™ 100/100</span>
          </div>

          {/* Hover Button on Photo */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onQuickPreview();
            }}
            className="absolute inset-0 flex items-center justify-center bg-stone-950/20 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
            aria-label="Xem trước 3D hộp"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-stone-900 shadow-lg hover:scale-105 transition-transform">
              <Eye className="size-3.5 text-landing-indigo" />
              <span>Xoay 3D & Xem Gập</span>
            </span>
          </button>
        </div>

        {/* Content & Editorial Details (Right) */}
        <div className="flex flex-1 flex-col justify-between py-1">
          <div>
            {/* Top Metadata Line */}
            <div className="flex items-center justify-between text-stone-400">
              <span className="font-mono text-[11px] uppercase tracking-wider font-medium text-stone-500">
                {item.publishedMeta}
              </span>
              <span className="font-mono text-[11px] text-stone-400">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            {/* Headline Title */}
            <h3 className="mt-2 font-landing-heading text-xl sm:text-2xl font-bold tracking-tight text-stone-900 leading-snug">
              {item.title}
            </h3>

            {/* Description */}
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-600 line-clamp-3">
              {item.description}
            </p>

            {/* CAD Specs Readout Bar */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl border border-stone-100 bg-stone-50/70 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <Ruler className="size-3.5 text-stone-400 shrink-0" />
                <span className="font-mono font-medium text-stone-800">
                  {item.dims.length} × {item.dims.width} × {item.dims.height} mm
                </span>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-right text-stone-600 truncate">
                <span className="text-stone-400">Giấy:</span>
                <span className="font-medium text-stone-800 truncate">{item.paper.split(" ")[0]}</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Tag Pill (Left) and Round Black "+" Button (Right) */}
          <div className="relative mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
            {/* Tag Pill (matching 'radial' tag in getlayers.ai screenshot) */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 font-mono text-[11px] font-semibold text-stone-700">
                {item.tag}
              </span>
              <span className="hidden sm:inline-block text-[11px] text-stone-400">
                ⚡ Gập {item.foldTimeSec}s ({item.foldDifficulty})
              </span>
            </div>

            {/* Signature Round Black "+" Button */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleActions}
                aria-expanded={isActionsOpen}
                aria-label={isActionsOpen ? "Đóng tùy chọn" : "Mở menu thao tác đa nhiệm"}
                className={cn(
                  "inline-flex size-9 sm:size-10 items-center justify-center rounded-full text-white shadow-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-landing-lime active:scale-95",
                  isActionsOpen
                    ? "bg-stone-900 rotate-45"
                    : "bg-stone-900 hover:bg-[#F26522] hover:text-white"
                )}
              >
                <Plus className="size-5 transition-transform" />
              </button>

              {/* Multitasking Popover Menu (Expands from "+" button) */}
              {isActionsOpen && (
                <div className="absolute right-0 bottom-12 z-30 flex w-56 flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-2 text-xs shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsOpen(false);
                      onQuickPreview();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl p-2 text-left font-medium text-stone-800 transition hover:bg-stone-100"
                  >
                    <Eye className="size-4 text-landing-indigo" />
                    <span>Xem 3D Nhanh (Xoay 360°)</span>
                  </button>
                  <Link
                    href={studioUrl}
                    onClick={() => setIsActionsOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl bg-landing-lime/20 p-2 font-bold text-stone-950 transition hover:bg-landing-lime"
                  >
                    <Wand2 className="size-4 text-emerald-800" />
                    <span>Tùy biến trong Studio</span>
                  </Link>
                  <Link
                    href={templatesUrl}
                    onClick={() => setIsActionsOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl p-2 text-stone-600 transition hover:bg-stone-100"
                  >
                    <ArrowRight className="size-4 text-stone-400" />
                    <span>Xem các mẫu tương tự</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleBookmark(e);
                      setIsActionsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl p-2 text-stone-600 transition hover:bg-stone-100"
                  >
                    <Bookmark className={cn("size-4 text-amber-500", bookmarked && "fill-amber-500")} />
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
