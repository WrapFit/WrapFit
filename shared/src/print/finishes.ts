/**
 * Print finishes of single elements (docs/23 S6, D8): foil, spot UV, embossing. Each one goes to the print file as its
 * own spot colour (100 %, overprinted, layer "Finish"), the way print shops make the foil block, the UV screen or the
 * emboss die. `cmyk` is only the alternate colour a viewer shows for the spot; `display` is its colour on screen.
 */
import type { QuoteFinish } from "../pricing/quote";
import type { CanvasElement, ElementFinish } from "../types/project";

export interface FinishSpot {
  /** Spot colour name in the PDF (no spaces). */
  name: string;
  /** Name in the editor. */
  label: string;
  cmyk: [number, number, number, number];
  /** Colour of the finish on screen (editor badges, SVG layer, 3D tint). */
  display: string;
  /** Foil: shiny metal in 3D, foil rules in FitCheck. */
  metallic: boolean;
  /** Line of the quote that pays for it. */
  quote: QuoteFinish;
}

export const FINISH_SPOTS: Record<ElementFinish, FinishSpot> = {
  foil_gold: { name: "Foil_Gold", label: "Ép kim vàng", cmyk: [0, 20, 60, 20], display: "#C9A227", metallic: true, quote: "foil" },
  foil_silver: { name: "Foil_Silver", label: "Ép kim bạc", cmyk: [0, 0, 0, 30], display: "#B9BEC5", metallic: true, quote: "foil" },
  foil_rose: { name: "Foil_RoseGold", label: "Ép kim vàng hồng", cmyk: [0, 35, 35, 10], display: "#CB8E7E", metallic: true, quote: "foil" },
  spot_uv: { name: "SpotUV", label: "UV định hình", cmyk: [30, 0, 0, 0], display: "#7DD3E8", metallic: false, quote: "spot-uv" },
  emboss: { name: "Emboss", label: "Dập nổi", cmyk: [0, 0, 40, 0], display: "#E5D27A", metallic: false, quote: "emboss" },
  deboss: { name: "Deboss", label: "Dập chìm", cmyk: [0, 40, 0, 0], display: "#D79BC8", metallic: false, quote: "emboss" },
};

/** Order of the finishes in the editor. */
export const ELEMENT_FINISHES: ElementFinish[] = ["foil_gold", "foil_silver", "foil_rose", "spot_uv", "emboss", "deboss"];

/**
 * Smallest line and text a foil block holds. Defaults of docs/23 Q1 until the partner print shop gives its own.
 */
export const MIN_FOIL_LINE_MM = 0.3;
export const MIN_FOIL_TEXT_PT = 8;

/** Finishes the quote must price for the elements of a design (visible ones). */
export function quoteFinishesOf(elements: CanvasElement[]): QuoteFinish[] {
  const found = new Set<QuoteFinish>();
  for (const el of elements) if (el.finish && !el.hidden) found.add(FINISH_SPOTS[el.finish].quote);
  return [...found];
}
