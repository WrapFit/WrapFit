"use client";
/* ds-artwork: palette tiles preview printed artwork in its own colours (docs/15_DESIGN_SYSTEM.md §2). */

import React from "react";
import { AlertTriangle, Ban, Check, Shuffle, Undo2 } from "lucide-react";
import { ART_DESIGNS, ART_PALETTES, libraryArt, libraryArtContent, type ArtPalette } from "@wrapfit/shared";
import { Button } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { ArtShapes } from "./library/elementArt";

/** Five colours of a library palette (preferred colours of the AI pattern generator). */
export const paletteColors = (paletteId: string | null): string[] => {
  const palette = ART_PALETTES.find((p) => p.id === paletteId) ?? ART_PALETTES[0];
  return [palette.base, palette.deep, palette.accent, palette.ink, "#FFFFFF"];
};

/**
 * Colours of the palette that a screen shows brighter than CMYK ink can print: vivid blues, violets and greens
 * (saturated, bright). Printed, they come out duller.
 */
export function cmykRisk(palette: ArtPalette): boolean {
  return [palette.base, palette.deep, palette.accent].some((hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    if (max < 0.75 || chroma / max < 0.65) return false;
    const hue = (max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4) * 60;
    const h = (hue + 360) % 360;
    return (h >= 195 && h <= 290) || (h >= 80 && h <= 170);
  });
}

function ArtPreview({ content, width, height }: { content: string; width: number; height: number }) {
  const art = libraryArt(content, width, height);
  if (!art) return null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" aria-hidden>
      <ArtShapes art={art} />
    </svg>
  );
}

interface ColorPaletteSelectorProps {
  /** Palette of the design (null: none chosen yet). */
  selectedPaletteId: string | null;
  /** Recolours the design: stickers, labels, backgrounds of the library and the texts. */
  onSelectPalette: (paletteId: string) => void;
  /** The palette before the last change, while that change is the last edit: offers to go back to it. */
  undo?: { paletteName: string; onUndo: () => void } | null;
  className?: string;
}

/**
 * The design's palette: the 12 palettes of the library. Choosing one recolours what will be printed (library art and
 * texts), each tile shows a small label drawn in it.
 */
