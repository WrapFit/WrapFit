'use client';

/**
 * `/admin/studio-monitoring`: the processes behind the studio, from `GET /health/details` (refreshed every 30 s):
 * database, Redis, the BullMQ export worker and the sizes of the export queue.
 */

import React from 'react';
import { AdminShell, AdminTimeline, Badge, Panel, PanelTitle, AdminStat, WorkspaceError, ADMIN_STAT_GROUP, type TimelineBucket, type TimelineEvent } from '@/components/workspace';
import { formatCount, formatTime, formatUptime, useHealthDetails } from '@/features/admin';
import { RequireAuth } from '@/features/auth';
import { cn } from '@/utils/helpers';

export default function AdminStudioMonitoringPage() {
  return (
    <RequireAuth role="ADMIN">
      <StudioMonitoring />
    </RequireAuth>
  );
}

const SERVICES = [
  { key: 'database', label: 'PostgreSQL', text: 'Dự án, tài khoản, mẫu hộp (Prisma).' },
  { key: 'redis', label: 'Redis', text: 'Hàng đợi BullMQ và nhịp tim của worker.' },
  { key: 'worker', label: 'Worker xuất file', text: 'Tiến trình riêng dựng PDF CMYK, SVG, DXF.' },
] as const;

const QUEUE = [
  { key: 'waiting', label: 'Đang chờ' },
  { key: 'active', label: 'Đang chạy' },
  { key: 'delayed', label: 'Hẹn giờ thử lại' },
  { key: 'failed', label: 'Lỗi' },
] as const;

/** Checks kept for the live timeline (30 s apart: the last 10 minutes). */
const SAMPLES = 20;
const SAMPLES_KEY = 'wf:admin-queue-samples';

interface QueueSample {
  at: string;
  queued: number;
  failed: number;
  ok: boolean;
}

function readSamples(): QueueSample[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(SAMPLES_KEY) ?? '[]') as QueueSample[];
  } catch {
    return [];
  }
}

