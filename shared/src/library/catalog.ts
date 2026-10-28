/**
 * Catalogue of the built-in library: what the studio's sticker panel lists and searches. Items are combinations of a
 * vector design (`art.ts`), a palette and the words of an occasion, plus Gói's drawings and sample barcodes. Every item
 * can still be recoloured with any palette and given the user's own words, so a few dozen presets open thousands of
 * variants without one file to store or license.
 */
import type { CanvasElement } from "../types/project";
import { ART_DESIGNS, ART_PALETTES, artDesignOf, libraryArtContent } from "./art";
import { LIBRARY_ICONS } from "./icons";

export type LibraryCategory = "sticker" | "icon" | "label" | "background" | "mascot" | "barcode";
export type LibraryOccasion = "TET" | "CHRISTMAS" | "WEDDING" | "VALENTINE" | "BIRTHDAY" | "MINIMAL";

export interface LibraryItem {
  id: string;
  name: string;
  category: LibraryCategory;
  /** Element type the item becomes on the canvas. */
  elementType: CanvasElement["type"];
  content: string;
  /** Size when added (backgrounds are stretched over the whole panel instead). */
  widthMm: number;
  heightMm: number;
  occasions: LibraryOccasion[];
  /** Search words (Vietnamese with and without accents are both matched). */
  keywords: string[];
  /** Vector art: recolour and change the words. */
  editable: boolean;
  /** Raster files: resolution at the default size. */
  dpi?: number;
  /** Listing order: 0 for the first variant of every design, so the first page shows different shapes, not recolours. */
  rank: number;
}

export const LIBRARY_CATEGORIES: { id: LibraryCategory; label: string }[] = [
  { id: "sticker", label: "Tem & sticker" },
  { id: "icon", label: "Biểu tượng" },
  { id: "label", label: "Nhãn & băng rôn" },
  { id: "background", label: "Nền & hoa văn" },
  { id: "mascot", label: "Bé Gói" },
  { id: "barcode", label: "QR & mã vạch" },
];

export const LIBRARY_OCCASIONS: { id: LibraryOccasion; label: string }[] = [
  { id: "TET", label: "Tết" },
  { id: "CHRISTMAS", label: "Giáng Sinh" },
  { id: "WEDDING", label: "Cưới hỏi" },
  { id: "VALENTINE", label: "Valentine" },
  { id: "BIRTHDAY", label: "Sinh nhật" },
  { id: "MINIMAL", label: "Thương hiệu" },
];

