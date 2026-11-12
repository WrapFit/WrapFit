/**
 * Response of GET /api/analytics/summary (docs/17 S7): the "Số liệu thiết kế" block of the dashboard.
 * Both scopes return only counts and durations; "global" never names a user or a project (decision M7).
 */

/** "me": projects of the signed-in user. "global": every user of WrapFit, anonymous totals. */
export type AnalyticsScope = "me" | "global";

/** Periods the dashboard offers, in days. */
export const ANALYTICS_PERIODS = [7, 30, 90] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

/** The four MVP box structures, in the order the dashboard lists them; anything else counts as "other". */
export const ANALYTICS_BOX_TYPES = ["tuck-top", "sleeve-drawer", "lid-base", "pillow"] as const;
export type AnalyticsBoxType = (typeof ANALYTICS_BOX_TYPES)[number] | "other";

export interface AnalyticsSummary {
  scope: AnalyticsScope;
  days: number;
  /** First and last day of the period (YYYY-MM-DD, Vietnam time), both included. */
  from: string;
  to: string;
  boxes: {
    /** Projects created in the period (new, duplicated or remixed). */
    total: number;
    /** One entry per day of the period, days without a box included. */
    byDay: { date: string; count: number }[];
  };
  /** One entry per structure of ANALYTICS_BOX_TYPES, then "other" when it is not 0. */
  boxTypes: { type: AnalyticsBoxType; count: number }[];
  /** FitCheck errors the system stopped before they reached the printer (decision M9). */
  fitcheck: {
    prevented: number;
    /** Errors in exports refused with 422. */
    blockedAtExport: number;
    /** Errors Auto-Fix moved inside the safe margin. */
    autoFixed: number;
    /** Projects created in the period whose last FitCheck scored 100, of those that have a FitCheck. */
    passed: number;
    checked: number;
  };
  /**
   * Active studio time from creating a project to its first completed export (decision M8), for the projects whose
   * first export falls in the period and that have studio activity. null when there is none.
   */
  creationTime: {
    medianSeconds: number | null;
    meanSeconds: number | null;
    projects: number;
  };
  exports: {
    total: number;
    byFormat: { fileType: string; count: number }[];
  };
}
