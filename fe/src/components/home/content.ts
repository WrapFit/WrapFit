import type { LucideIcon } from "lucide-react";
import { FileDown, MessageCircleMore, Package, Ruler, ShieldCheck } from "lucide-react";
import { ROUTES } from "@/constants";
import { PLANS as TIERS, formatQuota, formatUsd } from "@/features/pricing";
import type { Industry, Occasion } from "@/types/api";

// Copy, photos and links of the home page. The layout follows the pack.ly home page; the photos are WrapFit's own
// product shots (public/stitch/img).

const photo = (id: string) => `/stitch/img/${id}.jpg`;
const byIndustry = (industry: Industry) => `${ROUTES.templates}?industry=${industry}`;
const byOccasion = (occasion: Occasion) => `${ROUTES.templates}?occasion=${occasion}`;

/** Anchors of the blocks that the hero links to. */
export const ANCHORS = {
  structures: "cau-truc-hop",
  fitcheck: "fitcheck",
  export: "xuat-file",
  copilot: "copilot",
  industries: "nganh-hang",
} as const;

export const HERO = {
  slogan: "Make Every Present, Present.",
  badges: ["Đúng kích thước từng milimét", "File in CMYK 300 DPI"],
  title: "Make Every Present,",
  highlight: "Present.",
  lead: "Biến mỗi món quà thành một sự hiện diện trọn vẹn — nơi chiếc hộp được tạo tác vừa khít từ chính món quà, nâng niu thành ý người trao và tôn vinh khoảnh khắc gắn kết chân thành.",
  cta: { label: "Tất cả mẫu hộp", href: ROUTES.templates },
};

export const HERO_FEATURES: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Ruler, label: "Khuôn bế tự sinh theo mm", href: ROUTES.editorNew },
  { icon: Package, label: "4 cấu trúc hộp chuẩn", href: `#${ANCHORS.structures}` },
  { icon: ShieldCheck, label: "FitCheck™ trước khi in", href: `#${ANCHORS.fitcheck}` },
  { icon: MessageCircleMore, label: "Copilot Gói tư vấn", href: `#${ANCHORS.copilot}` },
  { icon: FileDown, label: "Xuất PDF · SVG · DXF", href: `#${ANCHORS.export}` },
];

export interface IndustryTile {
  title: string;
  description?: string;
  tag?: string;
  image: string;
  href: string;
}

/** Bento under the hero: the first tile is the big one. */
export const INDUSTRY_TILES: IndustryTile[] = [
  {
    title: "Mỹ phẩm & chăm sóc cá nhân",
    description: "Hộp và khay cho serum, nước hoa, son dưỡng — vừa khít từng chai lọ, chừa sẵn 3 mm an toàn cho chữ và logo.",
    image: photo("4c7ce7d1a5170261"),
    href: byIndustry("COSMETICS"),
  },
  { title: "Nến thơm", image: photo("5714e230a3e22084"), href: byIndustry("CANDLES") },
  { title: "Bánh ngọt & socola", image: photo("3729dc5394915422"), href: byIndustry("BAKERY") },
  { title: "Trang sức", tag: "Hộp gối", image: photo("b9f0eea12b54c317"), href: byIndustry("JEWELRY") },
  { title: "Trà & nông sản", tag: "Kraft", image: photo("45070742ddab799c"), href: byIndustry("TEA_AGRI") },
];

/** Strip under the bento: the standards and file formats WrapFit works with, set as wordmarks. */
export const STANDARDS: { label: string; className: string }[] = [
  { label: "ECMA", className: "font-landing-heading font-bold tracking-[0.2em]" },
  { label: "FEFCO", className: "font-landing-heading font-bold italic" },
  { label: "CMYK", className: "font-mono font-bold tracking-widest" },
  { label: "PDF/X", className: "font-serif font-bold italic" },
  { label: "SVG", className: "font-landing-heading font-semibold tracking-[0.3em]" },
  { label: "DXF", className: "font-mono font-bold" },
  { label: "300 DPI", className: "font-landing-heading font-bold" },
  { label: "Kraft", className: "font-serif font-semibold italic" },
];

export const STRUCTURES_SECTION = {
  title: "Hộp theo cấu trúc",
  subtitle: "Khám phá các kiểu hộp của WrapFit và chọn cấu trúc hợp nhất với món quà của bạn.",
  href: ROUTES.templates,
};