function StudioMonitoring() {
  const health = useHealthDetails();
  const data = health.data;

  // Live timeline: every health check adds one sample (export jobs waiting + running), kept for this tab.
  const [samples, setSamples] = React.useState<QueueSample[]>([]);
  React.useEffect(() => setSamples(readSamples()), []);
  React.useEffect(() => {
    if (!data?.timestamp) return;
    setSamples((prev) => {
      if (prev.at(-1)?.at === data.timestamp) return prev;
      const q = data.exportQueue;
      const next = [
        ...prev,
        { at: data.timestamp!, queued: (q?.waiting ?? 0) + (q?.active ?? 0) + (q?.delayed ?? 0), failed: q?.failed ?? 0, ok: data.status === 'ok' },
      ].slice(-SAMPLES);
      try {
        window.sessionStorage.setItem(SAMPLES_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: the timeline lives in memory only */
      }
      return next;
    });
  }, [data]);
  const buckets: TimelineBucket[] = samples.map((s) => ({ key: s.at, label: formatTime(Date.parse(s.at)).slice(0, 5), title: formatTime(Date.parse(s.at)), value: s.queued }));
  const events: TimelineEvent[] = samples
    .map((s, i) => {
      const prev = samples[i - 1];
      if (!prev) return { id: s.at, at: s.at, tone: s.ok ? 'good' : 'critical', title: s.ok ? 'Bắt đầu theo dõi: hệ thống ổn định' : 'Bắt đầu theo dõi: hệ thống suy giảm' } as TimelineEvent;
      if (prev.ok !== s.ok) return { id: s.at, at: s.at, tone: s.ok ? 'good' : 'critical', title: s.ok ? 'Hệ thống hồi phục' : 'Hệ thống suy giảm' } as TimelineEvent;
      if (s.failed > prev.failed) return { id: s.at, at: s.at, tone: 'warning', title: `Thêm ${s.failed - prev.failed} lần xuất file lỗi` } as TimelineEvent;
      if (s.queued !== prev.queued) return { id: s.at, at: s.at, tone: 'info', title: `Hàng đợi: ${prev.queued} → ${s.queued} file` } as TimelineEvent;
      return null;
    })
    .filter((e): e is TimelineEvent => e !== null)
    .reverse();

  return (
    <AdminShell
      title="Giám sát studio"
      description="Tiến trình studio và hàng đợi xuất file, làm mới mỗi 30 giây."
    >
      {health.isError && !data ? (
        <WorkspaceError error={health.error} title="Không đọc được tình trạng hệ thống" onRetry={() => void health.refetch()} retrying={health.isFetching} />
      ) : (
        <div className="flex flex-col gap-6">
          <AdminTimeline
            title="Hàng đợi xuất file theo thời gian"
            unit="file trong hàng đợi"
            buckets={buckets}
            periodLabel={`${buckets.length} lần kiểm tra gần nhất`}
            lastLabel="hiện tại"
            loading={health.isPending}
            events={events}
            eventsTitle="Thay đổi gần đây"
            updatedAt={health.dataUpdatedAt || undefined}
            refreshSeconds={30}
            refreshing={health.isFetching}
            onRefresh={() => void health.refetch()}
          />

          <section aria-label="Tổng quan" className={`${ADMIN_STAT_GROUP} grid-cols-2 md:grid-cols-4`}>
            <AdminStat label="Trạng thái" value={!data ? '–' : data.status === 'ok' ? 'Ổn định' : 'Suy giảm'} />
            <AdminStat label="Thời gian chạy API" value={data?.uptime !== undefined ? formatUptime(data.uptime) : '–'} />
            <AdminStat label="Lần kiểm tra" value={data?.timestamp ? formatTime(Date.parse(data.timestamp)) : '–'} />
            <AdminStat label="File đang xuất" value={data?.exportQueue ? formatCount(data.exportQueue.active ?? 0) : '–'} />
          </section>

          <Panel aria-labelledby="monitor-services">
            <PanelTitle id="monitor-services">Dịch vụ</PanelTitle>
            <ul className="divide-y divide-library-line border-t border-library-line">
              {SERVICES.map((service) => {
                const state = data ? String(data[service.key]) : undefined;
                return (
                  <li key={service.key} className="flex items-center justify-between gap-4 py-3.5">
                    <span>
                      <span className="block text-body font-medium text-library-ink">{service.label}</span>
                      <span className="block text-sm text-library-sub">{service.text}</span>
                    </span>
                    {state ? (
                      <Badge tone={state === 'up' ? 'green' : state === 'down' ? 'red' : 'grey'}>{state === 'up' ? 'Chạy' : state === 'down' ? 'Lỗi' : 'Không rõ'}</Badge>
                    ) : (
                      <span className="h-6 w-14 animate-pulse rounded-md bg-library-panel motion-reduce:animate-none" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel aria-labelledby="monitor-queue">
            <PanelTitle id="monitor-queue" action={<span className="text-sm text-library-muted">BullMQ · export</span>}>
              Hàng đợi xuất file
            </PanelTitle>
            {data && !data.exportQueue ? (
              <p className="rounded-xl bg-library-panel p-4 text-sm text-library-sub">Redis không trả lời: chưa đọc được số việc trong hàng đợi.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {QUEUE.map((item) => (
                  <div key={item.key} className={cn('rounded-xl px-4 py-3', item.key === 'failed' && (data?.exportQueue?.failed ?? 0) > 0 ? 'bg-danger-bg' : 'bg-library-panel')}>
                    <dt className="text-xs text-library-muted">{item.label}</dt>
                    <dd className="mt-0.5 text-2xl font-medium text-library-ink">{data?.exportQueue ? formatCount(data.exportQueue[item.key] ?? 0) : '–'}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-4 text-sm leading-[1.6] text-library-sub">
              Mỗi yêu cầu xuất file của studio là một việc trong hàng đợi; worker xử lý rồi trả link tải có hạn 15 phút. Việc lỗi được giữ lại để xem nguyên nhân.
            </p>
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}
