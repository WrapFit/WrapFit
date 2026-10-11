'use client';

/**
 * Account profile (hand-written, not a Stitch screen): name, shop name and avatar of the signed-in user
 * (`PATCH /users/me`, avatar upload purpose AVATAR). The four preference cards have no API yet and stay static (D6).
 */

import React from 'react';
import Link from 'next/link';
import { DashboardHeaderNav } from '@/components/layout';
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';
import { displayName } from '@/components/layout/account';
import { ROLE_LABELS, ROUTES, TIER_LABELS } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import { formatDate } from '@/features/dashboard';
import { AvatarEditor, ProfileForm } from '@/features/profile';

export default function DashboardProfilePage() {
  return (
    <RequireAuth>
      <DashboardProfileScreen />
    </RequireAuth>
  );
}

function DashboardProfileScreen() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#fff8f5] text-[#1b1c18] font-['Plus_Jakarta_Sans'] flex flex-col justify-between">
      <MainHeader />
      <div className="pt-28 pb-28 md:pb-16 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="w-full max-w-[1720px] mx-auto">
          <header className="flex flex-col gap-5 pb-6 mb-8 border-b border-[#e8ded0]/60">
            <DashboardHeaderNav />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href={ROUTES.dashboard}
                  aria-label="Về Tổng quan"
                  className="w-11 h-11 shrink-0 rounded-full bg-white border border-[#e8ded0] flex items-center justify-center text-[#122e20] hover:bg-[#f7f2ef] shadow-xs transition-all"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    arrow_back
                  </span>
                </Link>
                <div className="min-w-0">
                  <h1 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-[#122e20]">
                    Hồ Sơ Chuyên Gia &amp; Thiết Lập Cadence
                  </h1>
                  <p className="text-xs text-[#717971] font-['JetBrains_Mono']">
                    SPLIT BENTO FOCUS &bull; PACKAGING CAD PROFILE
                  </p>
                </div>
              </div>

              <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-['JetBrains_Mono'] uppercase">
                {TIER_LABELS[user.subscriptionTier]}
                {user.emailVerifiedAt ? ' · Đã xác minh' : ''}
              </span>
            </div>
          </header>

          {/* Split Bento Layout */}
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Profile Card */}
            <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#e8ded0]/80 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-6 h-fit">
              <div className="text-center space-y-3">
                <AvatarEditor user={user} />
                <div>
                  <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#122e20] break-words">
                    {displayName(user)}
                  </h2>
                  <p className="text-xs text-[#717971] font-['JetBrains_Mono']">
                    {user.shopName || ROLE_LABELS[user.role]}
                  </p>
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>

              <dl className="pt-4 border-t border-[#e8ded0]/60 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#717971] shrink-0">Email:</dt>
                  <dd className="font-semibold truncate" title={user.email}>
                    {user.email}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#717971] shrink-0">Cửa hàng:</dt>
                  <dd className="font-semibold truncate">{user.shopName || 'Chưa đặt'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#717971] shrink-0">Gói Bản Quyền:</dt>
                  <dd className="font-semibold text-emerald-700">{TIER_LABELS[user.subscriptionTier]}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#717971] shrink-0">Thành viên từ:</dt>
                  <dd className="font-semibold font-['JetBrains_Mono']">{formatDate(user.createdAt)}</dd>
                </div>
                {user.referralCode && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#717971] shrink-0">Mã giới thiệu:</dt>
                    <dd className="font-semibold font-['JetBrains_Mono']">{user.referralCode}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Right Column: profile form, then 4 Bento Cards with Corner Folds */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
              <ProfileForm user={user} />

              <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200/80 shadow-xs space-y-3 relative overflow-hidden">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest font-bold text-amber-800">
                  THẺ 1
                </span>
                <h4 className="font-['Playfair_Display'] text-lg font-bold text-amber-950">
                  Cấu Hình Đo Đạc &amp; Caliper
                </h4>
                <p className="text-xs text-amber-800/80">
                  Đơn vị đo mặc định: mm • Chuẩn tự động: FEFCO 0215 • Thanh trượt bù gập Caliper creep: 1.50t
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-lime-50 border border-lime-200/80 shadow-xs space-y-3 relative overflow-hidden">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest font-bold text-lime-800">
                  THẺ 2
                </span>
                <h4 className="font-['Playfair_Display'] text-lg font-bold text-lime-950">
                  Không Gian Màu &amp; 3D Engine
                </h4>
                <p className="text-xs text-lime-800/80">
                  Không gian màu CMYK Fogra39 / ISO Coated • 300 DPI • Khử răng cưa WebGL MSAA 4X Bật
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-sky-50 border border-sky-200/80 shadow-xs space-y-3 relative overflow-hidden">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest font-bold text-sky-800">
                  THẺ 3
                </span>
                <h4 className="font-['Playfair_Display'] text-lg font-bold text-sky-950">Hóa Đơn VAT Doanh Nghiệp</h4>
                <p className="text-xs text-sky-800/80">
                  Maison de Luxe Ltd • MST: 0317892341 • Tự động gửi email nhận HĐĐT sau khi xuất xưởng
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200/80 shadow-xs space-y-3 relative overflow-hidden">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest font-bold text-emerald-800">
                  THẺ 4
                </span>
                <h4 className="font-['Playfair_Display'] text-lg font-bold text-emerald-950">
                  Cloud Key &amp; Tích Hợp AI
                </h4>
                <p className="text-xs text-emerald-800/80">
                  Illustrator Plugin Sync Bật • Khóa FIDO2 Touch ID kích hoạt • CAD Engine Token: wf_live_***
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
      <MainFooter />
    </div>
  );
}