export const INDUSTRIES_SECTION = {
  title: "Bao bì theo ngành hàng",
  subtitle: "Tìm ngành hàng hay dịp tặng quà của bạn và xem những mẫu hộp hợp nhất.",
  href: ROUTES.templates,
};

export interface CatalogCard {
  title: string;
  kind: string;
  image: string;
  href: string;
  recommendedStructure?: string;
  templateCount?: string;
  badge?: string;
  categoryTag?: string;
}

export const INDUSTRY_CARDS: CatalogCard[] = [
  {
    title: "Mỹ phẩm",
    kind: "Ngành hàng",
    image: photo("727b7e0788de4f2f"),
    href: byIndustry("COSMETICS"),
    recommendedStructure: "Hộp Nắp Gài & Âm Dương",
    templateCount: "48+ mẫu",
    badge: "Bán chạy nhất",
    categoryTag: "Skincare & Beauty",
  },
  {
    title: "Nến thơm",
    kind: "Ngành hàng",
    image: photo("11aab61a5e6b85b3"),
    href: byIndustry("CANDLES"),
    recommendedStructure: "Hộp Nắp Gài Đáy Khóa",
    templateCount: "32+ mẫu",
    badge: "Thịnh hành",
    categoryTag: "Home Fragrance",
  },
  {
    title: "Bánh ngọt",
    kind: "Ngành hàng",
    image: photo("ceb84293f215fae7"),
    href: byIndustry("BAKERY"),
    recommendedStructure: "Hộp Bao Diêm Khay Rút",
    templateCount: "28+ mẫu",
    badge: "Food Safe",
    categoryTag: "Pastry & Bakery",
  },
  {
    title: "Trang sức",
    kind: "Ngành hàng",
    image: photo("d9bcf1d058bfb05b"),
    href: byIndustry("JEWELRY"),
    recommendedStructure: "Hộp Âm Dương Cao Cấp",
    templateCount: "42+ mẫu",
    badge: "Luxury & VIP",
    categoryTag: "Fine Jewelry",
  },
  {
    title: "Trà & nông sản",
    kind: "Ngành hàng",
    image: photo("d5bab56f2c79edea"),
    href: byIndustry("TEA_AGRI"),
    recommendedStructure: "Hộp Nắp Gài Giấy Kraft",
    templateCount: "35+ mẫu",
    badge: "Eco Kraft",
    categoryTag: "Nông sản Việt",
  },
  {
    title: "Tết",
    kind: "Dịp tặng quà",
    image: photo("9aeea1ca61895060"),
    href: byOccasion("TET"),
    recommendedStructure: "Hộp Âm Dương Sơn Mài",
    templateCount: "64+ mẫu",
    badge: "Lễ hội truyền thống",
    categoryTag: "Quà Tết sum vầy",
  },
  {
    title: "Giáng sinh",
    kind: "Dịp tặng quà",
    image: photo("af8c8412c159d49a"),
    href: byOccasion("CHRISTMAS"),
    recommendedStructure: "Hộp Nắp Gài Họa Tiết Thông",
    templateCount: "30+ mẫu",
    badge: "Winter Holiday",
    categoryTag: "Mùa lễ hội",
  },
  {
    title: "Cưới hỏi",
    kind: "Dịp tặng quà",
    image: photo("1012c6f152a6d72f"),
    href: byOccasion("WEDDING"),
    recommendedStructure: "Hộp Gối Cánh Cung",
    templateCount: "25+ mẫu",
    badge: "Nhã nhặn",
    categoryTag: "Hôn lễ & Cảm ơn",
  },
  {
    title: "Valentine",
    kind: "Dịp tặng quà",
    image: photo("d274ba3b177d39f3"),
    href: byOccasion("VALENTINE"),
    recommendedStructure: "Hộp Khay Rút Trái Tim",
    templateCount: "22+ mẫu",
    badge: "Sweet Love",
    categoryTag: "Tình yêu & Gắn kết",
  },
  {
    title: "Sinh nhật",
    kind: "Dịp tặng quà",
    image: photo("f958a0d1ac6f013b"),
    href: byOccasion("BIRTHDAY"),
    recommendedStructure: "Hộp Nắp Gài Sôi Động",
    templateCount: "40+ mẫu",
    badge: "Kỷ niệm tuổi mới",
    categoryTag: "Party & Birthday",
  },
  {
    title: "Tối giản",
    kind: "Phong cách",
    image: photo("42f41003ce34a4a9"),
    href: byOccasion("MINIMAL"),
    recommendedStructure: "Hộp Kraft Mộc Trơn",
    templateCount: "50+ mẫu",
    badge: "Aesop / Luma",
    categoryTag: "Minimalist Craft",
  },
];

