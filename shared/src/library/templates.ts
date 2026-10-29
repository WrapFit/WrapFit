/**
 * Design templates generated from style kits: a kit (occasion, palette, background, fonts, sticker, label and words)
 * dressed onto a product box (industry, structure, size) with one of a few layouts. Every element is placed inside the
 * FitCheck safe area of its panel and every template is audited with `checkBox`: only those without an error or a
 * warning are kept, so a generated template always exports. The seed of the API and the offline demo of the editor
 * use the same list, so both show the same designs.
 */
import { checkBox, safeMarginsOf, cutSidesOf } from "../fitcheck/validator";
import { caliperOf } from "../parametric/paper";
import { generateDielinePieces, type DielinePiece } from "../parametric/registry";
import { BLEED_BOX_MM } from "../print/prepress";
import { PT_TO_MM, PRINT_FONTS, type PrintFontId } from "../print/text-layout";
import type { BoxDimensions, PanelFace } from "../types/dieline";
import type { CanvasElement, CanvasState, MaterialSpecification } from "../types/project";
import { artDesignOf, artPaletteOf, libraryArtContent } from "./art";
import type { LibraryOccasion } from "./catalog";

export type TemplateIndustry = "COSMETICS" | "CANDLES" | "BAKERY" | "JEWELRY" | "TEA_AGRI";

export interface StyleKit {
  id: string;
  name: string;
  occasion: LibraryOccasion;
  industries: TemplateIndustry[];
  material: MaterialSpecification["type"];
  /** Background over the panels (a `bg-*` design and a palette), or none: bare paper. */
  background: { design: string; palette: string } | null;
  /** Colour of the free texts (on the background, or on the paper). */
  ink: string;
  titleFont: PrintFontId;
  bodyFont: PrintFontId;
  tagline: string;
  sticker: { design: string; palette: string; texts?: string[] };
  label: { design: string; palette: string };
  tags: string[];
}

