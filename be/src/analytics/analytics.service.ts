import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type AnalyticsScope, type AnalyticsSummary, MAX_STUDIO_HEARTBEAT_SECONDS } from '@wrapfit/shared';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../shared/prisma';
import { ANALYTICS_TIME_ZONE, boxTypesOf, countsByDay, creationTimeOf, periodOf } from './analytics-stats';

/** The totals of WrapFit are the same for everyone: computed at most once a minute per period. */
export const GLOBAL_SUMMARY_TTL_MS = 60_000;

/**
 * Numbers of the "Số liệu thiết kế" block of the dashboard (docs/17 S7, decisions M7–M9), from `product_events` and
 * the FitCheck score of `packaging_projects`. "me" is never cached: the dashboard shows the export the user just made
 * (demo step 7). Only aggregates leave this service; no query returns an id or a name.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  summary(scope: AnalyticsScope, days: number, userId: string, now = new Date()): Promise<AnalyticsSummary> {
    if (scope === 'me') return this.compute('me', days, userId, now);
    return this.cache.wrap(`analytics:global:${days}`, () => this.compute('global', days, null, now), GLOBAL_SUMMARY_TTL_MS);
  }

  private async compute(scope: AnalyticsScope, days: number, userId: string | null, now: Date): Promise<AnalyticsSummary> {
    const { from, to, start, dates } = periodOf(days, now);
    const ofUser = userId ? Prisma.sql`AND user_id = ${userId}::uuid` : Prisma.empty;

    const [created, prevented, exports, fitcheck, creation] = await Promise.all([
      this.prisma.$queryRaw<{ day: string; templateId: string | null; count: number }[]>`
        SELECT to_char(created_at AT TIME ZONE ${ANALYTICS_TIME_ZONE}, 'YYYY-MM-DD') AS day,
               payload->>'templateId' AS "templateId", count(*)::int AS count
        FROM product_events
        WHERE type = 'PROJECT_CREATED' AND created_at >= ${start} ${ofUser}
        GROUP BY 1, 2`,
      this.prisma.$queryRaw<{ blocked: number; fixed: number }[]>`
        SELECT coalesce(sum((payload->>'errors')::int) FILTER (WHERE type = 'EXPORT_BLOCKED_FITCHECK'), 0)::int AS blocked,
               coalesce(sum((payload->>'fixed')::int) FILTER (WHERE type = 'AUTO_FIX_APPLIED'), 0)::int AS fixed
        FROM product_events
        WHERE type IN ('EXPORT_BLOCKED_FITCHECK', 'AUTO_FIX_APPLIED') AND created_at >= ${start} ${ofUser}`,
      this.prisma.$queryRaw<{ fileType: string; count: number }[]>`
        SELECT payload->>'fileType' AS "fileType", count(*)::int AS count
        FROM product_events
        WHERE type = 'EXPORT_COMPLETED' AND created_at >= ${start} ${ofUser}
        GROUP BY 1
        ORDER BY 2 DESC, 1`,
      this.prisma.$queryRaw<{ passed: number; checked: number }[]>`
        SELECT count(*) FILTER (WHERE fitcheck_score = 100)::int AS passed, count(*)::int AS checked
        FROM packaging_projects
        WHERE fitcheck_score IS NOT NULL AND status <> 'DELETED' AND created_at >= ${start} ${ofUser}`,
      // Active time of each project whose first completed export falls in the period: its heartbeats up to that export.
      this.prisma.$queryRaw<{ seconds: number }[]>`
        WITH first_export AS (
          SELECT project_id, min(created_at) AS at
          FROM product_events
          WHERE type = 'EXPORT_COMPLETED' AND project_id IS NOT NULL ${ofUser}
          GROUP BY project_id
          HAVING min(created_at) >= ${start}
        )
        SELECT sum(least((beat.payload->>'seconds')::int, ${MAX_STUDIO_HEARTBEAT_SECONDS}))::int AS seconds
        FROM first_export
        JOIN product_events beat
          ON beat.project_id = first_export.project_id AND beat.type = 'STUDIO_ACTIVE' AND beat.created_at <= first_export.at
        GROUP BY first_export.project_id`,
    ]);

    const byFormat = exports.map((row) => ({ fileType: row.fileType ?? 'UNKNOWN', count: row.count }));
    const { blocked, fixed } = prevented[0] ?? { blocked: 0, fixed: 0 };
    return {
      scope,
      days,
      from,
      to,
      boxes: {
        total: created.reduce((sum, row) => sum + row.count, 0),
        byDay: countsByDay(dates, created),
      },
      boxTypes: boxTypesOf(created),
      fitcheck: {
        prevented: blocked + fixed,
        blockedAtExport: blocked,
        autoFixed: fixed,
        passed: fitcheck[0]?.passed ?? 0,
        checked: fitcheck[0]?.checked ?? 0,
      },
      creationTime: creationTimeOf(creation.map((row) => row.seconds)),
      exports: { total: byFormat.reduce((sum, row) => sum + row.count, 0), byFormat },
    };
  }
}