/** Full-width reel of product shots. */
export const PHOTO_REEL: { image: string; alt: string }[] = [
  { image: photo("0d6ad47bfba44c5b"), alt: "Hộp nắp rời xanh rêu ép kim logo WrapFit" },
  { image: photo("8f3cf51318eaf072"), alt: "Hộp nắp gài giấy kraft đứng trên bàn" },
  { image: photo("1a2b00bef63aaaf6"), alt: "Hộp gối giấy kraft in logo WrapFit" },
  { image: photo("4c7ce7d1a5170261"), alt: "Hộp khay rút đựng bộ tinh dầu" },
  { image: photo("af8c8412c159d49a"), alt: "Hộp quà Tết xanh thắt nơ vàng" },
  { image: photo("d9bcf1d058bfb05b"), alt: "Hộp nam châm đen ép kim vàng" },
  { image: photo("5714e230a3e22084"), alt: "Hộp giấy mỹ thuật đựng nến thơm" },
  { image: photo("f958a0d1ac6f013b"), alt: "Hộp khay rút màu vàng in khuôn bế" },
  { image: photo("3729dc5394915422"), alt: "Hộp khay kraft đựng socola thủ công" },
  { image: photo("9aeea1ca61895060"), alt: "Hộp âm dương sơn mài cho quà Tết" },
];

export const CUSTOMIZE = {
  eyebrow: "Hộp được may đo cho món quà",
  title: "Tùy biến toàn diện",
  body: [
    "Nhập kích thước món quà thay vì chọn một cỡ hộp có sẵn. WrapFit dựng khuôn bế từ chính chiều dài, rộng, cao và độ dày giấy: từng tấm, tai gài, tai dán đều được tính lại theo milimét, nên hộp vừa khít món quà ngay từ bản in đầu tiên.",
    "Chọn giấy Ivory hay Kraft, thêm hoa văn, logo, lời chúc — rồi xem chiếc hộp gấp lại thành hình 3D.",
  ],
  cta: { label: "Tùy chỉnh ngay", href: ROUTES.editorNew },
  dimensions: { length: 120, width: 80, height: 60 },
};

export const PREVIEW_3D = {
  eyebrow: "Trải nghiệm tương tác với mô hình ảo",
  title: "Xem trước hộp 3D trực tuyến",
  body: "Duyệt mẫu nhanh hơn và bớt sai sót. Mỗi thay đổi trên khuôn bế 2D hiện ngay trên chiếc hộp 3D bên cạnh: xoay, phóng to, mở nắp, gấp từng tai để thấy hộp trông thế nào khi cầm trên tay. Gửi đường dẫn để khách hàng hay đồng nghiệp cùng xem và góp ý, không cần cài đặt gì.",
  cta: { label: "Xem trước ngay", href: ROUTES.editorDemo },
};

export interface ProductionRow {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  images: { src: string; alt: string }[];
}

