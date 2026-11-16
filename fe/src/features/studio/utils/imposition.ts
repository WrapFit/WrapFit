import {
  type ImpositionItem,
  type ImpositionResult,
  PRESS_SHEET_FORMATS,
  type PressSheetFormat,
  type PressSheetId,
} from "../types/imposition";

/** Constant pre-press margins in millimeters */
export const GRIPPER_MARGIN_MM = 12; // Mép kẹp nhíp máy in offset
export const COLOR_BAR_HEIGHT_MM = 8; // Dải thang màu CMYK
export const SIDE_MARGIN_MM = 10; // Lề biên giấy hai bên
export const KNIFE_GUTTER_MM = 4; // Khoảng hở an toàn giữa hai lưỡi dao bế

export interface CalculateImpositionOptions {
  pieceWidth: number; // mm (flat bounding box width)
  pieceHeight: number; // mm (flat bounding box height)
  sheetId?: PressSheetId;
  knifeGutter?: number;
}

/**
 * Calculates optimal imposition (bình trang in) for offset and digital production.
 * Evaluates both 0° and 90° rotations to maximize copies per sheet and minimize paper waste.
 */
export function calculateImposition({
  pieceWidth,
  pieceHeight,
  sheetId = "B1",
  knifeGutter = KNIFE_GUTTER_MM,
}: CalculateImpositionOptions): ImpositionResult {
  const gutter = Math.max(2, knifeGutter);

  // If auto optimal requested, evaluate all standard formats and pick best fit
  let targetSheet: PressSheetFormat;
  if (sheetId === "AUTO_OPTIMAL") {
    let bestResult: ImpositionResult | null = null;
    let bestEfficiency = -1;

    for (const fmt of PRESS_SHEET_FORMATS) {
      const res = layoutOnSheet(pieceWidth, pieceHeight, fmt, gutter);
      if (res.totalUps > 0 && res.paperEfficiencyPercent > bestEfficiency) {
        bestEfficiency = res.paperEfficiencyPercent;
        bestResult = res;
      }
    }
    if (bestResult) return bestResult;
    targetSheet = PRESS_SHEET_FORMATS[0]; // fallback B1
  } else {
    targetSheet = PRESS_SHEET_FORMATS.find((f) => f.id === sheetId) ?? PRESS_SHEET_FORMATS[0];
  }

  return layoutOnSheet(pieceWidth, pieceHeight, targetSheet, gutter);
}

function layoutOnSheet(
  pw: number,
  ph: number,
  sheet: PressSheetFormat,
  gutter: number
): ImpositionResult {
  const sheetW = sheet.width;
  const sheetH = sheet.height;

  // Printable usable area excluding gripper and color bar
  const usableW = Math.max(10, sheetW - SIDE_MARGIN_MM * 2);
  const usableH = Math.max(10, sheetH - GRIPPER_MARGIN_MM - COLOR_BAR_HEIGHT_MM - SIDE_MARGIN_MM);

  // 1. Evaluate Normal orientation (0°)
  const cols0 = Math.max(0, Math.floor((usableW + gutter) / (pw + gutter)));
  const rows0 = Math.max(0, Math.floor((usableH + gutter) / (ph + gutter)));
  const total0 = cols0 * rows0;

  // 2. Evaluate Rotated orientation (90°)
  const cols90 = Math.max(0, Math.floor((usableW + gutter) / (ph + gutter)));
  const rows90 = Math.max(0, Math.floor((usableH + gutter) / (pw + gutter)));
  const total90 = cols90 * rows90;

  // Choose the orientation yielding more ups, or higher area coverage
  const useRotated = total90 > total0;
  const totalUps = useRotated ? total90 : total0;
  const cols = useRotated ? cols90 : cols0;
  const rows = useRotated ? rows90 : rows0;
  const itemW = useRotated ? ph : pw;
  const itemH = useRotated ? pw : ph;

  const items: ImpositionItem[] = [];

  if (totalUps > 0 && cols > 0 && rows > 0) {
    const gridW = cols * itemW + (cols - 1) * gutter;
    const gridH = rows * itemH + (rows - 1) * gutter;

    // Center the grid within the printable area
    const startX = SIDE_MARGIN_MM + (usableW - gridW) / 2;
    // Offset Y leaves room for color bar at top and gripper at bottom
    const startY = COLOR_BAR_HEIGHT_MM + 4 + (usableH - gridH) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push({
          id: `up-${r}-${c}`,
          x: Math.round((startX + c * (itemW + gutter)) * 10) / 10,
          y: Math.round((startY + r * (itemH + gutter)) * 10) / 10,
          width: itemW,
          height: itemH,
          rotated: useRotated,
          colIndex: c,
          rowIndex: r,
        });
      }
    }
  }

  const pieceArea = pw * ph;
  const totalPrintedArea = totalUps * pieceArea;
  const sheetArea = sheetW * sheetH;
  const paperEfficiencyPercent = sheetArea > 0 ? Math.round((totalPrintedArea / sheetArea) * 1000) / 10 : 0;
  const wastePercent = Math.max(0, Math.round((100 - paperEfficiencyPercent) * 10) / 10);

  return {
    sheet,
    items,
    totalUps,
    rows,
    cols,
    rotated: useRotated,
    itemWidth: itemW,
    itemHeight: itemH,
    gutterX: gutter,
    gutterY: gutter,
    gripperMargin: GRIPPER_MARGIN_MM,
    usableWidth: usableW,
    usableHeight: usableH,
    paperEfficiencyPercent,
    wastePercent,
  };
}