export const STYLE_KITS: StyleKit[] = [
  {
    id: "tet-son-do", name: "Xuân Son Đỏ", occasion: "TET", industries: ["TEA_AGRI", "BAKERY", "CANDLES"], material: "ivory",
    background: { design: "bg-blossoms", palette: "son-do" }, ink: "#FEF3C7", titleFont: "playfair-display", bodyFont: "be-vietnam-pro",
    tagline: "An Khang Thịnh Vượng", sticker: { design: "seal", palette: "kim-ngan", texts: ["TẾT 2026", "An Khang", "VẠN SỰ NHƯ Ý"] },
    label: { design: "arch", palette: "kim-ngan" }, tags: ["tết", "đỏ son", "hoa đào"],
  },
  {
    id: "tet-kim-ngan", name: "Tết Ngà Kim", occasion: "TET", industries: ["TEA_AGRI", "COSMETICS", "JEWELRY"], material: "ivory",
    background: { design: "bg-diamonds", palette: "kim-ngan" }, ink: "#7F1D1D", titleFont: "cormorant-garamond", bodyFont: "be-vietnam-pro",
    tagline: "Vạn Sự Như Ý", sticker: { design: "rosette", palette: "son-do", texts: ["Xuân", "LỘC"] },
    label: { design: "label", palette: "son-do" }, tags: ["tết", "sang trọng", "vàng kim"],
  },
  {
    id: "noel-rung-thong", name: "Giáng Sinh Rừng Thông", occasion: "CHRISTMAS", industries: ["BAKERY", "CANDLES", "COSMETICS"], material: "ivory",
    background: { design: "bg-stripes", palette: "rung-thong" }, ink: "#FEFAE0", titleFont: "playfair-display", bodyFont: "be-vietnam-pro",
    tagline: "Merry Christmas", sticker: { design: "rosette", palette: "son-do", texts: ["Happy", "HOLIDAYS"] },
    label: { design: "ribbon", palette: "son-do" }, tags: ["noel", "giáng sinh", "xanh thông"],
  },
  {
    id: "cuoi-ngoc-trai", name: "Hỷ Sự Ngọc Trai", occasion: "WEDDING", industries: ["BAKERY", "TEA_AGRI", "JEWELRY", "CANDLES"], material: "ivory",
    background: { design: "bg-diamonds", palette: "kim-ngan" }, ink: "#7C2D12", titleFont: "cormorant-garamond", bodyFont: "be-vietnam-pro",
    tagline: "Trăm Năm Hạnh Phúc", sticker: { design: "oval", palette: "son-do", texts: ["Hỷ Sự", "12.12.2026"] },
    label: { design: "arch", palette: "son-do" }, tags: ["cưới", "hỷ", "quà cảm ơn"],
  },
  {
    id: "valentine-hong-phan", name: "Valentine Hồng Phấn", occasion: "VALENTINE", industries: ["JEWELRY", "COSMETICS", "CANDLES", "BAKERY"], material: "ivory",
    background: { design: "bg-dots", palette: "hong-phan" }, ink: "#831843", titleFont: "playfair-display", bodyFont: "be-vietnam-pro",
    tagline: "Gửi người thương", sticker: { design: "heart", palette: "son-do", texts: ["Love", "you"] },
    label: { design: "tag", palette: "kem-sua" }, tags: ["valentine", "tình yêu", "hồng"],
  },
  {
    id: "sinh-nhat-cam", name: "Sinh Nhật Cam Tươi", occasion: "BIRTHDAY", industries: ["BAKERY", "CANDLES", "COSMETICS"], material: "ivory",
    background: { design: "bg-stripes", palette: "cam-fpt" }, ink: "#FFFFFF", titleFont: "big-shoulders-display", bodyFont: "be-vietnam-pro",
    tagline: "Happy Birthday", sticker: { design: "burst", palette: "bien-xanh", texts: ["HPBD", "Sinh nhật vui vẻ"] },
    label: { design: "ribbon", palette: "bien-xanh" }, tags: ["sinh nhật", "vui tươi", "cam"],
  },
  {
    id: "sinh-nhat-oai-huong", name: "Sinh Nhật Oải Hương", occasion: "BIRTHDAY", industries: ["BAKERY", "JEWELRY", "COSMETICS"], material: "ivory",
    background: { design: "bg-waves", palette: "oai-huong" }, ink: "#4C1D95", titleFont: "playfair-display", bodyFont: "be-vietnam-pro",
    tagline: "Best Wishes For You", sticker: { design: "rosette", palette: "kem-sua", texts: ["Best", "WISHES"] },
    label: { design: "label", palette: "oai-huong" }, tags: ["sinh nhật", "tím", "nhẹ nhàng"],
  },
  {
    id: "toi-gian-kraft", name: "Kraft Thủ Công", occasion: "MINIMAL", industries: ["CANDLES", "TEA_AGRI", "BAKERY", "COSMETICS"], material: "kraft",
    background: null, ink: "#3F2A1D", titleFont: "cormorant-garamond", bodyFont: "be-vietnam-pro",
    tagline: "Làm thủ công từng chiếc", sticker: { design: "seal", palette: "kraft-moc", texts: ["HANDMADE", "With Love", "SINCE 2026"] },
    label: { design: "oval", palette: "kraft-moc" }, tags: ["kraft", "handmade", "mộc mạc"],
  },
  {
    id: "toi-gian-den-trang", name: "Đen Trắng Tối Giản", occasion: "MINIMAL", industries: ["COSMETICS", "JEWELRY", "CANDLES"], material: "ivory",
    background: null, ink: "#111827", titleFont: "inter", bodyFont: "inter",
    tagline: "Less is more", sticker: { design: "seal", palette: "toi-gian", texts: ["THANK", "You", "Cảm ơn bạn"] },
    label: { design: "ticket", palette: "den-sang" }, tags: ["tối giản", "đen trắng", "hiện đại"],
  },
  {
    id: "toi-gian-xanh-reu", name: "Xanh Rêu Thiên Nhiên", occasion: "MINIMAL", industries: ["TEA_AGRI", "COSMETICS", "CANDLES"], material: "ivory",
    background: { design: "bg-grid", palette: "xanh-reu" }, ink: "#2F3E2C", titleFont: "cormorant-garamond", bodyFont: "be-vietnam-pro",
    tagline: "Từ thiên nhiên", sticker: { design: "seal", palette: "xanh-reu", texts: ["ORGANIC", "Tự Nhiên", "100% HANDMADE"] },
    label: { design: "arch", palette: "xanh-reu" }, tags: ["thiên nhiên", "xanh rêu", "organic"],
  },
  {
    id: "sang-trong-den-kim", name: "Đen Ánh Kim", occasion: "MINIMAL", industries: ["JEWELRY", "COSMETICS", "TEA_AGRI"], material: "ivory",
    background: { design: "bg-solid", palette: "den-sang" }, ink: "#F5E6B8", titleFont: "playfair-display", bodyFont: "be-vietnam-pro",
    tagline: "Phiên bản giới hạn", sticker: { design: "seal", palette: "den-sang", texts: ["LUXURY", "Edition", "2026"] },
    label: { design: "ticket", palette: "den-sang" }, tags: ["sang trọng", "đen", "ánh kim"],
  },
];

