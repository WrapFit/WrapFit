'use client';

/**
 * `/notifications` in the pacdora.com workspace style. There is no notification API yet: the feed is worked out from
 * the account itself (`GET /auth/me`), its projects (`GET /projects`), the trash, the storage and the AI quota, so every
 * item points at something the user can act on now.
 */

import { AlertTriangle, ArrowRight, CircleCheck, Cloud, MailWarning, Sparkles, Trash2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { Badge, SegmentedControl, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { ROUTES } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import {
  daysUntilPurge,
  fitCheckLabel,
  fitCheckTone,
  formatBytes,
  formatRelative,
  usagePercent,
  useAiUsage,
  useProjectList,
  useStorageUsage,
} from '@/features/dashboard';
import { cn } from '@/utils/helpers';

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsScreen />
    </RequireAuth>
  );
}

type Category = 'project' | 'account';
type Filter = 'all' | Category;

interface Notice {
  id: string;
  category: Category;
  tone: 'red' | 'amber' | 'green' | 'grey';
  icon: LucideIcon;
  title: string;
  text: string;
  href: string;
  action: string;
  /** ISO date, for the order and the "x ago" label. */
  at?: string;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'project', label: 'Dự án' },
  { value: 'account', label: 'Tài khoản' },
];

const ICON_TONES: Record<Notice['tone'], string> = {
  red: 'bg-danger-bg text-danger-fg',
  amber: 'bg-warning-bg text-warning-fg',
  green: 'bg-fpt-orange-light text-fpt-orange-ink',
  grey: 'bg-library-panel text-library-ink',
};

const ACTIVE_QUERY = { status: 'ACTIVE' as const, sortBy: 'updatedAt' as const, order: 'desc' as const, page: 1, limit: 50 };
const TRASH_QUERY = { status: 'DELETED' as const, sortBy: 'updatedAt' as const, order: 'desc' as const, page: 1, limit: 50 };
/** Trashed projects this close to their purge get a notice. */
const PURGE_SOON_DAYS = 7;

