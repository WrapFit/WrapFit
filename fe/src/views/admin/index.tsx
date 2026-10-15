'use client';

/**
 * `/admin`: overview of the admin console. Wired: `GET /health/details` (services, export queue, uptime),
 * `GET /users` (account total) and `GET /templates/structures`.
 */

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { ADMIN_NAV, AdminShell, Badge, HeroPanel, Panel, PanelTitle, StatTile, WorkspaceError } from '@/components/workspace';
import { formatCount, formatUptime, useAccountsPage, useHealthDetails } from '@/features/admin';
import { RequireAuth } from '@/features/auth';
import { useBoxStructures } from '@/features/templates';

export default function AdminPage() {
  return (
    <RequireAuth role="ADMIN">
      <AdminOverview />
    </RequireAuth>
  );
}

/** Wired sections first; the others show example figures. */
const SECTION_NOTES: Record<string, string> = {
  '/admin/studio-monitoring': 'Hàng đợi xuất file và worker',
  '/admin/gpu-cluster': 'Máy chủ dựng ảnh 3D',
  '/admin/dieline-vault': 'Cấu trúc hộp và mẫu WrapFit',
  '/admin/appraisal': 'Thiết kế cộng đồng đang hiển thị',
  '/admin/media': 'Ảnh, logo và file đã tải lên',
  '/admin/revenue': 'Doanh thu theo gói',
  '/admin/ledger': 'Giao dịch thanh toán',
  '/admin/print-shops': 'Xưởng in đối tác',
  '/admin/accounts': 'Vai trò, xác minh, khoá tài khoản',
  '/admin/vault-quotas': 'Dung lượng và lượt AI theo gói',
  '/admin/security': 'Chính sách đăng nhập và link',
  '/admin/system-config': 'Quy tắc FitCheck™ và tệp tải lên',
};
const WIRED = new Set(['/admin/studio-monitoring', '/admin/dieline-vault', '/admin/appraisal', '/admin/accounts', '/admin/vault-quotas', '/admin/security', '/admin/system-config']);

const SERVICE_LABEL: Record<string, string> = { up: 'Chạy', down: 'Lỗi', unknown: 'Không rõ' };

function AdminOverview() {
  const health = useHealthDetails();
  const accounts = useAccountsPage(1);
  const structures = useBoxStructures();
  const queue = health.data?.exportQueue ?? null;

  return (
    <AdminShell title="Tổng quan" description="Tình trạng hệ thống, tài khoản và các mục quản trị của WrapFit.">
      <div className="flex flex-col gap-8">
        <HeroPanel>
          {health.isError ? (
            <WorkspaceError error={health.error} title="Không kiểm tra được hệ thống" onRetry={() => void health.refetch()} retrying={health.isFetching} />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
              <div>
                <p className="text-sm text-library-sub">Hệ thống</p>
                <h2 className="mt-1 text-2xl font-medium text-library-ink">
                  {!health.data ? 'Đang kiểm tra…' : health.data.status === 'ok' ? 'Mọi dịch vụ hoạt động bình thường' : 'Một dịch vụ đang gặp sự cố'}
                </h2>
                {health.data?.uptime !== undefined && <p className="mt-2 text-sm text-library-sub">API chạy liên tục {formatUptime(health.data.uptime)}.</p>}
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Cơ sở dữ liệu', state: health.data?.database },
                  { label: 'Redis', state: health.data?.redis },
                  { label: 'Worker xuất file', state: health.data?.worker as string | undefined },
                ].map((service) => (
                  <li key={service.label} className="rounded-xl border border-library-ink bg-white p-4">
                    <p className="text-sm text-library-sub">{service.label}</p>
                    <p className="mt-1">
                      {service.state ? (
                        <Badge tone={service.state === 'up' ? 'green' : service.state === 'down' ? 'red' : 'grey'}>{SERVICE_LABEL[service.state] ?? service.state}</Badge>
                      ) : (
                        <span className="text-sm text-library-muted">–</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </HeroPanel>

        <section aria-label="Số liệu" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Tài khoản" value={accounts.data ? formatCount(accounts.data.meta.total) : '–'} hint="Toàn hệ thống" />
          <StatTile label="Cấu trúc hộp" value={structures.data ? structures.data.length : '–'} hint="Đang hỗ trợ" />
          <StatTile label="Xuất file đang chờ" value={queue ? formatCount((queue.waiting ?? 0) + (queue.delayed ?? 0)) : '–'} hint={queue ? `${queue.active ?? 0} đang chạy` : 'Hàng đợi BullMQ'} />
          <StatTile label="Xuất file lỗi" value={queue ? formatCount(queue.failed ?? 0) : '–'} hint="Còn giữ trong hàng đợi" />
        </section>

        {ADMIN_NAV.map((group) => (
          <Panel key={group.title} aria-labelledby={`admin-${group.title}`}>
            <PanelTitle id={`admin-${group.title}`}>{group.title}</PanelTitle>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {group.items
                .filter((item) => item.href !== '/admin')
                .map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="group flex h-full flex-col gap-2 rounded-xl bg-library-panel p-4 transition-colors hover:bg-fpt-orange-light">
                      <span className="flex items-center justify-between">
                        <item.icon className="size-5 text-library-ink" strokeWidth={1.75} aria-hidden />
                        {WIRED.has(item.href) ? <Badge tone="green">Dữ liệu thật</Badge> : <Badge>Dữ liệu mẫu</Badge>}
                      </span>
                      <span className="flex items-center gap-1 text-base font-medium text-library-ink">
                        {item.label}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                      <span className="text-sm text-library-sub">{SECTION_NOTES[item.href]}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </div>
    </AdminShell>
  );
}
