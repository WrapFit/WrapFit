/**
 * FitCheck™ Validation Engine — one function for the editor (live score) and the server (score saved with the project,
 * export gate), so both always agree. Rules: skill `fitcheck-validator` and the prepress checklist (`print/prepress.ts`).
 * Owned by IT 2 (Production Physics)
 *
 * Scoring: 100 − 30 per error − 10 per warning (never below 0). Any error blocks the print export.
 * Not checked yet: text overflowing its box (needs font metrics; the editor wraps text inside the box anyway).
 */

import { CanvasElement } from "../types/project";
import { DielineGeometry, PanelFace } from "../types/dieline";
import { FitCheckReport, FitCheckViolation } from "../types/fitcheck";
import type { DielinePiece } from "../parametric/registry";
import { ean13Digits, isEan13Valid, MIN_BARCODE_MM } from "../print/barcode";
import {
  BLEED_BOX_MM,
  BLEED_MM,
  HARD_MIN_DPI,
  MIN_LINE_MM,
  PRINT_DPI,
  SAFE_MARGIN_CREASE_MM,
  SAFE_MARGIN_CUT_MM,
} from "../print/prepress";
import { fontSizeMmOf, printFontOf, PT_TO_MM, type PrintFontId } from "../print/text-layout";

/** Text, logos, images and barcodes stay this far inside a fold of their panel, mm (SAFE_MARGIN_CUT_MM from a cut). */
export const SAFE_MARGIN_MM = SAFE_MARGIN_CREASE_MM;
/** Raster images print sharp from this resolution at their printed size; below HARD_MIN_DPI is an error. */
export const MIN_DPI = PRINT_DPI;
/** Largest flat piece most print shops can run: B1 sheet, mm. */
export const MAX_SHEET_MM = { long: 1020, short: 720 };

/**
 * Thinnest stroke of each print font (bold) as a fraction of the font size: the top and bottom hairlines of "o" / "O"
 * / "e", measured on the outlines of the font files (be/src/export/rendering FONT_FILES).
 * A text whose thinnest stroke falls under MIN_LINE_MM may lose those strokes on paper.
 */
const THINNEST_STROKE_EM: Record<PrintFontId, number> = {
  "be-vietnam-pro": 0.114,
  inter: 0.115,
  "big-shoulders-display": 0.083,
  "playfair-display": 0.018,
  "cormorant-garamond": 0.021,
};

/** Smallest font size (pt) whose strokes stay at least MIN_LINE_MM thick. */
export function minFontSizePt(font: PrintFontId): number {
  return Math.ceil(MIN_LINE_MM / THINNEST_STROKE_EM[font] / PT_TO_MM);
}

/** Element types that are a background: no safe margin, but bleed past the cut lines they reach. */
const BACKGROUND_TYPES = new Set<CanvasElement["type"]>(["pattern"]);
const RASTER_TYPES = new Set<CanvasElement["type"]>(["image", "pattern", "logo"]);
const TOUCH = 0.01; // mm: a segment lies on a panel side

type Side = "top" | "right" | "bottom" | "left";
const SIDES: Side[] = ["top", "right", "bottom", "left"];
type Rect = { x: number; y: number; width: number; height: number };

/** Canvas elements reference a panel by its full id (`panel_front`) or its short name (`front`). */
export function matchesPanel(panel: PanelFace, panelId: string): boolean {
  return panel.id === panelId || panel.id === `panel_${panelId}`;
}

