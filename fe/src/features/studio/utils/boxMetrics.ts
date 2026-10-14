import { MAX_SHEET_MM, type BoxDimensions, type DielinePiece } from "@wrapfit/shared";

/** Gap between two dielines on a press sheet (knife clearance), mm. */
const SHEET_GUTTER_MM = 5;

export interface SheetFit {
  name: string;
  width: number;
  height: number;
  /** Copies of this piece on one B1 sheet (1020 × 720 mm), the better of both orientations. */
  perSheet: number;
}

/** Flat size of every piece and how many fit on a B1 press sheet. */
export function sheetFits(pieces: DielinePiece[]): SheetFit[] {
  return pieces.map(({ name, geometry: { totalBoundingBox: b } }) => {
    const w = b.width + SHEET_GUTTER_MM;
    const h = b.height + SHEET_GUTTER_MM;
    const fit = (a: number, c: number) => Math.floor(MAX_SHEET_MM.long / a) * Math.floor(MAX_SHEET_MM.short / c);
    return { name, width: Math.round(b.width), height: Math.round(b.height), perSheet: Math.max(fit(w, h), fit(h, w)) };
  });
}

/** Inner volume in millilitres (1 ml = 1 000 mm³). */
export const innerVolumeMl = ({ length, width, height }: BoxDimensions) => Math.round((length * width * height) / 1000);

/** Fold lines of the dieline, every piece. */
export const creaseCount = (pieces: DielinePiece[]) =>
  pieces.reduce((sum, piece) => sum + piece.geometry.segments.filter((segment) => segment.type === "crease").length, 0);

/** Outside size of one side: the inner size plus the board on both faces. */
export const outerSize = (inner: number, paperThickness: number) => Math.round((inner + 2 * paperThickness) * 10) / 10;

const NUMBER = new Intl.NumberFormat("vi-VN");
export const formatNumber = (value: number) => NUMBER.format(value);
