import { caliperOf, type BoxStructureType } from "@wrapfit/shared";

// Presentation of the box structures (the API gives their names, descriptions and size limits) and quick gift sizes.

export interface BoxSizePreset {
  label: "S" | "M" | "L";
  name: string;
  description: string;
  dims: { length: number; width: number; height: number; paperThickness: number };
}

export interface BoxStructureOption {
  id: BoxStructureType;
  name: string;
  vietnameseName: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeColor: string;
  recommendedGifts: string[];
  recommendedPaper: string;
  foldDifficulty: "Dễ" | "Trung bình" | "Cao cấp";
  foldTimeSec?: number;
  feasibilityRate?: string;
  defaultDims: { length: number; width: number; height: number; paperThickness: number };
  sizePresets?: BoxSizePreset[];
  svgPath: string; // SVG visual icon
}

export const BOX_STRUCTURES: BoxStructureOption[] = [
  {
    id: "tuck-top",
    name: "Tuck Top Box",
    vietnameseName: "Hộp Nắp Gài Đáy Khóa",
    subtitle: "Mẫu hộp bán lẻ & quà tặng quốc dân",
    description: "Cấu trúc một mảnh tích hợp nắp gài trên và khóa đáy đan chéo chịu lực cao. Tiết kiệm keo dán, sản xuất nhanh, cực kỳ chắc chắn.",
    badge: "Phổ Biến Nhất",
    badgeColor: "bg-library-accent-mist text-library-accent border-library-accent/30",
    recommendedGifts: ["Hũ nến thơm", "Chai nước hoa", "Mỹ phẩm dưỡng da", "Cốc gốm sứ"],
    recommendedPaper: "Ivory 300 – 350 GSM",
    foldDifficulty: "Dễ",
    foldTimeSec: 3,
    feasibilityRate: "100% Chuẩn bế CNC",
    defaultDims: { length: 120, width: 80, height: 60, paperThickness: caliperOf(300) },
    sizePresets: [
      { label: "S", name: "Nhỏ (Mini)", description: "Mỹ phẩm, son môi, nước hoa 30ml", dims: { length: 90, width: 60, height: 45, paperThickness: caliperOf(300) } },
      { label: "M", name: "Tiêu chuẩn", description: "Hũ nến thơm, kem dưỡng, quà vừa", dims: { length: 120, width: 80, height: 60, paperThickness: caliperOf(300) } },
      { label: "L", name: "Lớn", description: "Cốc gốm, set quà tặng, chai 100ml", dims: { length: 160, width: 110, height: 80, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M10 20 L50 5 L90 20 L90 70 L50 85 L10 70 Z M50 5 L50 85 M10 20 L50 35 L90 20",
  },
  {
    id: "sleeve-drawer",
    name: "Sleeve & Drawer Box",
    vietnameseName: "Hộp Bao Diêm (Khay Rút)",
    subtitle: "Trải nghiệm mở quà trượt tinh tế",
    description: "Gồm bao vỏ ngoài trượt kết hợp khay kéo bên trong. Tạo cảm giác tò mò và bất ngờ khi người nhận từ từ rút món quà ra khỏi vỏ bọc.",
    badge: "Sang Trọng",
    badgeColor: "bg-emerald-50 text-brand-forest border-emerald-200",
    recommendedGifts: ["Socola thủ công", "Macaron", "Trang sức cao cấp", "Bộ tinh dầu"],
    recommendedPaper: "Duplex cán mờ 350 GSM hoặc Carton lạnh",
    foldDifficulty: "Trung bình",
    foldTimeSec: 8,
    feasibilityRate: "100% Khay rút êm",
    defaultDims: { length: 140, width: 90, height: 45, paperThickness: caliperOf(300) },
    sizePresets: [
      { label: "S", name: "Nhỏ (Mini)", description: "Nhẫn, vòng tay, macaron 3 cái", dims: { length: 110, width: 70, height: 35, paperThickness: caliperOf(300) } },
      { label: "M", name: "Tiêu chuẩn", description: "Socola thủ công, bộ tinh dầu", dims: { length: 140, width: 90, height: 45, paperThickness: caliperOf(300) } },
      { label: "L", name: "Lớn", description: "Khăn lụa, ví da, set quà VIP", dims: { length: 200, width: 130, height: 55, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M15 25 L85 25 L85 65 L15 65 Z M30 35 L70 35 L70 55 L30 55 Z",
  },
  {
    id: "lid-base",
    name: "Lid & Base Box",
    vietnameseName: "Hộp Âm Dương (Nắp Rời)",
    subtitle: "Đẳng cấp quà tặng cao cấp & VIP",
    description: "Hai cấu trúc độc lập: Thân hộp âm và nắp hộp dương chụp khít bên ngoài. Tạo ấn tượng bề thế, vững chãi và sang trọng bậc nhất.",
    badge: "Luxury & VIP",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    recommendedGifts: ["Đồng hồ cao cấp", "Vòng tay bạc", "Kỷ niệm chương", "Set quà tết"],
    recommendedPaper: "Carton lạnh bồi giấy mỹ thuật ép kim vàng",
    foldDifficulty: "Cao cấp",
    foldTimeSec: 12,
    feasibilityRate: "Khớp nắp âm dương",
    defaultDims: { length: 130, width: 130, height: 55, paperThickness: caliperOf(300) },
    sizePresets: [
      { label: "S", name: "Nhỏ (Mini)", description: "Dây chuyền, nhẫn kim cương, trâm cài", dims: { length: 100, width: 100, height: 40, paperThickness: caliperOf(300) } },
      { label: "M", name: "Tiêu chuẩn", description: "Đồng hồ cao cấp, kỷ niệm chương", dims: { length: 130, width: 130, height: 55, paperThickness: caliperOf(300) } },
      { label: "L", name: "Lớn", description: "Hộp quà tết, yến sào, set trà sen", dims: { length: 180, width: 180, height: 70, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M10 25 L50 10 L90 25 L50 40 Z M10 32 L50 47 L90 32 L90 75 L50 90 L10 75 Z",
  },
  {
    id: "pillow",
    name: "Pillow Box",
    vietnameseName: "Hộp Gối Cánh Cung",
    subtitle: "Đường cong mềm mại, đóng gói siêu tốc",
    description: "Hình dáng chiếc gối duyên dáng với hai đầu uốn cong bán nguyệt. Không cần keo dán phức tạp, gấp lại trong 3 giây.",
    badge: "Thủ Công & Duyên Dáng",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    recommendedGifts: ["Khăn lụa tơ tằm", "Cà vạt", "Trang sức nhỏ", "Kẹo cưới thủ công"],
    recommendedPaper: "Kraft mộc 250 – 300 GSM",
    foldDifficulty: "Dễ",
    foldTimeSec: 3,
    feasibilityRate: "Bán nguyệt tự khóa",
    defaultDims: { length: 160, width: 110, height: 35, paperThickness: caliperOf(300) },
    sizePresets: [
      { label: "S", name: "Nhỏ (Mini)", description: "Trang sức nhỏ, voucher, kẹo cưới", dims: { length: 120, width: 80, height: 25, paperThickness: caliperOf(250) } },
      { label: "M", name: "Tiêu chuẩn", description: "Khăn lụa, cà vạt, phụ kiện thời trang", dims: { length: 160, width: 110, height: 35, paperThickness: caliperOf(300) } },
      { label: "L", name: "Lớn", description: "Áo sơ mi gấp, khăn choàng lụa dài", dims: { length: 220, width: 150, height: 50, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M15 50 Q50 15 85 50 Q50 85 15 50 Z",
  },
];

export interface GiftPreset {
  id: string;
  name: string;
  category: string;
  dims: { length: number; width: number; height: number; paperThickness: number };
}

/** Common gifts, measured inside the box (mm). */
export const GIFT_PRESETS: GiftPreset[] = [
  {
    id: "candle",
    name: "Hũ Nến Thơm Gỗ Thông",
    category: "Home & Craft",
    dims: { length: 85, width: 85, height: 105, paperThickness: 0.45 },
  },
  {
    id: "perfume",
    name: "Chai Nước Hoa 50ml",
    category: "Cosmetics",
    dims: { length: 65, width: 40, height: 120, paperThickness: 0.42 },
  },
  {
    id: "jewelry",
    name: "Hộp Vòng Tay / Dây Chuyền",
    category: "Luxury",
    dims: { length: 100, width: 100, height: 60, paperThickness: 0.5 },
  },
  {
    id: "lipstick",
    name: "Thỏi Son Môi Handmade",
    category: "Beauty",
    dims: { length: 28, width: 28, height: 88, paperThickness: 0.35 },
  },
  {
    id: "ceramic_mug",
    name: "Cốc Gốm Mộc & Trà Hoa",
    category: "Artisan",
    dims: { length: 95, width: 95, height: 105, paperThickness: 0.48 },
  },
  {
    id: "macaron",
    name: "Hộp 6 Bánh Macaron",
    category: "Pastry",
    dims: { length: 180, width: 55, height: 50, paperThickness: 0.4 },
  },
];
