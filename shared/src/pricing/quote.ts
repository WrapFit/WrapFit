/**
 * Estimated print quote of a box design (studio step 6, sample orders). One function for the studio, the offline demo
 * and the API, so every screen shows the same price.
 *
 * Method: the cheaper of digital (a digital press prints and a plotter cuts, no die; priced on the flat area of the
 * pieces; up to DIGITAL_MAX_QUANTITY boxes) and offset on B1 sheets with a steel-rule die (VND 1.5–2M per the CP2
 * interviews), whose fixed costs pay off on longer runs.
 * The quote stops at the finished box from the partner shop: WrapFit is the intermediary, its commission comes out of
 * the partner's price, and shipping and storage are agreed between the customer and the shop, so neither is priced here.
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
  /** Digital: printing, then plotter cutting, per m² of flat pieces (with their knife clearance). */
  digitalPrintPerM2: 90_000,
  plotterCutPerM2: 30_000,
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
  /** WrapFit's commission (CP2), paid by the partner out of the quoted price: never added to the customer's total. */
  partnerShare: 0.15,
};

/** Longest run a digital partner takes; above it only offset. Below it the quote picks the cheaper method. */
export const DIGITAL_MAX_QUANTITY = 1000;

export const FINISH_LABELS: Record<QuoteFinish, string> = {
  "matte-lamination": "Cán màng mờ",
  "gloss-lamination": "Cán màng bóng",
  "soft-touch-lamination": "Cán màng nhung",
  foil: "Ép kim",
  "spot-uv": "UV định hình",
};

/** What a cost pays for: the box material, printing, converting (cutting, finishes, gluing) up to the finished box. */
export type QuoteGroup = "material" | "print" | "converting";
export const QUOTE_GROUP_LABELS: Record<QuoteGroup, string> = {
  material: "Chất liệu hộp",
  print: "In ấn",
  converting: "Gia công & hoàn thiện",
};

/**
 * `fixed`: paid once per order whatever the quantity (plates, die, foil block): spread over more boxes, it weighs less
 * on each. `perUnit`: grows with the quantity (paper, ink, cutting, gluing).
 */
export type QuoteCostKind = "fixed" | "perUnit";

export interface QuoteLine {
  id: string;
  group: QuoteGroup;
  kind: QuoteCostKind;
  label: string;
  /** How it is computed, in words and numbers ("53 tờ B1 × 4.500đ"). */
  detail: string;
  vnd: number;
}

export interface QuoteGroupTotal {
  group: QuoteGroup;
  label: string;
  vnd: number;
  /** 0–1 of the total. */
  share: number;
}