interface Product {
  id: string;
  industry: TemplateIndustry;
  structure: "tuck-top" | "sleeve-drawer" | "lid-base" | "pillow";
  dimensions: BoxDimensions;
  name: string;
  detail: string;
  info: string[];
}

const PAPER_350 = caliperOf(350);
const dims = (length: number, width: number, height: number): BoxDimensions => ({ length, width, height, paperThickness: PAPER_350 });

const PRODUCTS: Product[] = [
  { id: "nen-thom", industry: "CANDLES", structure: "tuck-top", dimensions: dims(90, 90, 110), name: "Nến Thơm", detail: "Sáp đậu nành thủ công", info: ["Thành phần: sáp đậu nành", "Khối lượng: 200 g", "Thời gian cháy: 40 giờ"] },
  { id: "serum", industry: "COSMETICS", structure: "tuck-top", dimensions: dims(50, 50, 140), name: "Serum", detail: "Dưỡng ẩm chuyên sâu", info: ["Dung tích: 30 ml", "Dùng sáng và tối", "HSD: 24 tháng"] },
  { id: "bo-skincare", industry: "COSMETICS", structure: "sleeve-drawer", dimensions: dims(160, 110, 45), name: "Bộ Quà Skincare", detail: "Ba bước dưỡng da", info: ["Gồm 3 sản phẩm", "Dùng cho mọi loại da", "HSD: xem từng chai"] },
  { id: "banh-quy", industry: "BAKERY", structure: "sleeve-drawer", dimensions: dims(180, 120, 50), name: "Bánh Quy Bơ", detail: "Nướng mới mỗi ngày", info: ["Thành phần: bơ, bột mì", "Khối lượng: 300 g", "Dùng trong 15 ngày"] },
  { id: "hop-banh", industry: "BAKERY", structure: "lid-base", dimensions: dims(200, 200, 60), name: "Hộp Bánh Ngọt", detail: "Tiệm bánh nhà làm", info: [] },
  { id: "trang-suc", industry: "JEWELRY", structure: "pillow", dimensions: dims(100, 80, 30), name: "Trang Sức", detail: "Bạc ta thủ công", info: [] },
  { id: "nhan-bac", industry: "JEWELRY", structure: "lid-base", dimensions: dims(90, 90, 40), name: "Nhẫn Bạc", detail: "Quà tặng tinh tế", info: [] },
  { id: "tra-sen", industry: "TEA_AGRI", structure: "lid-base", dimensions: dims(180, 120, 85), name: "Trà Sen", detail: "Ướp sen Tây Hồ", info: [] },
  { id: "ca-phe", industry: "TEA_AGRI", structure: "tuck-top", dimensions: dims(80, 80, 150), name: "Cà Phê Rang Xay", detail: "Arabica Cầu Đất", info: ["Khối lượng: 250 g", "Rang mộc, xay vừa", "Ngày rang: xem đáy hộp"] },
];

