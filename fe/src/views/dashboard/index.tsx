'use client';

/**
 * Stitch screen `dashboard` (status "wired": `stitch:sync` keeps this hand-edited file). Recent projects, storage and
 * AI usage come from the API (`GET /projects`, `/storage/usage`, `/ai/usage`); the ecosystem shortcuts and the Copilot
 * bar stay static (docs/12, D6). The screen's behavior script did nothing here, so there is no StitchRuntime.
 */

import React from 'react';
import Link from 'next/link';
import { MainHeader, MainFooter, DashboardHeaderNav } from '@/components/layout';
import { GoiMascot } from '@/components/common/GoiMascot';
import { EmptyState, ErrorState, PRIMARY_BUTTON } from '@/components/common/StatusViews';
import { ROUTES } from '@/constants';
import { RequireAuth } from '@/features/auth';
import {
  AiUsageTile,
  RECENT_PROJECTS_QUERY,
  RecentProjectCard,
  RecentProjectSkeleton,
  StorageUsageTile,
  formatCount,
  useProjectList,
} from '@/features/dashboard';

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardScreen />
    </RequireAuth>
  );
}

function DashboardScreen() {
  const recent = useProjectList(RECENT_PROJECTS_QUERY);
  const projects = recent.data?.items ?? [];
  const latest = projects[0];

  let recentBody: React.ReactNode;
  if (recent.isPending) {
    recentBody = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" aria-busy="true">
        <span role="status" className="sr-only">
          Đang tải dự án gần đây…
        </span>
        {[0, 1, 2, 3].map((index) => (
          <RecentProjectSkeleton key={index} />
        ))}
      </div>
    );
  } else if (recent.isError) {
    recentBody = (
      <ErrorState
        error={recent.error}
        title="Không tải được dự án gần đây"
        onRetry={() => void recent.refetch()}
        retrying={recent.isFetching}
      />
    );
  } else if (projects.length === 0) {
    recentBody = (
      <EmptyState
        title="Chưa có dự án nào"
        description="Nhập kích thước món quà, WrapFit dựng khuôn bế và hộp 3D vừa khít cho bạn."
        action={
          <Link href={ROUTES.editorNew} className={PRIMARY_BUTTON}>
            Tạo hộp mới
          </Link>
        }
      />
    );
  } else {
    recentBody = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {projects.map((project) => (
          <RecentProjectCard key={project.id} project={project} />
        ))}
      </div>
    );
  }

  return (
    <div
      data-stitch="dashboard"
      className="min-h-screen bg-[#fff8f5] text-[#1b1c18] flex flex-col justify-between font-['Plus_Jakarta_Sans'] select-none"
    >
      {/* 1. Unified Main Header with Mega Menu */}
      <MainHeader />

      {/* 2. Main Dashboard Content Container */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 flex-1 flex flex-col gap-8">
        {/* Top Header & Sub-Navigation Strip */}
        <header className="flex flex-col gap-5 pb-6 border-b border-[#e8ded0]/60">
          <DashboardHeaderNav />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-['JetBrains_Mono'] text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  CAD ENGINE 1:1 ACTIVE &bull; ISO 12647-2
                </span>
              </div>
              <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-[#122e20]">
                Không Gian Dự Án Bao Bì Của Bạn
              </h1>
              <p className="text-sm text-[#717971] mt-1 max-w-2xl font-normal leading-relaxed">
                Quản lý các khuôn bế CAD, thông số dung sai nếp gấp, kết cấu bao bì FEFCO và thư viện vật liệu thực tế
                phục vụ sản xuất.
              </p>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href={ROUTES.editorNew}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#122e20] hover:bg-[#1a382b] text-white text-xs font-bold shadow-md shadow-[#122e20]/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Tạo hộp mới</span>
              </Link>
              <Link
                href={latest ? ROUTES.editor(latest.id) : ROUTES.editorNew}
                title={latest ? `Mở “${latest.title}”` : undefined}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold shadow-2xs flex items-center gap-2 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px] text-[#2563eb]">view_in_ar</span>
                <span>{latest ? 'Tiếp tục dự án gần nhất' : 'Mở Master Studio 3D'}</span>
              </Link>
            </div>
          </div>
        </header>

        {/* 3. Main Bento: Active Packaging Projects (Dự Án Gần Đây) */}
        <section className="space-y-4" aria-labelledby="recent-projects-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 id="recent-projects-title" className="font-['Playfair_Display'] text-2xl font-bold text-[#122e20]">
                Dự Án Bao Bì Gần Đây
              </h2>
              {recent.data && (
                <span className="px-2.5 py-0.5 rounded-full bg-stone-200/70 text-stone-700 text-xs font-['JetBrains_Mono'] font-bold">
                  {formatCount(recent.data.meta.total)} dự án
                </span>
              )}
            </div>
            <Link
              href={ROUTES.projects}
              className="min-h-[44px] text-xs font-semibold text-[#122e20] hover:underline flex items-center gap-1"
            >
              <span>Xem Tất Cả Dự Án</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>

          {recentBody}
        </section>

        {/* Storage & AI usage of the plan */}
        <section aria-label="Hạn mức của gói" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <StorageUsageTile />
          <AiUsageTile />
        </section>

        {/* 4. Packaging Ecosystem Shortcuts (Brand Kit, Materials, Orders, Specs) */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Brand Kit */}
          <Link
            href={ROUTES.brandKit}
            className="group p-6 rounded-3xl bg-white border border-[#e8ded0]/80 shadow-soft hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">palette</span>
              </div>
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#122e20]">
                Brand Kit &amp; Màu Pantone
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Đồng bộ mã màu Spot ink, khuôn ép kim nóng 22K và font chữ khắc laser.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[#122e20] group-hover:translate-x-1 transition-transform">
              <span>Mở Brand Kit</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </Link>

          {/* Card 2: Materials */}
          <Link
            href="/dashboard/materials"
            className="group p-6 rounded-3xl bg-white border border-[#e8ded0]/80 shadow-soft hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700 mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">texture</span>
              </div>
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#122e20]">
                Kho Vật Liệu PBR &amp; Giấy
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Giấy kẹp bông, Kraft organic, màng Velvet và cốt Greyboard sẵn có tại 4 xưởng in.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[#122e20] group-hover:translate-x-1 transition-transform">
              <span>Xem Thư Viện Vật Liệu</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </Link>

          {/* Card 3: Orders & VAT */}
          <Link
            href="/dashboard/orders"
            className="group p-6 rounded-3xl bg-white border border-[#e8ded0]/80 shadow-soft hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
              </div>
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#122e20]">Đơn Hàng &amp; Hóa Đơn VAT</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Theo dõi tiến độ chế bản, xuất hóa đơn điện tử CQT và quản lý bản quyền CAD.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[#122e20] group-hover:translate-x-1 transition-transform">
              <span>Tra Cứu Đơn Hàng</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </Link>

          {/* Card 4: Specs CAD */}
          <Link
            href="/dashboard/specs"
            className="group p-6 rounded-3xl bg-white border border-[#e8ded0]/80 shadow-soft hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-700 mb-4 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">architecture</span>
              </div>
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#122e20]">
                Quy Chuẩn CAD &amp; Caliper
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Bảng thông số bù co giãn nếp gấp, độ dày Caliper và tiêu chuẩn dao bế FEFCO.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[#122e20] group-hover:translate-x-1 transition-transform">
              <span>Xem Quy Chuẩn Kỹ Thuật</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </Link>
        </section>

        {/* 5. Companion Mascot Copilot Bar */}
        <section className="bg-white rounded-3xl p-5 border border-[#e8ded0]/80 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 p-1 flex items-center justify-center shrink-0">
              {/* The Stitch image of the mascot has expired: the app's own Gói. */}
              <GoiMascot pose="chilling" size={40} interactive={false} label="Bé Gói WrapFit Copilot" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#122e20]">Bé Gói AI Packaging Copilot</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  Tự động kiểm định
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Các bản vẽ trong kho đồ án của bạn luôn được tiền kiểm tự động: Vùng an toàn &ge; 3mm, Bleed bù xén &ge;
                2mm, đảm bảo không lỗi khi lên máy bế!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/support"
              className="min-h-[44px] px-4 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              <span>Trợ Giúp CAD</span>
            </Link>
            <Link
              href={ROUTES.editorNew}
              className="min-h-[44px] px-4 py-2 rounded-full bg-[#122e20] hover:bg-[#1a382b] text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
              <span>Bắt Đầu Ngay</span>
            </Link>
          </div>
        </section>
      </main>

      {/* 6. Unified Footer */}
      <MainFooter />
    </div>
  );
}
