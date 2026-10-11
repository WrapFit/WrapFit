'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserAvatarDropdown } from './UserAvatarDropdown';

export const DASHBOARD_TABS = [
  { href: '/dashboard', label: 'Tổng Quan', icon: 'grid_view' },
  { href: '/dashboard/projects', label: 'Dự Án', icon: 'folder_special' },
  { href: '/dashboard/orders', label: 'Đơn Hàng & VAT', icon: 'receipt_long' },
  { href: '/dashboard/brand-kit', label: 'Brand Kit', icon: 'palette' },
  { href: '/dashboard/materials', label: 'Vật Liệu PBR', icon: 'texture' },
  { href: '/dashboard/specs', label: 'Quy Chuẩn CAD', icon: 'architecture' },
  { href: '/dashboard/profile', label: 'Hồ Sơ', icon: 'badge' },
  { href: '/dashboard/settings', label: 'Cài Đặt', icon: 'tune' },
];

export function DashboardHeaderNav({
  showActions = true,
  showAvatar = false,
}: {
  showActions?: boolean;
  showAvatar?: boolean;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // On a narrow row the tabs scroll: bring the current one into view (horizontally only, the page stays put).
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const start = active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    const end = start + active.offsetWidth;
    if (start < nav.scrollLeft || end > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = Math.max(0, end - nav.clientWidth + 16);
    }
  }, [pathname]);

  return (
    <div data-app-tokens className="flex flex-col xl:flex-row items-center justify-between gap-3 w-full font-sans">
      {/* Navigation Pill Tabs */}
      <nav
        ref={navRef}
        className="flex items-center gap-1.5 overflow-x-auto w-full xl:w-auto xl:min-w-0 py-1 scrollbar-none"
        data-purpose="nav-tabs"
      >
        {DASHBOARD_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-black text-white font-semibold shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-700 font-medium border border-stone-200/50 shadow-2xs'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Action Buttons & Interactive Account Avatar */}
      <div className="flex items-center gap-2 self-end xl:self-auto shrink-0">
        {showActions && (
          <>
            <Link
              href="/editor"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all border border-stone-200/60 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
              <span>3D Studio</span>
            </Link>
            <Link
              href="/editor/step-1"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#122e20] hover:bg-[#1a382b] text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>+ Tạo Hộp Mới</span>
            </Link>
          </>
        )}

        {/* Off by default: every dashboard page also has MainHeader, whose avatar menu is the same one. A second
            avatar here took room the tabs need (they scrolled at 1280–1535 px) and showed two avatars on phones. */}
        {showAvatar && <UserAvatarDropdown size="md" align="right" labelClassName="hidden 2xl:flex" />}
      </div>
    </div>
  );
}
