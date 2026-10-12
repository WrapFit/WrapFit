import {
  CURRENT_FORMULA_VERSION,
  checkBox,
  dimensionRuleErrors,
  generateDielinePieces,
  type BoxDimensions,
  type CanvasElement,
  type DielinePiece,
  type FitCheckReport,
} from "@wrapfit/shared";
import type { DimensionLimits, DimensionRange } from "@/types/api";

/**
 * Flat pieces of a box with the formulas the project is pinned to (`formulaVersion`), like the print export: the
 * dieline on screen is the one that gets printed. A design that is not saved yet uses the current formulas.
 */
export function dielinePiecesOf(
  structure: string,
  dimensions: BoxDimensions,
  formulaVersion: number = CURRENT_FORMULA_VERSION
): DielinePiece[] {
  return generateDielinePieces(structure, dimensions, formulaVersion);
}

/**
 * FitCheck of the whole box with the function the server runs after each save (`checkBox` of @wrapfit/shared, called
 * by `checkProject` in be/src/projects/domain/project-fitcheck.ts). Runs on every change, so the score follows a drag
 * before the save answers.
 */
export function checkDesign(pieces: DielinePiece[], elements: CanvasElement[]): FitCheckReport {
  return checkBox(pieces, elements);
}

/** Piece that holds a panel, so the canvas shows the piece of the selected element. */
export function pieceIndexOfPanel(pieces: DielinePiece[], panelId: string): number {
  return pieces.findIndex((piece) => piece.geometry.panels.some((p) => p.id === panelId || p.id === `panel_${panelId}`));
}

export type DimensionField = "length" | "width" | "height" | "paperThickness";

export const DIMENSION_LABELS: Record<DimensionField, string> = {
  length: "Chiều dài",
  width: "Chiều rộng",
  height: "Chiều cao",
  paperThickness: "Độ dày giấy",
};

export function rangeOf(limits: DimensionLimits | undefined, field: DimensionField): DimensionRange | undefined {
  return limits?.[field];
}

/** Keeps a value inside the range of its dimension (no range: unchanged). */
export function clampDimension(limits: DimensionLimits | undefined, field: DimensionField, value: number): number {
  const range = rangeOf(limits, field);
  if (!range || !Number.isFinite(value)) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/**
 * One Vietnamese message per dimension outside the limits of the box structure, then the proportion rules of the
 * structure (`dimensionRuleErrors`): the API answers 400 for both.
 */
export function dimensionErrors(
  dimensions: BoxDimensions,
  limits: DimensionLimits | undefined,
  structure?: string
): string[] {
  const outside = (Object.keys(DIMENSION_LABELS) as DimensionField[]).flatMap((field) => {
    const range = limits?.[field];
    const value = dimensions[field];
    if (!range || (value >= range.min && value <= range.max)) return [];
    return [`${DIMENSION_LABELS[field]} phải từ ${range.min} đến ${range.max} mm.`];
  });
  return [...outside, ...(structure ? dimensionRuleErrors(structure, dimensions).map((rule) => rule.vi) : [])];
}