/** Axis-aligned box of an element turned around its centre (canvas rotation), in the coordinates of its panel. */
export function envelopeOf(element: Pick<CanvasElement, "x" | "y" | "width" | "height" | "rotation">): Rect {
  const angle = ((element.rotation || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfW = (element.width * cos + element.height * sin) / 2;
  const halfH = (element.width * sin + element.height * cos) / 2;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return { x: cx - halfW, y: cy - halfH, width: 2 * halfW, height: 2 * halfH };
}

/**
 * Sides of a panel that lie on the outline of the piece (cut lines), the others are folds or open inside the sheet.
 * A side counts as cut when straight cut segments cover at least half of it.
 */
export function cutSidesOf(panel: PanelFace, geometry: DielineGeometry): Set<Side> {
  const { x, y, width, height } = panel.bounds;
  const sides: Record<Side, { fixed: "x" | "y"; at: number; from: number; to: number }> = {
    top: { fixed: "y", at: y, from: x, to: x + width },
    bottom: { fixed: "y", at: y + height, from: x, to: x + width },
    left: { fixed: "x", at: x, from: y, to: y + height },
    right: { fixed: "x", at: x + width, from: y, to: y + height },
  };
  const result = new Set<Side>();
  for (const side of SIDES) {
    const { fixed, at, from, to } = sides[side];
    const along = fixed === "y" ? "x" : "y";
    let covered = 0;
    for (const segment of geometry.segments) {
      if (segment.type !== "cut" || segment.pathString) continue;
      if (Math.abs(segment.start[fixed] - at) > TOUCH || Math.abs(segment.end[fixed] - at) > TOUCH) continue;
      const lo = Math.max(from, Math.min(segment.start[along], segment.end[along]));
      const hi = Math.min(to, Math.max(segment.start[along], segment.end[along]));
      covered += Math.max(0, hi - lo);
    }
    if (covered >= (to - from) / 2) result.add(side);
  }
  return result;
}

/** Safe margin each side of a panel asks for: SAFE_MARGIN_CUT_MM on a cut line, SAFE_MARGIN_CREASE_MM on a fold. */
export function safeMarginsOf(panel: PanelFace, geometry: DielineGeometry): Record<Side, number> {
  const cut = cutSidesOf(panel, geometry);
  const of = (side: Side) => (cut.has(side) ? SAFE_MARGIN_CUT_MM : SAFE_MARGIN_CREASE_MM);
  return { top: of("top"), right: of("right"), bottom: of("bottom"), left: of("left") };
}

/** Distance from each side of the panel to the element, inwards (negative: the element sticks out past that side). */
function marginsOf(box: Rect, panel: PanelFace): Record<Side, number> {
  return {
    top: box.y,
    left: box.x,
    right: panel.bounds.width - (box.x + box.width),
    bottom: panel.bounds.height - (box.y + box.height),
  };
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const labelOf = (element: CanvasElement) =>
  element.type === "text"
    ? `"${element.content.length > 18 ? `${element.content.slice(0, 18)}…` : element.content}"`
    : element.type === "pattern"
      ? "Hoa văn"
      : element.type === "logo"
        ? "Logo"
        : element.type === "barcode"
          ? ean13Digits(element.content)
            ? "Mã vạch"
            : "Mã QR"
          : "Hình ảnh";

/** Panel of an element, with the piece it belongs to. */
function locate(pieces: DielinePiece[], panelId: string): { panel: PanelFace; geometry: DielineGeometry } | null {
  for (const piece of pieces) {
    const panel = piece.geometry.panels.find((p) => matchesPanel(p, panelId));
    if (panel) return { panel, geometry: piece.geometry };
  }
  return null;
}

/**
 * FitCheck of a whole box: every piece (two-piece boxes), every element once. Panel ids are resolved like the print
 * export ("front" = "panel_front", first piece that has the panel).
 */
export function checkBox(pieces: DielinePiece[], elements: CanvasElement[]): FitCheckReport {
  const violations: FitCheckViolation[] = [];

  for (const piece of pieces) {
    const { width, height } = piece.geometry.totalBoundingBox;
    const long = Math.max(width, height);
    const short = Math.min(width, height);
    if (long > MAX_SHEET_MM.long || short > MAX_SHEET_MM.short) {
      violations.push({
        id: `sheet_${piece.name}`,
        code: "DIMENSION_OUT_OF_BOUNDS",
        severity: "warning",
        title: "Phôi lớn hơn khổ giấy B1",
        message: `Phôi "${piece.name}" trải phẳng ${Math.round(width)} × ${Math.round(height)} mm, lớn hơn khổ B1 (${MAX_SHEET_MM.long} × ${MAX_SHEET_MM.short} mm) của phần lớn xưởng in.`,
        suggestion: "Giảm kích thước hộp, hoặc hỏi trước xưởng có máy in khổ lớn.",
        currentValue: Math.round(long),
        expectedValue: MAX_SHEET_MM.long,
      });
    }
  }

  // A box without artwork prints as plain paper: allowed (a plain box is a real order), but never "print-ready art".
  if (elements.length === 0) {
    violations.push({
      id: "empty_design",
      code: "EMPTY_DESIGN",
      severity: "info",
      title: "Hộp chưa có hình in",
      message: "Hộp sẽ được in trơn, chỉ có màu giấy. FitCheck chỉ kiểm tra hình in khi bạn thêm chữ, tem hoặc ảnh.",
      suggestion: "Áp một phong cách cả hộp hoặc thêm chữ, tem từ thư viện.",
    });
  }

  for (const element of elements) {
    const label = labelOf(element);
    const found = locate(pieces, element.panelId);
    if (!found) {
      violations.push({
        id: `panel_${element.id}`,
        code: "NO_PANEL",
        severity: "warning",
        elementId: element.id,
        panelId: element.panelId,
        title: "Phần tử không nằm trên mặt hộp nào",
        message: `${label} gắn với mặt "${element.panelId}", hộp này không có mặt đó nên sẽ không được in.`,
        suggestion: "Xoá phần tử, hoặc thêm lại vào một mặt của hộp.",
      });
      continue;
    }
    const { panel, geometry } = found;
    const box = envelopeOf(element);
    const margins = marginsOf(box, panel);
    const cutSides = cutSidesOf(panel, geometry);
    const required = safeMarginsOf(panel, geometry);
    const background = BACKGROUND_TYPES.has(element.type);

    if (!background) {
      // 1. Safe margin: 5 mm from the cut lines, 3 mm from the folds of the panel (rotated elements: their turned box).
      const worst = SIDES.reduce((a, b) => (margins[b] - required[b] < margins[a] - required[a] ? b : a));
      const margin = margins[worst];
      if (margin < required[worst]) {
        const onCut = cutSides.has(worst);
        violations.push({
          id: `margin_${element.id}`,
          code: onCut ? "CUT_OVERLAP" : "CREASE_OVERLAP",
          severity: margin < 1 ? "error" : "warning",
          elementId: element.id,
          panelId: panel.id,
          title: onCut ? "Quá sát nét cắt" : "Quá sát nếp gấp",
          message:
            margin < 0
              ? `${label} tràn ra ngoài mặt ${panel.name} ${(-margin).toFixed(1)} mm, phần tràn sẽ bị ${onCut ? "cắt mất" : "gập sang mặt bên"}.`
              : `${label} chỉ cách ${onCut ? "nét cắt" : "nếp gấp"} ${margin.toFixed(1)} mm (cần ≥ ${required[worst]} mm).`,
          suggestion: `Dịch phần tử vào trong mặt, cách ${onCut ? "nét cắt" : "nếp gấp"} tối thiểu ${required[worst]} mm, để không bị ${onCut ? "xén mất khi bế" : "gãy nét khi gập hộp"}.`,
          currentValue: Number(margin.toFixed(2)),
          expectedValue: required[worst],
        });
      }
    } else {
      // 2. Bleed: a background that reaches a cut line must run past it, or stay clear of it.
      const short = [...cutSides].filter((side) => margins[side] > -BLEED_MM && margins[side] < SAFE_MARGIN_CREASE_MM);
      if (short.length > 0) {
        const worst = Math.max(...short.map((side) => -margins[side]));
        violations.push({
          id: `bleed_${element.id}`,
          code: "BLEED_INSUFFICIENT",
          severity: "warning",
          elementId: element.id,
          panelId: panel.id,
          title: "Hoa văn thiếu tràn lề",
          message: `${label} trên mặt ${panel.name} chạm tới nét cắt nhưng chỉ tràn ${Math.max(0, worst).toFixed(1)} mm; khi bế lệch sẽ lộ viền giấy trắng.`,
          suggestion: `Kéo hoa văn tràn ra ngoài nét cắt ${BLEED_MM}–${BLEED_BOX_MM} mm, hoặc lùi vào trong ${SAFE_MARGIN_CREASE_MM} mm.`,
          currentValue: Number(Math.max(0, worst).toFixed(2)),
          expectedValue: BLEED_MM,
        });
      }
    }

    // 3. Glue flaps and tabs stay free of ink.
    const onSheet = { ...box, x: box.x + panel.bounds.x, y: box.y + panel.bounds.y };
    if (geometry.glueAreas?.some((area) => overlaps(onSheet, area))) {
      violations.push({
        id: `glue_${element.id}`,
        code: "GLUE_CONTAMINATED",
        severity: "error",
        elementId: element.id,
        panelId: panel.id,
        title: "Mực in lấn lên tai dán",
        message: `${label} lấn lên tai dán: keo không bám lên mực, hộp sẽ bung.`,
        suggestion: "Thu nhỏ hoặc dịch phần tử để nằm gọn trong mặt hộp.",
      });
    }

    // 4. Resolution of raster files at their printed size: 300 DPI, blurry (error) under 150.
    if (RASTER_TYPES.has(element.type) && element.dpi && element.dpi < PRINT_DPI) {
      const blocking = element.dpi < HARD_MIN_DPI;
      violations.push({
        id: `dpi_${element.id}`,
        code: "LOW_DPI",
        severity: blocking ? "error" : "warning",
        elementId: element.id,
        panelId: panel.id,
        title: "Độ phân giải hình ảnh thấp",
        message: blocking
          ? `${label} chỉ đạt ${element.dpi} DPI ở kích thước in, chắc chắn sẽ vỡ hạt.`
          : `${label} đạt ${element.dpi} DPI ở kích thước in, dưới chuẩn ${PRINT_DPI} DPI của nhà in, có thể bị mờ nhòe.`,
        suggestion: `Dùng ảnh gốc chất lượng cao hơn để đạt ${PRINT_DPI} DPI, hoặc thu nhỏ ảnh trên hộp (ảnh nhỏ lại thì DPI tăng).`,
        currentValue: element.dpi,
        expectedValue: PRINT_DPI,
      });
    }

    // 5. Strokes of a text thinner than the ink holds. Every line WrapFit draws itself (dielines, crop marks, barcode
    // modules) is thicker than MIN_LINE_MM; the hairlines of serif faces are part of their design, so this is a note
    // (no score penalty): offset presses hold them, digital presses and kraft paper may break them.
    if (element.type === "text" && element.content.trim()) {
      const font = printFontOf(element.style?.fontFamily);
      const sizePt = fontSizeMmOf(element) / PT_TO_MM;
      const minPt = minFontSizePt(font);
      if (sizePt < minPt) {
        violations.push({
          id: `line_${element.id}`,
          code: "LINE_TOO_THIN",
          severity: "info",
          elementId: element.id,
          panelId: panel.id,
          title: "Nét chữ quá mảnh",
          message: `${label} cỡ ${Math.round(sizePt)} pt có nét mảnh dưới ${MIN_LINE_MM} mm: in offset vẫn giữ được, nhưng máy in kỹ thuật số hoặc giấy kraft có thể làm đứt nét.`,
          suggestion: `Nếu in kỹ thuật số hoặc trên giấy kraft, tăng cỡ chữ lên tối thiểu ${minPt} pt hoặc đổi sang font không chân (Be Vietnam Pro, Inter).`,
          currentValue: Math.round(sizePt),
          expectedValue: minPt,
        });
      }
    }

    // 6. Barcodes and QR codes that scan.
    if (element.type === "barcode") {
      const ean = ean13Digits(element.content);
      const size = ean ? element.width : Math.min(element.width, element.height);
      const minimum = ean ? MIN_BARCODE_MM.ean13Width : MIN_BARCODE_MM.qrSide;
      const tooSmall = size < minimum;
      if ((ean && !isEan13Valid(element.content)) || tooSmall) {
        violations.push({
          id: `barcode_${element.id}`,
          code: "BARCODE_UNREADABLE",
          severity: tooSmall ? "warning" : "error",
          elementId: element.id,
          panelId: panel.id,
          title: tooSmall ? `${label} quá nhỏ để quét` : "Mã vạch sai số kiểm tra",
          message: tooSmall
            ? `${label} rộng ${Math.round(size)} mm, máy quét cần tối thiểu ${minimum} mm.`
            : `Chữ số cuối của mã EAN-13 "${element.content}" không khớp số kiểm tra, máy quét sẽ từ chối.`,
          suggestion: tooSmall ? `Phóng to ${label.toLowerCase()} lên tối thiểu ${minimum} mm.` : "Kiểm tra lại mã sản phẩm.",
          ...(tooSmall ? { currentValue: Math.round(size), expectedValue: minimum } : {}),
        });
      }
    }
  }

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;
  return {
    isValidForProduction: errorCount === 0,
    score: Math.max(0, 100 - errorCount * 30 - warningCount * 10),
    violations,
    auditedAt: new Date().toISOString(),
  };
}

/**
 * 1-click fix (Gói's watchdog): moves each element that breaks the safe margin back inside its panel (SAFE_MARGIN_CUT_MM
 * from cut sides, SAFE_MARGIN_CREASE_MM from folds; rotated elements by their turned box), shrinking it when the panel
 * is too small; stretches backgrounds that stop short of a cut line to BLEED_BOX_MM past it. Elements without a panel
 * are left alone.
 */
export function autoFixElements(pieces: DielinePiece[], elements: CanvasElement[]): CanvasElement[] {
  return elements.map((element) => {
    const found = locate(pieces, element.panelId);
    if (!found) return element;
    const { panel, geometry } = found;
    const margins = marginsOf(envelopeOf(element), panel);

    if (BACKGROUND_TYPES.has(element.type)) {
      if (element.rotation) return element;
      const next = { ...element };
      for (const side of cutSidesOf(panel, geometry)) {
        if (margins[side] <= -BLEED_MM || margins[side] >= SAFE_MARGIN_CREASE_MM) continue;
        if (side === "left") {
          next.width += next.x + BLEED_BOX_MM;
          next.x = -BLEED_BOX_MM;
        } else if (side === "top") {
          next.height += next.y + BLEED_BOX_MM;
          next.y = -BLEED_BOX_MM;
        } else if (side === "right") next.width = panel.bounds.width + BLEED_BOX_MM - next.x;
        else next.height = panel.bounds.height + BLEED_BOX_MM - next.y;
      }
      // A stretched raster covers more paper with the same pixels.
      if (next.dpi && next.width > element.width) next.dpi = Math.floor((next.dpi * element.width) / next.width);
      return next;
    }

    const required = safeMarginsOf(panel, geometry);
    if (SIDES.every((side) => margins[side] >= required[side])) return element;
    // A tiny extra keeps rounding on the safe side.
    const extra = 0.05;
    const room = {
      width: panel.bounds.width - required.left - required.right - 2 * extra,
      height: panel.bounds.height - required.top - required.bottom - 2 * extra,
    };
    if (room.width <= 0 || room.height <= 0) return element;
    const box = envelopeOf(element);
    const scale = Math.min(1, room.width / box.width, room.height / box.height);
    const next = { ...element, width: element.width * scale, height: element.height * scale };
    if (scale < 1 && next.style?.fontSize) next.style = { ...next.style, fontSize: next.style.fontSize * scale };
    if (scale < 1 && next.dpi) next.dpi = Math.floor(next.dpi / scale);
    // Clamp the centre so the (scaled) turned box sits inside the safe area.
    const half = { width: (box.width * scale) / 2, height: (box.height * scale) / 2 };
    const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);
    const cx = clamp(
      element.x + element.width / 2,
      required.left + half.width + extra,
      panel.bounds.width - required.right - half.width - extra,
    );
    const cy = clamp(
      element.y + element.height / 2,
      required.top + half.height + extra,
      panel.bounds.height - required.bottom - half.height - extra,
    );
    return { ...next, x: cx - next.width / 2, y: cy - next.height / 2 };
  });
}

/**
 * Size rules a box structure needs beyond the min / max of each dimension (the API answers 400 for them, the editor
 * shows the message): a pillow box thicker than half its width gives huge end flaps that cannot close.
 */
export function dimensionRuleErrors(
  structure: string,
  dimensions: { length: number; width: number; height: number },
): { field: "length" | "width" | "height"; message: string; vi: string }[] {
  if (structure === "pillow" && dimensions.height > dimensions.width / 2) {
    return [
      {
        field: "height",
        message: `dimensions.height must not be greater than half of dimensions.width (${dimensions.width / 2}) for a pillow box`,
        vi: `Hộp gối dày tối đa bằng nửa chiều rộng (${dimensions.width / 2} mm).`,
      },
    ];
  }
  return [];
}