function NotificationsScreen() {
  const { user } = useAuth();
  const active = useProjectList(ACTIVE_QUERY);
  const trash = useProjectList(TRASH_QUERY);
  const storage = useStorageUsage();
  const ai = useAiUsage();
  const [filter, setFilter] = useState<Filter>('all');

  const notices: Notice[] = [];
  if (user && !user.emailVerifiedAt) {
    notices.push({
      id: 'verify-email',
      category: 'account',
      tone: 'amber',
      icon: MailWarning,
      title: 'Email chưa được xác minh',
      text: `Mở thư WrapFit đã gửi tới ${user.email} để kích hoạt đầy đủ tài khoản.`,
      href: ROUTES.checkEmail,
      action: 'Gửi lại thư',
    });
  }
  for (const project of active.data?.items ?? []) {
    const tone = fitCheckTone(project.fitcheckScore);
    if (tone === 'pass') continue;
    notices.push({
      id: `fitcheck-${project.id}`,
      category: 'project',
      tone: tone === 'fail' ? 'red' : tone === 'warn' ? 'amber' : 'grey',
      icon: tone === 'unchecked' ? CircleCheck : AlertTriangle,
      title: tone === 'unchecked' ? `“${project.title}” chưa chạy FitCheck™` : `“${project.title}”: ${fitCheckLabel(project.fitcheckScore)}`,
      text:
        tone === 'fail'
          ? 'Còn lỗi chặn xuất file in. Mở studio để xem từng lỗi và sửa nhanh.'
          : tone === 'warn'
            ? 'Có cảnh báo nên sửa trước khi gửi xưởng in.'
            : 'Mở studio để kiểm tra lề an toàn, tràn lề và độ phân giải ảnh.',
      href: ROUTES.editor(project.id),
      action: 'Mở studio',
      at: project.updatedAt,
    });
  }
  for (const project of trash.data?.items ?? []) {
    if (!project.deletedAt) continue;
    const days = daysUntilPurge(project.deletedAt);
    if (days > PURGE_SOON_DAYS) continue;
    notices.push({
      id: `purge-${project.id}`,
      category: 'project',
      tone: 'red',
      icon: Trash2,
      title: days > 0 ? `“${project.title}” sẽ bị xoá vĩnh viễn sau ${days} ngày` : `“${project.title}” sắp bị xoá vĩnh viễn`,
      text: 'Khôi phục từ thùng rác nếu bạn còn cần dự án này.',
      href: ROUTES.projects,
      action: 'Mở thùng rác',
      at: project.deletedAt,
    });
  }
  if (storage.data) {
    const percent = usagePercent(storage.data.usedBytes, storage.data.quotaBytes);
    if (percent >= 80) {
      notices.push({
        id: 'storage',
        category: 'account',
        tone: percent >= 95 ? 'red' : 'amber',
        icon: Cloud,
        title: `Đã dùng ${Math.round(percent)}% dung lượng lưu trữ`,
        text: `${formatBytes(storage.data.usedBytes)} / ${formatBytes(storage.data.quotaBytes)}. Xoá vĩnh viễn dự án cũ hoặc nâng gói để tải thêm ảnh.`,
        href: ROUTES.settings,
        action: 'Xem dung lượng',
      });
    }
  }
  if (ai.data?.aiEnabled && ai.data.used >= ai.data.limit * 0.8) {
    const left = Math.max(0, ai.data.limit - ai.data.used);
    notices.push({
      id: 'ai',
      category: 'account',
      tone: left === 0 ? 'red' : 'amber',
      icon: Sparkles,
      title: left === 0 ? 'Đã hết lượt tạo hoa văn AI' : `Còn ${left} lượt tạo hoa văn AI`,
      text: `Hạn mức ${ai.data.limit} lượt trong 24 giờ của gói hiện tại.`,
      href: '/pricing',
      action: 'Xem các gói',
    });
  }
  notices.sort((a, b) => (b.at ?? '9').localeCompare(a.at ?? '9'));

  const shown = notices.filter((notice) => filter === 'all' || notice.category === filter);
  const loading = active.isPending || trash.isPending;
  const error = active.error ?? trash.error;

  let body: React.ReactNode;
  if (error && !active.data) {
    body = <WorkspaceError error={error} title="Không tải được thông báo" onRetry={() => void active.refetch()} retrying={active.isFetching} />;
  } else if (loading) {
    body = (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span role="status" className="sr-only">
          Đang tải thông báo…
        </span>
        {[0, 1, 2].map((index) => (
          <div key={index} aria-hidden className="h-[88px] animate-pulse rounded-2xl bg-library-panel motion-reduce:animate-none" />
        ))}
      </div>
    );
  } else if (shown.length === 0) {
    body = (
      <WorkspaceEmpty
        icon={CircleCheck}
        title="Mọi thứ đều ổn"
        description="Dự án đạt FitCheck™, thùng rác không có gì sắp bị xoá và hạn mức của gói còn thoải mái."
      />
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {shown.map((notice) => (
          <li key={notice.id}>
            <Link
              href={notice.href}
              className="group flex items-start gap-4 rounded-2xl border border-library-line bg-white p-4 transition-[border-color,box-shadow] hover:border-library-ink hover:shadow-hard-sm sm:p-5"
            >
              <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', ICON_TONES[notice.tone])}>
                <notice.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-body font-medium text-library-ink">{notice.title}</span>
                  <Badge>{notice.category === 'project' ? 'Dự án' : 'Tài khoản'}</Badge>
                </span>
                <span className="mt-0.5 block text-sm leading-[1.6] text-library-sub">{notice.text}</span>
                {notice.at && <span className="mt-1 block text-xs text-library-muted">{formatRelative(notice.at)}</span>}
              </span>
              <span className="hidden shrink-0 items-center gap-1 self-center text-sm font-medium text-fpt-orange-ink sm:inline-flex">
                {notice.action}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <WorkspaceShell title="Thông báo" description="Những việc cần bạn xử lý: FitCheck™ chưa đạt, dự án sắp bị xoá và hạn mức của gói.">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl<Filter> label="Loại thông báo" value={filter} onChange={setFilter} options={FILTERS} />
          {!loading && <span className="text-sm text-library-muted">{shown.length} thông báo</span>}
        </div>
        {body}
      </div>
    </WorkspaceShell>
  );
}
