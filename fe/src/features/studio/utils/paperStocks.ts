import { caliperOf, type BoxDimensions, type MaterialSpecification, type QuotePaper } from "@wrapfit/shared";
import type { BoxMaterialTheme } from "@/features/studio/components/three/boxModel";

/**
 * The paper stocks the editor offers: one per paper look of the 3D box. `spec` is what the API stores
 * (`materialSpec`: type ivory | kraft | duplex, 100–1000 GSM, finish matte | glossy | raw); the caliper follows the
 * rule t = GSM × 0.0014 mm of `@wrapfit/shared`. Only the paper: colours are printed (palettes of the design) and
 * lamination, foil and UV are finishes of the print shop, chosen on their own.
 */
export interface PaperStock {
  theme: BoxMaterialTheme;
  name: string;
  /** The surface of the paper itself. */
  finishLabel: string;
  description: string;
  /** Box styles it suits best. */
  bestFor: string;
  spec: MaterialSpecification;
  /** Printed side and inside, as the 3D model paints them. */
  swatch: { outside: string; inside: string };
  /** 1 (soft) to 5 (rigid): how well a box of it keeps its shape. */
  stiffness: number;
  /** Paper of the quote (`QUOTE_PRICES.paperPerB1Sheet`). */
  quotePaper: QuotePaper;
  /** What the print shop should know before printing on it. */
  printNote?: string;
}

const stock = (gsm: number, type: MaterialSpecification["type"], finish: MaterialSpecification["finish"]): MaterialSpecification => ({
  type,
  gsm,
  finish,
  caliper: caliperOf(gsm),
});

export const PAPER_STOCKS: readonly PaperStock[] = [
  {
    theme: "ivory",
    name: "Ivory 300 GSM",
    finishLabel: "Trắng ngà, mặt mịn",
    description: "Giấy bìa trắng ngà, mặt in mịn: màu lên tươi và đúng nhất. Loại phổ biến nhất cho hộp bán lẻ.",
    bestFor: "Mỹ phẩm, nến, hộp nắp gài, hộp gối",
    spec: stock(300, "ivory", "matte"),
    swatch: { outside: "#FAF6EE", inside: "#EFE8DC" },
    stiffness: 3,
    quotePaper: "ivory",
  },
  {
    theme: "kraft",
    name: "Kraft 300 GSM",
    finishLabel: "Nâu mộc, sợi tái chế",
    description: "Giấy nâu sợi tái chế, mộc mạc. Mực thấm vào sợi giấy nên màu in trầm hơn.",
    bestFor: "Nến thơm, trà, đồ thủ công",
    spec: stock(300, "kraft", "raw"),
    swatch: { outside: "#D9B897", inside: "#CDAA85" },
    stiffness: 3,
    quotePaper: "kraft",
    printNote: "Không in được màu trắng; màu sáng sẽ chìm vào nền nâu.",
  },
  {
    theme: "duplex",
    name: "Duplex 350 GSM",
    finishLabel: "Mặt trắng, lưng xám",
    description: "Mặt in trắng, lưng xám. Dày và cứng hơn ivory, giá mềm hơn; mặt trong hộp có màu xám.",
    bestFor: "Bánh, hộp bao diêm, hộp lớn",
    spec: stock(350, "duplex", "matte"),
    swatch: { outside: "#F7F7F3", inside: "#B9BCB7" },
    stiffness: 4,
    quotePaper: "duplex",
  },
  {
    theme: "rigid",
    name: "Carton bồi 400 GSM",
    finishLabel: "Giấy in bồi lõi carton",
    description: "Giấy in được bồi lên lõi carton xám: cầm đầm tay, không móp. Dành cho quà cao cấp.",
    bestFor: "Hộp âm dương, trang sức, quà VIP",
    spec: stock(400, "duplex", "matte"),
    swatch: { outside: "#FBFAF6", inside: "#8E8A82" },
    stiffness: 5,
    quotePaper: "rigid",
    printNote: "Bồi thủ công: thêm khoảng 2 ngày làm.",
  },
];

/** The stock of a paper look; the showcase looks of old projects map to the stock they stood for. */
export const paperStockOf = (theme: BoxMaterialTheme): PaperStock =>
  PAPER_STOCKS.find((item) => item.theme === (theme === "forest" ? "duplex" : theme === "gold_foil" ? "rigid" : theme)) ?? PAPER_STOCKS[0];

export interface PaperAdvice {
  recommended: BoxMaterialTheme;
  reason: string;
  /** Stocks too soft for this box, with the reason. */
  tooSoft: Partial<Record<BoxMaterialTheme, string>>;
}

/**
 * The stock that suits the box: rigid board for a lid and base box, duplex once the box is large, ivory otherwise.
 * Sizes are inner sizes in mm; thresholds are rules of thumb of the print shops, to be checked on folded samples.
 */
export function paperAdvice(structure: string, { length, width, height }: BoxDimensions): PaperAdvice {
  const longest = Math.max(length, width, height);
  const litres = (length * width * height) / 1e6;
  const large = longest >= 220 || litres >= 2;
  const tooSoft: PaperAdvice["tooSoft"] = {};
  if (large) {
    const why = `Hộp lớn (${longest} mm): giấy 300 GSM dễ móp khi chở.`;
    tooSoft.ivory = why;
    tooSoft.kraft = why;
  }
  if (structure === "lid-base") return { recommended: "rigid", reason: "Hộp âm dương cần thành cứng để nắp đậy khít.", tooSoft };
  if (large) return { recommended: "duplex", reason: `Hộp lớn (${longest} mm, ${litres.toFixed(1)} lít) cần giấy dày hơn.`, tooSoft };
  return { recommended: "ivory", reason: "Hộp vừa và nhỏ: ivory 300 đủ cứng, in màu đẹp nhất.", tooSoft };
}

/** Vietnamese names of the paper types and finishes the API accepts. */
export const MATERIAL_TYPE_LABELS: Record<MaterialSpecification["type"], string> = { ivory: "Ivory", kraft: "Kraft", duplex: "Duplex" };
export const MATERIAL_FINISH_LABELS: Record<MaterialSpecification["finish"], string> = { matte: "Mờ", glossy: "Bóng", raw: "Mộc" };