/** Words of each design for an occasion, and the palettes that suit it. */
const PRESETS: { design: string; occasion: LibraryOccasion; texts: string[]; palettes: string[]; keywords: string[] }[] = [
  // Tết
  { design: "seal", occasion: "TET", texts: ["TẾT 2026", "An Khang", "VẠN SỰ NHƯ Ý"], palettes: ["son-do", "kim-ngan", "den-sang"], keywords: ["tết", "xuân", "lì xì"] },
  { design: "rosette", occasion: "TET", texts: ["Xuân", "LỘC"], palettes: ["son-do", "kim-ngan"], keywords: ["tết", "lộc", "xuân"] },
  { design: "ribbon", occasion: "TET", texts: ["Chúc Mừng Năm Mới"], palettes: ["son-do", "den-sang", "kim-ngan"], keywords: ["tết", "năm mới"] },
  { design: "label", occasion: "TET", texts: ["Quà Tết", "An khang • Thịnh vượng"], palettes: ["son-do", "kim-ngan"], keywords: ["tết", "quà biếu"] },
  { design: "arch", occasion: "TET", texts: ["Phúc", "Lộc Thọ"], palettes: ["son-do", "den-sang"], keywords: ["tết", "phúc"] },
  // Giáng Sinh
  { design: "seal", occasion: "CHRISTMAS", texts: ["MERRY", "Christmas", "2026"], palettes: ["rung-thong", "son-do"], keywords: ["noel", "giáng sinh", "xmas"] },
  { design: "ribbon", occasion: "CHRISTMAS", texts: ["Merry Christmas"], palettes: ["rung-thong", "son-do"], keywords: ["noel", "giáng sinh"] },
  { design: "tag", occasion: "CHRISTMAS", texts: ["To: Người thương", "From: Ông già Noel"], palettes: ["rung-thong", "kraft-moc"], keywords: ["noel", "thẻ quà"] },
  { design: "rosette", occasion: "CHRISTMAS", texts: ["Happy", "HOLIDAYS"], palettes: ["rung-thong", "son-do"], keywords: ["noel", "lễ hội"] },
  // Cưới hỏi
  { design: "oval", occasion: "WEDDING", texts: ["Hỷ Sự", "Trăm năm hạnh phúc"], palettes: ["son-do", "kim-ngan"], keywords: ["cưới", "hỷ", "đám cưới"] },
  { design: "seal", occasion: "WEDDING", texts: ["WEDDING", "Thank You", "2026"], palettes: ["kim-ngan", "xanh-reu", "oai-huong"], keywords: ["cưới", "cảm ơn"] },
  { design: "ribbon", occasion: "WEDDING", texts: ["Thank you for coming"], palettes: ["kim-ngan", "hong-phan"], keywords: ["cưới", "quà cảm ơn"] },
  { design: "arch", occasion: "WEDDING", texts: ["Mr & Mrs", "12.12.2026"], palettes: ["kim-ngan", "xanh-reu"], keywords: ["cưới", "đính hôn"] },
  // Valentine
  { design: "heart", occasion: "VALENTINE", texts: ["Love", "you"], palettes: ["hong-phan", "son-do"], keywords: ["valentine", "tình yêu", "tim"] },
  { design: "seal", occasion: "VALENTINE", texts: ["BE MINE", "Valentine", "14.02"], palettes: ["hong-phan", "son-do"], keywords: ["valentine", "tình yêu"] },
  { design: "tag", occasion: "VALENTINE", texts: ["To: Em yêu", "From: Anh"], palettes: ["hong-phan", "kem-sua"], keywords: ["valentine", "thẻ quà"] },
  // Sinh nhật
  { design: "burst", occasion: "BIRTHDAY", texts: ["HPBD", "Sinh nhật vui vẻ"], palettes: ["cam-fpt", "bien-xanh", "hong-phan"], keywords: ["sinh nhật", "birthday"] },
  { design: "ribbon", occasion: "BIRTHDAY", texts: ["Happy Birthday"], palettes: ["cam-fpt", "oai-huong", "bien-xanh"], keywords: ["sinh nhật", "birthday"] },
  { design: "rosette", occasion: "BIRTHDAY", texts: ["Best", "WISHES"], palettes: ["oai-huong", "kem-sua"], keywords: ["sinh nhật", "chúc mừng"] },
  // Thương hiệu, dùng quanh năm
  { design: "seal", occasion: "MINIMAL", texts: ["HANDMADE", "With Love", "SINCE 2026"], palettes: ["kraft-moc", "toi-gian", "xanh-reu", "son-do"], keywords: ["handmade", "thủ công"] },
  { design: "seal", occasion: "MINIMAL", texts: ["THANK", "You", "Cảm ơn bạn"], palettes: ["kraft-moc", "kem-sua", "toi-gian"], keywords: ["cảm ơn", "thank you"] },
  { design: "label", occasion: "MINIMAL", texts: ["Tên Sản Phẩm", "Thủ công • 100% tự nhiên"], palettes: ["kraft-moc", "toi-gian", "xanh-reu", "kem-sua"], keywords: ["nhãn", "sản phẩm"] },
  { design: "oval", occasion: "MINIMAL", texts: ["Tiệm Nhà Mây", "est. 2026"], palettes: ["kraft-moc", "toi-gian", "oai-huong"], keywords: ["logo", "tên tiệm"] },
  { design: "ticket", occasion: "MINIMAL", texts: ["LIMITED EDITION", "Lô 01 / 2026"], palettes: ["den-sang", "kraft-moc", "toi-gian"], keywords: ["giới hạn", "vintage"] },
  { design: "arch", occasion: "MINIMAL", texts: ["Trà Sen", "Tây Hồ"], palettes: ["xanh-reu", "kraft-moc"], keywords: ["trà", "nông sản"] },
  { design: "info", occasion: "MINIMAL", texts: ["THÔNG TIN SẢN PHẨM", "Thành phần: sáp đậu nành", "Khối lượng: 200 g", "NSX / HSD: xem đáy hộp"], palettes: ["toi-gian", "kraft-moc", "xanh-reu"], keywords: ["thành phần", "hạn dùng", "hsd", "nsx"] },
  { design: "burst", occasion: "MINIMAL", texts: ["MỚI", "100% tự nhiên"], palettes: ["cam-fpt", "xanh-reu"], keywords: ["mới", "new"] },
  { design: "burst", occasion: "MINIMAL", texts: ["SALE", "Giảm 20%"], palettes: ["son-do", "cam-fpt"], keywords: ["giảm giá", "khuyến mãi"] },
  { design: "band", occasion: "MINIMAL", texts: ["HÀNG DỄ VỠ • XIN NHẸ TAY"], palettes: ["cam-fpt", "toi-gian"], keywords: ["dễ vỡ", "fragile", "vận chuyển"] },
  { design: "band", occasion: "MINIMAL", texts: ["GIỮ KHÔ RÁO • TRÁNH NẮNG"], palettes: ["bien-xanh", "toi-gian"], keywords: ["bảo quản", "vận chuyển"] },
  { design: "tag", occasion: "MINIMAL", texts: ["To: Bạn thân mến", "From: Tiệm nhỏ"], palettes: ["kraft-moc", "kem-sua"], keywords: ["thẻ quà", "gift tag"] },
  // More shapes
  { design: "lantern", occasion: "TET", texts: ["Phúc"], palettes: ["son-do", "den-sang"], keywords: ["tết", "đèn lồng", "trung thu"] },
  { design: "lantern", occasion: "TET", texts: ["Lộc"], palettes: ["son-do", "kim-ngan"], keywords: ["tết", "đèn lồng"] },
  { design: "lotus", occasion: "MINIMAL", texts: ["Trà Sen"], palettes: ["xanh-reu", "hong-phan", "kim-ngan"], keywords: ["sen", "trà", "việt nam"] },
  { design: "lotus", occasion: "TET", texts: ["An Lành"], palettes: ["son-do", "kim-ngan"], keywords: ["tết", "sen", "an lành"] },
  { design: "stamp", occasion: "MINIMAL", texts: ["Gửi Yêu Thương", "2026"], palettes: ["kraft-moc", "bien-xanh", "kem-sua"], keywords: ["tem thư", "bưu chính", "vintage"] },
  { design: "stamp", occasion: "CHRISTMAS", texts: ["Merry Xmas", "25.12"], palettes: ["rung-thong", "son-do"], keywords: ["noel", "tem thư"] },
  { design: "stamp", occasion: "VALENTINE", texts: ["With Love", "14.02"], palettes: ["hong-phan", "son-do"], keywords: ["valentine", "tem thư"] },
  { design: "shield", occasion: "MINIMAL", texts: ["PREMIUM", "Chất Lượng", "EST. 2026"], palettes: ["den-sang", "rung-thong", "son-do"], keywords: ["cao cấp", "chất lượng", "huy hiệu"] },
  { design: "shield", occasion: "MINIMAL", texts: ["100%", "Thủ Công", "HANDMADE"], palettes: ["kraft-moc", "xanh-reu"], keywords: ["handmade", "thủ công"] },
  { design: "cloud", occasion: "BIRTHDAY", texts: ["Ngọt Ngào"], palettes: ["bien-xanh", "hong-phan", "oai-huong"], keywords: ["mây", "dễ thương", "baby"] },
  { design: "cloud", occasion: "MINIMAL", texts: ["Sweet Dreams"], palettes: ["oai-huong", "kem-sua"], keywords: ["mây", "dễ thương"] },
  { design: "hexagon", occasion: "MINIMAL", texts: ["Mật Ong", "Rừng U Minh"], palettes: ["cam-fpt", "kem-sua", "kraft-moc"], keywords: ["mật ong", "nông sản", "lục giác"] },
  { design: "hexagon", occasion: "MINIMAL", texts: ["Organic", "100% tự nhiên"], palettes: ["xanh-reu", "toi-gian"], keywords: ["organic", "hữu cơ"] },
  { design: "bubble", occasion: "MINIMAL", texts: ["Cảm ơn bạn", "đã ủng hộ tiệm!"], palettes: ["kem-sua", "bien-xanh", "hong-phan"], keywords: ["cảm ơn", "lời nhắn"] },
  { design: "bubble", occasion: "BIRTHDAY", texts: ["Chúc mừng", "sinh nhật nha!"], palettes: ["cam-fpt", "oai-huong"], keywords: ["sinh nhật", "lời nhắn"] },
  { design: "bubble", occasion: "VALENTINE", texts: ["Yêu bạn", "nhiều lắm!"], palettes: ["hong-phan", "son-do"], keywords: ["valentine", "lời nhắn"] },
];

