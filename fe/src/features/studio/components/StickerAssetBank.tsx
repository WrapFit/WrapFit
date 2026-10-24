"use client";
/* ds-artwork: sticker artwork thumbnails, printed at their own size. Raw colours and sizes here are allowed (docs/15_DESIGN_SYSTEM.md §2). */

import React, { useState } from "react";
import { Sparkles, QrCode, Tag, Award, Heart, Check, X, ShieldAlert, Gift } from "lucide-react";
import { CanvasElement } from "@wrapfit/shared";

import { GoiMascot, MascotPose } from "@/components/common/GoiMascot";

export interface StickerAssetItem {
  id: string;
  name: string;
  category: "mascot" | "wax_seal" | "gift_badge" | "qr_barcode";
  svgContent: string;
  previewType?: "mascot_pose" | "svg";
  mascotPose?: MascotPose;
  defaultWidthMm: number;
  defaultHeightMm: number;
}

export const STICKER_BANK_ITEMS: StickerAssetItem[] = [
  // 1. MASCOT BÉ GÓI POSES
  {
    id: "mascot_waving",
    name: "Bé Gói vẫy tay chào",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "waving",
    svgContent: "Bé Gói Vẫy Tay",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_thumbsup",
    name: "Bé Gói thumbs up",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "thumbs_up",
    svgContent: "Bé Gói Tuyệt Vời",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_celebration",
    name: "Bé Gói ăn mừng",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "celebration",
    svgContent: "Bé Gói Pháo Hoa",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_presenting",
    name: "Bé Gói nâng hộp quà",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "presenting",
    svgContent: "Bé Gói Tặng Quà",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_unboxing",
    name: "Bé Gói nhảy bật nắp",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "unboxing_pop",
    svgContent: "Bé Gói Mở Hộp",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },

  // 2. LUXURY WAX SEALS (CON DẤU SÁP & TEM HOÀNG GIA)
  {
    id: "wax_seal_handmade",
    name: "Con dấu sáp đỏ 'handmade'",
    category: "wax_seal",
    previewType: "svg",
    defaultWidthMm: 32,
    defaultHeightMm: 32,
    svgContent: "Handmade With Love",
  },
  {
    id: "wax_seal_gold",
    name: "Dấu ép kim vàng 'special gift'",
    category: "wax_seal",
    previewType: "svg",
    defaultWidthMm: 32,
    defaultHeightMm: 32,
    svgContent: "Special Gift For You",
  },
  {
    id: "wax_seal_thankyou",
    name: "Tem lời cảm ơn 'thank you'",
    category: "wax_seal",
    previewType: "svg",
    defaultWidthMm: 32,
    defaultHeightMm: 32,
    svgContent: "Thank You So Much",
  },

  // 3. GIFT BADGES & OCCASION TEMPLATES (TEM DỊP LỄ)
  {
    id: "badge_tet_2026",
    name: "Tem Tết Bính Ngọ 2026",
    category: "gift_badge",
    previewType: "svg",
    defaultWidthMm: 38,
    defaultHeightMm: 38,
    svgContent: "Tết Bính Ngọ 2026 — Vạn Sự Như Ý",
  },
  {
    id: "badge_xmas",
    name: "Tem Giáng Sinh & năm mới",
    category: "gift_badge",
    previewType: "svg",
    defaultWidthMm: 38,
    defaultHeightMm: 38,
    svgContent: "Merry Christmas & Happy New Year",
  },
  {
    id: "badge_fragile",
    name: "Tem 'hàng dễ vỡ xin nhẹ tay'",
    category: "gift_badge",
    previewType: "svg",
    defaultWidthMm: 40,
    defaultHeightMm: 24,
    svgContent: "FRAGILE • HÀNG DỄ VỠ",
  },
  {
    id: "badge_eco_organic",
    name: "Tem '100% Eco & Organic'",
    category: "gift_badge",
    previewType: "svg",
    defaultWidthMm: 36,
    defaultHeightMm: 24,
    svgContent: "100% Organic & Recyclable Paper",
  },

  // 4. QR CODES & BARCODES (MÃ QR MỞ QUÀ VÀ MÃ VẠCH)
  {
    id: "qr_unbox_experience",
    name: "Mã QR trải nghiệm mở hộp 3D",
    category: "qr_barcode",
    previewType: "svg",
    defaultWidthMm: 28,
    defaultHeightMm: 28,
    svgContent: "QR 3D Unboxing",
  },
  {
    id: "barcode_ean13",
    name: "Mã vạch chuẩn bán lẻ EAN-13",
    category: "qr_barcode",
    previewType: "svg",
    defaultWidthMm: 42,
    defaultHeightMm: 22,
    svgContent: "8938501234568", // valid EAN-13 check digit
  },
];

