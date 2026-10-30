import { BLEED_MM, ENTITLEMENTS, MIN_DPI, SAFE_MARGIN_CREASE_MM, SAFE_MARGIN_CUT_MM, type ExportPackId } from "@wrapfit/shared";
import { ROUTES } from "@/constants";
import {
  EXPORT_PACK_LIST,
  EXPORT_PACK_VALID_MONTHS,
  PLANS,
  PLAN_ORDER,
  PRO_PERIOD_DAYS,
  SINGLE_EXPORT_PRICE,
  formatQuota,
  formatVnd,
} from "@/features/pricing";
import type { SubscriptionTier } from "@/types/api";

// Copy of /pricing. Names, prices and storage come from features/pricing (a display layer over @wrapfit/shared/billing,
// the numbers the backend charges and enforces); FitCheck rules from @wrapfit/shared.

const { FREE, PAY_PER_EXPORT, STARTER, PRO_BUSINESS } = PLANS;
const UNLOCK_DAYS = ENTITLEMENTS.PAY_PER_EXPORT.export.unlockDays;

/** Export pack chosen first in the "Lượt xuất" card. */
export const DEFAULT_PACK: ExportPackId = "EXPORT_5";

/** Where the button of a paid plan leads: the checkout, with the plan (and the export pack) chosen. */
export const checkoutHref = (tier: SubscriptionTier, pack?: ExportPackId) =>
  `/checkout/step-1?plan=${tier}${pack ? `&pack=${pack}` : ""}`;

export const PRICING_HERO = {
  eyebrow: "Bảng giá",
  title: "Thiết kế miễn phí, trả khi cần file in",
  lead: `Mọi gói đều có đủ studio, FitCheck™ và hộp gấp 3D. Gói Miễn phí xuất PDF A4 in tại nhà có watermark ở tai dán; file in sạch cho xưởng từ ${formatVnd(SINGLE_EXPORT_PRICE)} một lượt.`,
};

export interface PlanCardCopy {
  tier: SubscriptionTier;
  subtitle: string;
  features: string[];
  /** Small grey line under the price. */
  note: string;
  cta: string;
  popular?: boolean;
}

export const PLAN_CARDS: Record<SubscriptionTier, PlanCardCopy> = {
  FREE: {
    tier: "FREE",
    subtitle: "Thiết kế và thử in tại nhà",
    note: "Không cần thẻ thanh toán",
    features: [
      "Studio thiết kế, 4 cấu trúc hộp, hộp gấp 3D",
      "FitCheck™ và Auto-Fix trước khi in",
      "PDF A4 in tại nhà, có watermark WrapFit ở tai dán",
      `${formatQuota(FREE.storageBytes)} lưu trữ · ${FREE.aiPatternsPerDay} hoa văn AI/ngày`,
      "Trang chia sẻ 3D và mã QR mở hộp",
    ],
    cta: "Bắt đầu miễn phí",
  },
  PAY_PER_EXPORT: {
    tier: "PAY_PER_EXPORT",
    subtitle: "Trả theo lượt, không phí tháng",
    note: `Hạn dùng ${EXPORT_PACK_VALID_MONTHS} tháng · không phí duy trì`,
    features: [
      `Mỗi lượt mở khóa một bản thiết kế trong ${UNLOCK_DAYS} ngày`,
      "PDF CMYK 4 lớp cho xưởng · SVG · DXF · PDF A4/A3, không watermark",
      `${formatQuota(PAY_PER_EXPORT.storageBytes)} lưu trữ · ${PAY_PER_EXPORT.aiPatternsPerDay} hoa văn AI/ngày`,
      "Mọi tính năng của gói Miễn phí",
    ],
    cta: "Mua lượt xuất",
  },
  STARTER: {
    tier: "STARTER",
    subtitle: "Cho shop làm hộp mỗi tuần",
    note: `Trả một lần cho ${PRO_PERIOD_DAYS} ngày, không tự gia hạn`,
    features: [
      `Xuất file in sạch không giới hạn trong ${PRO_PERIOD_DAYS} ngày`,
      "PDF CMYK 4 lớp · SVG · DXF · PDF A4/A3",
      `${formatQuota(STARTER.storageBytes)} lưu trữ · ${STARTER.aiPatternsPerDay} hoa văn AI/ngày`,
      "Ưu tiên đặt in hộp mẫu qua xưởng đối tác",
      "Mọi tính năng của gói Lượt xuất",
    ],
    cta: `Chọn ${STARTER.name}`,
    popular: true,
  },
  PRO_BUSINESS: {
    tier: "PRO_BUSINESS",
    subtitle: "Cho thương hiệu và xưởng in",
    note: `Tham khảo từ ${formatVnd(PRO_BUSINESS.price.monthly)}/tháng`,
    features: [
      `${formatQuota(PRO_BUSINESS.storageBytes)} lưu trữ · ${PRO_BUSINESS.aiPatternsPerDay} hoa văn AI/ngày`,
      "Nhiều thành viên trong một không gian làm việc",
      "Kiểm tra hàng loạt file khuôn cho đối tác gia công",
      "Tư vấn 1-1 với chuyên gia bao bì",
      `Mọi tính năng của gói ${STARTER.name}`,
    ],
    cta: "Liên hệ",
  },
};

