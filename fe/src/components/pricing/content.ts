import type { LucideIcon } from "lucide-react";
import { Boxes, FileDown, HardDrive, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { BLEED_MM, MIN_DPI, SAFE_MARGIN_MM } from "@wrapfit/shared";
import { ROUTES } from "@/constants";
import { PLANS, formatQuota, formatUsd } from "@/features/pricing";
import type { SubscriptionTier } from "@/types/api";

// Copy of /pricing, laid out after pack.ly's subscription plan page. Every limit comes from features/pricing (the
// quotas the API enforces) or @wrapfit/shared (FitCheck rules).

export const HERO = {
  title: "Ứng dụng thiết kế\nhộp quà trực tuyến",
  subtitle: "Chọn gói của bạn",
  lead: "Mọi gói đều có đủ studio thiết kế; gói trả phí cho thêm dung lượng và lượt tạo hoa văn AI.",
};

export interface PlanFeature {
  icon: LucideIcon;
  label: string;
  /** Second line, small and grey. */
  note?: string;
  /** Small coloured label after the text. */
  badge?: string;
}

export interface PlanCopy {
  tier: SubscriptionTier;
  /** Big price line: "Miễn phí" or the amount, then its unit. */
  price: { amount: string; unit?: string };
  badge: string;
  description: string;
  cta: string;
  note: string;
  popular?: boolean;
  features: PlanFeature[];
}

const { FREE, STARTER, PRO_BUSINESS } = PLANS;

const quotaFeatures = (tier: SubscriptionTier, note?: string): PlanFeature[] => [
  { icon: HardDrive, label: `${formatQuota(PLANS[tier].storageBytes)} lưu trữ`, note },
  { icon: Sparkles, label: `${PLANS[tier].aiPatternsPerDay} hoa văn AI /ngày`, note: "Tính trong 24 giờ gần nhất" },
];

export const PLAN_COPY: PlanCopy[] = [
  {
    tier: "FREE",
    price: { amount: "Miễn phí" },
    badge: "Tính năng thiết yếu",
    description: "Dành cho những chiếc hộp quà đầu tiên: dựng khuôn, thiết kế, kiểm tra và xuất file in.",
    cta: "Tạo tài khoản",
    note: "Không cần thẻ thanh toán",
    features: [
      { icon: Boxes, label: "Không giới hạn dự án", note: "4 cấu trúc hộp chuẩn" },
      ...quotaFeatures("FREE"),
      { icon: ShieldCheck, label: "FitCheck™ trước khi in" },
      { icon: FileDown, label: "Xuất PDF CMYK · SVG · DXF" },
      { icon: QrCode, label: "Trang chia sẻ 3D", note: "+ Mã QR mở hộp" },
    ],
  },
  {
    tier: "STARTER",
    price: { amount: formatUsd(STARTER.price.monthly), unit: "/tháng" },
    badge: "Cách tốt nhất để bắt đầu",
    description: "Lựa chọn hợp lý cho shop handmade thỉnh thoảng làm hộp riêng cho sản phẩm của mình.",
    cta: "Chọn Starter",
    note: `${formatUsd(STARTER.price.yearlyPerMonth)}/tháng khi thanh toán theo năm`,
    features: [
      ...quotaFeatures("STARTER", `Gói Free: ${formatQuota(FREE.storageBytes)}`),
      { icon: Boxes, label: "Mọi tính năng của Free" },
    ],
  },
  {
    tier: "PRO_BUSINESS",
    price: { amount: formatUsd(PRO_BUSINESS.price.yearlyPerMonth * 12), unit: "/năm" },
    badge: "Chức năng chuyên nghiệp",
    description: "Gói lý tưởng cho thương hiệu và xưởng làm nhiều mẫu hộp, cần nhiều dung lượng cho ảnh và file in.",
    cta: "Chọn Pro Business",
    note: `Hoặc ${formatUsd(PRO_BUSINESS.price.monthly)}/tháng khi thanh toán theo tháng`,
    popular: true,
    features: [
      ...quotaFeatures("PRO_BUSINESS", `Gói Starter: ${formatQuota(STARTER.storageBytes)}`),
      { icon: Boxes, label: "Mọi tính năng của Starter" },
    ],
  },
];

/** Where the button of a paid plan leads (the checkout screens). */
export const CHECKOUT_HREF = "/checkout/step-1";

export const FAQ: { question: string; answer: string }[] = [
  {
    question: "Có cần trả phí mới thiết kế được hộp không?",
    answer: `Không. Gói Free có đủ studio: chọn cấu trúc hộp, nhập kích thước, thiết kế, chạy FitCheck™ và xuất file in. Gói trả phí chỉ nâng dung lượng lưu trữ (${formatQuota(FREE.storageBytes)} → ${formatQuota(STARTER.storageBytes)} → ${formatQuota(PRO_BUSINESS.storageBytes)}) và số lượt tạo hoa văn AI mỗi ngày.`,
  },
  {
    question: "Dung lượng lưu trữ gồm những gì?",
    answer: "Mọi tệp bạn tải lên (logo, ảnh, ảnh đại diện, ảnh thu nhỏ của dự án) và các file in đã xuất. Khi đầy, WrapFit từ chối tệp mới cho đến khi bạn xoá bớt hoặc nâng gói; dự án cũ không bị ảnh hưởng.",
  },
  {
    question: "Lượt tạo hoa văn AI được tính thế nào?",
    answer: `Mỗi lần bấm tạo hoa văn trong studio là một lượt. Hạn mức tính trên 24 giờ gần nhất, không reset lúc nửa đêm: gói Free ${FREE.aiPatternsPerDay} lượt, Starter ${STARTER.aiPatternsPerDay} lượt, Pro Business ${PRO_BUSINESS.aiPatternsPerDay} lượt.`,
  },
  {
    question: "Có giới hạn số dự án không?",
    answer: "Không, ở mọi gói. Bạn có thể tạo bao nhiêu dự án tuỳ thích, sắp xếp vào thư mục, nhân bản và lưu nhiều phiên bản cho mỗi dự án.",
  },
  {
    question: "FitCheck™ kiểm tra những gì?",
    answer: `Chữ, logo, ảnh cách đường cắt và đường gấp tối thiểu ${SAFE_MARGIN_MM} mm; nền tràn qua đường cắt ${BLEED_MM} mm; ảnh từ ${MIN_DPI} DPI; không gì nằm đè lên tai dán. FitCheck™ chạy ở mọi gói, trước mỗi lần xuất file.`,
  },
  {
    question: "Tôi nhận được file in dạng nào?",
    answer: "PDF CMYK tách lớp (nét cắt, nét gấp, hình in, kích thước), SVG và DXF cho máy cắt. Đường tải mỗi file có hiệu lực 15 phút; bạn có thể xuất lại bất cứ lúc nào.",
  },
  {
    question: "Thiết kế của tôi có bị công khai không?",
    answer: "Không, dự án mặc định là riêng tư. Bạn chủ động chuyển sang “Chỉ ai có liên kết” hoặc “Công khai” để chia sẻ trang 3D; thiết kế công khai đạt FitCheck™ từ 90 điểm sẽ xuất hiện trong thư viện cộng đồng.",
  },
  {
    question: "Nâng gói xong, dữ liệu cũ có còn không?",
    answer: "Còn nguyên. Gói chỉ thay đổi hạn mức của tài khoản; dự án, phiên bản và tệp đã tải lên không bị di chuyển hay xoá.",
  },
];

export const WHY = {
  title: "Vì sao chọn WrapFit để thiết kế hộp quà?",
  columns: [
    [
      "WrapFit sinh ra để làm một việc: thiết kế chiếc hộp bao quanh món quà. Bạn nhập chiều dài, rộng, cao và độ dày giấy; khuôn bế được dựng lại theo từng milimét, kể cả tai gài và tai dán.",
      "Bạn không cần biết vẽ khuôn hay dùng phần mềm đồ hoạ chuyên nghiệp. Kéo thả hoa văn, logo và lời chúc lên từng mặt hộp, xem ngay chiếc hộp gấp lại trong 3D.",
    ],
    [
      "Trước khi xuất, FitCheck™ soát vùng an toàn, tràn lề và độ phân giải; Gói đề xuất cách sửa chỉ với một cú bấm. File PDF tách lớp đi thẳng đến xưởng in mà không phải vẽ lại.",
      "Khi món quà đến tay, người nhận quét mã QR để mở chiếc hộp 3D cùng lời nhắn của bạn.",
    ],
  ],
  cta: { label: "Bắt đầu miễn phí", href: ROUTES.register },
};

export const CTA_BAND = {
  title: "Thiết kế. Xem trước. In.",
  body: "Quản lý cả quy trình làm hộp quà, từ khuôn bế đến file in, trên một nền tảng.",
  cta: { label: "Tạo hộp ngay", href: ROUTES.editorNew },
};
