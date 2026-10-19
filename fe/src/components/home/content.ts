import type { LucideIcon } from "lucide-react";
import { FileDown, MessageCircleMore, Package, Ruler, ShieldCheck } from "lucide-react";
import { ROUTES } from "@/constants";
import { PLANS as TIERS, formatQuota, formatUsd } from "@/features/pricing";
import { PHOTOS } from "@/features/site/photos";
import type { Industry, Occasion } from "@/types/api";

// Copy, photos and links of the home page. The layout follows the pack.ly home page; the photos are the shared library
// of features/site/photos (public/photos). Keep the copy short and in Vietnamese: one idea per line.

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
  slogan: "Mỗi món quà, trọn vẹn tâm ý.",
  title: "Mỗi món quà,",
  highlight: "Trọn vẹn tâm ý.",
  cta: { label: "Tất cả mẫu hộp", href: ROUTES.templates },
};

export const HERO_FEATURES: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Ruler, label: "Khuôn bế theo mm", href: ROUTES.editorNew },
  { icon: Package, label: "Cấu trúc hộp chuẩn", href: `#${ANCHORS.structures}` },
  { icon: ShieldCheck, label: "Soát lỗi trước in", href: `#${ANCHORS.fitcheck}` },
  { icon: MessageCircleMore, label: "Trợ lý Gói", href: `#${ANCHORS.copilot}` },
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
    description: "Hộp vừa khít từng chai serum, lọ kem.",
    image: PHOTOS.cosmetics.src,
    href: byIndustry("COSMETICS"),
  },
  { title: "Nến thơm", image: PHOTOS.candle.src, href: byIndustry("CANDLES") },
  { title: "Bánh ngọt & socola", image: PHOTOS.chocolate.src, href: byIndustry("BAKERY") },
  { title: "Trang sức", image: PHOTOS.jewelry.src, href: byIndustry("JEWELRY") },
  { title: "Trà & nông sản", image: PHOTOS.teaSet.src, href: byIndustry("TEA_AGRI") },
];

export const STRUCTURES_SECTION = {
  title: "Hộp theo cấu trúc",
  subtitle: "Chọn kiểu hộp hợp với món quà của bạn.",
  href: ROUTES.templates,
};

export const INDUSTRIES_SECTION = {
  title: "Bao bì theo ngành hàng",
  subtitle: "Mẫu hộp theo ngành hàng và dịp tặng quà.",
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
  { title: "Mỹ phẩm", kind: "Ngành hàng", image: PHOTOS.cosmetics.src, href: byIndustry("COSMETICS"), recommendedStructure: "Hộp nắp gài", templateCount: "48+ mẫu", badge: "Bán chạy" },
  { title: "Nến thơm", kind: "Ngành hàng", image: PHOTOS.candleJars.src, href: byIndustry("CANDLES"), recommendedStructure: "Hộp nắp gài đáy khóa", templateCount: "32+ mẫu" },
  { title: "Bánh ngọt", kind: "Ngành hàng", image: PHOTOS.macarons.src, href: byIndustry("BAKERY"), recommendedStructure: "Hộp bao diêm", templateCount: "28+ mẫu" },
  { title: "Trang sức", kind: "Ngành hàng", image: PHOTOS.necklaceBox.src, href: byIndustry("JEWELRY"), recommendedStructure: "Hộp âm dương", templateCount: "42+ mẫu" },
  { title: "Trà & nông sản", kind: "Ngành hàng", image: PHOTOS.tea.src, href: byIndustry("TEA_AGRI"), recommendedStructure: "Hộp nắp gài giấy kraft", templateCount: "35+ mẫu" },
  { title: "Tết", kind: "Dịp tặng quà", image: PHOTOS.tet.src, href: byOccasion("TET"), recommendedStructure: "Hộp âm dương", templateCount: "64+ mẫu", badge: "Mùa Tết" },
  { title: "Giáng sinh", kind: "Dịp tặng quà", image: PHOTOS.christmas.src, href: byOccasion("CHRISTMAS"), recommendedStructure: "Hộp nắp gài", templateCount: "30+ mẫu" },
  { title: "Cưới hỏi", kind: "Dịp tặng quà", image: PHOTOS.wedding.src, href: byOccasion("WEDDING"), recommendedStructure: "Hộp gối", templateCount: "25+ mẫu" },
  { title: "Valentine", kind: "Dịp tặng quà", image: PHOTOS.valentine.src, href: byOccasion("VALENTINE"), recommendedStructure: "Hộp âm dương", templateCount: "22+ mẫu" },
  { title: "Sinh nhật", kind: "Dịp tặng quà", image: PHOTOS.birthday.src, href: byOccasion("BIRTHDAY"), recommendedStructure: "Hộp nắp gài", templateCount: "40+ mẫu" },
  { title: "Tối giản", kind: "Phong cách", image: PHOTOS.kraftDrawer.src, href: byOccasion("MINIMAL"), recommendedStructure: "Hộp bao diêm kraft", templateCount: "50+ mẫu" },
];

