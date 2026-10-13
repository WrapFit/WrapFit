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
          <span className="text-xs font-bold text-stone-900 tracking-wide">
            Fonts (Bộ Phông Chữ Bao Bì)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-mono">
            Editorial
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            
            const r = Math.floor(Math.random() * CURATED_FONT_PRESETS.length);
            onSelectFont(CURATED_FONT_PRESETS[r]);
          }}
          className="text-stone-400 hover:text-stone-700 transition p-1"
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
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between min-h-[68px] ${
                isSelected
                  ? "border-library-accent bg-library-accent-mist/40 ring-2 ring-library-accent/20 shadow-sm"
                  : "border-stone-200 hover:border-stone-300 hover:bg-stone-50/70 bg-white"
              }`}
            >
              <div>
                <span
                  className="block text-xs font-bold text-stone-900 leading-tight"
                  style={{ fontFamily: font.fontFamilyHeading }}
                >
                  {font.name}
                </span>
                <span className="block text-[10px] text-stone-400 pt-0.5 font-sans">
                  {font.subtitle}
                </span>
              </div>

              {isSelected && (
                <div className="flex justify-end pt-1">
                  <Check className="w-3 h-3 text-library-accent" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
