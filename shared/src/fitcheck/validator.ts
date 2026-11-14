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
import { insidePieces } from "../canvas/inside";
import { outOfPrintGamut } from "../print/color";
import { parseLibraryArt } from "../library/art";
import { FINISH_SPOTS, MIN_FOIL_LINE_MM, MIN_FOIL_TEXT_PT } from "../print/finishes";
import { overlapsOpening } from "../parametric/openings";
import { contrastRatio, turnFromUpright, uprightRotationOf } from "./reading";

/** Smallest text size worth printing (docs/23 S21): below it most readers cannot read it. */
export const MIN_TEXT_PT = 6;
/** Text against the solid colour under it needs at least this contrast (WCAG, large text). */
export const MIN_TEXT_CONTRAST = 3;

/** Texts below this size should not print in a rich black: the plates rarely register on thin strokes. */
const RICH_BLACK_MIN_TEXT_PT = 12;

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

/** #RRGGBB of the topmost element with one solid colour that covers `box` (sheet coordinates) under `element`. */
function solidColourUnder(elements: CanvasElement[], element: CanvasElement, box: Rect, panel: PanelFace): string | null {
  const index = elements.indexOf(element);
  for (let i = index - 1; i >= 0; i--) {
    const below = elements[i];
    if (below.hidden || below.panelId !== element.panelId || (below.side ?? "outside") !== (element.side ?? "outside")) continue;
    const fill = below.style?.fillColor;
    const solid = fill && !below.style?.gradient && (below.style?.opacity ?? 1) >= 0.9 && (below.type === "shape" || below.role === "background");
    if (!solid || below.rotation) continue;
    const covers =
      below.x + panel.bounds.x <= box.x + TOUCH &&
      below.y + panel.bounds.y <= box.y + TOUCH &&
      below.x + panel.bounds.x + below.width >= box.x + box.width - TOUCH &&
      below.y + panel.bounds.y + below.height >= box.y + box.height - TOUCH;
    if (covers) return fill;
  }
  return null;
}