/** Palettes of each icon group, the words of its label style and its occasions. */
const ICON_GROUPS: Record<string, { palettes: string[]; word: string; occasions: LibraryOccasion[] }> = {
  qua: { palettes: ["son-do", "cam-fpt", "kim-ngan"], word: "Quà tặng", occasions: ["MINIMAL", "BIRTHDAY"] },
  le: { palettes: ["son-do", "rung-thong", "oai-huong"], word: "Chúc mừng", occasions: ["CHRISTMAS", "BIRTHDAY", "TET"] },
  "trang-tri": { palettes: ["den-sang", "kim-ngan", "oai-huong"], word: "Đặc biệt", occasions: ["MINIMAL"] },
  "trang-suc": { palettes: ["den-sang", "hong-phan", "kim-ngan"], word: "Tinh tế", occasions: ["MINIMAL", "VALENTINE"] },
  "chat-luong": { palettes: ["rung-thong", "den-sang", "bien-xanh"], word: "Chính hãng", occasions: ["MINIMAL"] },
  "ban-hang": { palettes: ["cam-fpt", "toi-gian", "son-do"], word: "Tiệm nhỏ", occasions: ["MINIMAL"] },
  "tinh-cam": { palettes: ["hong-phan", "son-do", "kem-sua"], word: "Gửi yêu thương", occasions: ["VALENTINE", "WEDDING"] },
  "thien-nhien": { palettes: ["xanh-reu", "kraft-moc", "bien-xanh"], word: "Tự nhiên", occasions: ["MINIMAL"] },
  an: { palettes: ["kem-sua", "cam-fpt", "kraft-moc"], word: "Nhà làm", occasions: ["MINIMAL", "BIRTHDAY"] },
  "thu-cong": { palettes: ["kraft-moc", "toi-gian", "oai-huong"], word: "Handmade", occasions: ["MINIMAL"] },
  "van-chuyen": { palettes: ["bien-xanh", "toi-gian", "cam-fpt"], word: "Giao tận tay", occasions: ["MINIMAL"] },
  "thu-cung": { palettes: ["kem-sua", "bien-xanh", "xanh-reu"], word: "Pet friendly", occasions: ["MINIMAL"] },
};

