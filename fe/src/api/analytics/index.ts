/**
 * Analytics dashboard (`be/src/analytics`, docs/17 S7). No demo fallback: the "Số liệu thiết kế" block shows real
 * numbers or an error, never invented ones.
 */

import type { AnalyticsPeriod, AnalyticsScope, AnalyticsSummary } from "@wrapfit/shared";
import { request } from "@/services/api";

/** Boxes, box types, FitCheck errors prevented, box creation time and exports of the last `days` days. */
export function getAnalyticsSummary(scope: AnalyticsScope, days: AnalyticsPeriod): Promise<AnalyticsSummary> {
  return request("/analytics/summary", { query: { scope, days } });
}

/** Events only the studio sees: an Auto-Fix and the minute heartbeat of active work (owner only, 10 per minute). */
export type StudioEvent = { type: "AUTO_FIX_APPLIED"; fixed: number } | { type: "STUDIO_ACTIVE"; seconds: number };

export function recordProjectEvent(projectId: string, event: StudioEvent): Promise<void> {
  return request(`/projects/${projectId}/events`, { method: "POST", json: event });
}
