"use client";

import React from "react";
import { Check, RefreshCw } from "lucide-react";


export interface FontPresetCard {
  id: string;
  name: string;
  subtitle: string;
  fontFamilyHeading: string;
  fontFamilyBody: string;
  sampleText: string;
}

export const CURATED_FONT_PRESETS: FontPresetCard[] = [
  {
    id: "big_shoulders",
    name: "Big Shoulders Display",
    subtitle: "Inter",
    fontFamilyHeading: "'Big Shoulders Display', sans-serif",
    fontFamilyBody: "Inter, sans-serif",
    sampleText: "LUXURY PACKAGING",
  },
  {
    id: "inter_grotesque",
    name: "Inter Grotesque",
    subtitle: "Plus Jakarta",
    fontFamilyHeading: "Inter, sans-serif",
    fontFamilyBody: "Inter, sans-serif",
    sampleText: "Clean & Modern Art",
  },
  {
    id: "ibm_plex_serif",
    name: "Playfair & Serif",
    subtitle: "Playfair Display",
    fontFamilyHeading: "'Playfair Display', serif",
    fontFamilyBody: "Inter, sans-serif",
    sampleText: "Handcrafted Luxury",
  },
  {
    id: "merriweather",
    name: "Cormorant Garamond",
    subtitle: "Editorial Serif",
    fontFamilyHeading: "'Cormorant Garamond', serif",
    fontFamilyBody: "Inter, sans-serif",
    sampleText: "Haute Parfumerie",
  },
];

interface FontSelectorCardsProps {
  selectedFontId: string;
  onSelectFont: (font: FontPresetCard) => void;
  className?: string;
}

export const FontSelectorCards: React.FC<FontSelectorCardsProps> = ({
  selectedFontId,
  onSelectFont,
  className = "",
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-landing-heading text-base font-bold text-landing-ink">Font chữ</span>
        </div>
        <button
          type="button"
          onClick={() => {
            
            const r = Math.floor(Math.random() * CURATED_FONT_PRESETS.length);
            onSelectFont(CURATED_FONT_PRESETS[r]);
          }}
          className="text-landing-muted hover:text-landing-ink transition p-1"
          title="Đổi bộ phông ngẫu nhiên"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2x2 Grid of Font Cards matching Image 2 */}
      <div className="grid grid-cols-2 gap-2.5">
        {CURATED_FONT_PRESETS.map((font) => {
          const isSelected = selectedFontId === font.id;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => {
                
                onSelectFont(font);
              }}
              className={`p-3 rounded-3xl border text-left transition flex flex-col justify-between min-h-[68px] ${
                isSelected
                  ? "border-fpt-orange bg-orange-50/70 ring-2 ring-fpt-orange/20 shadow-sm"
                  : "border-landing-line hover:border-landing-ink/30 hover:bg-landing-canvas bg-white"
              }`}
            >
              <div>
                <span
                  className="block text-xs font-bold text-landing-ink leading-tight"
                  style={{ fontFamily: font.fontFamilyHeading }}
                >
                  {font.name}
                </span>
                <span className="block text-caption text-landing-muted pt-0.5 font-sans">
                  {font.subtitle}
                </span>
              </div>

              {isSelected && (
                <div className="flex justify-end pt-1">
                  <Check className="w-3 h-3 text-fpt-orange" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