/** The three rows of the big production card; the second one has its photos on the left. */
export const PRODUCTION_ROWS: ProductionRow[] = [
  {
    id: ANCHORS.export,
    eyebrow: "In một chiếc hay cả nghìn chiếc",
    title: "File in chuẩn xưởng, in ở đâu cũng được",
    body: "Xuất PDF vector CMYK 300 DPI tách lớp CutContour, Crease, Artwork và Dimensions — đúng thứ xưởng in và máy bế cần. Kèm SVG và DXF cho máy cắt plotter, laser hay bàn cắt CNC. Bạn mang file đến bất kỳ xưởng nào, in thử một hộp hay chạy cả lô.",
    cta: { label: "Thử xuất file", href: ROUTES.editorDemo },
    images: [{ src: photo("0fd63a93bcc6e79f"), alt: "Thợ in vận hành máy in offset với tờ in khuôn hộp" }],
  },
  {
    id: ANCHORS.fitcheck,
    eyebrow: "Kiểm tra trước khi in",
    title: "FitCheck™: đúng ngay từ bản đầu",
    body: "FitCheck™ soát từng chi tiết trên khuôn: chữ và logo cách đường gấp, đường cắt tối thiểu 3 mm, hình nền tràn lề 2 mm, ảnh từ 200 DPI, không chữ nào nằm đè lên tai dán. Lỗi nào cũng được chỉ rõ vị trí, và trợ lý Gói đề xuất cách sửa chỉ với một cú bấm.",
    cta: { label: "Kiểm tra thiết kế", href: ROUTES.editorNew },
    images: [
      { src: photo("583fb224c447a31f"), alt: "Nghệ nhân ép kim vàng lên giấy mỹ thuật" },
      { src: photo("d4747bd7fbdff9e6"), alt: "Mẫu thử ép kim chữ WrapFit trên giấy" },
    ],
  },
  {
    eyebrow: "Món quà đến tay người nhận",
    title: "Mở hộp 3D bằng mã QR",
    body: "In mã QR cùng món quà: người nhận quét mã là thấy chiếc hộp mở ra trong không gian 3D cùng lời nhắn của bạn. Trang của mỗi dự án có đường dẫn riêng để chia sẻ, và trang nhập mã giúp người nhận mở quà cả khi không quét được.",
    cta: { label: "Nhập mã mở quà", href: ROUTES.unboxCode },
    images: [{ src: photo("1012c6f152a6d72f"), alt: "Phong thư niêm sáp đỏ kèm lời nhắn viết tay" }],
  },
];

export const PLANS = {
  eyebrow: "Bảng giá minh bạch",
  title: "Chỉ từ 19.000đ / lần xuất file",
  body: "Tiết kiệm 95% so với Pacdora ($29–$99/tháng). Bắt đầu miễn phí với gói Free, chọn trả 19.000đ khi cần xuất file in đơn lẻ, hoặc đăng ký chỉ 99.000đ/tháng để xuất không giới hạn cho shop của bạn.",
  cta: { label: "Xem bảng giá chi tiết", href: "/pricing" },
  // The plans of /pricing, paid monthly or for a year.
  options: [
    { price: formatUsd(0), unit: "Free", detail: `Miễn phí — ${formatQuota(TIERS.FREE.storageBytes)} lưu trữ` },
    { price: formatUsd(TIERS.PAY_PER_EXPORT.price.monthly), unit: "Từng lần", detail: "19.000đ / lần — Không phí duy trì" },
    ...(["STARTER", "PRO_BUSINESS"] as const).flatMap((tier) => [
      { price: formatUsd(TIERS[tier].price.yearlyPerMonth), unit: `${TIERS[tier].name} · năm`, detail: "Mỗi tháng, thanh toán theo năm" },
      { price: formatUsd(TIERS[tier].price.monthly), unit: `${TIERS[tier].name} · tháng`, detail: "Mỗi tháng, thanh toán theo tháng" },
    ]),
  ],
  selected: 1,
};

export const COPILOT = {
  id: ANCHORS.copilot,
  eyebrow: "Trợ lý AI đóng gói",
  title: "Gói luôn ở cạnh bạn",
  body: "Gói là trợ lý thiết kế bao bì ngay trong studio. Gói gợi ý cấu trúc hộp theo món quà, nhắc khi chữ lấn vào vùng an toàn hay đè lên tai dán và sửa giúp chỉ với một cú bấm. Bế tắc ở bước nào, cứ hỏi Gói — hoặc ghé trung tâm hỗ trợ.",
  actions: [
    { label: "Trò chuyện với Gói", href: ROUTES.editorDemo, icon: "chat" as const },
    { label: "Trung tâm hỗ trợ", href: "/support", icon: "help" as const },
  ],
  image: { src: photo("52d394c3859e67b0"), alt: "Nhà thiết kế làm việc với khuôn hộp trên màn hình lớn" },
  bubble: "Chữ đang cách nếp gấp 1,8 mm — để mình đẩy vào 3 mm nhé?",
};

export interface JourneyStep {
  stepNumber: string;
  badge: string;
  badgeColor?: string;
  title: string;
  body: string;
  stat?: string;
  image: string;
  alt: string;
  cta?: { label: string; href: string };
}