export const CONTACT_HREF = ROUTES.contact;

/** One row of the comparison table: the value of each plan. */
export interface ComparisonRow {
  feature: string;
  values: Record<SubscriptionTier, string>;
}

const sameForAll = (value: string) => Object.fromEntries(PLAN_ORDER.map((tier) => [tier, value])) as Record<SubscriptionTier, string>;
const perTier = (value: (tier: SubscriptionTier) => string) =>
  Object.fromEntries(PLAN_ORDER.map((tier) => [tier, value(tier)])) as Record<SubscriptionTier, string>;

export const COMPARISON: ComparisonRow[] = [
  { feature: "Studio, 4 cấu trúc hộp, hộp gấp 3D", values: sameForAll("Có") },
  { feature: "FitCheck™ và Auto-Fix", values: sameForAll("Có") },
  {
    feature: "PDF A4 in tại nhà",
    values: { FREE: "Có watermark ở tai dán", PAY_PER_EXPORT: "Không watermark", STARTER: "Không watermark", PRO_BUSINESS: "Không watermark" },
  },
  {
    feature: "PDF CMYK 4 lớp cho xưởng · SVG · DXF",
    values: { FREE: "Không có", PAY_PER_EXPORT: "1 lượt / bản thiết kế", STARTER: "Không giới hạn", PRO_BUSINESS: "Không giới hạn" },
  },
  { feature: "Lưu trữ", values: perTier((tier) => formatQuota(PLANS[tier].storageBytes)) },
  { feature: "Hoa văn AI mỗi 24 giờ", values: perTier((tier) => `${PLANS[tier].aiPatternsPerDay} lượt`) },
  {
    feature: "Cách trả tiền",
    values: {
      FREE: "Miễn phí",
      PAY_PER_EXPORT: EXPORT_PACK_LIST.map((pack) => `${pack.credits} lượt ${formatVnd(pack.priceVnd)}`).join(" · "),
      STARTER: `${formatVnd(STARTER.price.monthly)} / ${PRO_PERIOD_DAYS} ngày`,
      PRO_BUSINESS: "Liên hệ",
    },
  },
];

const [PACK_1, , PACK_LARGEST] = EXPORT_PACK_LIST;

