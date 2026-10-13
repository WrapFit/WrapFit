import type { MaterialSpecification } from "@wrapfit/shared";
import type { BoxMaterialTheme } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { PAPER_STOCKS } from "./paperStocks";

/**
 * Printable paper stock (`materialSpec`, validated by the API) behind each paper look of the editor (`PAPER_STOCKS`);
 * the caliper comes from the dimensions.
 */
const STOCK_OF_THEME = Object.fromEntries(PAPER_STOCKS.map(({ theme, spec }) => [theme, spec])) as Record<BoxMaterialTheme, MaterialSpecification>;

const THEMES = Object.keys(STOCK_OF_THEME) as BoxMaterialTheme[];

export function materialSpecFor(theme: BoxMaterialTheme, caliper: number): MaterialSpecification {
  const { type, gsm, finish } = STOCK_OF_THEME[theme];
  return { type, gsm, finish, caliper };
}

/**
 * Paper look of a saved project: the one the editor stored in the canvas, otherwise the closest look for the stock
 * (projects created elsewhere, e.g. from a template).
 */
export function materialThemeOf(
  stored: string | null | undefined,
  spec: MaterialSpecification | undefined
): BoxMaterialTheme {
  if (stored && (THEMES as string[]).includes(stored)) return stored as BoxMaterialTheme;
  if (spec?.type === "kraft") return "kraft";
  if (spec?.type === "duplex") return spec.gsm >= 400 ? "gold_foil" : "forest";
  return "ivory";
}
