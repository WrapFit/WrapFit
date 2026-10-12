/**
 * Versioned registry of the dieline formulas.
 *
 * A project is pinned to the formula version that was current when it was created (`formulaVersion`), so changing a
 * formula never moves the cut lines of a design that was already checked or printed. To change a formula, keep the
 * old generator under its version and register the new one under the next version.
 */

import { BoxDimensions, DielineGeometry } from "../types/dieline";
import { generateLidBaseDieline } from "./lid-base";
import { generateLidBaseDielineV1 } from "./lid-base.v1";
import { generatePillowBoxDieline } from "./pillow";
import { generatePillowBoxDielineV1 } from "./pillow.v1";
import { generateSleeveDrawerDieline } from "./sleeve-drawer";
import { generateSleeveDrawerDielineV1 } from "./sleeve-drawer.v1";
import { generateTuckTopDieline } from "./tuck-top";
import { generateTuckTopDielineV1 } from "./tuck-top.v1";
import { generateTuckTopDielineV2 } from "./tuck-top.v2";

/**
 * Version given to new projects (the backend stores it on each box template, see be/prisma/seed-data.ts).
 * 2: tuck-top lid and bottom placed on the back panel, with tuck flaps, dust flaps and cut lines.
 * 3: L × W × H is the inside of the box and the paper thickness is added; cut lines for the pillow, lid & base and
 *    sleeve boxes; corner glue tabs on their trays; the sleeve wraps around W × H so the drawer slides along L; panel
 *    hinges for the 3D model. Summaries for the studio: FORMULA_CHANGES.
 */
export const CURRENT_FORMULA_VERSION = 3;

/** What each version changed, per box structure, in Vietnamese (studio banner of projects on an older version). */
export const FORMULA_CHANGES: Record<number, Partial<Record<string, string>>> = {
  2: { "tuck-top": "nắp và đáy gắn vào mặt sau nên không còn đè lên thân hộp; có nét cắt, tai gài, tai chống bụi" },
  3: {
    "tuck-top": "cộng thêm độ dày giấy để lòng hộp đúng bằng kích thước đã nhập",
    pillow: "có nét cắt; bề rộng mặt tính đúng theo độ phồng; cộng thêm độ dày giấy",
    "lid-base": "có nét cắt và tai dán ở 4 góc để dán thành hộp; nắp rộng hơn đáy đúng độ dày giấy + 1 mm",
    "sleeve-drawer":
      "có nét cắt và tai dán ở 4 góc khay; vỏ quấn quanh khay theo chiều rộng nên khay rút ra theo chiều dài; cộng thêm độ dày giấy",
  },
};

/** One flat piece of a box: two-piece boxes print as base + lid, sleeve + drawer. */
export interface DielinePiece {
  name: string;
  geometry: DielineGeometry;
}

export class UnsupportedStructureError extends Error {}
export class UnsupportedFormulaVersionError extends Error {}

type PieceGenerator = (dimensions: BoxDimensions) => DielinePiece[];

const VERSION_1: Record<string, PieceGenerator> = {
  "tuck-top": (d) => [{ name: "Thân hộp", geometry: generateTuckTopDielineV1(d) }],
  pillow: (d) => [{ name: "Thân hộp", geometry: generatePillowBoxDielineV1(d) }],
  "lid-base": (d) => {
    const { base, lid } = generateLidBaseDielineV1(d);
    return [
      { name: "Đáy (hộp dương)", geometry: base },
      { name: "Nắp (hộp âm)", geometry: lid },
    ];
  },
  "sleeve-drawer": (d) => {
    const { sleeve, drawer } = generateSleeveDrawerDielineV1(d);
    return [
      { name: "Vỏ bao", geometry: sleeve },
      { name: "Khay kéo", geometry: drawer },
    ];
  },
};

const VERSION_3: Record<string, PieceGenerator> = {
  "tuck-top": (d) => [{ name: "Thân hộp", geometry: generateTuckTopDieline(d) }],
  pillow: (d) => [{ name: "Thân hộp", geometry: generatePillowBoxDieline(d) }],
  "lid-base": (d) => {
    const { base, lid } = generateLidBaseDieline(d);
    return [
      { name: "Đáy (hộp dương)", geometry: base },
      { name: "Nắp (hộp âm)", geometry: lid },
    ];
  },
  "sleeve-drawer": (d) => {
    const { sleeve, drawer } = generateSleeveDrawerDieline(d);
    return [
      { name: "Vỏ bao", geometry: sleeve },
      { name: "Khay kéo", geometry: drawer },
    ];
  },
};

const FORMULAS: Record<number, Record<string, PieceGenerator>> = {
  1: VERSION_1,
  2: { ...VERSION_1, "tuck-top": (d) => [{ name: "Thân hộp", geometry: generateTuckTopDielineV2(d) }] },
  3: VERSION_3,
};

/**
 * Pieces of a box with the formulas of `formulaVersion`. Throws UnsupportedFormulaVersionError for a version that was
 * never registered (a data bug, never silently replaced by the current formulas) and UnsupportedStructureError for a
 * structure without a generator in that version.
 */
export function generateDielinePieces(
  structure: string,
  dimensions: BoxDimensions,
  formulaVersion: number,
): DielinePiece[] {
  const formulas = FORMULAS[formulaVersion];
  if (!formulas) throw new UnsupportedFormulaVersionError(`Unknown dieline formula version ${formulaVersion}`);
  const generate = formulas[structure];
  if (!generate) {
    throw new UnsupportedStructureError(`No dieline generator for box structure "${structure}" (v${formulaVersion})`);
  }
  return generate(dimensions);
}