export const FAQ: { question: string; answer: string }[] = [
  {
    question: "WrapFit có lợi thế gì về giá so với Pacdora hay phần mềm nước ngoài?",
    answer: `Pacdora và các công cụ nước ngoài có mức phí từ $29 đến $99/tháng (khoảng 750.000đ – 2.500.000đ), cần thẻ thanh toán quốc tế và thiết kế trên khuôn cố định. WrapFit dành riêng cho người làm quà Việt: chỉ từ ${formatVnd(PACK_1.priceVnd)}/lượt xuất hoặc ${formatVnd(STARTER.price.monthly)}/tháng với gói ${STARTER.name}, thanh toán qua VietQR, in thử A4 tại nhà và đặt in hộp mẫu qua xưởng đối tác.`,
  },
  {
    question: "Gói Miễn phí xuất được file gì?",
    answer: `PDF A4 để in thử tại nhà, có watermark WrapFit nhỏ ở tai dán (phần bị dán khuất khi gấp hộp). File cho xưởng (PDF CMYK 4 lớp, SVG, DXF) và PDF không watermark cần một lượt xuất hoặc gói ${STARTER.name}.`,
  },
  {
    question: "Một lượt xuất gồm những gì?",
    answer: `Một lượt mở khóa một bản thiết kế trong ${UNLOCK_DAYS} ngày: bạn tải mọi định dạng (PDF CMYK, SVG, DXF, PDF A4/A3) và tải lại bao nhiêu lần tùy ý trong thời gian đó. Mua lẻ ${formatVnd(PACK_1.priceVnd)}/lượt, hoặc gói ${PACK_LARGEST.credits} lượt ${formatVnd(PACK_LARGEST.priceVnd)}; lượt chưa dùng còn hạn ${EXPORT_PACK_VALID_MONTHS} tháng.`,
  },
  {
    question: `Gói ${STARTER.name} có tự gia hạn không?`,
    answer: `Không. Gói ${STARTER.name} ${formatVnd(STARTER.price.monthly)} dùng trong ${PRO_PERIOD_DAYS} ngày kể từ lúc thanh toán, xuất file sạch không giới hạn. Hết hạn, tài khoản trở về gói Miễn phí (hoặc Lượt xuất nếu còn lượt); dự án không bị xoá.`,
  },
  {
    question: "Lượt tạo hoa văn AI được tính thế nào?",
    answer: `Mỗi lần bấm tạo hoa văn trong studio là một lượt. Hạn mức tính trên 24 giờ gần nhất, không reset lúc nửa đêm: ${FREE.name} ${FREE.aiPatternsPerDay} lượt, ${PAY_PER_EXPORT.name} ${PAY_PER_EXPORT.aiPatternsPerDay} lượt, ${STARTER.name} ${STARTER.aiPatternsPerDay} lượt, ${PRO_BUSINESS.name} ${PRO_BUSINESS.aiPatternsPerDay} lượt.`,
  },
  {
    question: "Dung lượng lưu trữ gồm những gì?",
    answer: `Mọi tệp bạn tải lên (logo, ảnh, ảnh đại diện, ảnh thu nhỏ của dự án) và các file in đã xuất: ${PLAN_ORDER.map((tier) => `${PLANS[tier].name} ${formatQuota(PLANS[tier].storageBytes)}`).join(", ")}. Khi đầy, WrapFit từ chối tệp mới cho đến khi bạn xoá bớt hoặc nâng gói; dự án cũ không bị ảnh hưởng.`,
  },
  {
    question: "FitCheck™ kiểm tra những gì?",
    answer: `Chữ, logo, ảnh cách đường cắt tối thiểu ${SAFE_MARGIN_CUT_MM} mm và đường gấp ${SAFE_MARGIN_CREASE_MM} mm; nền tràn qua đường cắt ${BLEED_MM} mm; ảnh từ ${MIN_DPI} DPI; không gì nằm đè lên tai dán. FitCheck™ chạy ở mọi gói, trước mỗi lần xuất file.`,
  },
  {
    question: "Tôi nhận được file in dạng nào?",
    answer: "PDF CMYK tách lớp (nét cắt #E53E3E, nét gấp #3182CE, hình in, kích thước) có dòng thông số hộp in ở lề, PDF A4/A3 in tại nhà có dấu xén và thước chuẩn 50 mm, SVG và DXF cho máy cắt bế CNC.",
  },
];