/** Full-width reel of product shots. */
export const PHOTO_REEL: { image: string; alt: string }[] = [
  PHOTOS.luxuryLid,
  PHOTOS.kraftTuck,
  PHOTOS.necklaceBox,
  PHOTOS.cosmetics,
  PHOTOS.tet,
  PHOTOS.blackGift,
  PHOTOS.candle,
  PHOTOS.kraftDrawer,
  PHOTOS.chocolate,
  PHOTOS.christmas,
].map(({ src, alt }) => ({ image: src, alt }));

export const CUSTOMIZE = {
  eyebrow: "Hộp may đo cho món quà",
  title: "Tùy biến toàn diện",
  body: [
    "Nhập kích thước món quà, WrapFit dựng khuôn bế vừa khít đến từng milimét.",
    "Chọn giấy, thêm hoa văn, logo, lời chúc và xem hộp gấp thành 3D.",
  ],
  cta: { label: "Tùy chỉnh ngay", href: ROUTES.editorNew },
  dimensions: { length: 120, width: 80, height: 60 },
};

export const PREVIEW_3D = {
  eyebrow: "Xem trước trực tuyến",
  title: "Xem hộp 3D trước khi in",
  body: "Mỗi thay đổi trên khuôn 2D hiện ngay trên hộp 3D. Xoay, mở nắp, gửi đường dẫn để khách cùng góp ý.",
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
    eyebrow: "In một hay cả nghìn chiếc",
    title: "File in chuẩn xưởng",
    body: "PDF vector CMYK 300 DPI tách lớp sẵn, kèm SVG và DXF cho máy cắt. Mang đến xưởng nào cũng in được.",
    cta: { label: "Thử xuất file", href: ROUTES.editorDemo },
    images: [PHOTOS.offset],
  },
  {
    id: ANCHORS.fitcheck,
    eyebrow: "Kiểm tra trước khi in",
    title: "FitCheck™: đúng ngay bản đầu",
    body: "Tự soát chữ sát nếp gấp, thiếu tràn lề, ảnh mờ. Trợ lý Gói chỉ chỗ lỗi và sửa giúp bằng một cú bấm.",
    cta: { label: "Kiểm tra thiết kế", href: ROUTES.editorNew },
    images: [PHOTOS.swatches, PHOTOS.foil],
  },
  {
    eyebrow: "Đến tay người nhận",
    title: "Mở hộp 3D bằng mã QR",
    body: "Người nhận quét mã là thấy hộp mở ra cùng lời nhắn của bạn.",
    cta: { label: "Nhập mã mở quà", href: ROUTES.unboxCode },
    images: [PHOTOS.giftHands],
  },
];

export const PLANS = {
  eyebrow: "Bảng giá minh bạch",
  title: "Chỉ từ 19.000đ / lần xuất file",
  body: "Dùng miễn phí, trả theo lần xuất hoặc 99.000đ/tháng để xuất không giới hạn.",
  cta: { label: "Xem bảng giá", href: "/pricing" },
  // The plans of /pricing, paid monthly or for a year.
  options: [
    { price: formatUsd(0), unit: "Miễn phí", detail: `${formatQuota(TIERS.FREE.storageBytes)} lưu trữ` },
    { price: formatUsd(TIERS.PAY_PER_EXPORT.price.monthly), unit: "Từng lần", detail: "Không phí duy trì" },
    ...(["STARTER", "PRO_BUSINESS"] as const).flatMap((tier) => [
      { price: formatUsd(TIERS[tier].price.yearlyPerMonth), unit: `${TIERS[tier].name} · năm`, detail: "Mỗi tháng, trả theo năm" },
      { price: formatUsd(TIERS[tier].price.monthly), unit: `${TIERS[tier].name} · tháng`, detail: "Mỗi tháng, trả theo tháng" },
    ]),
  ],
  selected: 1,
};

