'use client';

/**
 * `/admin/studio-monitoring`: the processes behind the studio, from `GET /health/details` (refreshed every 30 s):
 * database, Redis, the BullMQ export worker and the sizes of the export queue.
 */

import { RotateCw } from 'lucide-react';
import React from 'react';
import { outlineButton } from '@/components/library';
import { AdminShell, Badge, Panel, PanelTitle, StatTile, WorkspaceError } from '@/components/workspace';
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

function StudioMonitoring() {
  const health = useHealthDetails();
  const data = health.data;

  return (
    <AdminShell
      title="Giám sát studio"
      description="Các tiến trình phục vụ studio và hàng đợi xuất file in, làm mới mỗi 30 giây."
      actions={
        <button type="button" onClick={() => void health.refetch()} disabled={health.isFetching} className={outlineButton}>
          <RotateCw className={cn('size-4', health.isFetching && 'animate-spin motion-reduce:animate-none')} aria-hidden />
          Làm mới
        </button>
      }
    >
      {health.isError && !data ? (
        <WorkspaceError error={health.error} title="Không đọc được tình trạng hệ thống" onRetry={() => void health.refetch()} retrying={health.isFetching} />
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="Tổng quan" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Trạng thái" value={!data ? '–' : data.status === 'ok' ? 'Ổn định' : 'Suy giảm'} />
            <StatTile label="Thời gian chạy API" value={data?.uptime !== undefined ? formatUptime(data.uptime) : '–'} />
            <StatTile label="Lần kiểm tra" value={data?.timestamp ? formatTime(Date.parse(data.timestamp)) : '–'} />
            <StatTile label="File đang xuất" value={data?.exportQueue ? formatCount(data.exportQueue.active ?? 0) : '–'} />
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
