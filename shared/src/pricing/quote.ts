/**
 * Estimated print quote of a box design (studio step 6, sample orders). One function for the studio, the offline demo
 * and the API, so every screen shows the same price.
 *
 * Method: up to DIGITAL_MAX_QUANTITY boxes a digital press prints and a plotter cuts them (no die), priced on the flat
 * area of the pieces; above it offset on B1 sheets with a steel-rule die (VND 1.5–2M per the CP2 interviews).
 * Every unit price below is an ASSUMPTION for the MVP demo: replace them with the partner shop's price list.
 */
import { MAX_SHEET_MM } from "../fitcheck/validator";
import { generateDielinePieces, type DielinePiece } from "../parametric/registry";
import type { BoxDimensions } from "../types/dieline";

/** Knife clearance between two dielines on a press sheet, mm. */
export const SHEET_GUTTER_MM = 5;

export interface SheetYield {
  name: string;
  /** Flat size of the piece, mm. */
  width: number;
  height: number;
  /** Copies on one B1 sheet (1020 × 720 mm), the better of both orientations. */
  perSheet: number;
}

/** Flat size of every piece and how many fit on a B1 press sheet. */
export function sheetYield(pieces: DielinePiece[]): SheetYield[] {
  return pieces.map(({ name, geometry: { totalBoundingBox: b } }) => {
    const w = b.width + SHEET_GUTTER_MM;
    const h = b.height + SHEET_GUTTER_MM;
    const fit = (a: number, c: number) => Math.floor(MAX_SHEET_MM.long / a) * Math.floor(MAX_SHEET_MM.short / c);
    return { name, width: Math.round(b.width), height: Math.round(b.height), perSheet: Math.max(fit(w, h), fit(h, w)) };
  });
}

export type QuotePaper = "ivory" | "kraft" | "duplex" | "rigid";
export type QuoteFinish = "matte-lamination" | "gloss-lamination" | "soft-touch-lamination" | "foil" | "spot-uv";
/** One lamination per box: the films exclude each other. */
export const LAMINATIONS: readonly QuoteFinish[] = ["matte-lamination", "gloss-lamination", "soft-touch-lamination"];
export type PrintMethod = "digital" | "offset";

/** Unit prices (VND). Assumptions for the demo: see the file header. */
export const QUOTE_PRICES = {
  /** One B1 sheet of each paper. */
  paperPerB1Sheet: { ivory: 4_500, kraft: 4_000, duplex: 5_000, rigid: 12_000 } satisfies Record<QuotePaper, number>,
  /** Digital: printing and plotter cutting, per m² of flat pieces (with their knife clearance). */
  digitalPerM2: 120_000,
  /** Digital: smallest order a partner accepts (also the price of a 1-box sample). */
  digitalMinimum: 49_000,
  /** Offset: plates and make-ready of a 4-colour job. */
  offsetSetup: 600_000,
  offsetPerSheet: 2_500,
  /** Steel-rule die (CP2: VND 1.5–2M) and die-cutting per sheet. */
  die: 1_800_000,
  dieCutPerSheet: 1_000,
  /** Sheets spoiled while setting up. */
  wasteSheets: { digital: 2, offset: 50 } satisfies Record<PrintMethod, number>,
  /** Folding and gluing, per box. */
  gluePerBox: { "tuck-top": 500, "sleeve-drawer": 800, "lid-base": 1_500, pillow: 300 } as Record<string, number>,
  /** Finishes: per B1 sheet (laminations, UV) or per box (foil, plus its plate). */
  finishes: {
    "matte-lamination": { perSheet: 3_000, perBox: 0, setup: 0 },
    "gloss-lamination": { perSheet: 2_500, perBox: 0, setup: 0 },
    "soft-touch-lamination": { perSheet: 6_500, perBox: 0, setup: 0 },
    foil: { perSheet: 0, perBox: 1_500, setup: 300_000 },
    "spot-uv": { perSheet: 4_000, perBox: 0, setup: 200_000 },
  } satisfies Record<QuoteFinish, { perSheet: number; perBox: number; setup: number }>,
  /** Share of the print partner network (CP2). */
  partnerShare: 0.15,
  shipping: 30_000,
};

/** Above this quantity offset with a die is cheaper than digital. */
export const DIGITAL_MAX_QUANTITY = 300;

export const FINISH_LABELS: Record<QuoteFinish, string> = {
  "matte-lamination": "Cán màng mờ",
  "gloss-lamination": "Cán màng bóng",
  "soft-touch-lamination": "Cán màng nhung",
  foil: "Ép kim",
  "spot-uv": "UV định hình",
};

export interface QuoteLine {
  label: string;
  vnd: number;
}

export interface Quote {
  quantity: number;
  method: PrintMethod;
  methodLabel: string;
  /** B1 sheets used (offset), or B1 sheets of the same area (digital, for the paper). */
  sheets: number;
  /** Boxes on one B1 sheet: the piece that fits the fewest. */
  perSheet: number;
  lines: QuoteLine[];
  subtotal: number;
  total: number;
  perBox: number;
  /** Working days at the shop before shipping. */
  leadDays: number;
}