export function ColorPaletteSelector({ selectedPaletteId, onSelectPalette, undo, className }: ColorPaletteSelectorProps) {
  const selectedPalette = ART_PALETTES.find((p) => p.id === selectedPaletteId);
  const shuffle = () => {
    const others = ART_PALETTES.filter((p) => p.id !== selectedPaletteId);
    onSelectPalette(others[Math.floor(Math.random() * others.length)].id);
  };
  return (
    <section aria-labelledby="palette-title" className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 id="palette-title" className="font-landing-heading text-title font-bold text-fg">
          Bảng màu
        </h3>
        <Button variant="ghost" size="sm" leadingIcon={<Shuffle className="size-4" aria-hidden />} onClick={shuffle}>
          Đổi ngẫu nhiên
        </Button>
      </div>
      <p className="text-caption text-fg-muted">Đổi màu tem, nhãn, nền và chữ của thiết kế. File in đổi theo.</p>
      {undo && (
        <Button variant="secondary" size="sm" leadingIcon={<Undo2 className="size-4" aria-hidden />} onClick={undo.onUndo}>
          Hoàn tác: về {undo.paletteName}
        </Button>
      )}
      <div role="radiogroup" aria-label="Bảng màu" className="grid grid-cols-2 gap-2">
        {ART_PALETTES.map((palette) => {
          const selected = palette.id === selectedPaletteId;
          const risky = cmykRisk(palette);
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectPalette(palette.id)}
              className={cn(
                "group relative flex min-h-11 flex-col gap-1.5 rounded-panel border bg-surface-raised p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                selected ? "border-accent bg-accent-bg" : "border-line hover:border-fg/40",
              )}
            >
              <span className="block h-10 overflow-hidden rounded-control bg-canvas">
                <ArtPreview content={libraryArtContent({ design: "label", palette: palette.id, texts: ["Aa", palette.name] })} width={64} height={40} />
              </span>
              <span className="line-clamp-1 text-caption font-semibold text-fg">{palette.name}</span>
              {risky && (
                <span className="flex items-center gap-1 text-label-sm text-warning-fg" title="Màu rực trên màn hình, in CMYK sẽ nhạt hơn">
                  <AlertTriangle className="size-3 shrink-0" aria-hidden />
                  In nhạt hơn
                </span>
              )}
              {selected && (
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-white">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedPalette && cmykRisk(selectedPalette) && (
        <p role="note" className="flex items-start gap-2 rounded-control bg-warning-bg px-3 py-2 text-caption leading-5 text-warning-fg">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {selectedPalette.name} có màu rực mà mực in CMYK không đạt được: hộp in ra sẽ nhạt hơn so với trên màn hình. Đặt in thử 1 hộp mẫu để duyệt màu.
        </p>
      )}
    </section>
  );
}

interface BoxBackgroundPickerProps {
  /** Background design of the box (`bg-*`), null when the paper shows. */
  selectedDesign: string | null;
  /** Palette the previews and a new background use. */
  paletteId: string;
  onSelect: (designId: string | null) => void;
}

/** A background over every panel of the box, printed with its bleed (replaces the screen-only seamless patterns). */
export function BoxBackgroundPicker({ selectedDesign, paletteId, onSelect }: BoxBackgroundPickerProps) {
  const backgrounds = ART_DESIGNS.filter((design) => design.kind === "background");
  return (
    <section aria-labelledby="box-bg-title" className="space-y-3">
      <h3 id="box-bg-title" className="font-landing-heading text-title font-bold text-fg">
        Nền cả hộp
      </h3>
      <p className="text-caption text-fg-muted">Phủ mọi mặt hộp, tràn lề 3 mm qua nét cắt, chừa tai dán. Mặt chính để trơn cho chữ dễ đọc.</p>
      <div role="radiogroup" aria-label="Nền cả hộp" className="grid grid-cols-4 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={!selectedDesign}
          onClick={() => onSelect(null)}
          title="Không nền: in trên màu giấy"
          className={cn(
            "flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-control border text-caption text-fg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
            !selectedDesign ? "border-accent bg-accent-bg text-fg" : "border-line hover:border-fg/40",
          )}
        >
          <Ban className="size-4" aria-hidden />
          Giấy
        </button>
        {backgrounds.map((design) => {
          const selected = design.id === selectedDesign;
          return (
            <button
              key={design.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={design.name}
              title={design.name}
              onClick={() => onSelect(design.id)}
              className={cn(
                "aspect-square min-h-11 overflow-hidden rounded-control border-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                selected ? "border-accent" : "border-line hover:border-fg/40",
              )}
            >
              <ArtPreview content={libraryArtContent({ design: design.id, palette: paletteId })} width={30} height={30} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

const SOLID_SWATCHES = [
  "#000000", "#555555", "#737373", "#A6A6A6", "#D9D9D9", "#FFFFFF",
  "#FF3131", "#FF66C4", "#CB6CE6", "#8C52FF", "#5E17EB", "#0097B2",
  "#0CC0DF", "#38B6FF", "#004AAD", "#00BF63", "#7ED957", "#FFDE59",
  "#FFBD59", "#FF914D", "#F26522", "#B91C1C", "#1A362B", "#E8D8C8",
];
const GRADIENT_SWATCHES: [string, string][] = [
  ["#000000", "#737373"], ["#FF3131", "#FF914D"], ["#FF66C4", "#FFDE59"], ["#8C52FF", "#5CE1E6"],
  ["#5E17EB", "#FF66C4"], ["#004AAD", "#5DE0E6"], ["#00BF63", "#FFDE59"], ["#F26522", "#FDE68A"],
  ["#1A362B", "#D4AF37"], ["#B91C1C", "#7F1D1D"], ["#FBCFE8", "#EDE9FE"], ["#FFFFFF", "#E8D8C8"],
];
const HEX = /^#?[0-9a-fA-F]{6}$/;
const normHex = (value: string) => `#${value.replace("#", "").toUpperCase()}`;

interface CustomBackgroundPickerProps {
  disabled?: boolean;
  /** Paints the whole box: `bg-solid` with one colour, `bg-gradient` with two. */
  onApply: (design: "bg-solid" | "bg-gradient", colors: [string] | [string, string]) => void;
}

/** One colour or a two-colour gradient of the user's choice, over every face of the box. */
export function CustomBackgroundPicker({ disabled, onApply }: CustomBackgroundPickerProps) {
  const [mode, setMode] = React.useState<"solid" | "gradient">("solid");
  const [solid, setSolid] = React.useState("#F26522");
  const [from, setFrom] = React.useState("#8C52FF");
  const [to, setTo] = React.useState("#5CE1E6");
  const apply = () => (mode === "solid" ? onApply("bg-solid", [solid]) : onApply("bg-gradient", [from, to]));

  const colorField = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex items-center gap-2 rounded-control border border-line bg-surface px-2 py-1.5">
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(normHex(e.target.value))}
        className="size-8 shrink-0 cursor-pointer rounded-full border border-line bg-transparent p-0"
      />
      <span className="sr-only">{label}</span>
      <input
        type="text"
        defaultValue={value}
        key={value}
        maxLength={7}
        onBlur={(e) => (HEX.test(e.target.value) ? onChange(normHex(e.target.value)) : (e.target.value = value))}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="min-w-0 flex-1 bg-transparent font-mono text-label uppercase text-fg outline-none"
      />
    </label>
  );

  return (
    <section aria-labelledby="custom-bg-title" className="space-y-3">
      <h3 id="custom-bg-title" className="font-landing-heading text-title font-bold text-fg">
        Màu nền tự chọn
      </h3>
      <div role="tablist" aria-label="Kiểu màu nền" className="grid grid-cols-2 border-b border-line">
        {(["solid", "gradient"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "-mb-px border-b-2 py-2 text-label font-semibold",
              mode === m ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {m === "solid" ? "Màu đồng nhất" : "Màu gradient"}
          </button>
        ))}
      </div>

      {mode === "solid" ? (
        <>
          {colorField("Màu nền", solid, setSolid)}
          <div className="grid grid-cols-6 gap-2">
            {SOLID_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={`Màu ${c}`}
                aria-pressed={solid === c}
                onClick={() => setSolid(c)}
                className={cn("aspect-square rounded-full border", solid === c ? "ring-2 ring-accent ring-offset-1" : "border-line")}
                style={{ background: c }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div
            aria-hidden
            className="h-10 rounded-control border border-line"
            style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}
          />
          <div className="grid grid-cols-2 gap-2">
            {colorField("Màu trên", from, setFrom)}
            {colorField("Màu dưới", to, setTo)}
          </div>
          <div className="grid grid-cols-6 gap-2">
            {GRADIENT_SWATCHES.map(([a, b]) => (
              <button
                key={a + b}
                type="button"
                aria-label={`Chuyển màu ${a} sang ${b}`}
                onClick={() => {
                  setFrom(a);
                  setTo(b);
                }}
                className={cn("aspect-square rounded-full border", from === a && to === b ? "ring-2 ring-accent ring-offset-1" : "border-line")}
                style={{ background: `linear-gradient(180deg, ${a}, ${b})` }}
              />
            ))}
          </div>
        </>
      )}
      <Button type="button" size="sm" className="w-full" disabled={disabled} onClick={apply}>
        Áp màu này cho cả hộp
      </Button>
    </section>
  );
}
