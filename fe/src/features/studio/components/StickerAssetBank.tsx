"use client";

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
    name: "Bé Gói Vẫy Tay Chào",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "waving",
    svgContent: "Bé Gói Vẫy Tay",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_thumbsup",
    name: "Bé Gói Thumbs Up",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "thumbs_up",
    svgContent: "Bé Gói Tuyệt Vời",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_celebration",
    name: "Bé Gói Ăn Mừng",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "celebration",
    svgContent: "Bé Gói Pháo Hoa",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_presenting",
    name: "Bé Gói Nâng Hộp Quà",
    category: "mascot",
    previewType: "mascot_pose",
    mascotPose: "presenting",
    svgContent: "Bé Gói Tặng Quà",
    defaultWidthMm: 35,
    defaultHeightMm: 35,
  },
  {
    id: "mascot_unboxing",
    name: "Bé Gói Nhảy Bật Nắp",
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
    name: "Con Dấu Sáp Đỏ 'Handmade'",
    category: "wax_seal",
    previewType: "svg",
    defaultWidthMm: 32,
    defaultHeightMm: 32,
    svgContent: "Handmade With Love",
  },
  {
    id: "wax_seal_gold",
    name: "Dấu Ép Kim Vàng 'Special Gift'",
    category: "wax_seal",
    previewType: "svg",
    defaultWidthMm: 32,
    defaultHeightMm: 32,
    svgContent: "Special Gift For You",
  },
  {
    id: "wax_seal_thankyou",
    name: "Tem Lời Cảm Ơn 'Thank You'",
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
    name: "Tem Giáng Sinh & Năm Mới",
    category: "gift_badge",
    previewType: "svg",
    defaultWidthMm: 38,
    defaultHeightMm: 38,
    svgContent: "Merry Christmas & Happy New Year",
  },
  {
    id: "badge_fragile",
    name: "Tem 'Hàng Dễ Vỡ Xin Nhẹ Tay'",
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
    name: "Mã QR Trải Nghiệm Mở Hộp 3D",
    category: "qr_barcode",
    previewType: "svg",
    defaultWidthMm: 28,
    defaultHeightMm: 28,
    svgContent: "QR 3D Unboxing",
  },
  {
    id: "barcode_ean13",
    name: "Mã Vạch Chuẩn Bán Lẻ EAN-13",
    category: "qr_barcode",
    previewType: "svg",
    defaultWidthMm: 42,
    defaultHeightMm: 22,
    svgContent: "8938501234567",
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
    <div className={`bg-white rounded-3xl border border-stone-200 shadow-tactile p-4 space-y-3.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-amber-100 text-amber-900">
            <Gift className="w-4 h-4 text-brand-gold" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-900">
              Ngân Hàng Sticker & Tem Quà Tặng
            </h3>
            <span className="text-[10px] text-stone-400">
              Nhấn 1-click để chèn vào mặt hộp đang chọn
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
        {[
          { id: "all", label: "Tất Cả" },
          { id: "mascot", label: "Bé Gói" },
          { id: "wax_seal", label: "Con Dấu Sáp" },
          { id: "gift_badge", label: "Tem Dịp Lễ" },
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
                ? "bg-brand-forest text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
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
            className="p-3 rounded-2xl border border-stone-200 hover:border-brand-forest hover:bg-stone-50/80 transition flex flex-col items-center justify-between text-center gap-2 group bg-white shadow-xs"
          >
            {/* Visual Thumbnail */}
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-stone-50 border border-stone-100 group-hover:scale-105 transition-transform overflow-hidden">
              {item.category === "mascot" && item.mascotPose ? (
                <GoiMascot pose={item.mascotPose} size={48} />
              ) : item.category === "wax_seal" ? (
                <div className="w-10 h-10 rounded-full bg-red-700 text-amber-200 flex items-center justify-center font-landing-heading text-[8px] font-bold text-center border-2 border-amber-300 shadow-sm leading-tight p-0.5">
                  WAX SEAL
                </div>
              ) : item.category === "qr_barcode" ? (
                item.id.includes("qr") ? (
                  <QrCode className="w-8 h-8 text-stone-900" />
                ) : (
                  <div className="font-mono text-[9px] font-bold text-stone-700 tracking-tighter">
                    |||||||||||||||||
                  </div>
                )
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-center p-1 text-[8px] font-bold text-center leading-none">
                  {item.svgContent.slice(0, 14)}
                </div>
              )}
            </div>

            {/* Sticker Info */}
            <div className="space-y-0.5 w-full">
              <span className="text-[11px] font-semibold text-stone-800 line-clamp-1 block group-hover:text-brand-forest">
                {item.name}
              </span>
              <span className="text-[9px] font-mono text-stone-400 block">
                {item.defaultWidthMm} × {item.defaultHeightMm} mm
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
