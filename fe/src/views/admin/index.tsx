'use client';

/**
 * `/admin`: overview of the admin console. Wired: `GET /health/details` (services, export queue, uptime),
 * `GET /users` (account total) and `GET /templates/structures`.
 */

import { AlertTriangle, Boxes, Clock, Cpu, Database, Layers, ServerCog, ServerCrash, Users } from 'lucide-react';
import { ADMIN_CARD } from '@/components/workspace/adminSkin';
import { cn } from '@/utils/helpers';
import React from 'react';
import { AdminShell, AdminTimeline, AdminStat, WorkspaceError, type TimelineEvent, ADMIN_STAT_GROUP } from '@/components/workspace';
import { ADMIN_TIMELINE_REFRESH_S, formatCount, formatUptime, useAccountsPage, useBankTimeline, useBoxesTimeline, useHealthDetails } from '@/features/admin';
import { RequireAuth } from '@/features/auth';
import { useBoxStructures } from '@/features/templates';

export default function AdminPage() {
  return (
    <RequireAuth role="ADMIN">
      <AdminOverview />
    </RequireAuth>
  );
}

const SERVICE_LABEL: Record<string, string> = { up: 'Chạy', down: 'Lỗi', unknown: 'Không rõ' };

function AdminOverview() {
  const health = useHealthDetails();
  const accounts = useAccountsPage(1);
  const structures = useBoxStructures();
  const queue = health.data?.exportQueue ?? null;
  // Timeline at the top: boxes created per day, and what just happened (transfers, export queue, services).
  const boxes = useBoxesTimeline(30);
  const bank = useBankTimeline(30);
  const now = new Date(health.dataUpdatedAt || Date.now()).toISOString();
  const systemEvents: TimelineEvent[] = health.data
    ? [
        health.data.status === 'ok'
          ? { id: 'health', at: now, tone: 'good', title: 'Mọi dịch vụ hoạt động bình thường' }
          : { id: 'health', at: now, tone: 'critical', title: 'Một dịch vụ đang gặp sự cố', detail: 'Xem khối Hệ thống bên dưới' },
        ...((queue?.failed ?? 0) > 0 ? [{ id: 'queue-failed', at: now, tone: 'warning' as const, title: `${queue!.failed} lần xuất file lỗi trong hàng đợi` }] : []),
      ]
    : [];
  const events = [...systemEvents, ...bank.events].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <AdminShell title="Tổng quan" description="Hoạt động, số liệu chính và tình trạng hệ thống.">
      <div className="flex flex-col gap-8">
        <AdminTimeline
          title="Hộp mới tạo mỗi ngày"
          unit="hộp"
          buckets={boxes.buckets}
          loading={boxes.query.isPending}
          error={boxes.query.isError ? 'Chưa tải được số liệu hộp mới. Kiểm tra kết nối máy chủ rồi thử lại.' : undefined}
          events={events}
          eventsTitle="Vừa xảy ra"
          updatedAt={Math.max(boxes.query.dataUpdatedAt, bank.query.dataUpdatedAt, health.dataUpdatedAt) || undefined}
          refreshSeconds={ADMIN_TIMELINE_REFRESH_S}
          refreshing={boxes.query.isFetching || bank.query.isFetching}
          onRefresh={() => {
            void boxes.query.refetch();
            void bank.query.refetch();
            void health.refetch();
          }}
        />

        <section aria-label="Số liệu" className={`${ADMIN_STAT_GROUP} grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`}>
          <AdminStat label="Tài khoản" icon={Users} value={accounts.data ? formatCount(accounts.data.meta.total) : '–'} />
          <AdminStat label="Cấu trúc hộp" icon={Boxes} value={structures.data ? structures.data.length : '–'} />
          <AdminStat label="Xuất file đang chờ" icon={Clock} value={queue ? formatCount((queue.waiting ?? 0) + (queue.delayed ?? 0)) : '–'} hint={queue ? `${queue.active ?? 0} đang chạy` : 'Hàng đợi BullMQ'} />
          <AdminStat label="Xuất file lỗi" icon={AlertTriangle} status={queue ? ((queue.failed ?? 0) > 0 ? 'critical' : 'ok') : undefined} value={queue ? formatCount(queue.failed ?? 0) : '–'} />
        </section>

        {/* System health */}
        <section aria-labelledby="admin-health" className={cn(ADMIN_CARD, 'overflow-hidden')}>
          {health.isError ? (
            <div className="p-5">
              <WorkspaceError error={health.error} title="Không kiểm tra được hệ thống" onRetry={() => void health.refetch()} retrying={health.isFetching} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <div className="flex items-center gap-4 p-6">
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                    !health.data ? 'bg-landing-canvas text-fg-muted' : health.data.status === 'ok' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'
                  )}
                >
                  {health.data && health.data.status !== 'ok' ? <ServerCrash className="size-5" aria-hidden /> : <ServerCog className="size-5" aria-hidden />}
                </span>
                <div className="min-w-0">
                  <h2 id="admin-health" className="text-sm font-medium text-fg-muted">Tình trạng hệ thống</h2>
                  <p className="font-landing-heading text-lg font-bold leading-snug text-landing-ink">
                    {!health.data ? 'Đang kiểm tra…' : health.data.status === 'ok' ? 'Mọi dịch vụ hoạt động bình thường' : 'Một dịch vụ đang gặp sự cố'}
                  </p>
                  {health.data?.uptime !== undefined && <p className="mt-0.5 text-sm text-fg-muted">API chạy liên tục {formatUptime(health.data.uptime)}</p>}
                </div>
              </div>
              <ul className="grid grid-cols-1 gap-px border-t border-line/60 bg-line/60 sm:grid-cols-3 lg:border-l lg:border-t-0">
                {[
                  { label: 'Cơ sở dữ liệu', note: 'PostgreSQL', icon: Database, state: health.data?.database },
                  { label: 'Redis', note: 'Hàng đợi & bộ đệm', icon: Layers, state: health.data?.redis },
                  { label: 'Worker xuất file', note: 'PDF · SVG · DXF', icon: Cpu, state: health.data?.worker as string | undefined },
                ].map((service) => (
                  <li key={service.label} className="flex flex-col justify-center gap-3 bg-white px-5 py-4">
                    <span className="flex items-center justify-between">
                      <service.icon className="size-5 text-fg-muted" strokeWidth={1.9} aria-hidden />
                      {service.state ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            service.state === 'up' ? 'bg-success-bg text-success-fg' : service.state === 'down' ? 'bg-danger-bg text-danger-fg' : 'bg-landing-canvas text-fg-muted'
                          )}
                        >
                          <span aria-hidden className={cn('size-1.5 rounded-full', service.state === 'up' ? 'bg-success' : service.state === 'down' ? 'bg-danger-solid' : 'bg-fg-muted')} />
                          {SERVICE_LABEL[service.state] ?? service.state}
                        </span>
                      ) : (
                        <span className="text-xs text-fg-muted">–</span>
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-landing-ink">{service.label}</span>
                      <span className="block text-xs text-fg-muted">{service.note}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

      </div>
    </AdminShell>
  );
}
