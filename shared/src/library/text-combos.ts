/**
 * Ready-made text combos (docs/23 S14): a few lines set in contrasting fonts and sizes ("Cảm ơn bạn" over a small
 * script line, a brand name with its tagline...), inserted as one group of plain text elements the user rewrites.
 */
import type { CanvasElementStyle } from "../types/project";
import { PRINT_FONTS, type PrintFontId } from "../print/text-layout";
import { artPaletteOf } from "./art";
import type { LibraryOccasion } from "./catalog";

export interface TextComboLine {
  text: string;
  font: PrintFontId;
  /** Points. */
  sizePt: number;
  weight?: 400 | 700;
  italic?: boolean;
  /** Thousandths of an em. */
  spacing?: number;
  upper?: boolean;
  /** Palette colour of the line. */
  tone: "ink" | "accent";
}

export interface TextCombo {
  id: string;
  name: string;
  occasion: LibraryOccasion | null;
  /** ART_PALETTES id the lines take their colours from. */
  palette: string;
  lines: TextComboLine[];
}

const FALLBACK: Record<PrintFontId, string> = {
  "be-vietnam-pro": "sans-serif",
  "playfair-display": "serif",
  "cormorant-garamond": "serif",
  "big-shoulders-display": "sans-serif",
  inter: "sans-serif",
};

