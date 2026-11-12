'use client';

/**
 * `/dashboard`: the workspace home of a signed-in user, in the pacdora.com style. Recent projects, project counts,
 * storage and AI usage come from the API (`GET /projects`, `/storage/usage`, `/ai/usage`); the the design numbers ("Số liệu thiết kế") from `GET /analytics/summary`.
 */

import { ArrowRight, Box, FolderOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { outlineButton, primaryButton, createBoxButton } from '@/components/library';
import { ADMIN_STAT_GROUP, PanelTitle, StatTile, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { displayName } from '@/components/layout/account';
import { ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import {
  AiUsageTile,
  DEMO_PROJECTS,
  DesignStats,
  RECENT_PROJECTS_QUERY,
  RecentProjectCard,
  RecentProjectSkeleton,
  StorageUsageTile,
  formatCount,
  useProjectCount,
  useProjectList,
} from '@/features/dashboard';
import { Banner, ProductTour, TourReplayButton, type TourStep } from '@/components/ui';

export default function DashboardPage() {
  return <DashboardScreen />;
}

const TOUR_ID = 'dashboard-v1';

/** First visit of the workspace: the places a new user needs. */
const TOUR_STEPS: TourStep[] = [
  {
    title: 'Chào mừng tới không gian làm việc',
    body: 'Mình là Bé Gói. Mất chừng 30 giây để mình chỉ bạn những chỗ quan trọng nhất, bạn có thể bỏ qua bất cứ lúc nào.',
    mascot: 'waving',
  },
  {
    target: '[data-tour="create-box"]',
    title: 'Tạo hộp theo kích thước món quà',
    body: 'Nhập dài × rộng × cao của món quà (mm), WrapFit dựng khuôn bế 2D và hộp 3D vừa khít, đã tính độ dày giấy. **Bấm “Tạo hộp mới”** để bắt đầu.',
    tryIt: '**Bấm “Tạo hộp mới”**: mở trang tạo hộp, hướng dẫn này sẽ dừng, trang mới có hướng dẫn riêng.',
    mascot: 'measuring',
  },
  {
    target: '[data-tour="recent-projects"]',
    title: 'Dự án gần đây',
    body: 'Các hộp bạn sửa gần nhất nằm ở đây. **Bấm vào thẻ** để mở lại trong Studio 2D + 3D.',
    tryIt: '**Bấm một thẻ dự án**: mở dự án trong Studio, hướng dẫn này sẽ dừng.',
    mascot: 'folding',
  },
  {
    target: '[data-tour="workspace-nav"]',
    title: 'Mọi thứ khác ở thanh bên',
    body: 'Bộ nhận diện thương hiệu, vật liệu, đơn in và gói dịch vụ. Trên điện thoại, **vuốt hàng thẻ này sang ngang** để xem hết.',
    tryIt: '**Bấm một mục ở thanh bên**: sang trang đó, hướng dẫn này sẽ dừng.',
    placement: 'right',
  },
  {
    target: '[data-tour="tour-replay"]',
    title: 'Cần xem lại?',
    body: 'Nút này mở lại hướng dẫn bất cứ lúc nào. **Bấm vào** khi bạn muốn xem lại. Chúc bạn gói quà thật đẹp!',
    tryIt: '**Bấm “Xem hướng dẫn”**: hướng dẫn chạy lại từ bước đầu.',
    mascot: 'celebration',
  },
];

function DashboardScreen() {
  const { user, status: authStatus } = useAuth();
  const isGuest = authStatus !== 'authenticated';
  const recent = useProjectList(RECENT_PROJECTS_QUERY);
  const active = useProjectCount('ACTIVE');
  const archived = useProjectCount('ARCHIVED');
  const trashed = useProjectCount('DELETED');
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
          <Link href={ROUTES.editorDemo} className={createBoxButton}>
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
      description={user ? `Chào ${displayName(user)}.` : "Trải nghiệm Studio 3D và tạo hộp quà theo kích thước."}
      actions={
        <>
          <TourReplayButton tourId={TOUR_ID} data-tour="tour-replay" variant="ghost" />
          {latest && (
            <Link href={ROUTES.editor(latest.id)} className={outlineButton} title={`Mở “${latest.title}”`}>
              <Box className="size-4" aria-hidden />
              Tiếp tục dự án gần nhất
            </Link>
          )}
        </>
      }
    >
      <ProductTour id={TOUR_ID} steps={TOUR_STEPS} ready={!recent.isPending || isGuestOrOffline} />
      {isGuest && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-fpt-orange/30 bg-orange-50/80 p-4 text-sm text-landing-ink">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-white font-bold text-xs">i</span>
            <span><strong>Chế độ trải nghiệm:</strong> dữ liệu mẫu, đăng nhập để lưu dự án của bạn.</span>
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
        <section aria-label="Số dự án" className={`${ADMIN_STAT_GROUP} grid-cols-3`}>
          <StatTile label="Đang làm" value={active.data !== undefined ? formatCount(active.data) : '–'} />
          <StatTile label="Lưu trữ" value={archived.data !== undefined ? formatCount(archived.data) : '–'} />
          <StatTile label="Thùng rác" value={trashed.data !== undefined ? formatCount(trashed.data) : '–'} hint="Tự xoá sau 30 ngày" />
        </section>

        {/* Real numbers only: guests see no analytics block (the API needs a session). */}
        {!isGuest && <DesignStats />}

        <section aria-labelledby="recent-projects-title" data-tour="recent-projects">
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

      </div>
    </WorkspaceShell>
  );
}