export const COPILOT = {
  id: ANCHORS.copilot,
  eyebrow: "Trợ lý thiết kế",
  title: "Gói luôn ở cạnh bạn",
  body: "Gói gợi ý kiểu hộp theo món quà, nhắc khi chữ lấn vùng an toàn và sửa giúp bằng một cú bấm.",
  actions: [
    { label: "Trò chuyện với Gói", href: ROUTES.editorDemo, icon: "chat" as const },
    { label: "Trung tâm hỗ trợ", href: "/support", icon: "help" as const },
  ],
  image: PHOTOS.designer,
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
  eyebrow: "Từ món quà đến xưởng in",
  title: "Hành trình một chiếc hộp",
  subtitle: "Năm bước, không cần khuôn dao, không cần biết thiết kế.",
  steps: [
    {
      stepNumber: "01",
      badge: "Đo món quà",
      badgeColor: "#005CA9",
      title: "Nhập dài, rộng, cao",
      body: "WrapFit tự cộng độ dày giấy và dung sai để hộp vừa khít món quà.",
      stat: "Vừa khít · Tự bù độ dày giấy",
      image: PHOTOS.measuring.src,
      alt: PHOTOS.measuring.alt,
      cta: { label: "Thử nhập kích thước", href: ROUTES.editorNew },
    },
    {
      stepNumber: "02",
      badge: "Thiết kế 2D & 3D",
      badgeColor: "#005CA9",
      title: "Trang trí và xem gập 3D",
      body: "Đặt hoa văn, logo trên khuôn 2D, xem ngay hộp 3D xoay 360°.",
      stat: "Đồng bộ 2D ↔ 3D",
      image: PHOTOS.sketching.src,
      alt: PHOTOS.sketching.alt,
      cta: { label: "Mở Studio", href: ROUTES.editorNew },
    },
    {
      stepNumber: "03",
      badge: "FitCheck™",
      badgeColor: "#F26522",
      title: "Soát lỗi trước khi in",
      body: "Kiểm tra vùng an toàn 3 mm, tràn lề 2 mm, ảnh từ 200 DPI và sửa nhanh một cú bấm.",
      stat: "An toàn ≥ 3 mm · Tràn lề ≥ 2 mm",
      image: PHOTOS.swatches.src,
      alt: PHOTOS.swatches.alt,
      cta: { label: "Kiểm tra với FitCheck™", href: ROUTES.editorNew },
    },
    {
      stepNumber: "04",
      badge: "Xuất file",
      badgeColor: "#6DB33F",
      title: "Xuất file và cắt kỹ thuật số",
      body: "File vector tách lớp chạy thẳng trên máy cắt phẳng, không tốn tiền làm khuôn dao.",
      stat: "Nhận in từ 20 hộp",
      image: PHOTOS.largePrinter.src,
      alt: PHOTOS.largePrinter.alt,
      cta: { label: "Xem chuẩn file xuất", href: ROUTES.editorDemo },
    },
    {
      stepNumber: "05",
      badge: "Trao quà",
      badgeColor: "#F26522",
      title: "In thử một hộp, mở quà bằng QR",
      body: "Cầm hộp mẫu trước khi in loạt. Người nhận quét QR để mở hộp 3D và đọc lời chúc.",
      stat: "In thử 1 hộp · Mở quà 3D",
      image: PHOTOS.giftHold.src,
      alt: PHOTOS.giftHold.alt,
      cta: { label: "Trải nghiệm mở quà", href: ROUTES.unboxCode },
    },
  ],
};

export const VOICES = {
  title: "Đánh giá khách hàng",
  subtitle: "Cảm nhận từ những người dùng đầu tiên",
  // Sample feedback for the demo: replace it with real reviews before launch.
  reviews: [
    { name: "Ngọc Anh", role: "Tiệm nến thơm thủ công", color: "#29B6F6", text: "Đổi cỡ hũ nến chỉ cần nhập kích thước, hộp in ra vừa khít." },
    { name: "Minh Khoa", role: "Xưởng gốm Bát Tràng", color: "#FFCA28", text: "FitCheck bắt được logo sát nếp gấp. Sửa một cú bấm là xong." },
    { name: "Thu Hà", role: "Shop trang sức bạc", color: "#26C6DA", text: "Khách quét QR thấy hộp mở ra kèm lời chúc, ai cũng thích." },
    { name: "Đức Long", role: "Thương hiệu trà Shan tuyết", color: "#42A5F5", text: "Gửi file thẳng cho xưởng, họ không phải hỏi lại gì." },
    { name: "Bảo Trâm", role: "Tiệm bánh tại nhà", color: "#AB47BC", text: "Xem hộp 3D giúp tôi chọn màu giấy mà không phải in thử nhiều lần." },
    { name: "Quang Huy", role: "Quà tặng doanh nghiệp", color: "#66BB6A", text: "Gửi đường dẫn 3D cho khách duyệt mẫu nhanh hơn hẳn gửi ảnh." },
  ],
};

export const BANNER = {
  eyebrow: "Bao bì vừa đủ",
  title: "Hộp vừa khít là hộp bền vững",
  body: "Không thừa giấy, không cần nhồi lót, không in hỏng.",
  image: PHOTOS.kraftTwine.src,
};

export const MADE_IN = {
  eyebrow: "Thiết kế tại Việt Nam",
  title: "Nối người làm quà với xưởng in",
  body: "Tiếng Việt, đơn vị milimét, giấy quen thuộc. Xưởng nhận file đã duyệt, sẵn sàng lên máy.",
  images: [PHOTOS.offset, PHOTOS.warehouse, PHOTOS.delivery],
};
