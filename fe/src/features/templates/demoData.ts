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
    paperThickness: { min: 0.15, max: 0.8 },
  },
}));

export const DEMO_CURATED_TEMPLATES: CuratedCard[] = [
  // --- HỘP ÂM DƯƠNG (LID & BASE) ---
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
    id: "curated-ceramic-cup-lidbase",
    title: "Hộp Âm Dương Cốc Gốm Mộc Nghệ Nhân",
    description: "Cấu trúc hai mảnh nắp chụp chắc chắn, đệm lót chống vỡ cho sản phẩm thủ công mỹ nghệ.",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "MINIMAL",
    industry: "CANDLES",
    dimensions: { length: 120, width: 120, height: 110, paperThickness: caliperOf(350) },
    materialSpec: { type: "duplex", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["gốm mộc", "thủ công", "cốc", "hộp cứng"],
    usesCount: 440,
  },
  {
    id: "curated-pearl-jewelry-lidbase",
    title: "Hộp Âm Dương Khuyên Tai Ngọc Trai Phú Quốc",
    description: "Tone trắng ngọc trai thanh lịch kết hợp nắp rời bo góc tỉ mỉ tôn vinh nữ trang quý phái.",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "VALENTINE",
    industry: "JEWELRY",
    dimensions: { length: 100, width: 100, height: 45, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["ngọc trai", "trang sức", "phú quốc", "nắp rời"],
    usesCount: 680,
  },
  {
    id: "curated-mooncake-heritage-lidbase",
    title: "Hộp Âm Dương Bánh Trung Thu Trăng Rằm",
    description: "Hộp 4 bánh trung thu cao cấp với họa tiết hoa sen dập nổi vàng kim truyền thống.",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "TET",
    industry: "BAKERY",
    dimensions: { length: 240, width: 240, height: 65, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["trung thu", "bánh nướng", "hoàng kim", "luxury"],
    usesCount: 950,
  },
  {
    id: "curated-bird-nest-lidbase",
    title: "Hộp Âm Dương Yến Sào Khánh Hòa Thượng Phẩm",
    description: "Quy chuẩn hộp quà biếu VIP bề thế, giữ cố định hũ yến chưng đường phèn tinh chế.",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "TET",
    industry: "TEA_AGRI",
    dimensions: { length: 250, width: 180, height: 80, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["yến sào", "khánh hòa", "thượng phẩm", "quà biếu vip"],
    usesCount: 990,
  },

  // --- HỘP NẮP GÀI ĐÁY KHÓA (TUCK TOP) ---
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
  {
    id: "curated-coffee-box-tuck",
    title: "Hộp Cà Phê Đặc Sản Robusta Măng Đen",
    description: "Chất liệu Kraft mộc phong trần, đáy khóa chịu tải 500g hạt cà phê rang xay cao cấp.",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "MINIMAL",
    industry: "TEA_AGRI",
    dimensions: { length: 110, width: 70, height: 160, paperThickness: caliperOf(350) },
    materialSpec: { type: "kraft", gsm: 350, caliper: caliperOf(350), finish: "raw" },
    thumbnailUrl: null,
    tags: ["cà phê", "măng đen", "đặc sản", "kraft"],
    usesCount: 530,
  },
  {
    id: "curated-sandalwood-candle-tuck",
    title: "Hộp Nắp Gài Nến Trầm Sandalwood & Amber",
    description: "Tone màu ấm áp mùa đông, viền cấn dao sắc sảo, chống xê dịch hũ nến khi vận chuyển.",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "CHRISTMAS",
    industry: "CANDLES",
    dimensions: { length: 95, width: 95, height: 115, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["nến thơm", "trầm hương", "giáng sinh", "quà ấm áp"],
    usesCount: 390,
  },
  {
    id: "curated-organic-soap-tuck",
    title: "Hộp Xà Bông Nghệ Mật Ong Hữu Cơ",
    description: "Kích thước vừa khít bánh xà phòng thảo dược, có khe thoáng khí tự nhiên.",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "MINIMAL",
    industry: "COSMETICS",
    dimensions: { length: 90, width: 65, height: 35, paperThickness: caliperOf(300) },
    materialSpec: { type: "kraft", gsm: 300, caliper: caliperOf(300), finish: "raw" },
    thumbnailUrl: null,
    tags: ["xà bông", "thảo mộc", "organic", "eco"],
    usesCount: 520,
  },

  // --- HỘP BAO DIÊM (SLEEVE & DRAWER) ---
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
    id: "curated-chocolate-bonbon-sleeve",
    title: "Hộp Khay Rút Socola Bonbon 9 Viên Tình Nhân",
    description: "Vỏ ngoài cán màng nhung mịn, khay kéo kèm dải ruy băng tinh tế cho ngày lễ tình nhân.",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "VALENTINE",
    industry: "BAKERY",
    dimensions: { length: 150, width: 150, height: 40, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["socola", "valentine", "bonbon", "khay rút"],
    usesCount: 760,
  },
  {
    id: "curated-perfume-sleeve",
    title: "Hộp Khay Rút Nước Hoa Mini Discovery Set",
    description: "Cấu trúc trượt cao cấp dành cho 3 chai nước hoa chiết 10ml, đệm mút cố định chuẩn.",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "BIRTHDAY",
    industry: "COSMETICS",
    dimensions: { length: 160, width: 90, height: 30, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["nước hoa", "discovery set", "mỹ phẩm", "khay rút"],
    usesCount: 590,
  },
  {
    id: "curated-cookies-christmas-sleeve",
    title: "Hộp Khay Rút Bánh Quy Gừng Giáng Sinh",
    description: "Họa tiết người tuyết Bắc Âu, nắp bao trượt êm ái bảo vệ bánh quy không bị vỡ.",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "CHRISTMAS",
    industry: "BAKERY",
    dimensions: { length: 170, width: 80, height: 50, paperThickness: caliperOf(300) },
    materialSpec: { type: "duplex", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["giáng sinh", "bánh gừng", "khay rút", "noel"],
    usesCount: 610,
  },
  {
    id: "curated-wedding-sleeve-favor",
    title: "Khay Rút Quà Cưới Thiệp Mừng & Socola",
    description: "Mẫu bao diêm thanh nhã dành cho quà cảm ơn khách mời tiệc cưới sang trọng.",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "WEDDING",
    industry: "JEWELRY",
    dimensions: { length: 130, width: 80, height: 35, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["cưới hỏi", "khay rút", "quà cảm ơn", "socola"],
    usesCount: 470,
  },

  // --- HỘP GỐI CÁNH CUNG (PILLOW BOX) ---
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
    id: "curated-pillow-wedding-favor",
    title: "Hộp Gối Kẹo Cưới Cảm Ơn Thank You",
    description: "Gấp siêu nhanh chỉ trong 3 giây, hoàn hảo để chia kẹo ngọt tri ân ngày cưới.",
    structure: { id: "pillow", name: "Hộp Gối Cánh Cung" },
    occasion: "WEDDING",
    industry: "BAKERY",
    dimensions: { length: 110, width: 75, height: 25, paperThickness: caliperOf(280) },
    materialSpec: { type: "ivory", gsm: 280, caliper: caliperOf(280), finish: "matte" },
    thumbnailUrl: null,
    tags: ["kẹo cưới", "cảm ơn", "hộp gối", "wedding favor"],
    usesCount: 810,
  },
  {
    id: "curated-pillow-accessory-kraft",
    title: "Hộp Gối Kraft Cà Vạt & Nơ Cổ Chú Rể",
    description: "Giấy Kraft nâu mộc mang phong cách vintage cổ điển cho phụ kiện thời trang nam.",
    structure: { id: "pillow", name: "Hộp Gối Cánh Cung" },
    occasion: "WEDDING",
    industry: "JEWELRY",
    dimensions: { length: 180, width: 120, height: 40, paperThickness: caliperOf(300) },
    materialSpec: { type: "kraft", gsm: 300, caliper: caliperOf(300), finish: "raw" },
    thumbnailUrl: null,
    tags: ["cà vạt", "chú rể", "kraft", "hộp gối"],
    usesCount: 460,
  },
  {
    id: "curated-brocade-pillow",
    title: "Hộp Gối Vải Thổ Cẩm & Vòng Tay Chỉ Đỏ",
    description: "Đường cong bán nguyệt độc đáo biểu trưng cho may mắn, tài lộc dịp đầu xuân.",
    structure: { id: "pillow", name: "Hộp Gối Cánh Cung" },
    occasion: "TET",
    industry: "JEWELRY",
    dimensions: { length: 140, width: 90, height: 30, paperThickness: caliperOf(280) },
    materialSpec: { type: "ivory", gsm: 280, caliper: caliperOf(280), finish: "matte" },
    thumbnailUrl: null,
    tags: ["thổ cẩm", "chỉ đỏ", "may mắn", "hộp gối"],
    usesCount: 480,
  },
  {
    id: "curated-pillow-lipstick-valentine",
    title: "Hộp Gối Cánh Cung Son Môi & Nơ Lụa",
    description: "Kiểu dáng nhỏ gọn xinh xắn dành riêng cho thỏi son môi và thiệp nhắn gửi yêu thương.",
    structure: { id: "pillow", name: "Hộp Gối Cánh Cung" },
    occasion: "VALENTINE",
    industry: "COSMETICS",
    dimensions: { length: 130, width: 85, height: 30, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["son môi", "valentine", "hộp gối", "nơ lụa"],
    usesCount: 550,
  },

  // --- TEM NHÃN & ĐAI GIẤY (STICKER / DECAL) ---
  {
    id: "curated-sticker-kraft-belt",
    title: "Đai Giấy Kraft Bọc Hộp Trơn Belly Band",
    description: "Dải đai giấy quấn quanh hộp trơn có sẵn, tiết kiệm 80% chi phí làm hộp mới.",
    structure: { id: "sticker-label", name: "Tem Nhãn & Đai Giấy (Sticker / Decal)" },
    occasion: "MINIMAL",
    industry: "TEA_AGRI",
    dimensions: { length: 280, width: 60, height: 2, paperThickness: 0.18 },
    materialSpec: { type: "kraft", gsm: 250, caliper: 0.18, finish: "raw" },
    thumbnailUrl: null,
    tags: ["đai giấy", "belly band", "kraft", "tối giản", "hộp trơn"],
    usesCount: 710,
  },
  {
    id: "curated-sticker-round-seal",
    title: "Bộ Tem Tròn Niêm Phong Hộp Quà Handmade",
    description: "Tem decal dán miệng nắp hộp với logo và dòng chữ cảm ơn chân thành.",
    structure: { id: "sticker-label", name: "Tem Nhãn & Đai Giấy (Sticker / Decal)" },
    occasion: "BIRTHDAY",
    industry: "CANDLES",
    dimensions: { length: 50, width: 50, height: 2, paperThickness: 0.15 },
    materialSpec: { type: "ivory", gsm: 160, caliper: 0.15, finish: "glossy" },
    thumbnailUrl: null,
    tags: ["tem niêm phong", "decal", "sticker", "handmade"],
    usesCount: 890,
  },
  {
    id: "curated-sticker-wedding-gold",
    title: "Nhãn Dán Song Hỷ Ép Nhũ Vàng Hỷ Sự",
    description: "Nhãn decal bóc dán lên thiệp mời hoặc hộp quà tân hôn tạo điểm nhấn sang quý.",
    structure: { id: "sticker-label", name: "Tem Nhãn & Đai Giấy (Sticker / Decal)" },
    occasion: "WEDDING",
    industry: "JEWELRY",
    dimensions: { length: 80, width: 40, height: 2, paperThickness: 0.16 },
    materialSpec: { type: "ivory", gsm: 180, caliper: 0.16, finish: "glossy" },
    thumbnailUrl: null,
    tags: ["song hỷ", "cưới hỏi", "ép nhũ", "tem dán"],
    usesCount: 640,
  },
  {
    id: "curated-sticker-tet-band",
    title: "Đai Giấy Chúc Mừng Năm Mới An Khang Thịnh Vượng",
    description: "Đai bọc hộp quà bánh Tết in màu đỏ tươi mang thông điệp phát tài phát lộc.",
    structure: { id: "sticker-label", name: "Tem Nhãn & Đai Giấy (Sticker / Decal)" },
    occasion: "TET",
    industry: "BAKERY",
    dimensions: { length: 320, width: 70, height: 2, paperThickness: 0.2 },
    materialSpec: { type: "ivory", gsm: 250, caliper: 0.2, finish: "matte" },
    thumbnailUrl: null,
    tags: ["đai giấy", "tết", "chúc mừng năm mới", "bánh mứt"],
    usesCount: 920,
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
  {
    slug: "coc-gom-su-bat-trang-lidbase",
    title: "Hộp Âm Dương Cốc Men Hỏa Biến Bát Tràng",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "MINIMAL",
    industry: "CANDLES",
    dimensions: { length: 125, width: 125, height: 115, paperThickness: caliperOf(350) },
    materialSpec: { type: "kraft", gsm: 350, caliper: caliperOf(350), finish: "raw" },
    thumbnailUrl: null,
    tags: ["gốm bát tràng", "thủ công", "cốc sứ", "hộp âm dương"],
    usesCount: 36,
    likesCount: 58,
    viewsCount: 220,
    fitcheckScore: 99,
    author: { fullName: "Quang Huy", shopName: "Gốm Mộc Bát Tràng", avatarUrl: null },
  },
  {
    slug: "tra-oolong-bao-loc-tuck",
    title: "Hộp Nắp Gài Trà Oolong Thuần Khiết Bảo Lộc",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "TET",
    industry: "TEA_AGRI",
    dimensions: { length: 80, width: 80, height: 150, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "matte" },
    thumbnailUrl: null,
    tags: ["trà oolong", "bảo lộc", "nông sản", "tết"],
    usesCount: 49,
    likesCount: 71,
    viewsCount: 310,
    fitcheckScore: 97,
    author: { fullName: "Đức Trí", shopName: "Trà Cao Nguyên", avatarUrl: null },
  },
  {
    slug: "vong-tay-da-phong-thuy-sleeve",
    title: "Khay Rút Vòng Tay Thạch Anh Phong Thủy",
    structure: { id: "sleeve-drawer", name: "Hộp Bao Diêm (Khay Rút)" },
    occasion: "BIRTHDAY",
    industry: "JEWELRY",
    dimensions: { length: 105, width: 105, height: 35, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["phong thủy", "thạch anh", "vòng tay", "khay rút"],
    usesCount: 27,
    likesCount: 39,
    viewsCount: 160,
    fitcheckScore: 100,
    author: { fullName: "Minh Thư", shopName: "An Gemstones", avatarUrl: null },
  },
  {
    slug: "keo-deo-trai-cay-pillow",
    title: "Hộp Gối Kẹo Dẻo Trái Cây Nhiệt Đới",
    structure: { id: "pillow", name: "Hộp Gối Cánh Cung" },
    occasion: "BIRTHDAY",
    industry: "BAKERY",
    dimensions: { length: 150, width: 100, height: 30, paperThickness: caliperOf(280) },
    materialSpec: { type: "duplex", gsm: 280, caliper: caliperOf(280), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["kẹo dẻo", "sinh nhật", "trái cây", "hộp gối"],
    usesCount: 33,
    likesCount: 45,
    viewsCount: 190,
    fitcheckScore: 95,
    author: { fullName: "Phương Linh", shopName: "Linh Sweeties", avatarUrl: null },
  },
  {
    slug: "dai-giay-kraft-banh-quy-belly",
    title: "Đai Giấy Quấn Hộp Bánh Quy Bơ Thảo Mộc",
    structure: { id: "sticker-label", name: "Tem Nhãn & Đai Giấy (Sticker / Decal)" },
    occasion: "MINIMAL",
    industry: "BAKERY",
    dimensions: { length: 260, width: 50, height: 2, paperThickness: 0.18 },
    materialSpec: { type: "kraft", gsm: 250, caliper: 0.18, finish: "raw" },
    thumbnailUrl: null,
    tags: ["đai giấy", "bánh quy", "belly band", "handmade"],
    usesCount: 42,
    likesCount: 65,
    viewsCount: 275,
    fitcheckScore: 100,
    author: { fullName: "Chị Linh DIY", shopName: "Bếp Bánh Handmade", avatarUrl: null },
  },
  {
    slug: "tem-decal-lo-mat-ong-rung",
    title: "Tem Decal Dán Hũ Mật Ong Rừng Tây Bắc",
    structure: { id: "sticker-label", name: "Tem Nhãn & Đai Giấy (Sticker / Decal)" },
    occasion: "MINIMAL",
    industry: "TEA_AGRI",
    dimensions: { length: 70, width: 45, height: 2, paperThickness: 0.15 },
    materialSpec: { type: "ivory", gsm: 160, caliper: 0.15, finish: "matte" },
    thumbnailUrl: null,
    tags: ["tem nhãn", "mật ong", "decal", "tây bắc"],
    usesCount: 37,
    likesCount: 52,
    viewsCount: 215,
    fitcheckScore: 98,
    author: { fullName: "Văn Hùng", shopName: "Nông Sản Tây Bắc", avatarUrl: null },
  },
  {
    slug: "hop-qua-noel-gingerbread-tuck",
    title: "Hộp Nắp Gài Bánh Quy Gừng Giáng Sinh",
    structure: { id: "tuck-top", name: "Hộp Nắp Gài Đáy Khóa" },
    occasion: "CHRISTMAS",
    industry: "BAKERY",
    dimensions: { length: 140, width: 90, height: 60, paperThickness: caliperOf(300) },
    materialSpec: { type: "ivory", gsm: 300, caliper: caliperOf(300), finish: "matte" },
    thumbnailUrl: null,
    tags: ["giáng sinh", "noel", "bánh gừng", "nắp gài"],
    usesCount: 44,
    likesCount: 61,
    viewsCount: 260,
    fitcheckScore: 96,
    author: { fullName: "Tiểu My", shopName: "My Bakery House", avatarUrl: null },
  },
  {
    slug: "hop-am-duong-set-tra-hoa-cuc-lidbase",
    title: "Hộp Âm Dương Set Trà Hoa Cúc Tiến Vua",
    structure: { id: "lid-base", name: "Hộp Âm Dương (Nắp Rời)" },
    occasion: "TET",
    industry: "TEA_AGRI",
    dimensions: { length: 200, width: 140, height: 75, paperThickness: caliperOf(350) },
    materialSpec: { type: "ivory", gsm: 350, caliper: caliperOf(350), finish: "glossy" },
    thumbnailUrl: null,
    tags: ["trà hoa cúc", "tiến vua", "quà biếu tết", "âm dương"],
    usesCount: 53,
    likesCount: 78,
    viewsCount: 340,
    fitcheckScore: 99,
    author: { fullName: "Bảo Trâm", shopName: "Trâm Trà Quán", avatarUrl: null },
  },
];

const DEFAULT_LIMITS: DimensionLimits = {
  length: { min: 20, max: 400 },
  width: { min: 20, max: 300 },
  height: { min: 15, max: 300 },
  paperThickness: { min: 0.15, max: 0.8 },
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
    // Match partial keyword or fallback
    community =
      DEMO_COMMUNITY_TEMPLATES.find(
        (p) =>
          slug.includes(p.slug.split("-")[0]) ||
          p.tags.some((t) => slug.includes(t)) ||
          slug.includes(p.structure.id),
      ) ?? DEMO_COMMUNITY_TEMPLATES[0];
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