export interface QuoteInput {
  structure: string;
  pieces: DielinePiece[];
  quantity: number;
  paper: QuotePaper;
  finishes?: QuoteFinish[];
  /** Force a method (comparisons); otherwise by quantity. */
  method?: PrintMethod;
}

const round100 = (vnd: number) => Math.round(vnd / 100) * 100;

/** Estimated price of `quantity` boxes. */
export function quote({ structure, pieces, quantity: asked, paper, finishes = [], method: forced }: QuoteInput): Quote {
  const P = QUOTE_PRICES;
  const quantity = Math.max(1, Math.round(asked));
  const method: PrintMethod = forced ?? (quantity <= DIGITAL_MAX_QUANTITY ? "digital" : "offset");
  const yields = sheetYield(pieces);
  const perSheet = Math.max(0, Math.min(...yields.map((y) => y.perSheet)));
  // Sheets of each piece, then the setup waste.
  const printedSheets = yields.reduce((sum, y) => sum + Math.ceil(quantity / Math.max(1, y.perSheet)), 0);
  const sheets = printedSheets + P.wasteSheets[method];
  const lines: QuoteLine[] = [];

  lines.push({ label: "Giấy", vnd: sheets * P.paperPerB1Sheet[paper] });
  if (method === "digital") {
    const areaM2 = yields.reduce((sum, y) => sum + ((y.width + SHEET_GUTTER_MM) * (y.height + SHEET_GUTTER_MM)) / 1e6, 0);
    lines.push({ label: "In kỹ thuật số và cắt plotter", vnd: areaM2 * quantity * P.digitalPerM2 });
  } else {
    lines.push({ label: "In offset (chế bản và in)", vnd: P.offsetSetup + sheets * P.offsetPerSheet });
    lines.push({ label: "Khuôn bế và bế", vnd: P.die + sheets * P.dieCutPerSheet });
  }
  for (const finish of finishes) {
    const price = P.finishes[finish];
    lines.push({ label: FINISH_LABELS[finish], vnd: price.setup + sheets * price.perSheet + quantity * price.perBox });
  }
  lines.push({ label: "Gấp và dán", vnd: quantity * (P.gluePerBox[structure] ?? 500) });

  let production = lines.reduce((sum, line) => sum + line.vnd, 0);
  if (method === "digital" && production < P.digitalMinimum) {
    lines.push({ label: "Bù đơn tối thiểu", vnd: P.digitalMinimum - production });
    production = P.digitalMinimum;
  }
  lines.push({ label: `Phí đối tác in (${Math.round(P.partnerShare * 100)}%)`, vnd: production * P.partnerShare });
  lines.push({ label: "Vận chuyển", vnd: P.shipping });

  const rounded = lines.map((line) => ({ ...line, vnd: round100(line.vnd) }));
  const total = rounded.reduce((sum, line) => sum + line.vnd, 0);
  return {
    quantity,
    method,
    methodLabel: method === "digital" ? "In kỹ thuật số, cắt plotter (không cần khuôn)" : "In offset, bế bằng khuôn",
    sheets,
    perSheet,
    lines: rounded,
    subtotal: total - round100(P.shipping),
    total,
    perBox: round100(total / quantity),
    leadDays: method === "digital" ? 3 + Math.floor(quantity / 200) : 7 + (finishes.length ? 2 : 0),
  };
}

export interface QuoteSaving {
  axis: "length" | "width" | "height";
  /** mm to take off that side. */
  deltaMm: number;
  perSheet: number;
  perBox: number;
  /** 0–1, of the current price per box. */
  saving: number;
}

/**
 * Smaller sizes that fit more boxes on a sheet: each side is tried 1 to `maxDeltaMm` mm smaller; the best saving of at
 * least 3% is returned (null otherwise). Only a suggestion: the gift must still fit.
 */
export function quoteSaving(
  input: Omit<QuoteInput, "pieces"> & { dimensions: BoxDimensions; formulaVersion?: number },
  maxDeltaMm = 5
): QuoteSaving | null {
  const piecesOf = (dimensions: BoxDimensions) => generateDielinePieces(input.structure, dimensions, input.formulaVersion);
  const current = quote({ ...input, pieces: piecesOf(input.dimensions) });
  let best: QuoteSaving | null = null;
  for (const axis of ["length", "width", "height"] as const) {
    for (let delta = 1; delta <= maxDeltaMm; delta++) {
      const dimensions = { ...input.dimensions, [axis]: input.dimensions[axis] - delta };
      if (dimensions[axis] < 15) break;
      let pieces: DielinePiece[];
      try {
        pieces = piecesOf(dimensions);
      } catch {
        break;
      }
      const next = quote({ ...input, pieces });
      if (next.perSheet <= current.perSheet) continue;
      const saving = 1 - next.perBox / current.perBox;
      if (saving >= 0.03 && (!best || saving > best.saving)) {
        best = { axis, deltaMm: delta, perSheet: next.perSheet, perBox: next.perBox, saving };
      }
      break; // the smallest change that adds boxes per sheet
    }
  }
  return best;
}
