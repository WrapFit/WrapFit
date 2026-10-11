'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { usePathname } from 'next/navigation';

interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

const NAV_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: 'Chỉ Huy & Vận Hành',
    items: [
      { href: '/admin', label: 'Command Center', icon: 'grid_view', badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-700' },
      { href: '/admin/studio-monitoring', label: 'Giám Sát 3D Studio', icon: 'view_in_ar' },
      { href: '/admin/gpu-cluster', label: 'Cụm GPU Render', icon: 'memory' },
    ],
  },
  {
    title: 'Bản Vẽ CAD & Tài Sản',
    items: [
      { href: '/admin/dieline-vault', label: 'Dieline Vault CAD', icon: 'architecture', badge: '1.25k', badgeColor: 'bg-blue-500/20 text-blue-700' },
      { href: '/admin/appraisal', label: 'Thẩm Định Kỹ Thuật', icon: 'fact_check' },
      { href: '/admin/media', label: 'Đa Phương Tiện & Hub', icon: 'perm_media' },
    ],
  },
  {
    title: 'Tài Chính & Đối Tác',
    items: [
      { href: '/admin/revenue', label: 'Doanh Thu & VAT', icon: 'payments' },
      { href: '/admin/ledger', label: 'Sổ Cái Giao Dịch', icon: 'receipt_long' },
      { href: '/admin/print-shops', label: 'Quản Lý Xưởng In', icon: 'domain', badge: '420', badgeColor: 'bg-amber-500/20 text-amber-700' },
    ],
  },
  {
    title: 'Hệ Thống & Bảo Mật',
    items: [
      { href: '/admin/accounts', label: 'Quản Lý Tài Khoản', icon: 'badge' },
      { href: '/admin/vault-quotas', label: 'Hạn Mức Cloud Quotas', icon: 'cloud_done' },
      { href: '/admin/security', label: 'Bảo Mật Zero-Trust', icon: 'shield_locked' },
      { href: '/admin/system-config', label: 'Cấu Hình Hệ Thống', icon: 'tune' },
    ],
  },
];

interface AdminSidebarNavProps {
  /**
   * The static admin screens keep the desktop shell of their Stitch design (sidebar always shown). With this, below lg
   * the sidebar becomes a drawer behind a menu button (CSS on `[data-admin-sidebar-nav='drawer']` and
   * `html[data-admin-nav='open']` in globals.css). Off for a screen that has its own drawer (`/admin/accounts`).
   */
  mobileToggle?: boolean;
}

export function AdminSidebarNav({ mobileToggle = true }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (mobileToggle) setMounted(true);
  }, [mobileToggle]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.setAttribute('data-admin-nav', 'open');
    return () => root.removeAttribute('data-admin-nav');
  }, [open]);

  // A link inside the drawer moves to another screen: close it there.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const toggle =
    mounted &&
    createPortal(
      <div data-app-tokens className="lg:hidden font-sans">
        {open && (
          <div aria-hidden="true" className="fixed inset-0 z-[55] bg-stone-900/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
          className={`fixed top-2.5 z-[70] w-11 h-11 rounded-xl border border-stone-200/80 bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-center text-stone-800 transition-[left] duration-200 ${
            open ? 'left-[calc(min(18rem,85vw)-3.5rem)]' : 'left-3'
          }`}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            {open ? 'close' : 'menu'}
          </span>
        </button>
      </div>,
      document.body,
    );

  return (
    <nav data-admin-sidebar-nav={mobileToggle ? 'drawer' : 'fixed'} className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 scrollbar-thin">
      {toggle}
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <div className="px-3 py-1 font-mono text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
            {group.title}
          </div>
          {group.items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all group ${
                  isActive
                    ? 'bg-[#122e20] text-white shadow-sm font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] transition-colors ${
                    isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-700'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-semibold ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Quick External Jump Links */}
      <div className="pt-2 mt-1 border-t border-stone-200/60 flex flex-col gap-0.5">
        <div className="px-3 py-1 font-mono text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
          Lối Tắt Nhanh
        </div>
        <Link
          href={ROUTES.editorNew}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[12px] text-blue-700 hover:bg-blue-50 font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">view_in_ar</span>
          <span>Mở 3D Studio</span>
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[12px] text-stone-600 hover:bg-stone-100 font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">dashboard</span>
          <span>Về Dashboard</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[12px] text-stone-600 hover:bg-stone-100 font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">home</span>
          <span>Về Trang Chủ</span>
        </Link>
      </div>
    </nav>
  );
}