export const TEXT_COMBOS: TextCombo[] = [
  {
    id: "thank-you",
    name: "Cảm ơn bạn",
    occasion: null,
    palette: "son-do",
    lines: [
      { text: "Cảm ơn bạn", font: "playfair-display", sizePt: 26, weight: 700, italic: true, tone: "accent" },
      { text: "ĐÃ ỦNG HỘ SHOP NHỎ CỦA CHÚNG MÌNH", font: "inter", sizePt: 7, weight: 700, spacing: 160, tone: "ink" },
    ],
  },
  {
    id: "handmade",
    name: "Làm thủ công",
    occasion: null,
    palette: "kraft-moc",
    lines: [
      { text: "HANDMADE", font: "big-shoulders-display", sizePt: 28, weight: 700, spacing: 80, tone: "ink" },
      { text: "with love · từ đôi tay Việt", font: "cormorant-garamond", sizePt: 11, italic: true, tone: "accent" },
    ],
  },
  {
    id: "brand-tagline",
    name: "Tên thương hiệu và câu khẩu hiệu",
    occasion: "MINIMAL",
    palette: "toi-gian",
    lines: [
      { text: "TÊN THƯƠNG HIỆU", font: "be-vietnam-pro", sizePt: 20, weight: 700, spacing: 120, tone: "ink" },
      { text: "Câu khẩu hiệu ngắn gọn của bạn", font: "cormorant-garamond", sizePt: 12, italic: true, tone: "accent" },
    ],
  },
  {
    id: "tet",
    name: "Chúc mừng năm mới",
    occasion: "TET",
    palette: "son-do",
    lines: [
      { text: "XUÂN AN KHANG", font: "be-vietnam-pro", sizePt: 9, weight: 700, spacing: 220, tone: "accent" },
      { text: "Vạn Sự Như Ý", font: "playfair-display", sizePt: 26, weight: 700, tone: "ink" },
      { text: "Chúc mừng năm mới", font: "cormorant-garamond", sizePt: 12, italic: true, tone: "accent" },
    ],
  },
  {
    id: "mid-autumn",
    name: "Trung thu đoàn viên",
    occasion: null,
    palette: "kim-ngan",
    lines: [
      { text: "Trung Thu", font: "playfair-display", sizePt: 28, weight: 700, italic: true, tone: "accent" },
      { text: "TRĂNG TRÒN · ĐOÀN VIÊN", font: "inter", sizePt: 8, weight: 700, spacing: 200, tone: "ink" },
    ],
  },
  {
    id: "birthday",
    name: "Sinh nhật vui vẻ",
    occasion: "BIRTHDAY",
    palette: "hong-phan",
    lines: [
      { text: "Happy", font: "cormorant-garamond", sizePt: 16, italic: true, tone: "ink" },
      { text: "BIRTHDAY", font: "big-shoulders-display", sizePt: 30, weight: 700, spacing: 60, tone: "accent" },
      { text: "Chúc bạn tuổi mới thật rực rỡ", font: "be-vietnam-pro", sizePt: 8, tone: "ink" },
    ],
  },
  {
    id: "wedding",
    name: "Thiệp cưới",
    occasion: "WEDDING",
    palette: "kem-sua",
    lines: [
      { text: "Save the date", font: "cormorant-garamond", sizePt: 14, italic: true, tone: "accent" },
      { text: "Minh & Lan", font: "playfair-display", sizePt: 26, weight: 700, tone: "ink" },
      { text: "12 · 12 · 2026", font: "inter", sizePt: 8, weight: 700, spacing: 240, tone: "accent" },
    ],
  },
  {
    id: "valentine",
    name: "Gửi người thương",
    occasion: "VALENTINE",
    palette: "hong-phan",
    lines: [
      { text: "Gửi người thương", font: "playfair-display", sizePt: 22, italic: true, tone: "accent" },
      { text: "MỘT CHÚT NGỌT NGÀO CHO NGÀY CỦA CHÚNG MÌNH", font: "inter", sizePt: 6.5, weight: 700, spacing: 140, tone: "ink" },
    ],
  },
  {
    id: "organic",
    name: "Tự nhiên, hữu cơ",
    occasion: null,
    palette: "xanh-reu",
    lines: [
      { text: "100% TỰ NHIÊN", font: "big-shoulders-display", sizePt: 22, weight: 700, spacing: 60, tone: "accent" },
      { text: "Không chất bảo quản · Không hương liệu tổng hợp", font: "be-vietnam-pro", sizePt: 7.5, tone: "ink" },
    ],
  },
  {
    id: "fresh-bakery",
    name: "Bánh mới ra lò",
    occasion: null,
    palette: "kraft-moc",
    lines: [
      { text: "FRESHLY BAKED", font: "inter", sizePt: 8, weight: 700, spacing: 260, tone: "accent" },
      { text: "Bánh mới mỗi ngày", font: "playfair-display", sizePt: 22, weight: 700, tone: "ink" },
    ],
  },
  {
    id: "candle-notes",
    name: "Nến thơm và hương",
    occasion: null,
    palette: "oai-huong",
    lines: [
      { text: "Lavender & Vanilla", font: "cormorant-garamond", sizePt: 20, italic: true, tone: "ink" },
      { text: "NẾN SÁP ĐẬU NÀNH · 180 G · 40 GIỜ CHÁY", font: "inter", sizePt: 6.5, weight: 700, spacing: 140, tone: "accent" },
    ],
  },
  {
    id: "sale",
    name: "Ưu đãi",
    occasion: null,
    palette: "cam-fpt",
    lines: [
      { text: "GIẢM", font: "be-vietnam-pro", sizePt: 10, weight: 700, spacing: 200, tone: "ink" },
      { text: "-20%", font: "big-shoulders-display", sizePt: 36, weight: 700, tone: "accent" },
      { text: "cho đơn hàng tiếp theo", font: "be-vietnam-pro", sizePt: 8, tone: "ink" },
    ],
  },
];

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Style of one line of a combo (colours from the combo's palette). */
export function textComboStyle(combo: TextCombo, line: TextComboLine): CanvasElementStyle {
  const palette = artPaletteOf(combo.palette);
  // Texts sit on the board, often light: the darker of ink and base for the main lines, the accent unless it is pale.
  const ink = palette ? (luminance(palette.ink) < luminance(palette.base) ? palette.ink : palette.base) : "#1A362B";
  const accent = palette && luminance(palette.accent) < 0.75 ? palette.accent : ink;
  const color = line.tone === "accent" ? accent : ink;
  return {
    fontFamily: `'${PRINT_FONTS[line.font]}', ${FALLBACK[line.font]}`,
    fontSize: line.sizePt,
    color,
    fontWeight: line.weight ?? 400,
    ...(line.italic ? { fontStyle: "italic" as const } : {}),
    ...(line.spacing ? { letterSpacing: line.spacing } : {}),
    ...(line.upper ? { textTransform: "uppercase" as const } : {}),
    textAlign: "center",
  };
}