export const JOURNEY: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  steps: JourneyStep[];
} = {
  eyebrow: "Quy trình chuẩn hóa từ món quà đến xưởng in",
  title: "Hành trình một chiếc hộp",
  subtitle:
    "Xóa bỏ rào cản khuôn dao bế 2 triệu VNĐ và 90% lỗi đồ họa từ Canva — đưa chiếc hộp chuẩn xác từ bản đo milimét đến tay người nhận.",
  steps: [
    {
      stepNumber: "01",
      badge: "Gift-to-Box Engine",
      badgeColor: "#005CA9",
      title: "Đo kích thước món quà (L, W, H)",
      body: "Không cần tự tính toán kích thước hộp. Bạn chỉ cần nhập chiều dài, rộng, cao của món quà. Thuật toán của WrapFit tự động bù trừ độ dày giấy (Caliper t ≈ 0.35–0.55mm) và dung sai nắp gài, tạo khuôn bế vừa khít 100%, triệt tiêu 8–10% rủi ro va đập và bể vỡ khi giao hàng.",
      stat: "Vừa khít 100% · Tự bù trừ Caliper (t)",
      image: photo("99a87a6ce2e2b8e8"),
      alt: "Đo đạc kích thước sản phẩm thủ công chính xác theo milimét",
      cta: { label: "Thử nhập kích thước", href: ROUTES.editorNew },
    },
    {
      stepNumber: "02",
      badge: "3D WebGL Origami Simulation",
      badgeColor: "#005CA9",
      title: "Studio 2D & Mô phỏng 3D gập mở",
      body: "Khắc phục triệt để điểm yếu của Canva khi không thể xem trước hình dạng gập. Studio WrapFit đồng bộ thời gian thực giữa bản vẽ 2D và không gian 3D: kéo thả hoa văn độc quyền (Seamless Pattern), đặt logo thương hiệu, và xoay 360° mở nắp gấp tai như đang cầm chiếc hộp trên tay.",
      stat: "Xoay lật 360° · Trực quan hoá thời gian thực",
      image: photo("8bc6e04f24de029f"),
      alt: "Mô phỏng gập mở 3D song song với bản vẽ trải phẳng 2D dieline",
      cta: { label: "Khám phá Studio 3D", href: ROUTES.editorNew },
    },
    {
      stepNumber: "03",
      badge: "FitCheck™ Pre-press Watchdog",
      badgeColor: "#F26522",
      title: "FitCheck™ soát lỗi trước khi in",
      body: "Chấm dứt 90% lỗi in ấn phổ biến khiến xưởng từ chối: FitCheck™ tự động quét vùng an toàn (≥3mm), đường tràn lề (bleed ≥2mm), kiểm tra độ phân giải ảnh (≥200 DPI) và bảo đảm chữ/logo không đè lên nếp cấn hay tai dán keo. Trợ lý AI 'Gói' phát hiện và đề xuất sửa nhanh chỉ với 1 cú bấm.",
      stat: "Vùng an toàn ≥3mm · Tràn lề ≥2mm · 1-Click Auto-Fix",
      image: photo("911d50c6851db5c2"),
      alt: "Kỹ thuật viên xưởng in soi kính lúp kiểm định tờ in và mẫu bế hộp",
      cta: { label: "Kiểm tra với FitCheck™", href: ROUTES.editorNew },
    },
    {
      stepNumber: "04",
      badge: "Zero MOQ Digital Cutting",
      badgeColor: "#6DB33F",
      title: "Xuất file vector & Cắt kỹ thuật số",
      body: "Bỏ qua chi phí khuôn dao sắt đắt đỏ 1.5 – 2.0 triệu VNĐ khiến xưởng truyền thống từ chối đơn nhỏ. WrapFit xuất file vector tách lớp chuẩn in công nghiệp (Đường cắt Red #E53E3E, đường cấn Blue #3182CE, CMYK 300 DPI, DXF/SVG) kết nối trực tiếp với bàn cắt phẳng kỹ thuật số để sản xuất từ 20–50 hộp.",
      stat: "Tiết kiệm 2 triệu tiền khuôn · Nhận in từ 20 hộp",
      image: photo("f7c292efc7189f00"),
      alt: "Bàn cắt kỹ thuật số không cần khuôn dao bế sắt kim loại",
      cta: { label: "Xem chuẩn file xuất", href: ROUTES.editorDemo },
    },
    {
      stepNumber: "05",
      badge: "1-Unit Physical Proof & 3D QR",
      badgeColor: "#F26522",
      title: "In mẫu thử 01 hộp & Mở quà 3D QR",
      body: "Đáp ứng mong muốn của 90.8% nhà bán hàng cần cầm mẫu thực tế trước khi in loạt. WrapFit liên kết mạng lưới xưởng in đối tác in thử 01 hộp mẫu gửi tận tay. Đồng thời, in mã QR trên nắp hộp để người nhận quà quét mã mở hộp 3D ảo và đọc lời chúc cá nhân hóa đầy cảm xúc.",
      stat: "In thử 1 hộp thực tế · Mở quà tương tác 3D QR",
      image: photo("af8c8412c159d49a"),
      alt: "Chiếc hộp quà hoàn thiện tinh xảo đính kèm mã QR mở quà trực tuyến",
      cta: { label: "Trải nghiệm mở quà 3D", href: ROUTES.unboxCode },
    },
  ],
};