interface StickerAssetBankProps {
  activePanelId: string;
  onAddElement: (element: CanvasElement) => void;
  onClose?: () => void;
  className?: string;
}

export const StickerAssetBank: React.FC<StickerAssetBankProps> = ({
  activePanelId,
  onAddElement,
  onClose,
  className = "",
}) => {
  const [activeCategory, setActiveCategory] = useState<"all" | "mascot" | "wax_seal" | "gift_badge" | "qr_barcode">("all");

  const filteredItems = STICKER_BANK_ITEMS.filter(
    (item) => activeCategory === "all" || item.category === activeCategory
  );

  const handleApplySticker = (item: StickerAssetItem) => {
    

    const newElement: CanvasElement = {
      id: `sticker_${Date.now()}`,
      type: item.category === "qr_barcode" ? "barcode" : "logo",
      panelId: activePanelId || "panel_front",
      x: 12,
      y: 12,
      width: item.defaultWidthMm,
      height: item.defaultHeightMm,
      rotation: 0,
      content: item.svgContent,
      dpi: 300,
    };

    onAddElement(newElement);
  };

  return (
    <div className={`bg-white rounded-sheet p-4 space-y-3.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-landing-line pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-amber-100 text-amber-900">
            <Gift className="w-4 h-4 text-landing-green" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-landing-ink">
              Ngân hàng sticker & tem quà tặng
            </h3>
            <span className="text-caption text-landing-muted">
              Nhấn 1-click để chèn vào mặt hộp đang chọn
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-landing-muted hover:text-landing-ink rounded-full hover:bg-landing-canvas transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-caption">
        {[
          { id: "all", label: "Tất Cả" },
          { id: "mascot", label: "Bé Gói" },
          { id: "wax_seal", label: "Con dấu sáp" },
          { id: "gift_badge", label: "Tem dịp lễ" },
          { id: "qr_barcode", label: "QR & Mã Vạch" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              
              setActiveCategory(tab.id as any);
            }}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition font-medium ${
              activeCategory === tab.id
                ? "bg-landing-green-night text-white shadow-sm"
                : "bg-landing-canvas text-landing-muted hover:bg-landing-tile"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sticker Item Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleApplySticker(item)}
            className="p-3 rounded-3xl border border-landing-line hover:border-landing-ink hover:bg-landing-canvas transition flex flex-col items-center justify-between text-center gap-2 group bg-white shadow-xs"
          >
            {/* Visual Thumbnail */}
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-landing-canvas border border-landing-line group-hover:scale-105 transition-transform overflow-hidden">
              {item.category === "mascot" && item.mascotPose ? (
                <GoiMascot pose={item.mascotPose} size={48} interactive={false} enableTracking={false} />
              ) : item.category === "wax_seal" ? (
                <div className="w-10 h-10 rounded-full bg-red-700 text-amber-200 flex items-center justify-center font-landing-heading text-cad-spec-micro font-bold text-center border-2 border-amber-300 shadow-sm leading-tight p-0.5">
                  WAX SEAL
                </div>
              ) : item.category === "qr_barcode" ? (
                item.id.includes("qr") ? (
                  <QrCode className="w-8 h-8 text-landing-ink" />
                ) : (
                  <div className="font-mono text-cad-spec-micro font-bold text-landing-ink tracking-tighter">
                    |||||||||||||||||
                  </div>
                )
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-center p-1 text-cad-spec-micro font-bold text-center leading-none">
                  {item.svgContent.slice(0, 14)}
                </div>
              )}
            </div>

            {/* Sticker Info */}
            <div className="space-y-0.5 w-full">
              <span className="text-caption font-semibold text-landing-ink line-clamp-1 block group-hover:text-landing-ink">
                {item.name}
              </span>
              <span className="text-cad-spec-micro font-mono text-landing-muted block">
                {item.defaultWidthMm} × {item.defaultHeightMm} mm
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
