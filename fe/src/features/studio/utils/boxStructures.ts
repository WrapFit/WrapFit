import { caliperOf, type BoxStructureType } from "@wrapfit/shared";

// Presentation of the box structures (the API gives their names, descriptions and size limits) and quick gift sizes.

export interface BoxSizePreset {
  label: "S" | "M" | "L";
  name: string;
  description: string;
  dims: { length: number; width: number; height: number; paperThickness: number; cells?: { rows: number; cols: number } };
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
  defaultDims: { length: number; width: number; height: number; paperThickness: number; cells?: { rows: number; cols: number } };
  sizePresets?: BoxSizePreset[];
  svgPath: string; // SVG visual icon
}

export const BOX_STRUCTURES: BoxStructureOption[] = [
  {
    id: "tuck-top",
    name: "Tuck Top Box",
    vietnameseName: "Hộp nắp gài đáy khóa",
    subtitle: "Hộp bán lẻ, quà tặng phổ biến",
    description: "Cấu trúc một mảnh tích hợp nắp gài trên và khóa đáy đan chéo chịu lực cao. Tiết kiệm keo dán, sản xuất nhanh, cực kỳ chắc chắn.",
    badge: "Phổ biến nhất",
    badgeColor: "bg-fpt-orange-light text-fpt-orange-ink border-fpt-orange/30",
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
    vietnameseName: "Hộp bao diêm",
    subtitle: "Rút khay mở quà nhẹ nhàng",
    description: "Gồm bao vỏ ngoài trượt kết hợp khay kéo bên trong. Tạo cảm giác tò mò và bất ngờ khi người nhận từ từ rút món quà ra khỏi vỏ bọc.",
    badge: "Sang trọng",
    badgeColor: "bg-success-bg text-brand-forest border-success/30",
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
    vietnameseName: "Hộp âm dương",
    subtitle: "Hai mảnh chắc chắn, sang trọng",
    description: "Hai cấu trúc độc lập: Thân hộp âm và nắp hộp dương chụp khít bên ngoài. Tạo ấn tượng bề thế, vững chãi và sang trọng bậc nhất.",
    badge: "Cao cấp",
    badgeColor: "bg-warning-bg text-warning-fg border-warning/30",
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
    vietnameseName: "Hộp gối",
    subtitle: "Dáng cong mềm, gấp nhanh",
    description: "Hình dáng chiếc gối duyên dáng với hai đầu uốn cong bán nguyệt. Không cần keo dán phức tạp, gấp lại trong 3 giây.",
    badge: "Duyên dáng",
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
  {
    id: "mailer",
    name: "Mailer Box",
    vietnameseName: "Hộp nắp cài",
    subtitle: "Gửi quà, giao hàng, mở hộp",
    description: "Một mảnh giấy, không cần keo: vách đôi cuộn mép chắc tay, nắp liền cài vào mặt trước. Mở nắp là thấy ngay lời cảm ơn in ở mặt trong — hợp hộp quà giao tận nơi và bộ quà thương mại điện tử.",
    badge: "Mới",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    recommendedGifts: ["Bộ mỹ phẩm", "Bánh giao tận nơi", "Áo thun gấp", "Hộp quà doanh nghiệp"],
    recommendedPaper: "Duplex 350 GSM hoặc carton sóng E",
    foldDifficulty: "Trung bình",
    foldTimeSec: 10,
    feasibilityRate: "Không cần keo",
    defaultDims: { length: 220, width: 160, height: 70, paperThickness: caliperOf(350) },
    sizePresets: [
      { label: "S", name: "Nhỏ (Mini)", description: "Son, nước hoa mini, phụ kiện", dims: { length: 150, width: 110, height: 50, paperThickness: caliperOf(300) } },
      { label: "M", name: "Tiêu chuẩn", description: "Bộ mỹ phẩm, bánh, quà vừa", dims: { length: 220, width: 160, height: 70, paperThickness: caliperOf(350) } },
      { label: "L", name: "Lớn", description: "Áo gấp, set quà doanh nghiệp", dims: { length: 300, width: 220, height: 100, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M10 40 L50 25 L90 40 L90 75 L50 90 L10 75 Z M50 55 L50 90 M10 40 L50 55 L90 40 M50 25 L30 8 L10 40",
  },
  {
    id: "gable",
    name: "Gable Box",
    vietnameseName: "Hộp quai xách",
    subtitle: "Xách tay đi biếu, mang đi",
    description: "Thân hộp nắp gài với hai mái dốc và quai xách có lỗ xỏ tay, không cần túi giấy. Hai đầu hồi hình tam giác là chỗ đẹp để in họa tiết — hợp quà Tết, hộp bánh mang đi, set quà sự kiện.",
    badge: "Mới",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    recommendedGifts: ["Quà Tết", "Bánh mang đi", "Trà, cà phê biếu", "Quà sự kiện"],
    recommendedPaper: "Ivory hoặc Duplex 350 GSM",
    foldDifficulty: "Trung bình",
    foldTimeSec: 14,
    feasibilityRate: "Xách được ngay",
    defaultDims: { length: 180, width: 100, height: 90, paperThickness: caliperOf(350) },
    sizePresets: [
      { label: "S", name: "Nhỏ", description: "Bánh, kẹo, phụ kiện", dims: { length: 120, width: 70, height: 80, paperThickness: caliperOf(300) } },
      { label: "M", name: "Tiêu chuẩn", description: "Hộp bánh, trà biếu", dims: { length: 180, width: 100, height: 90, paperThickness: caliperOf(350) } },
      { label: "L", name: "Lớn", description: "Set quà Tết, quà sự kiện", dims: { length: 260, width: 140, height: 160, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M15 45 L85 45 L85 90 L15 90 Z M15 45 L50 22 L85 45 M40 22 L40 6 L60 6 L60 22 M44 12 L56 12",
  },
  {
    id: "insert",
    name: "Divider Insert",
    vietnameseName: "Khay chia ngăn",
    subtitle: "Lót trong hộp, chia ô từng món",
    description: "Khay lót đặt vừa lòng hộp, có vách cài chéo chia thành từng ô để chai, lọ, bánh không xô lệch khi vận chuyển. Chọn số hàng × số cột ở bước Kích thước; mỗi ô in được họa tiết riêng.",
    badge: "Mới",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    recommendedGifts: ["Set nến, tinh dầu", "Hộp bánh nhiều vị", "Bộ mỹ phẩm", "Set trà"],
    recommendedPaper: "Duplex 350 GSM hoặc carton bồi",
    foldDifficulty: "Trung bình",
    foldTimeSec: 20,
    feasibilityRate: "Đặt vừa hộp có sẵn",
    defaultDims: { length: 180, width: 120, height: 50, paperThickness: caliperOf(350), cells: { rows: 2, cols: 3 } },
    sizePresets: [
      { label: "S", name: "Hộp nhỏ", description: "4 ô: son, nước hoa mini", dims: { length: 120, width: 80, height: 40, paperThickness: caliperOf(300), cells: { rows: 2, cols: 2 } } },
      { label: "M", name: "Tiêu chuẩn", description: "6 ô: bánh, lọ tinh dầu", dims: { length: 180, width: 120, height: 50, paperThickness: caliperOf(350), cells: { rows: 2, cols: 3 } } },
      { label: "L", name: "Lớn", description: "12 ô: set bánh, socola", dims: { length: 260, width: 180, height: 40, paperThickness: caliperOf(350), cells: { rows: 3, cols: 4 } } },
    ],
    svgPath: "M10 30 L90 30 L90 80 L10 80 Z M10 55 L90 55 M37 30 L37 80 M63 30 L63 80",
  },
  {
    id: "hang-tag",
    name: "Hang Tag",
    vietnameseName: "Thẻ treo",
    subtitle: "Treo lên quai, cổ chai, móc",
    description: "Thẻ cứng vát hai góc trên, có lỗ xỏ dây. In được cả hai mặt: mặt trước logo, mặt sau lời chúc hoặc thông tin sản phẩm (mặt sau là \"Mặt trong\" trong studio).",
    badge: "Sản phẩm phẳng",
    badgeColor: "bg-success-bg text-success-fg border-success/30",
    recommendedGifts: ["Quai túi quà", "Cổ chai rượu, mật ong", "Trang sức", "Quần áo"],
    recommendedPaper: "Ivory 350 GSM hoặc Kraft 300 GSM",
    foldDifficulty: "Dễ",
    foldTimeSec: 3,
    feasibilityRate: "Không cần gấp",
    defaultDims: { length: 55, width: 1, height: 90, paperThickness: caliperOf(350) },
    sizePresets: [
      { label: "S", name: "Nhỏ", description: "Trang sức, phụ kiện", dims: { length: 40, width: 1, height: 65, paperThickness: caliperOf(300) } },
      { label: "M", name: "Tiêu chuẩn", description: "Quai túi, cổ chai", dims: { length: 55, width: 1, height: 90, paperThickness: caliperOf(350) } },
      { label: "L", name: "Lớn", description: "Quần áo, set quà", dims: { length: 70, width: 1, height: 120, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M38 15 L62 15 L75 28 L75 90 L25 90 L25 28 Z M50 24 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0",
  },
  {
    id: "folded-card",
    name: "Folded Card",
    vietnameseName: "Thiệp gấp đôi",
    subtitle: "Thiệp cảm ơn, thiệp chúc mừng",
    description: "Một tờ gấp đôi theo nếp cấn: bìa trước, bìa sau in ở mặt ngoài, lời nhắn in ở hai trang bên trong (\"Mặt trong\" trong studio). Kích thước nhập là thiệp khi đã gấp lại.",
    badge: "Sản phẩm phẳng",
    badgeColor: "bg-success-bg text-success-fg border-success/30",
    recommendedGifts: ["Thiệp cảm ơn kèm đơn", "Thiệp chúc Tết", "Thiệp sinh nhật", "Thiệp cưới"],
    recommendedPaper: "Ivory 300 GSM hoặc giấy mỹ thuật",
    foldDifficulty: "Dễ",
    foldTimeSec: 2,
    feasibilityRate: "Gấp một nếp",
    defaultDims: { length: 100, width: 1, height: 150, paperThickness: caliperOf(300) },
    sizePresets: [
      { label: "S", name: "Thiệp nhỏ", description: "Kèm đơn hàng, 90 × 90", dims: { length: 90, width: 1, height: 90, paperThickness: caliperOf(300) } },
      { label: "M", name: "A6", description: "Thiệp cảm ơn, 105 × 148", dims: { length: 105, width: 1, height: 148, paperThickness: caliperOf(300) } },
      { label: "L", name: "A5", description: "Thiệp chúc mừng, 148 × 210", dims: { length: 148, width: 1, height: 210, paperThickness: caliperOf(350) } },
    ],
    svgPath: "M50 15 L85 25 L85 90 L50 80 Z M50 15 L15 25 L15 90 L50 80",
  },
  {
    id: "belly-band",
    name: "Belly Band",
    vietnameseName: "Đai giấy bọc hộp",
    subtitle: "Khoác áo mới cho hộp trơn",
    description: "Đai giấy quấn quanh hộp có sẵn qua mặt trên, hai đầu và đáy, dán mép ở mặt dưới. Nhập kích thước phủ bì của hộp cần bọc; đai rộng khoảng 40 % chiều sâu hộp.",
    badge: "Sản phẩm phẳng",
    badgeColor: "bg-success-bg text-success-fg border-success/30",
    recommendedGifts: ["Hộp kraft trơn", "Hộp bánh có sẵn", "Hộp quà doanh nghiệp", "Hộp xà phòng"],
    recommendedPaper: "Ivory 250–300 GSM hoặc Kraft",
    foldDifficulty: "Dễ",
    foldTimeSec: 5,
    feasibilityRate: "Hộp có sẵn",
    defaultDims: { length: 200, width: 200, height: 60, paperThickness: caliperOf(300) },
    sizePresets: [
      { label: "S", name: "Hộp xà phòng", description: "Hộp 90 × 60 × 30", dims: { length: 90, width: 60, height: 30, paperThickness: caliperOf(250) } },
      { label: "M", name: "Hộp bánh vuông", description: "Hộp 200 × 200 × 60", dims: { length: 200, width: 200, height: 60, paperThickness: caliperOf(300) } },
      { label: "L", name: "Hộp quà lớn", description: "Hộp 300 × 220 × 100", dims: { length: 300, width: 220, height: 100, paperThickness: caliperOf(300) } },
    ],
    svgPath: "M10 35 L90 35 L90 80 L10 80 Z M38 35 L38 80 M62 35 L62 80",
  },
  {
    id: "sticker-label",
    name: "Sticker & Decal Label",
    vietnameseName: "Tem nhãn & đai giấy",
    subtitle: "Trang trí hộp có sẵn",
    description: "Tem decal dán nắp/miệng hộp, tem tròn niêm phong hoặc đai giấy (belly band) quấn quanh hộp trơn có sẵn. Tiết kiệm 80% chi phí làm hộp mới, in nhanh trên giấy decal A4 tại nhà.",
    badge: "Cho hộp có sẵn",
    badgeColor: "bg-success-bg text-success-fg border-success/30",
    recommendedGifts: ["Hộp kraft trơn mua sẵn", "Túi giấy kraft", "Hộp quà có sẵn", "Lọ thủy tinh"],
    recommendedPaper: "Decal giấy / Decal nhựa bóc dán 120–160 GSM",
    foldDifficulty: "Dễ",
    foldTimeSec: 1,
    feasibilityRate: "100% Khổ A4/A3",
    defaultDims: { length: 150, width: 50, height: 2, paperThickness: 0.15 },
    sizePresets: [
      { label: "S", name: "Tem tròn", description: "Tem tròn niêm phong miệng hộp 40×40mm", dims: { length: 40, width: 40, height: 2, paperThickness: 0.15 } },
      { label: "M", name: "Tem nhãn chữ nhật", description: "Tem nhãn thông tin sản phẩm 100×60mm", dims: { length: 100, width: 60, height: 2, paperThickness: 0.15 } },
      { label: "L", name: "Đai giấy (Belly Band)", description: "Đai giấy quấn quanh hộp 280×50mm", dims: { length: 280, width: 50, height: 2, paperThickness: 0.15 } },
    ],
    svgPath: "M10 30 L90 30 L90 70 L10 70 Z M20 40 L80 40 M20 50 L60 50",
  },
];

export interface GiftPreset {
  id: string;
  name: string;
  category: string;
  weight?: number; // gift weight in grams
  dims: { length: number; width: number; height: number; paperThickness: number; giftWeight?: number; bottomType?: "tuck" | "lock" };
}

/** Common gifts, measured inside the box (mm). */
export const GIFT_PRESETS: GiftPreset[] = [
  {
    id: "candle",
    name: "Hũ Nến Thơm Gỗ Thông (380g)",
    category: "Home & Craft",
    weight: 380,
    dims: { length: 85, width: 85, height: 105, paperThickness: 0.45, giftWeight: 380, bottomType: "lock" },
  },
  {
    id: "perfume",
    name: "Chai Nước Hoa 50ml (180g)",
    category: "Cosmetics",
    weight: 180,
    dims: { length: 65, width: 40, height: 120, paperThickness: 0.42, giftWeight: 180, bottomType: "tuck" },
  },
  {
    id: "jewelry",
    name: "Hộp Vòng Tay / Dây Chuyền (85g)",
    category: "Luxury",
    weight: 85,
    dims: { length: 100, width: 100, height: 60, paperThickness: 0.5, giftWeight: 85, bottomType: "tuck" },
  },
  {
    id: "lipstick",
    name: "Thỏi Son Môi Handmade (35g)",
    category: "Beauty",
    weight: 35,
    dims: { length: 28, width: 28, height: 88, paperThickness: 0.35, giftWeight: 35, bottomType: "tuck" },
  },
  {
    id: "ceramic_mug",
    name: "Cốc Gốm Mộc & Trà Hoa (420g)",
    category: "Artisan",
    weight: 420,
    dims: { length: 95, width: 95, height: 105, paperThickness: 0.48, giftWeight: 420, bottomType: "lock" },
  },
  {
    id: "macaron",
    name: "Hộp 6 Bánh Macaron (150g)",
    category: "Pastry",
    weight: 150,
    dims: { length: 180, width: 55, height: 50, paperThickness: 0.4, giftWeight: 150, bottomType: "tuck" },
  },
];