export interface Quote {
  quantity: number;
  method: PrintMethod;
  methodLabel: string;
  /** B1 sheets used (offset), or B1 sheets of the same area (digital, for the paper). */
  sheets: number;
  /** Sheets spoiled while setting up the press, included in `sheets`. */
  wasteSheets: number;
  /** Boxes on one B1 sheet: the piece that fits the fewest. */
  perSheet: number;
  /** Flat area of one box (all pieces, with knife clearance), m². */
  areaM2: number;
  lines: QuoteLine[];
  /** The three groups, in order, with their share of the total. */
  groups: QuoteGroupTotal[];
  /** One-off costs of the order, and the costs that grow with the quantity. */
  fixedVnd: number;
  variableVnd: number;
  /** Price of the finished boxes at the partner shop, without VAT, shipping or storage. */
  total: number;
  perBox: number;
  /** WrapFit's commission inside `total`, paid by the partner (internal, not shown to the customer). */
  commissionVnd: number;
  /** Working days at the shop to produce the boxes. */
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
/** "4.500đ": the Vietnamese way, without depending on the runtime's locales. */
export const vndText = (vnd: number) => `${String(Math.round(vnd)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
const decimal = (n: number) => String(n).replace(".", ",");

/**
 * Estimated price of `quantity` boxes, line by line. Without a forced method, the cheaper one: digital (up to
 * DIGITAL_MAX_QUANTITY boxes, what a digital press takes) or offset, whose plates and die pay off on longer runs.
 */
export function quote(input: QuoteInput): Quote {
  if (input.method) return priceWith(input, input.method);
  const offset = priceWith(input, "offset");
  if (Math.round(input.quantity) > DIGITAL_MAX_QUANTITY) return offset;
  const digital = priceWith(input, "digital");
  return digital.total <= offset.total ? digital : offset;
}

function priceWith({ structure, pieces, quantity: asked, paper, finishes = [] }: QuoteInput, method: PrintMethod): Quote {
  const P = QUOTE_PRICES;
  const quantity = Math.max(1, Math.round(asked));
  const yields = sheetYield(pieces);
  const perSheet = Math.max(0, Math.min(...yields.map((y) => y.perSheet)));
  // Sheets of each piece, then the setup waste.
  const printedSheets = yields.reduce((sum, y) => sum + Math.ceil(quantity / Math.max(1, y.perSheet)), 0);
  const waste = P.wasteSheets[method];
  const sheets = printedSheets + waste;
  const areaM2 = yields.reduce((sum, y) => sum + ((y.width + SHEET_GUTTER_MM) * (y.height + SHEET_GUTTER_MM)) / 1e6, 0);
  const area = `${decimal(Math.round(areaM2 * 1000) / 1000)} m²/hộp × ${quantity} hộp`;
  const lines: QuoteLine[] = [];
  const add = (line: QuoteLine) => lines.push(line);

  add({
    id: "paper",
    group: "material",
    kind: "perUnit",
    label: "Giấy",
    detail: `${sheets} tờ B1 × ${vndText(P.paperPerB1Sheet[paper])} (${printedSheets} tờ in, ${perSheet} hộp mỗi tờ, ${waste} tờ hao hụt)`,
    vnd: sheets * P.paperPerB1Sheet[paper],
  });
  if (method === "digital") {
    add({ id: "print", group: "print", kind: "perUnit", label: "In kỹ thuật số (CMYK)", detail: `${area} × ${vndText(P.digitalPrintPerM2)}/m²`, vnd: areaM2 * quantity * P.digitalPrintPerM2 });
    add({ id: "cut", group: "converting", kind: "perUnit", label: "Cắt bằng plotter", detail: `${area} × ${vndText(P.plotterCutPerM2)}/m², không cần khuôn`, vnd: areaM2 * quantity * P.plotterCutPerM2 });
  } else {
    add({ id: "setup", group: "print", kind: "fixed", label: "Chế bản và canh máy", detail: "Kẽm 4 màu và canh màu, làm một lần cho cả đơn", vnd: P.offsetSetup });
    add({ id: "print", group: "print", kind: "perUnit", label: "In offset (CMYK)", detail: `${sheets} tờ × ${vndText(P.offsetPerSheet)}`, vnd: sheets * P.offsetPerSheet });
    add({ id: "die", group: "converting", kind: "fixed", label: "Khuôn bế", detail: "Làm một lần, xưởng giữ lại cho lần in sau", vnd: P.die });
    add({ id: "cut", group: "converting", kind: "perUnit", label: "Bế hộp", detail: `${sheets} tờ × ${vndText(P.dieCutPerSheet)}`, vnd: sheets * P.dieCutPerSheet });
  }
  for (const finish of finishes) {
    const price = P.finishes[finish];
    const label = FINISH_LABELS[finish];
    if (price.setup > 0) add({ id: `${finish}-setup`, group: "converting", kind: "fixed", label: `${label}: làm bản`, detail: "Bản ép hoặc lưới UV, làm một lần", vnd: price.setup });
    const how = price.perSheet > 0 ? `${sheets} tờ × ${vndText(price.perSheet)}` : `${quantity} hộp × ${vndText(price.perBox)}`;
    add({ id: finish, group: "converting", kind: "perUnit", label, detail: how, vnd: sheets * price.perSheet + quantity * price.perBox });
  }
  const glue = P.gluePerBox[structure] ?? 500;
  add({ id: "glue", group: "converting", kind: "perUnit", label: "Gấp và dán", detail: `${quantity} hộp × ${vndText(glue)}`, vnd: quantity * glue });

  const production = lines.reduce((sum, line) => sum + line.vnd, 0);
  if (method === "digital" && production < P.digitalMinimum) {
    add({
      id: "minimum",
      group: "converting",
      kind: "fixed",
      label: "Bù đơn tối thiểu",
      detail: `Xưởng nhận đơn từ ${vndText(P.digitalMinimum)}`,
      vnd: P.digitalMinimum - production,
    });
  }

  const rounded = lines.map((line) => ({ ...line, vnd: round100(line.vnd) }));
  const total = rounded.reduce((sum, line) => sum + line.vnd, 0);
  const groups = (Object.keys(QUOTE_GROUP_LABELS) as QuoteGroup[]).map((group) => {
    const vnd = rounded.filter((line) => line.group === group).reduce((sum, line) => sum + line.vnd, 0);
    return { group, label: QUOTE_GROUP_LABELS[group], vnd, share: total ? vnd / total : 0 };
  });
  const fixedVnd = rounded.filter((line) => line.kind === "fixed").reduce((sum, line) => sum + line.vnd, 0);
  return {
    quantity,
    method,
    methodLabel: method === "digital" ? "In kỹ thuật số, cắt plotter (không cần khuôn)" : "In offset, bế bằng khuôn",
    sheets,
    wasteSheets: waste,
    perSheet,
    areaM2,
    lines: rounded,
    groups,
    fixedVnd,
    variableVnd: total - fixedVnd,
    total,
    perBox: round100(total / quantity),
    commissionVnd: round100(total * P.partnerShare),
    leadDays: method === "digital" ? 3 + Math.floor(quantity / 200) : 7 + (finishes.length ? 2 : 0),
  };
}

export interface QuoteStep {
  quantity: number;
  method: PrintMethod;
  perBox: number;
  total: number;
  /** 0–1: how much cheaper each box is than a single box. */
  savingVsOne: number;
  /** 0–1: how much cheaper each box is than at the previous quantity (negative: dearer); null for the first. */
  savingVsPrevious: number | null;
}

/** Quantities the step 6 ladder compares. */
export const QUOTE_LADDER = [1, 20, 50, 100, 200, 300, 500, 1000, 2000];

/** The same design at several quantities: the price per box and how much it drops. */
export function quoteLadder(input: Omit<QuoteInput, "quantity" | "method">, quantities: readonly number[] = QUOTE_LADDER): QuoteStep[] {
  const sorted = [...new Set(quantities.map((q) => Math.max(1, Math.round(q))))].sort((a, b) => a - b);
  const one = quote({ ...input, quantity: 1 }).perBox;
  let previous: number | null = null;
  return sorted.map((quantity) => {
    const q = quote({ ...input, quantity });
    const step: QuoteStep = {
      quantity,
      method: q.method,
      perBox: q.perBox,
      total: q.total,
      savingVsOne: 1 - q.perBox / one,
      savingVsPrevious: previous === null ? null : 1 - q.perBox / previous,
    };
    previous = q.perBox;
    return step;
  });
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
