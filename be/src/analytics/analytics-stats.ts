import {
  ANALYTICS_BOX_TYPES,
  type AnalyticsBoxType,
  type AnalyticsSummary,
} from '@wrapfit/shared';

/** Days of the dashboard are days in Vietnam (UTC+7 all year, no daylight saving time). */
export const ANALYTICS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Middle value of a list (mean of the two middle values for an even count), null for an empty list. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function mean(values: readonly number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Calendar day in Vietnam of an instant, YYYY-MM-DD. */
export function vietnamDate(instant: Date): string {
  return new Date(instant.getTime() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** The last `days` days in Vietnam, today included: first and last day, and the instant the first day starts. */
export function periodOf(
  days: number,
  now: Date,
): { from: string; to: string; start: Date; dates: string[] } {
  const to = vietnamDate(now);
  const lastDayStart = Date.parse(`${to}T00:00:00+07:00`);
  const start = new Date(lastDayStart - (days - 1) * DAY_MS);
  const dates = Array.from({ length: days }, (_, i) =>
    vietnamDate(new Date(start.getTime() + i * DAY_MS)),
  );
  return { from: dates[0], to, start, dates };
}

/** One count per day of the period, 0 for the days without a row. */
export function countsByDay(
  dates: readonly string[],
  rows: readonly { day: string; count: number }[],
) {
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.day, (counts.get(row.day) ?? 0) + row.count);
  return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/** The four MVP structures in their fixed order, then "other" (sticker labels, unknown ids) when it is not 0. */
export function boxTypesOf(
  rows: readonly { templateId: string | null; count: number }[],
): AnalyticsSummary['boxTypes'] {
  const counts = new Map<AnalyticsBoxType, number>();
  for (const row of rows) {
    const type = (ANALYTICS_BOX_TYPES as readonly string[]).includes(
      row.templateId ?? '',
    )
      ? (row.templateId as AnalyticsBoxType)
      : 'other';
    counts.set(type, (counts.get(type) ?? 0) + row.count);
  }
  const types: AnalyticsSummary['boxTypes'] = ANALYTICS_BOX_TYPES.map(
    (type) => ({ type, count: counts.get(type) ?? 0 }),
  );
  const other = counts.get('other') ?? 0;
  return other > 0 ? [...types, { type: 'other', count: other }] : types;
}

/** Median and mean of the active creation time of each project, in whole seconds. */
export function creationTimeOf(
  secondsPerProject: readonly number[],
): AnalyticsSummary['creationTime'] {
  const measured = secondsPerProject.filter((seconds) => seconds > 0);
  const round = (value: number | null) =>
    value === null ? null : Math.round(value);
  return {
    medianSeconds: round(median(measured)),
    meanSeconds: round(mean(measured)),
    projects: measured.length,
  };
}
