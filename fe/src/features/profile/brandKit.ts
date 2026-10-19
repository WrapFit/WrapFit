/** Editing state of the brand kit and its rules (`be/src/users/dto/update-brand-kit.dto.ts`). */

import type { BrandKit } from "@wrapfit/shared";
import { HEX_COLOR } from "@/features/dashboard";
import type { UpdateBrandKitRequest } from "@/types/api";

export const MIN_COLORS = 3;
export const MAX_COLORS = 5;
export const MAX_FONTS = 3;
export const FONT_MAX_LENGTH = 100;
export const SLOGAN_MAX_LENGTH = 150;

/** Meaning of each colour by position, as the API stores them: primary, accent, background, then extras. */
export const COLOR_ROLES = ["Màu chính", "Màu nhấn", "Màu nền", "Màu phụ 1", "Màu phụ 2"] as const;
/** Meaning of each font by position: headings first. */
export const FONT_ROLES = ["Tiêu đề", "Nội dung", "Điểm nhấn"] as const;

/** Starting palette of a kit never saved: Forest, Champagne Gold, Cotton Ivory of the WrapFit palette. */
export const STARTER_COLORS = ["#1A362B", "#D4AF37", "#FDFBF7"];
/** Colour proposed for a 4th / 5th swatch. */
export const EXTRA_COLORS = ["#2563EB", "#FF6B6B"];

/** Families offered in the font field; any name is accepted. The first four are bundled with WrapFit. */
export const FONT_SUGGESTIONS = [
  "Playfair Display",
  "Plus Jakarta Sans",
  "JetBrains Mono",
  "Inter",
  "Cormorant Garamond",
  "DM Sans",
  "Be Vietnam Pro",
  "Lora",
  "Montserrat",
  "Noto Serif",
];

export interface BrandKitDraft {
  logoUrl: string | null;
  colors: string[];
  fonts: string[];
  slogan: string;
}

export function draftFrom(kit: BrandKit | null): BrandKitDraft {
  return {
    logoUrl: kit?.logoUrl ?? null,
    colors: kit?.colors?.length ? kit.colors.map((color) => color.toUpperCase()) : [...STARTER_COLORS],
    fonts: kit?.fonts ? [...kit.fonts] : [],
    slogan: kit?.slogan ?? "",
  };
}

export function sameDraft(a: BrandKitDraft, b: BrandKitDraft): boolean {
  return (
    a.logoUrl === b.logoUrl &&
    a.slogan.trim() === b.slogan.trim() &&
    a.colors.length === b.colors.length &&
    a.colors.every((color, index) => color.toUpperCase() === b.colors[index]?.toUpperCase()) &&
    a.fonts.length === b.fonts.length &&
    a.fonts.every((font, index) => font === b.fonts[index])
  );
}

export interface BrandKitProblems {
  colors?: string;
  fonts?: string;
  slogan?: string;
}

export function brandKitProblems(draft: BrandKitDraft): BrandKitProblems {
  const problems: BrandKitProblems = {};
  if (draft.colors.length < MIN_COLORS || draft.colors.length > MAX_COLORS) {
    problems.colors = `Bộ nhận diện cần từ ${MIN_COLORS} đến ${MAX_COLORS} màu.`;
  } else if (draft.colors.some((color) => !HEX_COLOR.test(color))) {
    problems.colors = "Mỗi màu phải là mã HEX 6 ký tự, ví dụ #1A362B.";
  }
  if (draft.fonts.length > MAX_FONTS) problems.fonts = `Tối đa ${MAX_FONTS} font.`;
  if (draft.slogan.trim().length > SLOGAN_MAX_LENGTH) problems.slogan = `Slogan tối đa ${SLOGAN_MAX_LENGTH} ký tự.`;
  return problems;
}

/** Why `name` cannot join `fonts`; null when it can. */
export function fontProblem(name: string, fonts: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Nhập tên font.";
  if (trimmed.length > FONT_MAX_LENGTH) return `Tên font tối đa ${FONT_MAX_LENGTH} ký tự.`;
  if (fonts.some((font) => font.toLowerCase() === trimmed.toLowerCase())) return "Phông này đã có trong bộ nhận diện.";
  if (fonts.length >= MAX_FONTS) return `Tối đa ${MAX_FONTS} font.`;
  return null;
}

export function toBrandKitRequest(draft: BrandKitDraft): UpdateBrandKitRequest {
  return {
    logoUrl: draft.logoUrl,
    colors: draft.colors.map((color) => color.toUpperCase()),
    fonts: draft.fonts,
    slogan: draft.slogan.trim() || null,
  };
}

/** "RGB 26 · 54 · 43" of a `#RRGGBB` colour. */
export function rgbLabel(hex: string): string {
  if (!HEX_COLOR.test(hex)) return "RGB —";
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  return `RGB ${channel(1)} · ${channel(3)} · ${channel(5)}`;
}

/** Vector PDF logos cannot be drawn by `<img>`. */
export const isPdfUrl = (url: string) => /\.pdf(?:$|[?#])/i.test(url);
