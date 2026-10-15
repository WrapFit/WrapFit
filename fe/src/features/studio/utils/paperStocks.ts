import { caliperOf, type MaterialSpecification } from "@wrapfit/shared";
import type { BoxMaterialTheme } from "@/features/studio/components/three/boxModel";

/**
 * The paper stocks the editor offers: one per paper look of the 3D box. `spec` is what the API stores
 * (`materialSpec`: type ivory | kraft | duplex, 100–1000 GSM, finish matte | glossy | raw); the caliper follows the
 * rule t = GSM × 0.0014 mm of `@wrapfit/shared`.
 */
export interface PaperStock {
  theme: BoxMaterialTheme;
  name: string;
  finishLabel: string;
  description: string;
  /** Box styles it suits best. */
  bestFor: string;
  spec: MaterialSpecification;
  /** Printed side and inside, as the 3D model paints them. */
  swatch: { outside: string; inside: string };
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
    finishLabel: "Cán mờ tự nhiên",
    description: "Mặt giấy trắng ngà, bắt mực in rực rỡ, độ cứng tiêu chuẩn cho hộp bán lẻ.",
    bestFor: "Hộp nắp gài, hộp gối, mỹ phẩm",
    spec: stock(300, "ivory", "matte"),
    swatch: { outside: "#FAF6EE", inside: "#EFE8DC" },
  },
  {
    theme: "kraft",
    name: "Kraft 300 GSM",
    finishLabel: "Mộc thủ công",
    description: "Màu nâu kraft mộc mạc, ấm áp, sợi tái chế thân thiện môi trường.",
    bestFor: "Nến thơm, trà, đồ thủ công",
    spec: stock(300, "kraft", "raw"),
    swatch: { outside: "#D9B897", inside: "#CDAA85" },
  },
  {
    theme: "forest",
    name: "Duplex 350 GSM",
    finishLabel: "Màng nhung soft-touch",
    description: "Dày dặn, bề mặt êm như nhung, chống trầy xước khi vận chuyển.",
    bestFor: "Hộp bao diêm, quà tặng cao cấp",
    spec: stock(350, "duplex", "matte"),
    swatch: { outside: "#1A362B", inside: "#E8E2D6" },
  },
  {
    theme: "gold_foil",
    name: "Carton bồi 400 GSM",
    finishLabel: "Ép kim vàng champagne",
    description: "Cầm đầm tay, nắp cứng cáp, dành cho quà VIP và hộp âm dương.",
    bestFor: "Hộp âm dương, trang sức",
    spec: stock(400, "duplex", "glossy"),
    swatch: { outside: "#D4AF37", inside: "#EFE8DC" },
  },
];

/** Vietnamese names of the paper types and finishes the API accepts. */
export const MATERIAL_TYPE_LABELS: Record<MaterialSpecification["type"], string> = { ivory: "Ivory", kraft: "Kraft", duplex: "Duplex" };
export const MATERIAL_FINISH_LABELS: Record<MaterialSpecification["finish"], string> = { matte: "Mờ", glossy: "Bóng", raw: "Mộc" };
