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
  | "NO_PANEL";

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
}

export interface FitCheckReport {
  isValidForProduction: boolean;
  score: number; // 0 to 100% production readiness
  violations: FitCheckViolation[];
  auditedAt: string;
}
