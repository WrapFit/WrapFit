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
} as const;

export const HERO = {
  badges: ["Đúng kích thước từng milimét", "File in CMYK 300 DPI"],
  title: "Nền tảng thiết kế",
  highlight: "hộp quà vừa khít",
  lead: "Một nơi cho cả quy trình làm hộp quà, từ đo món quà đến file in.",
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
}

export const INDUSTRY_CARDS: CatalogCard[] = [
  { title: "Mỹ phẩm", kind: "Ngành hàng", image: photo("727b7e0788de4f2f"), href: byIndustry("COSMETICS") },
  { title: "Nến thơm", kind: "Ngành hàng", image: photo("11aab61a5e6b85b3"), href: byIndustry("CANDLES") },
  { title: "Bánh ngọt", kind: "Ngành hàng", image: photo("ceb84293f215fae7"), href: byIndustry("BAKERY") },
  { title: "Trang sức", kind: "Ngành hàng", image: photo("d9bcf1d058bfb05b"), href: byIndustry("JEWELRY") },
  { title: "Trà & nông sản", kind: "Ngành hàng", image: photo("d5bab56f2c79edea"), href: byIndustry("TEA_AGRI") },
  { title: "Tết", kind: "Dịp tặng quà", image: photo("9aeea1ca61895060"), href: byOccasion("TET") },
  { title: "Giáng sinh", kind: "Dịp tặng quà", image: photo("af8c8412c159d49a"), href: byOccasion("CHRISTMAS") },
  { title: "Cưới hỏi", kind: "Dịp tặng quà", image: photo("1012c6f152a6d72f"), href: byOccasion("WEDDING") },
  { title: "Valentine", kind: "Dịp tặng quà", image: photo("d274ba3b177d39f3"), href: byOccasion("VALENTINE") },
  { title: "Sinh nhật", kind: "Dịp tặng quà", image: photo("f958a0d1ac6f013b"), href: byOccasion("BIRTHDAY") },
  { title: "Tối giản", kind: "Phong cách", image: photo("42f41003ce34a4a9"), href: byOccasion("MINIMAL") },
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
  title: "Không tốn phí thuê vẽ khuôn",
  body: "Khuôn bế được dựng tự động từ kích thước bạn nhập, nên bạn không phải trả tiền cho từng bản vẽ khuôn. Bắt đầu miễn phí với gói Free, nâng cấp khi cần thêm dung lượng lưu trữ và lượt tạo hoa văn AI. Thanh toán theo năm để tiết kiệm đến 20%.",
  cta: { label: "Xem bảng giá", href: "/pricing" },
  // The plans of /pricing, paid monthly or for a year.
  options: [
    { price: formatUsd(0), unit: "Free", detail: `Miễn phí — ${formatQuota(TIERS.FREE.storageBytes)} lưu trữ` },
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

export const JOURNEY = {
  eyebrow: "Từ ý tưởng đến tay người nhận",
  title: "Hành trình một chiếc hộp",
  steps: [
    {
      title: "Phác ý tưởng",
      body: "Mọi chiếc hộp bắt đầu từ món quà. Đo chiều dài, rộng, cao, chọn loại giấy và cấu trúc hộp — Gói gợi ý kiểu hộp hợp với món đồ của bạn.",
      image: photo("99a87a6ce2e2b8e8"),
    },
    {
      title: "Dựng khuôn & thiết kế",
      body: "Khuôn bế hiện ra đúng tỉ lệ 1:1. Kéo thả hoa văn, logo và lời chúc lên từng mặt hộp, xem ngay trên mô hình 3D.",
      image: photo("8bc6e04f24de029f"),
    },
    {
      title: "Duyệt bản in",
      body: "FitCheck™ soát vùng an toàn, tràn lề và độ phân giải. Chia sẻ đường dẫn để khách hàng duyệt mẫu trước khi in.",
      image: photo("911d50c6851db5c2"),
    },
    {
      title: "In & hoàn thiện",
      body: "File PDF tách lớp đi thẳng đến xưởng in và máy bế: in, cấn, bế, gấp — không phải vẽ lại khuôn.",
      image: photo("f7c292efc7189f00"),
    },
    {
      title: "Trao quà",
      body: "Món quà đến tay người nhận kèm mã QR: quét mã để mở chiếc hộp 3D cùng lời nhắn bạn gửi gắm.",
      image: photo("af8c8412c159d49a"),
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