export const VOICES = {
  title: "Tiếng nói khách hàng",
  subtitle: "Cảm nhận từ những người dùng đầu tiên",
  // Sample feedback for the demo: replace it with real reviews before launch.
  reviews: [
    {
      name: "Ngọc Anh",
      role: "Tiệm nến thơm thủ công",
      color: "#29B6F6",
      text: "Trước đây mỗi lần đổi cỡ hũ nến là phải nhờ người vẽ lại khuôn. Giờ chỉ cần nhập kích thước, khuôn hiện ra ngay và hộp in ra vừa khít.",
    },
    {
      name: "Minh Khoa",
      role: "Xưởng gốm Bát Tràng",
      color: "#FFCA28",
      text: "FitCheck bắt được logo nằm sát nếp gấp mà tôi không để ý. Sửa một cú bấm là xong.",
    },
    {
      name: "Thu Hà",
      role: "Shop trang sức bạc",
      color: "#26C6DA",
      text: "Hộp gối kraft cho bộ khuyên tai đẹp hơn mong đợi. Khách quét mã QR và thấy chiếc hộp mở ra kèm lời chúc, ai cũng thích.",
    },
    {
      name: "Đức Long",
      role: "Thương hiệu trà Shan tuyết",
      color: "#42A5F5",
      text: "File PDF tách lớp gửi thẳng cho xưởng in, họ không phải hỏi lại gì. Tiết kiệm cho tôi gần một tuần làm mẫu.",
    },
    {
      name: "Bảo Trâm",
      role: "Tiệm bánh tại nhà",
      color: "#AB47BC",
      text: "Xem hộp 3D trước khi in giúp tôi chọn được màu giấy ưng ý mà không phải in thử nhiều lần.",
    },
    {
      name: "Quang Huy",
      role: "Quà tặng doanh nghiệp",
      color: "#66BB6A",
      text: "Gửi đường dẫn 3D cho khách duyệt mẫu nhanh hơn hẳn gửi ảnh chụp. Hộp âm dương ép kim lên rất sang.",
    },
  ],
};

export const BANNER = {
  eyebrow: "Bao bì tự nhiên, vừa đủ",
  title: "Hộp vừa khít là hộp bền vững",
  body: "Mỗi chiếc hộp WrapFit được tính từ đúng kích thước món quà: không thừa giấy, không cần nhồi lót, không chở theo khoảng trống. Chọn giấy Kraft mộc hay Ivory, FitCheck™ lo phần còn lại để bản in đầu tiên cũng là bản dùng được — không in hỏng, không bỏ phí.",
  cta: { label: "Xem mẫu giấy Kraft", href: `${ROUTES.templates}?material=kraft` },
  image: photo("7b5628e1ca1cb23e"),
};

export const MADE_IN = {
  eyebrow: "Thiết kế tại Việt Nam",
  title: "Cầu nối giữa nhà sáng tạo và xưởng in",
  body: "WrapFit được xây dựng cho người làm quà Việt: giao diện tiếng Việt, đơn vị milimét, các loại giấy quen thuộc như Ivory, Duplex và Kraft. Tài khoản xưởng in nhận file đã được FitCheck™ duyệt, sẵn sàng lên máy — nhà sáng tạo tập trung vào món quà, xưởng tập trung vào bản in.",
  cta: { label: "Đăng ký tài khoản", href: ROUTES.register },
  images: [
    { src: photo("0fd63a93bcc6e79f"), alt: "Máy in offset trong xưởng in" },
    { src: photo("f7c292efc7189f00"), alt: "Pallet thùng carton sản xuất tại Việt Nam" },
    { src: photo("7690e8d6ff974a31"), alt: "Giao hộp quà bằng xe máy trên phố" },
  ],
};