/** The face that sells the box, and the one that carries the product information. */
const MAIN_PANEL: Record<Product["structure"], string> = {
  "tuck-top": "panel_front",
  "sleeve-drawer": "sleeve_top",
  "lid-base": "lid_top",
  pillow: "pillow_front",
};
/** The face that sells the box (title, label), or null for a structure without one. */
export const mainPanelOf = (structure: string): string | null => MAIN_PANEL[structure as Product["structure"]] ?? null;
const INFO_PANEL: Partial<Record<Product["structure"], string>> = {
  "tuck-top": "panel_back",
  "sleeve-drawer": "sleeve_bottom",
  pillow: "pillow_back",
};
/** Where a small seal goes when it is not on the main face. */
const SEAL_PANEL: Partial<Record<Product["structure"], string>> = { "tuck-top": "panel_top_lid" };

export type TemplateLayout = "classic" | "label" | "ribbon" | "seal";
const LAYOUTS: TemplateLayout[] = ["classic", "label", "ribbon", "seal"];
const LAYOUT_NAMES: Record<TemplateLayout, string> = {
  classic: "Chữ trung tâm",
  label: "Nhãn đặt giữa",
  ribbon: "Băng rôn",
  seal: "Tem tròn nổi bật",
};

export interface GeneratedTemplate {
  /** Stable key: kit, product and layout. */
  key: string;
  /** Stable UUID of the key (database id of the seeded template). */
  id: string;
  title: string;
  description: string;
  structure: Product["structure"];
  occasion: LibraryOccasion;
  industry: TemplateIndustry;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification;
  canvasState: CanvasState;
  tags: string[];
  /** Main colour of the design (cards without a thumbnail). */
  color: string;
  kitId: string;
}

