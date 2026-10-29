import { LAMINATIONS, type MaterialSpecification, type QuoteFinish } from "@wrapfit/shared";
import type { BoxMaterialTheme } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { PAPER_STOCKS, paperStockOf } from "./paperStocks";

/**
 * Printable paper stock (`materialSpec`, validated by the API) behind each paper look of the editor (`PAPER_STOCKS`);
 * the caliper comes from the dimensions, the surface from the lamination.
 */
const THEMES = PAPER_STOCKS.map(({ theme }) => theme as string);

export function materialSpecFor(theme: BoxMaterialTheme, caliper: number, finishes: readonly string[] = []): MaterialSpecification {
  const { type, gsm, finish } = paperStockOf(theme).spec;
  const surface = finishes.includes("gloss-lamination") ? "glossy" : finishes.some((f) => LAMINATIONS.includes(f as QuoteFinish)) ? "matte" : finish;
  return { type, gsm, finish: surface, caliper };
}

/**
 * Paper look of a saved project: the one the editor stored in the canvas, otherwise the closest look for the stock
 * (projects created elsewhere, e.g. from a template). The old showcase looks become the stock they stood for.
 */
export function materialThemeOf(
  stored: string | null | undefined,
  spec: MaterialSpecification | undefined
): BoxMaterialTheme {
  if (stored === "forest" || stored === "gold_foil") return paperStockOf(stored).theme;
  if (stored && THEMES.includes(stored)) return stored as BoxMaterialTheme;
  if (spec?.type === "kraft") return "kraft";
  if (spec?.type === "duplex") return spec.gsm >= 400 ? "rigid" : "duplex";
  return "ivory";
}

/** Finishes stored in the canvas, known ones only. */
export const finishesOf = (stored: readonly string[] | undefined): QuoteFinish[] =>
  (stored ?? []).filter((f): f is QuoteFinish => ["matte-lamination", "gloss-lamination", "soft-touch-lamination", "foil", "spot-uv"].includes(f));
