import type { BoxDimensions, MaterialSpecification, MaterialType } from "@wrapfit/shared";
import type { Industry, Occasion, PublicAuthor } from "@/types/api";

/** Vietnamese names of the hub filters (enum values of `be/src/templates/dto/query-hub.dto.ts`). */
export const OCCASION_LABELS: Record<Occasion, string> = {
  TET: "Tết",
  CHRISTMAS: "Giáng sinh",
  WEDDING: "Cưới hỏi",
  VALENTINE: "Valentine",
  BIRTHDAY: "Sinh nhật",
  MINIMAL: "Tối giản",
};

export const INDUSTRY_LABELS: Record<Industry, string> = {
  COSMETICS: "Mỹ phẩm",
  CANDLES: "Nến thơm",
  BAKERY: "Bánh ngọt",
  JEWELRY: "Trang sức",
  TEA_AGRI: "Trà & nông sản",
};

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  ivory: "Giấy Ivory",
  kraft: "Giấy Kraft",
  duplex: "Giấy Duplex",
};

const FINISH_LABELS: Record<MaterialSpecification["finish"], string> = {
  matte: "cán mờ",
  glossy: "cán bóng",
  raw: "mộc",
};

export const OCCASIONS = Object.keys(OCCASION_LABELS) as Occasion[];
export const INDUSTRIES = Object.keys(INDUSTRY_LABELS) as Industry[];
export const MATERIALS = Object.keys(MATERIAL_LABELS) as MaterialType[];

const trimNumber = (value: number) => String(Math.round(value * 100) / 100);

/** `120 × 80 × 60 mm` (L × W × H). */
export function formatDimensions({ length, width, height }: BoxDimensions): string {
  return `${trimNumber(length)} × ${trimNumber(width)} × ${trimNumber(height)} mm`;
}

/** `Giấy Kraft · 300 GSM · mộc`. */
export function formatMaterial(spec: MaterialSpecification | null | undefined): string {
  if (!spec) return "";
  const name = MATERIAL_LABELS[spec.type] ?? spec.type;
  const finish = FINISH_LABELS[spec.finish];
  return [name, spec.gsm ? `${spec.gsm} GSM` : null, finish].filter(Boolean).join(" · ");
}

/** Shop name first, like on the author's own pages. */
export function authorName(author: PublicAuthor | null | undefined): string {
  return author?.shopName?.trim() || author?.fullName?.trim() || "Nhà sáng tạo WrapFit";
}

const compact = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });

/** `1,2 N` for counters (views, likes, remixes). */
export function formatCount(value: number): string {
  return compact.format(value);
}
