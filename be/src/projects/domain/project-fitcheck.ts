// Dieline pieces of a box and the server-side FitCheck of a project. Plain TypeScript: geometry and rules come from
// the parametric engine of IT2 (`@wrapfit/shared`); used by the projects module and by the print export.
import {
  type BoxDimensions,
  type CanvasElement,
  checkBox,
  type DielinePiece,
  type FitCheckReport,
  generateDielinePieces,
  UnsupportedStructureError,
} from '@wrapfit/shared';

export { matchesPanel, UnsupportedFormulaVersionError, UnsupportedStructureError } from '@wrapfit/shared';

/**
 * Every box is printed as one or more flat pieces (two-piece boxes: base + lid, sleeve + drawer), drawn with the
 * formulas of the version the project is pinned to.
 */
export function dielinePieces(structure: string, dimensions: BoxDimensions, formulaVersion: number): DielinePiece[] {
  return generateDielinePieces(structure, dimensions, formulaVersion);
}

/** FitCheck score a design needs to be listed in the community template hub (UC-14). */
export const MIN_COMMUNITY_FITCHECK_SCORE = 90;

/**
 * FitCheck of a whole box (every piece, each element once), with the same function the editor runs on every change
 * (`checkBox` of @wrapfit/shared), so the saved score is the one the user saw.
 */
export function checkProject(
  structure: string,
  dimensions: BoxDimensions,
  elements: CanvasElement[],
  formulaVersion: number,
): FitCheckReport {
  return checkBox(dielinePieces(structure, dimensions, formulaVersion), elements);
}

/** Same as checkProject, but `null` for a structure that has no dieline generator yet (nothing to check against). */
export function fitCheckOf(
  structure: string,
  dimensions: BoxDimensions,
  elements: CanvasElement[],
  formulaVersion: number,
): FitCheckReport | null {
  try {
    return checkProject(structure, dimensions, elements, formulaVersion);
  } catch (error) {
    if (error instanceof UnsupportedStructureError) return null;
    throw error;
  }
}
