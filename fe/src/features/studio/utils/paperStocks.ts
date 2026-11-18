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
  /** Two or three words that set it apart from the others at a glance. */
  tags: string[];
  /** How to recognise it in hand and in print: what a customer checks on a sample. */
  identity: { printSide: string; inside: string; edge: string; feel: string; print: string };
  /** 1 to 5, for the comparison: colour fidelity of the print, premium feel, how green it is. */
  ratings: { color: number; premium: number; eco: number };
  pros: string[];
  cons: string[];
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
    description: "Trắng ngà, màu in tươi nhất.",
    bestFor: "Mỹ phẩm, nến, hộp nắp gài, hộp gối",
    spec: stock(300, "ivory", "matte"),
    swatch: { outside: "#FAF6EE", inside: "#EFE8DC" },
    stiffness: 3,
    quotePaper: "ivory",
    tags: ["Mặt trong trắng", "Màu in tươi nhất"],
    identity: {
      printSide: "Trắng ngà, có lớp tráng mịn, hơi bóng dịu dưới đèn",
      inside: "Trắng, không tráng, hơi nhám: mở hộp ra vẫn trắng sạch",
      edge: "Trắng đều từ mặt in tới mặt trong (bột giấy tẩy trắng)",
      feel: "Mịn, nhẹ tay; gập nếp gọn, ít nứt",
      print: "Tươi và đúng màu nhất; in được ảnh chụp, màu chuyển",
    },
    ratings: { color: 5, premium: 3, eco: 3 },
    pros: ["Màu in đẹp, đúng file nhất", "Mặt trong trắng, mở hộp sạch sẽ", "Phổ biến: xưởng nào cũng có, giao nhanh"],
    cons: ["Hộp lớn dễ móp nếu chở xa", "Nền màu đậm dễ nứt mực ở nếp gấp nếu không cán màng"],
  },
  {
    theme: "kraft",
    name: "Kraft 300 GSM",
    finishLabel: "Nâu mộc, sợi tái chế",
    description: "Nâu mộc, màu in trầm.",
    bestFor: "Nến thơm, trà, đồ thủ công",
    spec: stock(300, "kraft", "raw"),
    swatch: { outside: "#D9B897", inside: "#CDAA85" },
    stiffness: 3,
    quotePaper: "kraft",
    printNote: "Không in được màu trắng; màu sáng sẽ chìm vào nền nâu.",
    tags: ["Nâu mộc", "Không in được màu trắng"],
    identity: {
      printSide: "Nâu, thấy rõ sợi giấy, không tráng phủ",
      inside: "Nâu giống mặt ngoài",
      edge: "Nâu đều, hơi xơ sợi",
      feel: "Nhám, khô, mùi giấy mộc",
      print: "Trầm, ngả nâu; hợp in 1–2 màu đậm (đen, nâu, xanh rêu)",
    },
    ratings: { color: 2, premium: 2, eco: 5 },
    pros: ["Thân thiện môi trường nhất, dễ tái chế", "Chất thủ công, mộc mạc", "Ít lộ vết bẩn, trầy xước"],
    cons: ["Màu in xỉn, ảnh chụp in không nét", "Không có mực trắng: chữ màu sáng sẽ chìm"],
  },
  {
    theme: "duplex",
    name: "Duplex 350 GSM",
    finishLabel: "Mặt trắng, lưng xám",
    description: "Mặt trắng, lưng xám, cứng, giá mềm.",
    bestFor: "Bánh, hộp bao diêm, hộp lớn",
    spec: stock(350, "duplex", "matte"),
    swatch: { outside: "#F7F7F3", inside: "#B9BCB7" },
    stiffness: 4,
    quotePaper: "duplex",
    tags: ["Lưng xám", "Cứng, giá mềm"],
    identity: {
      printSide: "Trắng có tráng phủ, hơi ngả xám hơn ivory",
      inside: "Xám tro (lớp giấy tái chế): dấu hiệu dễ nhận ra nhất",
      edge: "Lớp trắng mỏng ở trên, lõi xám bên dưới",
      feel: "Dày và cứng hơn ivory; nếp gấp cứng tay",
      print: "Tốt, kém ivory một chút ở màu sáng và da người",
    },
    ratings: { color: 4, premium: 2, eco: 4 },
    pros: ["Cứng: hộp lớn, hộp bánh vẫn đứng form", "Giá mềm cho hộp to", "Có phần giấy tái chế"],
    cons: ["Mở hộp thấy mặt trong xám, kém sang", "Lớp tráng dễ nứt ở nếp gấp màu đậm"],
  },
  {
    theme: "rigid",
    name: "Carton bồi 400 GSM",
    finishLabel: "Giấy in bồi lõi carton",
    description: "Lõi carton cứng, cho quà cao cấp.",
    bestFor: "Hộp âm dương, trang sức, quà VIP",
    spec: stock(400, "duplex", "matte"),
    swatch: { outside: "#FBFAF6", inside: "#8E8A82" },
    stiffness: 5,
    quotePaper: "rigid",
    printNote: "Bồi thủ công: thêm khoảng 2 ngày làm.",
    tags: ["Lõi carton dày", "Cao cấp nhất"],
    identity: {
      printSide: "Giấy in mỏng bồi lên lõi carton, bọc kín mép hộp",
      inside: "Xám carton, hoặc dán giấy lót theo yêu cầu",
      edge: "Lõi carton xám dày 1–2 mm, giấy in gấp vào trong",
      feel: "Đầm, nặng tay; bóp không móp",
      print: "Đẹp như giấy in bề mặt; hợp ép kim, dập nổi",
    },
    ratings: { color: 5, premium: 5, eco: 2 },
    pros: ["Sang nhất, giữ form lâu, dùng lại được", "Nắp đậy khít, hợp quà tặng cao cấp", "Ép kim, dập nổi lên rất đẹp"],
    cons: ["Giá cao nhất, làm thêm khoảng 2 ngày", "Không gấp phẳng được: tốn chỗ khi vận chuyển, lưu kho"],
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
