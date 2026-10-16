'use client';

/**
 * `/dashboard`: the workspace home of a signed-in user, in the pacdora.com style. Recent projects, project counts,
 * storage and AI usage come from the API (`GET /projects`, `/storage/usage`, `/ai/usage`); the structures of the quick
 * start from `GET /templates/structures`.
 */

import { ArrowRight, Box, FolderOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { outlineButton, primaryButton, createBoxButton } from '@/components/library';
import { HeroPanel, Panel, PanelTitle, StatTile, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { displayName } from '@/components/layout/account';
import { ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import {
  AiUsageTile,
  DEMO_PROJECTS,
  RECENT_PROJECTS_QUERY,
  RecentProjectCard,
  RecentProjectSkeleton,
  StorageUsageTile,
  formatCount,
  useAiUsage,
  useProjectCount,
  useProjectList,
} from '@/features/dashboard';
import { DielineSketch, useBoxStructures } from '@/features/templates';
import { Banner } from '@/components/ui';

export default function DashboardPage() {
  return <DashboardScreen />;
}

const SHORTCUTS = [
  { href: ROUTES.brandKit, title: 'Brand kit', text: 'Logo, bảng màu, font và khẩu hiệu dùng lại trên mọi hộp.' },
  { href: ROUTES.templates, title: 'Thư viện mẫu', text: 'Mẫu WrapFit Curated và thiết kế đạt FitCheck™ của cộng đồng.' },
  { href: '/support', title: 'Trung tâm hỗ trợ', text: 'Kích thước, FitCheck™, file in, mã QR mở hộp.' },
  { href: '/pricing', title: 'Gói dịch vụ', text: 'Dung lượng lưu trữ và lượt tạo hoa văn AI của từng gói.' },
];

function DashboardScreen() {
  const { user, status: authStatus } = useAuth();
  const isGuest = authStatus !== 'authenticated';
  const recent = useProjectList(RECENT_PROJECTS_QUERY);
  const active = useProjectCount('ACTIVE');
  const archived = useProjectCount('ARCHIVED');
  const trashed = useProjectCount('DELETED');
  const ai = useAiUsage();
  const structures = useBoxStructures();
  const isGuestOrOffline = isGuest || (recent.isError && !recent.data);
  const projects = (recent.data?.items && recent.data.items.length > 0)
    ? recent.data.items
    : (isGuestOrOffline ? DEMO_PROJECTS : []);
  const latest = projects[0];

  let recentBody: React.ReactNode;
  if (recent.isPending && !isGuestOrOffline) {
    recentBody = (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        <span role="status" className="sr-only">
          Đang tải dự án gần đây…
        </span>
        {[0, 1, 2, 3].map((index) => (
          <RecentProjectSkeleton key={index} />
        ))}
      </div>
    );
  } else if (recent.isError && !isGuestOrOffline) {
    recentBody = (
      <WorkspaceError error={recent.error} title="Không tải được dự án gần đây" onRetry={() => void recent.refetch()} retrying={recent.isFetching} />
    );
  } else if (projects.length === 0) {
    recentBody = (
      <WorkspaceEmpty
        icon={FolderOpen}
        title="Chưa có dự án nào"
        description="Nhập kích thước món quà, WrapFit dựng khuôn bế và hộp 3D vừa khít cho bạn."
        action={
          <Link href={ROUTES.editorNew} className={createBoxButton}>
            <Plus className="size-4" aria-hidden />
            Tạo hộp mới
          </Link>
        }
      />
    );
  } else {
    recentBody = (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {projects.map((project) => (
          <RecentProjectCard key={project.id} project={project} />
        ))}
      </div>
    );
  }

  return (
    <WorkspaceShell
      title="Tổng quan"
      description={user ? `Chào ${displayName(user)}, đây là các hộp bạn đang làm.` : "Không gian làm việc trải nghiệm — mở hộp bất kỳ trong Studio 3D hoặc tạo mới theo kích thước."}
      actions={
        <>
          {latest && (
            <Link href={ROUTES.editor(latest.id)} className={outlineButton} title={`Mở “${latest.title}”`}>
              <Box className="size-4" aria-hidden />
              Tiếp tục dự án gần nhất
            </Link>
          )}
          <Link href={ROUTES.editorNew} className={createBoxButton}>
            <Plus className="size-4" aria-hidden />
            Tạo hộp mới
          </Link>
        </>
      }
    >
      {isGuest && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-fpt-orange/30 bg-orange-50/80 p-4 text-sm text-landing-ink">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-white font-bold text-xs">i</span>
            <span><strong>Không gian làm việc khách (Demo Workspace):</strong> Bạn đang xem các dự án mẫu của WrapFit. Bấm vào bất kỳ dự án nào để mở trực tiếp trong Studio 3D hoặc bấm <strong>Tạo hộp mới</strong> để tùy chỉnh kích thước riêng.</span>
          </div>
          <Link href="/auth/login" className="shrink-0 rounded-full border border-fpt-orange bg-white px-3.5 py-1.5 text-xs font-semibold text-fpt-orange-ink hover:bg-orange-100 transition-colors">
            Đăng nhập tài khoản
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-8">
        {user && !user.emailVerifiedAt && (
          <Banner
            tone="warning"
            title="Email của bạn chưa được xác minh"
            description="Xác minh để nhận hoá đơn, link tải file in và thông báo đơn in mẫu. Hãy mở thư WrapFit gửi tới hộp thư của bạn."
            action={
              <Link href={ROUTES.profile} className={outlineButton}>
                Xem hồ sơ
              </Link>
            }
          />
        )}
        <HeroPanel>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-center">
            <div>
              <h2 className="flex gap-3 text-2xl font-medium leading-snug text-library-ink">
                <ArrowRight className="mt-1 size-7 shrink-0 text-fpt-orange-ink" strokeWidth={1.75} aria-hidden />
                Bắt đầu từ một cấu trúc hộp
              </h2>
              <p className="mt-3 text-base leading-[1.6] text-library-sub">
                Chọn kiểu hộp gần nhất với món quà, xem các mẫu của nó rồi đổi kích thước theo từng milimét.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(structures.data ?? []).map((structure) => (
                <li key={structure.id}>
                  <Link
                    href={`${ROUTES.templates}?structure=${structure.id}`}
                    className="group flex h-full flex-col gap-2 rounded-xl border border-library-ink bg-white p-3 transition-shadow hover:shadow-hard-sm"
                  >
                    <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-library-tile p-2">
                      <DielineSketch structure={structure.id} dimensions={{ length: 80, width: 55, height: 60, paperThickness: 0.42 }} className="h-full w-full" />
                    </span>
                    <span className="text-sm text-library-ink">{structure.name}</span>
                  </Link>
                </li>
              ))}
              {structures.isPending &&
                [0, 1, 2, 3].map((index) => <li key={index} aria-hidden className="aspect-square animate-pulse rounded-xl bg-white/70" />)}
            </ul>
          </div>
        </HeroPanel>

        <section aria-label="Số dự án" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Đang làm" value={active.data !== undefined ? formatCount(active.data) : '–'} />
          <StatTile label="Lưu trữ" value={archived.data !== undefined ? formatCount(archived.data) : '–'} />
          <StatTile label="Thùng rác" value={trashed.data !== undefined ? formatCount(trashed.data) : '–'} hint="Tự xoá sau 30 ngày" />
          <StatTile
            label="Hoa văn AI còn lại"
            value={ai.data ? (ai.data.aiEnabled ? formatCount(Math.max(0, ai.data.limit - ai.data.used)) : 'Không giới hạn') : '–'}
            hint="Trong 24 giờ"
          />
        </section>

        <section aria-labelledby="recent-projects-title">
          <PanelTitle
            id="recent-projects-title"
            action={
              <Link href={ROUTES.projects} className="inline-flex min-h-[44px] items-center gap-1 text-sm text-library-ink underline-offset-4 hover:underline">
                Xem tất cả dự án
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          >
            Dự án gần đây
          </PanelTitle>
          {recentBody}
        </section>

        <section aria-label="Hạn mức của gói" className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <StorageUsageTile />
          <AiUsageTile />
        </section>

        <Panel aria-labelledby="shortcuts-title">
          <PanelTitle id="shortcuts-title">Lối tắt</PanelTitle>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.href}>
                <Link href={shortcut.href} className="group flex h-full flex-col gap-1 rounded-xl bg-library-panel p-4 transition-colors hover:bg-fpt-orange-light">
                  <span className="flex items-center justify-between text-base font-medium text-library-ink">
                    {shortcut.title}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                  <span className="text-sm text-library-sub">{shortcut.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </WorkspaceShell>
  );
}
