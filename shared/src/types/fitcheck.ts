/**
 * FitCheck™ Validation Results & Constraint Checking Types
 * Owned by IT 2 (Engine) & consumed by IT 1 (Warning Drawer UI)
 */

export type FitCheckErrorCode = 
  | "CREASE_OVERLAP"
  | "CUT_OVERLAP"
  | "BLEED_INSUFFICIENT"
  | "LOW_DPI"
  | "GLUE_CONTAMINATED"
  | "DIMENSION_OUT_OF_BOUNDS"
  | "NO_PANEL"
  | "LINE_TOO_THIN"
  | "BARCODE_UNREADABLE"
  | "EMPTY_DESIGN"
  /** A screen colour CMYK prints visibly duller (docs/23 S7). */
  | "OUT_OF_GAMUT"
  /** Artwork on a window or a hand hole: that part is cut away (docs/23 S17). */
  | "UNDER_OPENING"
  /** Text that reads upside down (or sideways) once the box is folded (docs/23 S21). */
  | "READING_DIRECTION"
  /** Text too close in colour to the solid colour under it. */
  | "LOW_CONTRAST"
  /** Text under 6 pt. */
  | "TEXT_TOO_SMALL"
  /** Text across a crease inside its face. */
  | "TEXT_ON_CREASE";

export type SeverityLevel = "error" | "warning" | "info";

export interface FitCheckViolation {
  id: string;
  code: FitCheckErrorCode;
  severity: SeverityLevel;
  elementId?: string;
  panelId?: string;
  title: string;
  message: string;
  suggestion: string;
  currentValue?: number;
  expectedValue?: number;
  /** One-click fix of this violation alone (e.g. turn the text upright), applied to `elementId`. */
  fix?: { rotation: number };
}

export interface FitCheckReport {
  isValidForProduction: boolean;
  score: number; // 0 to 100% production readiness
  violations: FitCheckViolation[];
  auditedAt: string;
}