/** Deterministic UUID-shaped id of a key (FNV-1a based), so the seed can upsert the same rows on every start. */
export function stableUuid(key: string): string {
  let hex = "";
  for (let round = 0; hex.length < 32; round++) {
    let hash = 0x811c9dc5 ^ round;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    hex += (hash >>> 0).toString(16).padStart(8, "0");
  }
  const h = hex.slice(0, 32).split("");
  h[12] = "4"; // version 4 shape
  h[16] = "89ab"[parseInt(h[16], 16) % 4];
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const round = (value: number) => Math.round(value * 10) / 10;
/** Average advance of a character in each print font (fraction of the size), to size a one-line title. */
const CHAR_EM: Record<PrintFontId, number> = {
  "be-vietnam-pro": 0.64,
  inter: 0.62,
  "big-shoulders-display": 0.46,
  "playfair-display": 0.62,
  "cormorant-garamond": 0.54,
};

/** Safe rectangle of a panel (panel coordinates). */
function safeArea(panel: PanelFace, piece: DielinePiece) {
  const m = safeMarginsOf(panel, piece.geometry);
  // A little more than the minimum, so rounding never touches the limit.
  const pad = 1;
  return { x: m.left + pad, y: m.top + pad, width: panel.bounds.width - m.left - m.right - 2 * pad, height: panel.bounds.height - m.top - m.bottom - 2 * pad };
}

/** A one-line text element as large as `maxPt` that still fits `width` (estimated). */
function textElement(id: string, panelId: string, content: string, x: number, y: number, width: number, maxPt: number, font: PrintFontId, color: string): CanvasElement {
  const fitPt = width / (content.length * CHAR_EM[font] * PT_TO_MM);
  const pt = Math.max(7, Math.min(maxPt, Math.floor(fitPt)));
  return {
    id,
    type: "text",
    panelId,
    x: round(x),
    y: round(y),
    width: round(width),
    height: round(pt * PT_TO_MM * 1.3),
    rotation: 0,
    content,
    style: { fontFamily: PRINT_FONTS[font], fontSize: pt, color },
  };
}

function artElement(id: string, panelId: string, type: "logo" | "pattern", content: string, x: number, y: number, width: number, height: number): CanvasElement {
  return { id, type, panelId, x: round(x), y: round(y), width: round(width), height: round(height), rotation: 0, content };
}

/** Background over every panel of every piece (bleed past the cut sides), except panels that hold a glue area. */
function backgrounds(pieces: DielinePiece[], kit: StyleKit, mainPanelId: string): CanvasElement[] {
  return kit.background ? boxBackgrounds(pieces, kit.background, mainPanelId) : [];
}

/**
 * A library background over every panel of every piece, bleeding past the cut sides, except panels holding a glue area
 * (ink there stops the glue). `plainPanelId`: that face gets a solid fill of the palette, so a title on it stays readable.
 */
export function boxBackgrounds(
  pieces: DielinePiece[],
  background: { design: string; palette: string },
  plainPanelId?: string
): CanvasElement[] {
  const content = libraryArtContent(background);
  const plain = libraryArtContent({ design: "bg-solid", palette: background.palette });
  const elements: CanvasElement[] = [];
  for (const piece of pieces) {
    for (const panel of piece.geometry.panels) {
      const cut = cutSidesOf(panel, piece.geometry);
      const bleed = (side: "top" | "right" | "bottom" | "left") => (cut.has(side) ? BLEED_BOX_MM : 0);
      const box = {
        x: -bleed("left"),
        y: -bleed("top"),
        width: panel.bounds.width + bleed("left") + bleed("right"),
        height: panel.bounds.height + bleed("top") + bleed("bottom"),
      };
      const onSheet = { x: panel.bounds.x + box.x, y: panel.bounds.y + box.y, width: box.width, height: box.height };
      const glued = piece.geometry.glueAreas?.some(
        (g) => onSheet.x < g.x + g.width && g.x < onSheet.x + onSheet.width && onSheet.y < g.y + g.height && g.y < onSheet.y + onSheet.height
      );
      // Exact sizes (not rounded): a background that only touches a glue flap must not grow onto it.
      if (!glued) elements.push({ id: `bg_${panel.id}`, type: "pattern", panelId: panel.id, ...box, rotation: 0, content: panel.id === plainPanelId ? plain : content });
    }
  }
  return elements;
}

function dress(product: Product, kit: StyleKit, layout: TemplateLayout, pieces: DielinePiece[]): CanvasElement[] {
  const find = (id: string | undefined) => {
    for (const piece of pieces) {
      const panel = id && piece.geometry.panels.find((p) => p.id === id);
      if (panel) return { panel, piece };
    }
    return null;
  };
  const main = find(MAIN_PANEL[product.structure])!;
  const area = safeArea(main.panel, main.piece);
  const panelId = main.panel.id;
  const elements: CanvasElement[] = backgrounds(pieces, kit, panelId);
  const titleMaxPt = Math.max(14, Math.min(40, (Math.min(area.width, area.height) * 0.22) / PT_TO_MM));
  const subtitle = kit.occasion === "MINIMAL" ? product.detail : kit.tagline;
  const stickerTexts = kit.sticker.texts;

  if (layout === "classic" || layout === "ribbon") {
    let top = area.y + area.height * 0.18;
    if (layout === "ribbon") {
      const design = artDesignOf("ribbon")!;
      const width = area.width;
      const height = Math.min(area.height * 0.45, width / design.aspect);
      elements.push(artElement("ribbon", panelId, "logo", libraryArtContent({ design: "ribbon", palette: kit.label.palette, texts: [product.name] }), area.x, area.y + area.height * 0.2, width, height));
      top = area.y + area.height * 0.2 + height + 2;
      elements.push(textElement("subtitle", panelId, subtitle, area.x, top, area.width, titleMaxPt * 0.45, kit.bodyFont, kit.ink));
    } else {
      const title = textElement("title", panelId, product.name, area.x, top, area.width, titleMaxPt, kit.titleFont, kit.ink);
      elements.push(title);
      elements.push(textElement("subtitle", panelId, subtitle, area.x, top + title.height + 1, area.width, titleMaxPt * 0.4, kit.bodyFont, kit.ink));
    }
  } else if (layout === "label") {
    const design = artDesignOf(kit.label.design)!;
    let width = area.width * 0.85;
    let height = width / design.aspect;
    if (height > area.height * 0.85) {
      height = area.height * 0.85;
      width = height * design.aspect;
    }
    const texts = design.id === "tag" ? [`To: ${kit.tagline}`, `From: ${product.name}`] : [product.name, subtitle];
    elements.push(artElement("label", panelId, "logo", libraryArtContent({ design: design.id, palette: kit.label.palette, texts }), area.x + (area.width - width) / 2, area.y + (area.height - height) / 2, width, height));
  } else {
    const side = Math.min(area.width, area.height * 0.66);
    const design = artDesignOf(kit.sticker.design)!;
    const height = side / design.aspect;
    elements.push(artElement("seal", panelId, "logo", libraryArtContent({ design: design.id, palette: kit.sticker.palette, texts: stickerTexts }), area.x + (area.width - side) / 2, area.y, side, height));
    elements.push(textElement("title", panelId, product.name, area.x, area.y + height + 1, area.width, titleMaxPt * 0.7, kit.titleFont, kit.ink));
  }

  // A small seal on the lid (tuck-top) for the layouts without one.
  const sealPanel = layout !== "seal" ? find(SEAL_PANEL[product.structure]) : null;
  if (sealPanel) {
    const a = safeArea(sealPanel.panel, sealPanel.piece);
    const design = artDesignOf(kit.sticker.design)!;
    const side = Math.min(a.width * 0.6, a.height, 34);
    elements.push(artElement("lid_seal", sealPanel.panel.id, "logo", libraryArtContent({ design: design.id, palette: kit.sticker.palette, texts: stickerTexts }), a.x + (a.width - side) / 2, a.y + (a.height - side / design.aspect) / 2, side, side / design.aspect));
  }

  // Product information on the back.
  const infoPanel = product.info.length ? find(INFO_PANEL[product.structure]) : null;
  if (infoPanel) {
    const a = safeArea(infoPanel.panel, infoPanel.piece);
    const design = artDesignOf("info")!;
    let width = Math.min(a.width, 60);
    let height = width / design.aspect;
    if (height > a.height) {
      height = a.height;
      width = height * design.aspect;
    }
    elements.push(artElement("info", infoPanel.panel.id, "logo", libraryArtContent({ design: "info", palette: kit.label.palette === "den-sang" ? "toi-gian" : kit.label.palette, texts: ["THÔNG TIN SẢN PHẨM", ...product.info] }), a.x + (a.width - width) / 2, a.y + (a.height - height) / 2, width, height));
  }
  return elements;
}

const OCCASION_WORDS: Record<LibraryOccasion, string> = {
  TET: "Tết",
  CHRISTMAS: "Giáng Sinh",
  WEDDING: "quà cưới",
  VALENTINE: "Valentine",
  BIRTHDAY: "sinh nhật",
  MINIMAL: "quanh năm",
};

const STRUCTURE_NAMES: Record<Product["structure"], string> = {
  "tuck-top": "hộp nắp gài",
  "sleeve-drawer": "hộp kéo bao diêm",
  "lid-base": "hộp âm dương",
  pillow: "hộp gối",
};

/** Candidates FitCheck turned down, with the reasons (tests and the generator's tuning). */
export const rejectedTemplates: { key: string; violations: string[] }[] = [];
const rejected = rejectedTemplates;

function build(): GeneratedTemplate[] {
  const result: GeneratedTemplate[] = [];
  rejected.length = 0;
  STYLE_KITS.forEach((kit, kitIndex) => {
    PRODUCTS.filter((product) => kit.industries.includes(product.industry)).forEach((product, productIndex) => {
      // Two layouts per kit and product, turning through the four so neighbours differ.
      const start = (kitIndex + productIndex) % LAYOUTS.length;
      for (const layout of [LAYOUTS[start], LAYOUTS[(start + 2) % LAYOUTS.length]]) {
        const pieces = generateDielinePieces(product.structure, product.dimensions);
        const elements = dress(product, kit, layout, pieces);
        const report = checkBox(pieces, elements);
        const blocking = report.violations.filter((v) => v.severity !== "info");
        if (blocking.length) {
          rejected.push({ key: `${kit.id}/${product.id}/${layout}`, violations: blocking.map((v) => `${v.code} ${v.elementId ?? ""} ${v.message}`) });
          continue;
        }
        const key = `${kit.id}/${product.id}/${layout}`;
        const background = kit.background ? artPaletteOf(kit.background.palette)! : null;
        result.push({
          key,
          id: stableUuid(key),
          title: `${product.name} ${kit.name}`,
          description: `${STRUCTURE_NAMES[product.structure][0].toUpperCase()}${STRUCTURE_NAMES[product.structure].slice(1)} ${product.dimensions.length}×${product.dimensions.width}×${product.dimensions.height} mm cho ${product.name.toLowerCase()}, phong cách ${kit.name.toLowerCase()} (${LAYOUT_NAMES[layout].toLowerCase()}), dịp ${OCCASION_WORDS[kit.occasion]}. Đạt FitCheck, xuất in ngay.`,
          structure: product.structure,
          occasion: kit.occasion,
          industry: product.industry,
          dimensions: product.dimensions,
          materialSpec: { type: kit.material, gsm: 350, caliper: PAPER_350, finish: "matte" },
          canvasState: { elements, backgroundPattern: null, backgroundTheme: null, materialTheme: kit.material === "kraft" ? "kraft" : "ivory" },
          tags: [...kit.tags, product.name.toLowerCase(), LAYOUT_NAMES[layout].toLowerCase()],
          color: background?.base ?? artPaletteOf(kit.sticker.palette)!.base,
          kitId: kit.id,
        });
      }
    });
  });
  return result;
}

let cache: GeneratedTemplate[] | null = null;
/** All generated templates (computed once). */
export function generatedTemplates(): GeneratedTemplate[] {
  return (cache ??= build());
}

/**
 * Elements of a kit dressed on any box (structure and size of an existing template), for templates that come without
 * artwork: the kit of the occasion (or a minimal one) and the classic layout. Empty when nothing passes FitCheck.
 */
export function dressTemplate(input: {
  structure: string;
  dimensions: BoxDimensions;
  occasion?: string | null;
  title: string;
  seed?: string;
}): CanvasElement[] {
  const structure = input.structure as Product["structure"];
  if (!MAIN_PANEL[structure]) return [];
  const kits = STYLE_KITS.filter((kit) => kit.occasion === input.occasion);
  const pool = kits.length ? kits : STYLE_KITS.filter((kit) => kit.occasion === "MINIMAL");
  const hash = [...(input.seed ?? input.title)].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const kit = pool[hash % pool.length];
  return dressWithKit({ ...input, kitId: kit.id, layout: LAYOUTS[hash % LAYOUTS.length] });
}

/**
 * Elements of one style kit dressed on a box (the studio's "apply a style"): the first layout that passes FitCheck,
 * starting with `layout`. The title shows the first words of `title`. Empty when nothing passes.
 */
export function dressWithKit(input: {
  structure: string;
  dimensions: BoxDimensions;
  kitId: string;
  title: string;
  layout?: TemplateLayout;
  formulaVersion?: number;
}): CanvasElement[] {
  const structure = input.structure as Product["structure"];
  const kit = STYLE_KITS.find((k) => k.id === input.kitId);
  if (!MAIN_PANEL[structure] || !kit) return [];
  const words = input.title.split(/[—–-]/)[0].trim().split(/\s+/).slice(0, 4).join(" ") || kit.name;
  const product: Product = { id: "custom", industry: kit.industries[0], structure, dimensions: input.dimensions, name: words, detail: kit.tagline, info: [] };
  const pieces = generateDielinePieces(structure, input.dimensions, input.formulaVersion);
  const order = [input.layout ?? "classic", ...LAYOUTS].filter((layout, i, all) => all.indexOf(layout) === i);
  for (const layout of order) {
    const elements = dress(product, kit, layout, pieces);
    if (!checkBox(pieces, elements).violations.some((v) => v.severity !== "info")) return elements;
  }
  return [];
}

export const TEMPLATE_LAYOUTS: { id: TemplateLayout; name: string }[] = LAYOUTS.map((id) => ({ id, name: LAYOUT_NAMES[id] }));