/** Backgrounds and the occasions their motif suits (every palette is offered). */
const BACKGROUND_OCCASIONS: Record<string, LibraryOccasion[]> = {
  "bg-solid": ["MINIMAL", "TET", "CHRISTMAS", "WEDDING", "VALENTINE", "BIRTHDAY"],
  "bg-dots": ["BIRTHDAY", "VALENTINE", "MINIMAL"],
  "bg-stripes": ["MINIMAL", "CHRISTMAS", "BIRTHDAY"],
  "bg-grid": ["MINIMAL", "CHRISTMAS"],
  "bg-diamonds": ["WEDDING", "TET", "MINIMAL"],
  "bg-blossoms": ["TET", "WEDDING", "VALENTINE"],
  "bg-waves": ["MINIMAL", "TET"],
};

/** Default width of a design (mm); the height follows its aspect. */
const DEFAULT_WIDTH: Record<string, number> = {
  ribbon: 64, label: 56, oval: 48, tag: 56, ticket: 60, arch: 34, info: 52, band: 64,
  stamp: 32, shield: 32, cloud: 42, hexagon: 34, bubble: 50, lantern: 26, lotus: 34, icon: 22, "icon-badge": 26, "icon-label": 48,
};

/** Gói's drawings (frontend files, 512 px: 371 DPI at 35 mm). The export worker ships the same files. */
export const MASCOT_FILES = ["/mascots/goi-cheer.webp", "/mascots/goi-ruler.webp", "/mascots/goi-magnifier.webp", "/mascots/goi.webp"] as const;

