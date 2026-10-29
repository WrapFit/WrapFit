"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AnalyticsPeriod, AnalyticsScope } from "@wrapfit/shared";
import { getAnalyticsSummary } from "@/api/analytics";
import { queryKeys } from "@/hooks/data";

/**
 * `GET /analytics/summary`. Refetched on every visit (the dashboard shows the box just exported); a switch of scope or
 * period keeps the previous numbers on screen until the new ones arrive.
 */
export function useAnalyticsSummary(scope: AnalyticsScope, days: AnalyticsPeriod, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(scope, days),
    queryFn: () => getAnalyticsSummary(scope, days),
    placeholderData: keepPreviousData,
    staleTime: 0,
    enabled,
  });
}
