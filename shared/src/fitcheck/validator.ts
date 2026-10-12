/**
 * FitCheck™ Validation Engine — one function for the editor (live score) and the server (score saved with the project,
 * export gate), so both always agree. Rules: skill `fitcheck-validator`.
 * Owned by IT 2 (Production Physics)
 *
 * Scoring: 100 − 30 per error − 10 per warning (never below 0). Any error blocks the print export.
 * Not checked yet: text overflowing its box (needs font metrics; the editor wraps text inside the box anyway).
 */

import { CanvasElement } from "../types/project";
import { DielineGeometry, PanelFace } from "../types/dieline";
import { FitCheckReport, FitCheckViolation } from "../types/fitcheck";
import type { DielinePiece } from "../parametric/registry";

/** Text, logos, images and barcodes stay this far inside the cut and crease lines of their panel, mm. */
export const SAFE_MARGIN_MM = 3;
/** Backgrounds that reach a cut line run this far past it, mm. */
export const BLEED_MM = 2;
/** Below this, a raster image prints blurry; 300 is ideal. */
export const MIN_DPI = 200;
/** Largest flat piece most print shops can run: B1 sheet, mm. */
export const MAX_SHEET_MM = { long: 1020, short: 720 };

/** Element types that are a background: no safe margin, but bleed past the cut lines they reach. */
const BACKGROUND_TYPES = new Set<CanvasElement["type"]>(["pattern"]);
const RASTER_TYPES = new Set<CanvasElement["type"]>(["image", "pattern"]);
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
    const background = BACKGROUND_TYPES.has(element.type);

    if (!background) {
      // 1. Safe margin from the folds and the cut lines of the panel (rotated elements: their turned box).
      const nearest = SIDES.reduce((a, b) => (margins[b] < margins[a] ? b : a));
      const margin = margins[nearest];
      if (margin < SAFE_MARGIN_MM) {
        const onCut = cutSides.has(nearest);
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
              : `${label} chỉ cách ${onCut ? "nét cắt" : "nếp gấp"} ${margin.toFixed(1)} mm.`,
          suggestion: `Dịch phần tử vào trong mặt, cách mép tối thiểu ${SAFE_MARGIN_MM} mm, để không bị ${onCut ? "xén mất khi bế" : "gãy nét khi gập hộp"}.`,
          currentValue: Number(margin.toFixed(2)),
          expectedValue: SAFE_MARGIN_MM,
        });
      }
    } else {
      // 2. Bleed: a background that reaches a cut line must run past it, or stay clear of it.
      const short = [...cutSides].filter((side) => margins[side] > -BLEED_MM && margins[side] < SAFE_MARGIN_MM);
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
          suggestion: `Kéo hoa văn tràn ra ngoài nét cắt tối thiểu ${BLEED_MM} mm, hoặc lùi vào trong ${SAFE_MARGIN_MM} mm.`,
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

    // 4. Resolution of raster files.
    if (RASTER_TYPES.has(element.type) && element.dpi && element.dpi < MIN_DPI) {
      violations.push({
        id: `dpi_${element.id}`,
        code: "LOW_DPI",
        severity: "warning",
        elementId: element.id,
        panelId: panel.id,
        title: "Độ phân giải hình ảnh thấp",
        message: `${label} có độ phân giải ${element.dpi} DPI, có thể bị mờ nhòe khi in công nghiệp.`,
        suggestion: `Dùng ảnh từ ${MIN_DPI} đến 300 DPI (thu nhỏ ảnh trên hộp cũng làm tăng DPI).`,
        currentValue: element.dpi,
        expectedValue: 300,
      });
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
 * 1-click fix (Gói's watchdog): moves each element that breaks the safe margin back inside its panel, at least
 * SAFE_MARGIN_MM from every side (rotated elements by their turned box), shrinking it when the panel is too small;
 * stretches backgrounds that stop short of a cut line to BLEED_MM past it. Elements without a panel are left alone.
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
        if (margins[side] <= -BLEED_MM || margins[side] >= SAFE_MARGIN_MM) continue;
        if (side === "left") {
          next.width += next.x + BLEED_MM;
          next.x = -BLEED_MM;
        } else if (side === "top") {
          next.height += next.y + BLEED_MM;
          next.y = -BLEED_MM;
        } else if (side === "right") next.width = panel.bounds.width + BLEED_MM - next.x;
        else next.height = panel.bounds.height + BLEED_MM - next.y;
      }
      return next;
    }

    if (SIDES.every((side) => margins[side] >= SAFE_MARGIN_MM)) return element;
    // A tiny extra keeps rounding on the safe side.
    const extra = 0.05;
    const room = {
      width: panel.bounds.width - 2 * (SAFE_MARGIN_MM + extra),
      height: panel.bounds.height - 2 * (SAFE_MARGIN_MM + extra),
    };
    const box = envelopeOf(element);
    const scale = Math.min(1, room.width / box.width, room.height / box.height);
    const next = { ...element, width: element.width * scale, height: element.height * scale };
    if (scale < 1 && next.style?.fontSize) next.style = { ...next.style, fontSize: next.style.fontSize * scale };
    // Clamp the centre so the (scaled) turned box sits inside the safe area.
    const half = { width: (box.width * scale) / 2, height: (box.height * scale) / 2 };
    const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);
    const cx = clamp(
      element.x + element.width / 2,
      SAFE_MARGIN_MM + half.width + extra,
      panel.bounds.width - SAFE_MARGIN_MM - half.width - extra,
    );
    const cy = clamp(
      element.y + element.height / 2,
      SAFE_MARGIN_MM + half.height + extra,
      panel.bounds.height - SAFE_MARGIN_MM - half.height - extra,
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