function buildCatalog(): LibraryItem[] {
  const items: LibraryItem[] = [];
  for (const preset of PRESETS) {
    const design = artDesignOf(preset.design)!;
    const width = DEFAULT_WIDTH[design.id] ?? 32;
    preset.palettes.forEach((palette, rank) => {
      const paletteName = ART_PALETTES.find((p) => p.id === palette)!.name;
      items.push({
        rank,
        id: `${design.id}-${preset.occasion.toLowerCase()}-${preset.texts[0]}-${palette}`.toLowerCase().replace(/\s+/g, "-"),
        name: `${design.name} “${preset.texts.filter(Boolean).slice(0, 2).join(" ")}”`,
        category: design.kind === "sticker" ? "sticker" : "label",
        elementType: "logo",
        content: libraryArtContent({ design: design.id, palette, texts: preset.texts }),
        widthMm: width,
        heightMm: Math.round((width / design.aspect) * 10) / 10,
        occasions: [preset.occasion],
        keywords: [...preset.keywords, ...preset.texts, design.name, paletteName],
        editable: true,
      });
    });
  }
  // Line icons: a badge, the bare icon and a label with words, each in a palette of the icon's group.
  for (const [iconId, icon] of Object.entries(LIBRARY_ICONS)) {
    const group = ICON_GROUPS[icon.group] ?? ICON_GROUPS["trang-tri"];
    const styles: [string, LibraryCategory, string[]][] = [
      ["icon-badge", "sticker", []],
      ["icon", "icon", []],
      ["icon-label", "label", [group.word]],
    ];
    styles.forEach(([designId, category, texts], styleIndex) => {
      const design = artDesignOf(designId)!;
      const width = DEFAULT_WIDTH[designId];
      items.push({
        rank: styleIndex === 0 ? 0 : 2,
        id: `${designId}-${iconId}`,
        name: designId === "icon-label" ? `${icon.name} “${group.word}”` : designId === "icon" ? icon.name : `Huy hiệu ${icon.name.toLowerCase()}`,
        category,
        elementType: "logo",
        content: libraryArtContent({ design: designId, palette: group.palettes[styleIndex % group.palettes.length], texts, icon: iconId }),
        widthMm: width,
        heightMm: Math.round((width / design.aspect) * 10) / 10,
        occasions: group.occasions,
        keywords: [icon.name, icon.keywords, design.name, "icon biểu tượng", ...texts],
        editable: true,
      });
    });
  }
  for (const design of ART_DESIGNS.filter((d) => d.kind === "background")) {
    ART_PALETTES.forEach((palette, index) => {
      items.push({
        rank: index < 2 ? 1 : 3,
        id: `${design.id}-${palette.id}`,
        name: `${design.name} ${palette.name.toLowerCase()}`,
        category: "background",
        elementType: "pattern",
        content: libraryArtContent({ design: design.id, palette: palette.id }),
        widthMm: 60,
        heightMm: 60,
        occasions: BACKGROUND_OCCASIONS[design.id] ?? ["MINIMAL"],
        keywords: ["nền", "hoa văn", design.name, palette.name],
        editable: true,
      });
    });
  }
  const poses = ["Bé Gói cổ vũ", "Bé Gói cầm thước", "Bé Gói soi kính lúp", "Bé Gói"];
  MASCOT_FILES.forEach((file, i) =>
    items.push({
      rank: 1,
      id: `mascot-${i}`,
      name: poses[i],
      category: "mascot",
      elementType: "logo",
      content: file,
      widthMm: 35,
      heightMm: 35,
      occasions: ["MINIMAL", "BIRTHDAY"],
      keywords: ["mascot", "gói", "linh vật"],
      editable: false,
      dpi: Math.round(512 / (35 / 25.4)),
    })
  );
  items.push(
    {
      rank: 2,
      id: "barcode-ean13",
      name: "Mã vạch bán lẻ EAN-13",
      category: "barcode",
      elementType: "barcode",
      content: "8938501234568",
      widthMm: 38,
      heightMm: 22,
      occasions: ["MINIMAL"],
      keywords: ["mã vạch", "ean", "barcode"],
      editable: false,
    },
    {
      rank: 2,
      id: "barcode-qr",
      name: "Mã QR mở hộp",
      category: "barcode",
      elementType: "barcode",
      content: "https://wrapfit.vn",
      widthMm: 24,
      heightMm: 24,
      occasions: ["MINIMAL", "BIRTHDAY", "VALENTINE"],
      keywords: ["qr", "mở hộp", "unboxing"],
      editable: false,
    }
  );
  // The first variant of every design first, then icons, then the recolours; inside a rank the designs take turns
  // (seal, rosette, ribbon…, then the second seal…), so a page shows as many different shapes as it can.
  const turns = new Map<string, number>();
  const turnOf = (item: LibraryItem) => {
    // A line icon is its own shape: every badge takes its turn.
    const icon = /[?&]i=([^&]+)/.exec(item.content)?.[1] ?? "";
    const key = `${item.rank}|${item.content.split("?")[0]}|${icon}`;
    const turn = turns.get(key) ?? 0;
    turns.set(key, turn + 1);
    return turn;
  };
  return items
    .map((item, index) => ({ item, index, turn: turnOf(item) }))
    .sort((a, b) => a.item.rank - b.item.rank || a.turn - b.turn || a.index - b.index)
    .map(({ item }) => item);
}

export const LIBRARY_ITEMS: readonly LibraryItem[] = buildCatalog();

/** Lower case without Vietnamese accents: "Tết" and "tet" match. */
export const foldVietnamese = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Items of the catalogue matching a search (every word must appear), a category and an occasion. */
export function searchLibrary(
  query: { q?: string; category?: LibraryCategory | null; occasion?: LibraryOccasion | null },
  items: readonly LibraryItem[] = LIBRARY_ITEMS
): LibraryItem[] {
  const words = foldVietnamese(query.q ?? "").split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (query.category && item.category !== query.category) return false;
    if (query.occasion && !item.occasions.includes(query.occasion)) return false;
    if (!words.length) return true;
    const haystack = foldVietnamese([item.name, ...item.keywords].join(" "));
    return words.every((word) => haystack.includes(word));
  });
}

/** Element types whose `content` is a file or library art (the others are text and barcodes). */
export const IMAGE_ELEMENT_TYPES: ReadonlySet<CanvasElement["type"]> = new Set<CanvasElement["type"]>(["logo", "image", "pattern"]);
