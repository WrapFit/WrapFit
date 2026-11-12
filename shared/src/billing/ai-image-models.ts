/**
 * Text-to-image models WrapFit offers, priced in xu (docs/19 §3). The backend maps each key to a fal.ai endpoint
 * (be/src/ai/image/fal-models.ts); the studio, the pricing page and the API read this catalog for names and prices.
 * `estCostUsd` is what one image costs us at the provider: the margin test keeps every price at
 * `MIN_XU_MARGIN` times that or more at `USD_VND_REFERENCE`.
 */
import { XU_VALUE_VND } from "./xu";

export type AiImageModelKey =
  | "flux2-klein"
  | "gpt-image-2-low"
  | "seedream-4.5"
  | "gpt-image-2-medium"
  | "nano-banana-2"
  | "recraft-v3-vector"
  | "nano-banana-pro"
  | "gpt-image-2-high";

export type AiImageAspectRatio = "1:1" | "4:3" | "3:4" | "3:2" | "2:3" | "16:9" | "9:16";

/** draft: try ideas cheaply; standard: everyday artwork; premium: best quality and lettering; vector: SVG output. */
export type AiImageTier = "draft" | "standard" | "premium" | "vector";

export interface AiImageModel {
  key: AiImageModelKey;
  label: string;
  tier: AiImageTier;
  /** Xu per image. */
  xu: number;
  /** Provider cost of one image, USD (fal pricing, 2026-10; measured again before launch). */
  estCostUsd: number;
  /** `vector`: the result is an SVG, sharp at any print size. */
  output: "raster" | "vector";
  /** The model may draw lettering when the user allows it; the others are always asked for no text. */
  supportsText: boolean;
  aspectRatios: readonly AiImageAspectRatio[];
  /** Images per request. */
  maxImages: number;
  /** Off: listed nowhere and refused by the API (the price is not confirmed yet). */
  enabled: boolean;
  /** One line for the model picker. */
  summary: string;
}

const COMMON_RATIOS: readonly AiImageAspectRatio[] = ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16"];
const GPT_RATIOS: readonly AiImageAspectRatio[] = ["1:1", "3:2", "2:3"];
const RECRAFT_RATIOS: readonly AiImageAspectRatio[] = ["1:1", "4:3", "3:4", "16:9", "9:16"];

/** Cheapest first: the order of the model picker. */
export const AI_IMAGE_MODELS: readonly AiImageModel[] = [
  {
    key: "flux2-klein",
    label: "FLUX.2 klein",
    tier: "draft",
    xu: 10,
    estCostUsd: 0.014,
    output: "raster",
    supportsText: false,
    aspectRatios: COMMON_RATIOS,
    maxImages: 4,
    enabled: true,
    summary: "Nháp nhanh trong vài giây, để thử ý tưởng trước",
  },
  {
    key: "gpt-image-2-low",
    label: "GPT Image 2 (nháp)",
    tier: "draft",
    xu: 10,
    estCostUsd: 0.01,
    output: "raster",
    supportsText: false,
    aspectRatios: GPT_RATIOS,
    maxImages: 4,
    enabled: true,
    summary: "Hiểu mô tả dài tốt, chất lượng nháp",
  },
  {
    key: "seedream-4.5",
    label: "Seedream 4.5",
    tier: "standard",
    xu: 30,
    estCostUsd: 0.04,
    output: "raster",
    supportsText: false,
    aspectRatios: COMMON_RATIOS,
    maxImages: 4,
    enabled: true,
    summary: "Minh họa đẹp, chi tiết, độ phân giải cao",
  },
  {
    key: "gpt-image-2-medium",
    label: "GPT Image 2",
    tier: "standard",
    xu: 40,
    estCostUsd: 0.055,
    output: "raster",
    supportsText: true,
    aspectRatios: GPT_RATIOS,
    maxImages: 4,
    enabled: true,
    summary: "Cân bằng giữa giá và chất lượng, viết chữ khá",
  },
  {
    key: "nano-banana-2",
    label: "Nano Banana 2",
    tier: "standard",
    xu: 60,
    estCostUsd: 0.08,
    output: "raster",
    supportsText: false,
    aspectRatios: COMMON_RATIOS,
    maxImages: 4,
    enabled: true,
    summary: "Bám sát mô tả, màu sắc tự nhiên",
  },
  {
    key: "recraft-v3-vector",
    label: "Recraft V3 Vector",
    tier: "vector",
    xu: 60,
    estCostUsd: 0.08,
    output: "vector",
    supportsText: false,
    aspectRatios: RECRAFT_RATIOS,
    maxImages: 1,
    enabled: true,
    summary: "Ảnh vector SVG: in to cỡ nào cũng nét, hợp logo, hoa văn, sticker",
  },
  {
    key: "nano-banana-pro",
    label: "Nano Banana Pro",
    tier: "premium",
    xu: 120,
    estCostUsd: 0.15,
    output: "raster",
    supportsText: true,
    aspectRatios: COMMON_RATIOS,
    maxImages: 4,
    enabled: true,
    summary: "Chất lượng cao nhất, viết chữ đẹp nhất",
  },
  {
    key: "gpt-image-2-high",
    label: "GPT Image 2 (cao)",
    tier: "premium",
    xu: 300,
    estCostUsd: 0.41,
    output: "raster",
    supportsText: true,
    aspectRatios: GPT_RATIOS,
    maxImages: 2,
    enabled: false,
    summary: "Chi tiết cao nhất của GPT Image 2",
  },
];

export const AI_IMAGE_MODEL_BY_KEY: Readonly<Record<AiImageModelKey, AiImageModel>> = Object.fromEntries(
  AI_IMAGE_MODELS.map((model) => [model.key, model]),
) as Record<AiImageModelKey, AiImageModel>;

export function isAiImageModelKey(value: string): value is AiImageModelKey {
  return Object.prototype.hasOwnProperty.call(AI_IMAGE_MODEL_BY_KEY, value);
}

/** Unplaced AI images stay in "Ảnh AI của tôi" this long; images on a saved design stay with it. */
export const AI_IMAGE_KEEP_DAYS = 30;

/** USD to VND rate the prices were set at; the backend reports costs at USD_VND_RATE. */
export const USD_VND_REFERENCE = 26_000;
/** A price in xu is worth at least this many times the provider cost. */
export const MIN_XU_MARGIN = 2.5;

/** Price-to-cost ratio of a model at `usdVnd`. */
export function xuMargin(model: Pick<AiImageModel, "xu" | "estCostUsd">, usdVnd = USD_VND_REFERENCE): number {
  return (model.xu * XU_VALUE_VND) / (model.estCostUsd * usdVnd);
}

const RATIO_VALUES: Record<AiImageAspectRatio, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "3:2": 3 / 2,
  "2:3": 2 / 3,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

/** Supported ratio closest to a box face of `widthMm` x `heightMm` (compared on a log scale, so 2:1 and 1:2 are as far from 1:1). */
export function nearestAspectRatio(
  widthMm: number,
  heightMm: number,
  supported: readonly AiImageAspectRatio[] = COMMON_RATIOS,
): AiImageAspectRatio {
  const target = Math.log(widthMm / heightMm);
  let best = supported[0];
  for (const ratio of supported) {
    if (Math.abs(Math.log(RATIO_VALUES[ratio]) - target) < Math.abs(Math.log(RATIO_VALUES[best]) - target)) best = ratio;
  }
  return best;
}