/** Does a crease strictly inside the face (not on its sides) cross the rectangle (sheet coordinates)? */
function crossesInnerCrease(box: Rect, panel: PanelFace, geometry: DielineGeometry): boolean {
  const { x, y, width, height } = panel.bounds;
  const near = (a: number, b: number) => Math.abs(a - b) < TOUCH;
  return geometry.segments.some((s) => {
    if (s.type !== "crease" || s.pathString) return false;
    // A crease along a side of the face is its fold: the safe margin (CREASE_OVERLAP) covers it.
    const alongSide =
      [x, x + width].some((v) => near(s.start.x, v) && near(s.end.x, v)) || [y, y + height].some((v) => near(s.start.y, v) && near(s.end.y, v));
    if (alongSide) return false;
    // Liang–Barsky: clip the segment to the rectangle.
    const dx = s.end.x - s.start.x;
    const dy = s.end.y - s.start.y;
    let t0 = 0;
    let t1 = 1;
    for (const [p, q] of [
      [-dx, s.start.x - box.x],
      [dx, box.x + box.width - s.start.x],
      [-dy, s.start.y - box.y],
      [dy, box.y + box.height - s.start.y],
    ]) {
      if (Math.abs(p) < 1e-12) {
        if (q < 0) return false;
        continue;
      }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
    return (t1 - t0) * Math.hypot(dx, dy) > 0.5;
  });
}

/** Are the four corners of a rectangle inside a convex outline (either winding), within TOUCH? */
function insideOutline(rect: Rect, outline: { x: number; y: number }[]): boolean {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  const sides = outline.map((a, i) => [a, outline[(i + 1) % outline.length]] as const);
  const area = sides.reduce((sum, [a, b]) => sum + a.x * b.y - b.x * a.y, 0);
  return corners.every((p) =>
    sides.every(([a, b]) => {
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const cross = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / length;
      return Math.sign(area) * cross >= -TOUCH;
    }),
  );
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const labelOf = (element: CanvasElement) => `${kindLabelOf(element)}${element.side === "inside" ? " (mặt trong)" : ""}`;

const kindLabelOf = (element: CanvasElement) =>
  element.type === "shape"
    ? "Hình khối"
    : element.type === "text"
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

  // Inside elements sit on the mirrored dieline (docs/23 S5).
  let inside: DielinePiece[] | null = null;
  const piecesFor = (element: CanvasElement) => (element.side === "inside" ? (inside ??= insidePieces(pieces)) : pieces);

  for (const element of elements) {
    // Hidden layers do not print (docs/23 S1).
    if (element.hidden) continue;
    const label = labelOf(element);
    const found = locate(piecesFor(element), element.panelId);
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
    const background = (element.role ?? (BACKGROUND_TYPES.has(element.type) ? "background" : "artwork")) === "background";

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
              ? `${label} tràn ra ngoài mặt ${panel.name} ${(-margin).toFixed(1)} mm, phần tràn sẽ bị cắt mất.`
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

    // 3b. Windows and hand holes are cut out: artwork there is lost (a background behind a window is expected).
    const opening = geometry.openings?.find((o) => o.panelId === panel.id && overlapsOpening(onSheet, o));
    if (opening) {
      const window = opening.kind === "window";
      const hole = opening.kind === "hole" ? "lỗ xỏ dây" : "lỗ xỏ tay";
      violations.push({
        id: `opening_${element.id}`,
        code: "UNDER_OPENING",
        severity: background ? "info" : "warning",
        elementId: element.id,
        panelId: panel.id,
        title: window ? "Hình nằm dưới cửa sổ" : `Hình nằm trên ${hole}`,
        message: `${label} chồng lên ${window ? "cửa sổ" : hole} của mặt ${panel.name}: phần đó bị khoét bỏ khi bế, không in ra.`,
        suggestion: window
          ? "Dời chữ, logo ra khung viền quanh cửa sổ; để sản phẩm bên trong làm điểm nhấn."
          : `Dời phần tử xuống dưới ${hole}.`,
      });
    }

    // 3c. Panels that are not rectangles (gable ends): artwork stays inside their outline.
    if (!background && panel.outline && !insideOutline(onSheet, panel.outline)) {
      violations.push({
        id: `outline_${element.id}`,
        code: "CUT_OVERLAP",
        severity: "warning",
        elementId: element.id,
        panelId: panel.id,
        title: "Tràn ra ngoài mặt hộp",
        message: `${label} có góc nằm ngoài đường cắt của mặt ${panel.name} (phần đầu hồi hình tam giác), phần đó sẽ bị cắt mất.`,
        suggestion: "Dời phần tử xuống hoặc vào giữa mặt, hoặc thu nhỏ lại.",
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

    // 6. Reading direction, size, contrast and creases of a text (docs/23 S21).
    if (element.type === "text" && element.content.trim()) {
      const upright = element.side === "inside" ? null : uprightRotationOf(geometry, panel.id);
      const turn = upright === null ? 0 : turnFromUpright(element.rotation || 0, upright);
      if (upright !== null && turn > 135) {
        violations.push({
          id: `reading_${element.id}`,
          code: "READING_DIRECTION",
          severity: "warning",
          elementId: element.id,
          panelId: panel.id,
          title: "Chữ sẽ bị ngược khi gấp",
          message: `${label} trên mặt ${panel.name} đứng ngược đầu khi hộp gấp xong: người xem phải lật hộp mới đọc được.`,
          suggestion: "Xoay chữ 180° để đọc xuôi trên hộp đã gấp.",
          fix: { rotation: ((element.rotation || 0) + 180) % 360 },
        });
      } else if (upright !== null && turn > 45) {
        violations.push({
          id: `reading_${element.id}`,
          code: "READING_DIRECTION",
          severity: "info",
          elementId: element.id,
          panelId: panel.id,
          title: "Chữ nằm nghiêng khi gấp",
          message: `${label} trên mặt ${panel.name} nằm nghiêng 90° khi hộp gấp xong.`,
          suggestion: "Nếu không cố ý (chữ chạy dọc gáy hộp), xoay chữ cho đứng thẳng.",
          fix: { rotation: upright },
        });
      }

      const sizePt = fontSizeMmOf(element) / PT_TO_MM;
      if (sizePt < MIN_TEXT_PT - 0.05) {
        violations.push({
          id: `small_${element.id}`,
          code: "TEXT_TOO_SMALL",
          severity: "warning",
          elementId: element.id,
          panelId: panel.id,
          title: "Chữ quá nhỏ",
          message: `${label} cỡ ${sizePt.toFixed(1).replace(".", ",")} pt, nhỏ hơn ${MIN_TEXT_PT} pt: in ra khó đọc, nhất là trên giấy kraft.`,
          suggestion: `Tăng cỡ chữ lên tối thiểu ${MIN_TEXT_PT} pt, hoặc rút gọn nội dung.`,
          currentValue: Number(sizePt.toFixed(1)),
          expectedValue: MIN_TEXT_PT,
        });
      }

      // The topmost solid colour under the whole text, among the elements drawn before it on the same face.
      const under = solidColourUnder(elements, element, onSheet, panel);
      const ink = element.style?.color;
      const ratio = under && ink ? contrastRatio(ink, under) : null;
      if (ratio !== null && ratio < MIN_TEXT_CONTRAST) {
        violations.push({
          id: `contrast_${element.id}`,
          code: "LOW_CONTRAST",
          severity: "warning",
          elementId: element.id,
          panelId: panel.id,
          title: "Chữ khó đọc trên nền",
          message: `${label} có màu quá gần màu nền bên dưới (tương phản ${ratio.toFixed(1).replace(".", ",")}:1, cần ≥ ${MIN_TEXT_CONTRAST}:1).`,
          suggestion: "Đổi màu chữ đậm hơn hoặc sáng hơn hẳn màu nền, hoặc thêm khối màu sau chữ.",
          currentValue: Number(ratio.toFixed(2)),
          expectedValue: MIN_TEXT_CONTRAST,
        });
      }

      if (crossesInnerCrease(onSheet, panel, geometry)) {
        violations.push({
          id: `crease_text_${element.id}`,
          code: "TEXT_ON_CREASE",
          severity: "warning",
          elementId: element.id,
          panelId: panel.id,
          title: "Chữ đè lên nếp gấp",
          message: `${label} nằm vắt qua một nếp gấp trong mặt ${panel.name}: chữ sẽ bị gãy khi gập.`,
          suggestion: "Dời chữ sang một bên của nếp gấp.",
        });
      }
    }

    // 7. Foil blocks hold lines from MIN_FOIL_LINE_MM and texts from MIN_FOIL_TEXT_PT (docs/23 S6, Q1).
    if (element.finish && FINISH_SPOTS[element.finish]?.metallic) {
      const finishName = FINISH_SPOTS[element.finish].label;
      const sizePt = element.type === "text" ? fontSizeMmOf(element) / PT_TO_MM : null;
      const line = element.type === "shape" ? element.style?.strokeWidth : undefined;
      if (sizePt !== null && sizePt < MIN_FOIL_TEXT_PT) {
        violations.push({
          id: `foil_${element.id}`,
          code: "LINE_TOO_THIN",
          severity: "warning",
          elementId: element.id,
          panelId: panel.id,
          title: `Chữ quá nhỏ để ${finishName.toLowerCase()}`,
          message: `${label} cỡ ${Math.round(sizePt)} pt: khuôn ép kim cần chữ từ ${MIN_FOIL_TEXT_PT} pt, nhỏ hơn dễ lem hoặc mất nét.`,
          suggestion: `Tăng cỡ chữ lên ${MIN_FOIL_TEXT_PT} pt, hoặc bỏ ép kim cho chữ này.`,
          currentValue: Math.round(sizePt),
          expectedValue: MIN_FOIL_TEXT_PT,
        });
      } else if (line !== undefined && line > 0 && line < MIN_FOIL_LINE_MM) {
        violations.push({
          id: `foil_${element.id}`,
          code: "LINE_TOO_THIN",
          severity: "warning",
          elementId: element.id,
          panelId: panel.id,
          title: `Nét quá mảnh để ${finishName.toLowerCase()}`,
          message: `${label} có nét ${line} mm: khuôn ép kim giữ được nét từ ${MIN_FOIL_LINE_MM} mm.`,
          suggestion: `Tăng độ dày nét lên ${MIN_FOIL_LINE_MM} mm.`,
          currentValue: line,
          expectedValue: MIN_FOIL_LINE_MM,
        });
      } else if (RASTER_TYPES.has(element.type) && !parseLibraryArt(element.content)) {
        violations.push({
          id: `foil_${element.id}`,
          code: "LINE_TOO_THIN",
          severity: "info",
          elementId: element.id,
          panelId: panel.id,
          title: `${finishName} trên ảnh`,
          message: `${label} là ảnh: xưởng làm khuôn ép theo cả khung ảnh. Logo vector (SVG) hoặc chữ cho đường ép sắc nét hơn.`,
          suggestion: "Dùng logo SVG, hình khối hoặc chữ cho phần ép kim.",
        });
      }
    }

    // 8. Screen colours CMYK cannot print as bright (docs/23 S7): a note, the design still prints.
    const inks = [element.style?.color, element.style?.fillColor, element.style?.strokeColor].filter(
      (color): color is string => !!color && (element.type === "text" || element.type === "shape")
    );
    const vivid = inks.find((color) => outOfPrintGamut(color));
    if (vivid && !element.style?.cmyk) {
      violations.push({
        id: `gamut_${element.id}`,
        code: "OUT_OF_GAMUT",
        severity: "info",
        elementId: element.id,
        panelId: panel.id,
        title: "Màu sẽ in nhạt hơn màn hình",
        message: `${label} dùng màu ${vivid.toUpperCase()}: màu xanh lá, xanh dương hoặc tím quá tươi nằm ngoài dải màu in CMYK, khi in sẽ xỉn hơn.`,
        suggestion: "Nhập màu bằng CMYK trong bảng thuộc tính, hoặc chọn màu dịu hơn.",
      });
    }

    // 9. Small text in a rich black the user typed: four plates must register on thin strokes (docs/23 S7).
    const typed = element.type === "text" ? element.style?.cmyk : undefined;
    if (typed && typed[3] >= 90 && typed[0] + typed[1] + typed[2] > 20) {
      const sizePt = fontSizeMmOf(element) / PT_TO_MM;
      if (sizePt < RICH_BLACK_MIN_TEXT_PT) {
        violations.push({
          id: `richblack_${element.id}`,
          code: "OUT_OF_GAMUT",
          severity: "info",
          elementId: element.id,
          panelId: panel.id,
          title: "Chữ nhỏ dùng đen 4 màu",
          message: `${label} cỡ ${Math.round(sizePt)} pt in bằng 4 bản kẽm (CMYK ${typed.join("/")}): lệch bản một chút là chữ nhòe viền màu.`,
          suggestion: `Với chữ dưới ${RICH_BLACK_MIN_TEXT_PT} pt, dùng đen một màu: C 0, M 0, Y 0, K 100.`,
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
  let inside: DielinePiece[] | null = null;
  return elements.map((element) => {
    const found = locate(element.side === "inside" ? (inside ??= insidePieces(pieces)) : pieces, element.panelId);
    if (!found) return element;
    const { panel, geometry } = found;
    const margins = marginsOf(envelopeOf(element), panel);

    if (element.hidden) return element;
    // Text that would stand upside down on the folded box is turned the right way up (docs/23 S21).
    const upright = element.type === "text" && element.side !== "inside" ? uprightRotationOf(geometry, panel.id) : null;
    if (upright !== null && turnFromUpright(element.rotation || 0, upright) > 135) {
      element = { ...element, rotation: ((element.rotation || 0) + 180) % 360 };
    }
    if ((element.role ?? (BACKGROUND_TYPES.has(element.type) ? "background" : "artwork")) === "background") {
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

/** Shortest gable box: its handle needs room for a hand hole. */
export const GABLE_MIN_LENGTH_MM = 60;

/**
 * Size rules a box structure needs beyond the min / max of each dimension (the API answers 400 for them, the editor
 * shows the message): a pillow box thicker than half its width gives huge end flaps that cannot close.
 */
export function dimensionRuleErrors(
  structure: string,
  dimensions: { length: number; width: number; height: number },
): { field: "length" | "width" | "height"; message: string; vi: string }[] {
  if (structure === "gable" && dimensions.length < GABLE_MIN_LENGTH_MM) {
    return [
      {
        field: "length",
        message: `dimensions.length must be at least ${GABLE_MIN_LENGTH_MM} for a gable box (room for the hand hole)`,
        vi: `Hộp quai xách cần dài tối thiểu ${GABLE_MIN_LENGTH_MM} mm để khoét lỗ xỏ tay.`,
      },
    ];
  }
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
