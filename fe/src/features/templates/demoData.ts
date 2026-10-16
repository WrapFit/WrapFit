import type {
  BoxDimensions,
  BoxStructureType,
  CanvasState,
  MaterialSpecification,
  MaterialType,
} from "@wrapfit/shared";
import { caliperOf } from "@wrapfit/shared";
import type {
  BoxStructure,
  CommunityCard,
  CuratedCard,
  DimensionLimits,
  Industry,
  Occasion,
  Paginated,
  PublicProject,
  TemplateDetail,
} from "@/types/api";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import type { HubFilters } from "./hooks";

export const DEMO_BOX_STRUCTURES: BoxStructure[] = BOX_STRUCTURES.map((s) => ({
  id: s.id,
  name: s.vietnameseName,
  category: "Tiêu chuẩn",
  description: s.description,
  preview3dUrl: null,
  dimensionLimits: {
    length: { min: 20, max: 400 },
    width: { min: 20, max: 300 },
    height: { min: 15, max: 300 },
    paperThickness: { min: 0.2, max: 0.8 },
  },
}));

export const DEMO_CURATED_TEMPLATES: CuratedCard[] = [
  {
    id: "curated-tet-luxury",
    title: "Hộp Quà Tết Hoàng Kim — Ép Kim Đỏ Thắm",
    description: "Mẫu hộp âm dương nắp rời sang trọng cho set quà Tết, trà thượng hạng và bánh mứt.",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "TET",
    industry: "TEA_AGRI",
    dimensions: { length: 220, width: 160, height: 70, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["tết", "quà tặng", "ép kim", "sang trọng"],
    usesCount: 842,
  },
  {
    id: "curated-candle-minimal",
    title: "Hộp Nến Thơm Mộc Botanical",
    description: "Cấu trúc nắp gài đáy khóa chắc chắn, chất liệu Kraft mộc tự nhiên bảo vệ hũ nến thủy tinh.",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "MINIMAL",
    industry: "CANDLES",
    dimensions: { length: 90, width: 90, height: 110, paperThickness: caliperOf(300) },
    materialSpec: { type: "kraft", gsm: 300, caliper: caliperOf(300), finish: "raw" },
    thumbnailUrl: null,
    tags: ["nến thơm", "kraft", "tối giản", "eco"],
    usesCount: 654,
  },
  {
    id: "curated-jewelry-drawer",
    title: "Hộp Khay Rút Trang Sức Velvet Noir",
    description: "Bao diêm trượt mượt mà dành cho nhẫn cưới, dây chuyền và vòng tay cao cấp.",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "VALENTINE",
    industry: "JEWELRY",
    dimensions: { length: 120, width: 85, height: 35, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["trang sức", "valentine", "khay rút", "luxury"],
    usesCount: 512,
  },
  {
    id: "curated-pillow-silk",
    title: "Hộp Gối Cánh Cung Khăn Lụa & Phụ Kiện",
    description: "Đường gấp cong mềm mại lý tưởng cho khăn lụa tơ tằm, cravat và phụ kiện handmade.",
    structure: { id: "pillow", name: "Hộp Gối Cánh Cung" },
    occasion: "WEDDING",
    industry: "COSMETICS",
    dimensions: { length: 160, width: 105, height: 35, paperThickness: caliperOf(280) },
    materialSpec: { type: "duplex", gsm: 280, caliper: caliperOf(280), finish: "matte" },
    thumbnailUrl: null,
    tags: ["cưới hỏi", "lụa", "phụ kiện", "hộp gối"],
    usesCount: 389,
  },
  {
    id: "curated-cosmetics-gift",
    title: "Set Hộp Mỹ Phẩm Serum & Nước Hoa",
    description: "Cấu trúc hộp nắp gài đáy khóa chia ngăn chuẩn xác, chịu lực rơi tốt.",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "BIRTHDAY",
    industry: "COSMETICS",
    dimensions: { length: 140, width: 70, height: 150, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["mỹ phẩm", "sinh nhật", "serum", "cao cấp"],
    usesCount: 428,
  },
  {
    id: "curated-bakery-drawer",
    title: "Hộp Macaron & Bánh Ngọt Trượt Ngang",
    description: "Khay rút 5 ngăn cho macaron, bánh quy bơ thủ công, dễ dàng lấy bánh mà không biến dạng.",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "BIRTHDAY",
    industry: "BAKERY",
    dimensions: { length: 190, width: 65, height: 55, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["bánh ngọt", "macaron", "sinh nhật", "bakery"],
    usesCount: 375,
  },
  {
    id: "curated-tea-heritage",
    title: "Hộp Trà Sen Tây Hồ — Bản Di Sản",
    description: "Hộp âm dương giấy Kraft ép nhũ đồng, lưu giữ hương thơm cổ truyền của danh trà.",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "TET",
    industry: "TEA_AGRI",
    dimensions: { length: 180, width: 120, height: 85, paperThickness: caliperOf(350) },
    materialSpec: { type: "kraft", gsm: 350, caliper: caliperOf(350), finish: "raw" },
    thumbnailUrl: null,
    tags: ["trà", "tết", "di sản", "nông sản"],
    usesCount: 620,
  },
  {
    id: "curated-christmas-holiday",
    title: "Hộp Quà Giáng Sinh Noel Pine Forest",
    description: "Tone xanh thông Bắc Âu kết hợp nắp gài tiện dụng, hoàn hảo cho bánh gừng và thiệp chúc mừng.",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "CHRISTMAS",
    industry: "BAKERY",
    dimensions: { length: 150, width: 100, height: 70, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["giáng sinh", "noel", "bánh gừng", "quà tặng"],
    usesCount: 495,
  },
];

export const DEMO_COMMUNITY_TEMPLATES: CommunityCard[] = [
  {
    slug: "nen-thom-lavender-candle-studio",
    title: "Hộp Nến Thơm Lavender — An Nhiên Studio",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "BIRTHDAY",
    industry: "CANDLES",
    dimensions: { length: 85, width: 85, height: 110, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["nến thơm", "lavender", "an nhiên"],
    usesCount: 45,
    likesCount: 68,
    viewsCount: 312,
    fitcheckScore: 100,
    author: { fullName: "Hoài An", shopName: "An Nhiên Candle Studio", avatarUrl: null },
  },
  {
    slug: "trang-suc-bac-lumiere-craft",
    title: "Khay Rút Nhẫn & Dây Chuyền Bạc Ý",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "VALENTINE",
    industry: "JEWELRY",
    dimensions: { length: 110, width: 75, height: 35, paperThickness: caliperOf(300) },
    materialSpec: { type: "kraft", gsm: 300, caliper: caliperOf(300), finish: "raw" },
    thumbnailUrl: null,
    tags: ["trang sức", "bạc", "lumiere", "khay rút"],
    usesCount: 38,
    likesCount: 54,
    viewsCount: 245,
    fitcheckScore: 98,
    author: { fullName: "Quốc Bảo", shopName: "Lumière Craft", avatarUrl: null },
  },
  {
    slug: "banh-trung-thu-mo-mang",
    title: "Hộp Âm Dương 4 Bánh Trung Thu — Mơ Màng Bakery",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "MINIMAL",
    industry: "BAKERY",
    dimensions: { length: 210, width: 210, height: 60, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["bánh ngọt", "trung thu", "bakery", "mơ màng"],
    usesCount: 52,
    likesCount: 89,
    viewsCount: 430,
    fitcheckScore: 96,
    author: { fullName: "Ngọc Mai", shopName: "Tiệm Bánh Mơ Màng", avatarUrl: null },
  },
  {
    slug: "tinh-dau-tram-huong-hoang-gia",
    title: "Hộp Nắp Gài Chai Tinh Dầu Trầm Hương",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "TET",
    industry: "TEA_AGRI",
    dimensions: { length: 60, width: 60, height: 120, paperThickness: caliperOf(350) },
    materialSpec: { type: "duplex", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["trầm hương", "tinh dầu", "tết", "quà biếu"],
    usesCount: 29,
    likesCount: 43,
    viewsCount: 198,
    fitcheckScore: 95,
    author: { fullName: "Hoàng Minh", shopName: "Trầm Hương Hoàng Gia", avatarUrl: null },
  },
  {
    slug: "khan-lua-ha-dong-van-silk",
    title: "Hộp Gối Cánh Cung Khăn Lụa Vạn Phúc",
    structure: { id: "pillow", name: "Hộp Gối Cánh Cung" },
    occasion: "WEDDING",
    industry: "COSMETICS",
    dimensions: { length: 170, width: 110, height: 35, paperThickness: caliperOf(280) },
    materialSpec: { type: "kraft", gsm: 280, caliper: caliperOf(280), finish: "raw" },
    thumbnailUrl: null,
    tags: ["lụa", "vạn phúc", "cưới hỏi", "handmade"],
    usesCount: 31,
    likesCount: 37,
    viewsCount: 175,
    fitcheckScore: 94,
    author: { fullName: "Thanh Vân", shopName: "Vân Silk Workshop", avatarUrl: null },
  },
  {
    slug: "set-son-duong-handmade-organic",
    title: "Hộp Khay Rút Set 3 Son Dưỡng Hữu Cơ",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "CHRISTMAS",
    industry: "COSMETICS",
    dimensions: { length: 130, width: 70, height: 28, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["son dưỡng", "hữu cơ", "mỹ phẩm", "giáng sinh"],
    usesCount: 41,
    likesCount: 62,
    viewsCount: 280,
    fitcheckScore: 97,
    author: { fullName: "Thu Trang", shopName: "Botanica Lab", avatarUrl: null },
  },
];

const DEFAULT_LIMITS: DimensionLimits = {
  length: { min: 20, max: 400 },
  width: { min: 20, max: 300 },
  height: { min: 15, max: 300 },
  paperThickness: { min: 0.2, max: 0.8 },
};

export function getDemoTemplateDetail(id: string): TemplateDetail | null {
  const card = DEMO_CURATED_TEMPLATES.find((t) => t.id === id) ?? DEMO_CURATED_TEMPLATES[0];
  if (!card) return null;
  return {
    ...card,
    canvasState: {
      elements: [],
      backgroundPattern: null,
      backgroundTheme: null,
      materialTheme: card.materialSpec.type === "kraft" ? "kraft" : "ivory",
    },
    dimensionLimits: DEFAULT_LIMITS,
  };
}

export function getDemoPublicProject(slug: string): PublicProject | null {
  // Check exact community match first
  let community = DEMO_COMMUNITY_TEMPLATES.find((p) => p.slug === slug);
  if (!community) {
    // Also match partial or dashboard demo projects
    if (slug.includes("lavender") || slug === "nen-thom-lavender") {
      community = DEMO_COMMUNITY_TEMPLATES[0];
    } else if (slug.includes("bac") || slug === "trang-suc-bac") {
      community = DEMO_COMMUNITY_TEMPLATES[1];
    } else if (slug.includes("tet") || slug === "qua-tet-hoang-kim") {
      community = DEMO_COMMUNITY_TEMPLATES[2];
    } else if (slug.includes("lua") || slug === "khan-lua-to-tam") {
      community = DEMO_COMMUNITY_TEMPLATES[4];
    } else {
      community = DEMO_COMMUNITY_TEMPLATES[0];
    }
  }

  return {
    slug,
    title: community.title,
    visibility: "PUBLIC",
    allowFork: true,
    template: community.structure,
    dimensions: community.dimensions,
    materialSpec: community.materialSpec,
    canvasState: {
      elements: [],
      backgroundPattern: null,
      backgroundTheme: null,
      materialTheme: community.materialSpec.type === "kraft" ? "kraft" : "ivory",
    },
    thumbnailUrl: community.thumbnailUrl,
    tags: community.tags,
    occasion: community.occasion,
    industry: community.industry,
    viewsCount: community.viewsCount,
    likesCount: community.likesCount,
    createdAt: "2026-10-15T08:00:00Z",
    updatedAt: "2026-10-16T10:00:00Z",
    author: community.author,
    forkedFrom: null,
    viewer: { isOwner: false, liked: false },
  };
}

export function filterCuratedTemplates(filters: Partial<HubFilters>): CuratedCard[] {
  return DEMO_CURATED_TEMPLATES.filter((item) => {
    if (filters.structure && item.structure.id !== filters.structure) return false;
    if (filters.occasion && item.occasion !== filters.occasion) return false;
    if (filters.industry && item.industry !== filters.industry) return false;
    if (filters.material && item.materialSpec?.type !== filters.material) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchStructure = item.structure.name.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchTags && !matchStructure) return false;
    }
    return true;
  });
}

export function filterCommunityTemplates(filters: Partial<HubFilters>): CommunityCard[] {
  return DEMO_COMMUNITY_TEMPLATES.filter((item) => {
    if (filters.structure && item.structure.id !== filters.structure) return false;
    if (filters.occasion && item.occasion !== filters.occasion) return false;
    if (filters.industry && item.industry !== filters.industry) return false;
    if (filters.material && item.materialSpec?.type !== filters.material) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const matchStructure = item.structure.name.toLowerCase().includes(q);
      const matchAuthor =
        item.author.fullName?.toLowerCase().includes(q) ||
        item.author.shopName?.toLowerCase().includes(q);
      if (!matchTitle && !matchTags && !matchStructure && !matchAuthor) return false;
    }
    return true;
  });
}

export function paginateTemplates<T>(items: T[], page = 1, limit = 12): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const validPage = Math.min(Math.max(1, page), totalPages);
  const start = (validPage - 1) * limit;
  const sliced = items.slice(start, start + limit);
  return {
    items: sliced,
    meta: {
      page: validPage,
      limit,
      total,
      totalPages,
    },
  };
}

export function getStructureTemplateCounts(tab: "curated" | "community"): Record<BoxStructureType, number> {
  const counts: Record<BoxStructureType, number> = {
    "tuck-top": 0,
    "sleeve-drawer": 0,
    "lid-base": 0,
    pillow: 0,
    "sticker-label": 0,
  };

  const list = tab === "curated" ? DEMO_CURATED_TEMPLATES : DEMO_COMMUNITY_TEMPLATES;
  for (const item of list) {
    if (item.structure.id in counts) {
      counts[item.structure.id]++;
    }
  }

  return counts;
}
