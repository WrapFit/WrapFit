"use client";

import React from "react";
import { Check, Sparkles, RefreshCw } from "lucide-react";

import { BoxMaterialTheme } from "@/features/studio/components/three/InteractiveFoldingBox3D";

export interface ColorPaletteFrame {
  id: string;
  name: string;
  desc: string;
  theme: BoxMaterialTheme;
  colors: [string, string, string, string, string]; // 5 harmonious colors from Image 2
}

export const CURATED_COLOR_FRAMES: ColorPaletteFrame[] = [
  {
    id: "earthy_olive",
    name: "Earthy Olive & Sage",
    desc: "Thảo mộc, gốm sứ, nến thơm tự nhiên",
    theme: "forest",
    colors: ["#F4F6F0", "#E2E8D5", "#A3B18A", "#588157", "#344E41"],
  },
  {
    id: "emerald_spruce",
    name: "Emerald Mint & Spruce",
    desc: "Tươi mát, thanh lọc, trang sức ngọc",
    theme: "forest",
    colors: ["#E8F5E9", "#A5D6A7", "#4CAF50", "#2E7D32", "#1B5E20"],
  },
  {
    id: "coral_terracotta",
    name: "Coral Terracotta & Rose",
    desc: "Ấm áp, son môi, mỹ phẩm hữu cơ",
    theme: "ivory",
    colors: ["#FDF2F0", "#FECDD3", "#F87171", "#DC2626", "#881337"],
  },
  {
    id: "ocean_cobalt",
    name: "Ocean Cobalt & Azure",
    desc: "Công nghệ, nước hoa unisex hiện đại",
    theme: "ivory",
    colors: ["#EFF6FF", "#BFDBFE", "#3B82F6", "#1D4ED8", "#172554"],
  },
  {
    id: "slate_monochrome",
    name: "Slate Modern Monochrome",
    desc: "Tối giản Bắc Âu, đồng hồ, phụ kiện da",
    theme: "ivory",
    colors: ["#F8FAFC", "#E2E8F0", "#94A3B8", "#475569", "#0F172A"],
  },
  {
    id: "kraft_amber",
    name: "Warm Kraft & Amber Gold",
    desc: "Thủ công mộc mạc, trà ngon, bánh mứt",
    theme: "kraft",
    colors: ["#FFFBEB", "#FDE68A", "#D4AF37", "#B45309", "#78350F"],
  },
  {
    id: "cyber_citron",
    name: "Citron Glow & Deep Forest",
    desc: "Năng động, bứt phá, quà Tết 2026",
    theme: "gold_foil",
    colors: ["#F7FEE7", "#D9F99D", "#84CC16", "#1A362B", "#052E16"],
  },
  {
    id: "orchid_berry",
    name: "Royal Orchid & Berry",
    desc: "Quyến rũ, socola thủ công, rượu vang",
    theme: "gold_foil",
    colors: ["#FDF4FF", "#F5D0FE", "#D946EF", "#9333EA", "#3B0764"],
  },
];

interface ColorPaletteSelectorProps {
  selectedPaletteId: string;
  onSelectPalette: (palette: ColorPaletteFrame) => void;
  className?: string;
}

export const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = ({
  selectedPaletteId,
  onSelectPalette,
  className = "",
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-landing-heading text-base font-bold text-landing-ink">Bảng màu</span>
        </div>
        <button
          type="button"
          onClick={() => {
            
            const randomIndex = Math.floor(Math.random() * CURATED_COLOR_FRAMES.length);
            onSelectPalette(CURATED_COLOR_FRAMES[randomIndex]);
          }}
          className="text-landing-muted hover:text-landing-ink transition p-1"
          title="Ngẫu nhiên bảng màu"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Color Bars matching Image 2 */}
      <div className="grid grid-cols-2 gap-2.5">
        {CURATED_COLOR_FRAMES.map((palette) => {
          const isSelected = selectedPaletteId === palette.id;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => {
                
                onSelectPalette(palette);
              }}
              className={`group p-2 rounded-3xl border text-left transition flex flex-col gap-1.5 ${
                isSelected
                  ? "border-landing-green bg-landing-lime-mist/40 ring-2 ring-landing-green/20 shadow-sm"
                  : "border-landing-line hover:border-landing-ink/30 hover:bg-landing-canvas"
              }`}
            >
              {/* 5-Color Horizontal Pill Swatch (Exact replica of Image 2) */}
              <div className="flex h-5 w-full rounded-full overflow-hidden border border-black/10 shadow-inner">
                {palette.colors.map((c, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full transition-transform group-hover:scale-105"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              {/* Title & Tag */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-semibold text-landing-ink line-clamp-1">
                  {palette.name}
                </span>
                {isSelected && <Check className="w-3 h-3 text-landing-green shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
