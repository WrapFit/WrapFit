'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import { displayName, loginHref } from './account';
import { BrandLogo } from './BrandLogo';
import { UserAvatarDropdown } from './UserAvatarDropdown';

export interface MainHeaderProps {
  /** Optional custom class */
  className?: string;
  /** Whether to show the top CTA button */
  showCta?: boolean;
}

export const MAIN_NAV_ITEMS = [
  { href: '/editor/step-1', label: 'Thư Viện Mẫu', icon: 'grid_view' },
  { href: '/editor/studio', label: 'Studio 3D', icon: 'view_in_ar' },
  { href: '/pricing', label: 'Bảng Giá', icon: 'payments' },
  { href: '/team', label: 'Đội Ngũ & Xưởng In', icon: 'group' },
  { href: '/support', label: 'Hỗ Trợ Kỹ Thuật', icon: 'help' },
  { href: '/dashboard', label: 'Dự Án Của Tôi', icon: 'folder_special' },
];

export interface MegaMenuItem {
  title: string;
  href: string;
  desc: string;
  badge?: string;
  icon: string;
}

export interface MegaMenuSection {
  title: string;
  icon: string;
  badge?: string;
  items: MegaMenuItem[];
}

export const MEGA_MENU_DATA: MegaMenuSection[] = [
  {
    title: '1. Thiết Kế & CAD Studio',
    icon: 'deployed_code',
    badge: 'Core Workflow',
    items: [
      { title: 'Bước 1: Chọn Cấu Trúc Hộp', href: '/editor/step-1', desc: '4 kết cấu FEFCO/ECMA tiêu chuẩn', icon: 'category', badge: 'Step 1' },
      { title: 'Bước 2: Nhập Kích Thước (mm)', href: '/editor/step-2', desc: 'L x W x H & độ dày Caliper giấy', icon: 'straighten', badge: 'Step 2' },
      { title: 'Bước 3: Studio Thiết Kế 2D/3D', href: '/editor/step-3', desc: 'Trải phẳng dieline & ốp decal UV', icon: 'draw', badge: 'Step 3' },
      { title: 'Bước 4: Kiểm Định FitCheck™', href: '/editor/step-4', desc: 'Báo cáo tiền kiểm dao bế ISO 12647', icon: 'verified', badge: 'Step 4' },
      { title: 'Master Studio 3D Toàn Cảnh', href: '/editor/studio', desc: 'Không gian WebGL gập mở thời gian thực', icon: 'view_in_ar', badge: 'WebGL' },
      { title: 'Kho Vật Liệu Giấy & Hot Foil', href: '/editor/materials/backdrop', desc: 'Giấy kẹp bông, Kraft, Kurz 22K', icon: 'layers' },
    ],
  },
  {
    title: '2. Thương Mại & Cấp Phép',
    icon: 'shopping_bag',
    items: [
      { title: 'Bảng Giá & Gói Cước', href: '/pricing', desc: 'Bản quyền Solo Pro & Enterprise', icon: 'payments' },
      { title: 'Chọn Gói Bản Quyền CAD', href: '/checkout/step-1', desc: 'Bước 1 chọn tier đăng ký xuất xưởng', icon: 'shopping_cart_checkout' },
      { title: 'Phương Thức Thanh Toán', href: '/checkout/step-2', desc: 'Hóa đơn điện tử VAT CQT hợp lệ', icon: 'credit_card' },
      { title: 'Cấp Phép CAD Passport', href: '/checkout/step-3', desc: 'Xác thực bản quyền & tải VAT', icon: 'badge' },
      { title: 'Trải Nghiệm Mở Hộp AR', href: '/unbox', desc: 'Quét QR ảo 3D unboxing pop', icon: 'qr_code_scanner', badge: 'AR' },
    ],
  },
  {
    title: '3. Không Gian Cá Nhân (Workspace)',
    icon: 'folder_open',
    items: [
      { title: 'Dự Án Đã Lưu Của Tôi', href: '/dashboard', desc: 'Kho quản lý bản vẽ CAD cá nhân', icon: 'folder_special' },
      { title: 'Brand Kit Thương Hiệu', href: '/dashboard/brand-kit', desc: 'Logo vector, màu Pantone, typography', icon: 'palette' },
      { title: 'Đơn Hàng & Hóa Đơn VAT', href: '/dashboard/orders', desc: 'Tra cứu trạng thái gia công & VAT', icon: 'receipt_long' },
      { title: 'Hồ Sơ Kỹ Sư Packaging', href: '/dashboard/profile', desc: 'Thiết lập không gian màu CMYK', icon: 'account_circle' },
      { title: 'Cài Đặt Hệ Thống CAD', href: '/dashboard/settings', desc: 'K-Factor, lưới CAD, snapshot', icon: 'tune' },
    ],
  },
  {
    title: '4. Bàn Điều Hành Admin Core',
    icon: 'admin_panel_settings',
    badge: 'Admin Only',
    items: [
      { title: 'Trung Tâm Chỉ Huy', href: '/admin', desc: 'Bảng đo lường hệ thống v4.12', icon: 'dashboard' },
      { title: 'Quản Lý Người Dùng & RBAC', href: '/admin/accounts', desc: 'Phân hạng 420 xưởng & đối tác', icon: 'manage_accounts' },
      { title: 'Kho Dao Bế & Laser CNC', href: '/admin/dieline-vault', desc: 'Thư viện dieline chuẩn DXF/CF2', icon: 'inventory_2' },
      { title: 'Doanh Thu MRR & Báo Cáo', href: '/admin/revenue', desc: 'Báo cáo doanh thu & khớp hóa đơn', icon: 'trending_up' },
      { title: 'Bảo Mật Zero-Trust', href: '/admin/security', desc: 'FIDO2, audit log, kiểm soát quyền', icon: 'security' },
    ],
  },
  {
    title: '5. Thông Tin & Hỗ Trợ',
    icon: 'support_agent',
    items: [
      { title: 'Đội Ngũ & Xưởng In Đối Tác', href: '/team', desc: 'Mạng lưới xưởng in gia công chuẩn', icon: 'group' },
      { title: 'Hỗ Trợ Kỹ Thuật 24/7', href: '/support', desc: 'Tư vấn viên CAD & nẹp dao bế', icon: 'headset_mic' },
      { title: 'Trung Tâm Thông Báo', href: '/notifications', desc: 'Cảnh báo sản xuất & nâng cấp', icon: 'notifications' },
      { title: 'Đăng Nhập Tài Khoản', href: '/auth/login', desc: 'Truy cập workspace bảo mật', icon: 'login' },
      { title: 'Đăng Ký Thành Viên Mới', href: '/auth/register', desc: 'Tạo tài khoản thiết kế bao bì', icon: 'person_add' },
      { title: 'Xác Thực 2FA OTP', href: '/auth/2fa', desc: 'Bảo mật 2 lớp TOTP', icon: 'pin' },
    ],
  },
];

/** Menu entries that only make sense for a visitor who is not signed in. */
const ANONYMOUS_ONLY_HREFS = new Set<string>([ROUTES.login, ROUTES.register]);

export function MainHeader({ className = '', showCta = true }: MainHeaderProps) {
  const pathname = usePathname();
  const { user, status } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Signed in: no "Đăng nhập" / "Đăng ký" entries in the menus.
  const menuSections = useMemo(
    () =>
      user
        ? MEGA_MENU_DATA.map((section) => ({
            ...section,
            items: section.items.filter((item) => !ANONYMOUS_ONLY_HREFS.has(item.href)),
          }))
        : MEGA_MENU_DATA,
    [user],
  );

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMegaMenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 300);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 pointer-events-none ${className}`}>
      <div 
        className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col items-center pointer-events-auto"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Main Floating Glass Capsule Bar */}
        <div className="w-full bg-white/90 backdrop-blur-xl rounded-full border border-stone-200/80 shadow-[0_4px_25px_rgba(28,25,23,0.08)] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 relative z-50">
          {/* 1. Left: Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <BrandLogo size="md" badge="CAD CADRE v4.2" href="/" />
          </div>

          {/* 2. Center: Desktop Navigation Tabs & Mega Menu Trigger */}
          <nav className="hidden xl:flex items-center gap-1 p-1 bg-stone-100/80 rounded-full border border-stone-200/50">
            {/* Mega Menu Hover Trigger Button */}
            <div
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setMegaMenuOpen(!megaMenuOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  megaMenuOpen
                    ? 'bg-[#122e20] text-white shadow-xs'
                    : 'text-stone-800 hover:text-black hover:bg-white/80'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">apps</span>
                <span>Khám Phá Toàn Bộ</span>
                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${megaMenuOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
            </div>

            <div className="h-4 w-px bg-stone-300 mx-1" />

            {MAIN_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-[#122e20] font-bold shadow-xs'
                      : 'text-stone-600 hover:text-black font-medium hover:bg-white/60'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* 3. Right: Utility Actions & Avatar Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Notifications Quick Bell */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-full text-stone-600 hover:text-black hover:bg-stone-100/80 transition-colors hidden sm:flex items-center justify-center"
              title="Thông báo hệ thống"
            >
              <span className="material-symbols-outlined text-[19px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </Link>

            {/* Smart User Avatar Dropdown */}
            <UserAvatarDropdown size="md" align="right" />

            {/* CTA: Create New Box */}
            {showCta && (
              <Link
                href="/editor/step-1"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#122e20] hover:bg-[#1a382b] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
              >
                <span>Bắt Đầu Hộp Quà</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-full text-stone-700 hover:bg-stone-100 transition-colors focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* 4. Desktop Mega Dropdown Panel (Appears on Hover) */}
        {megaMenuOpen && (
          <div
            className="w-full mt-2.5 pointer-events-auto transition-all duration-300 transform origin-top animate-in fade-in slide-in-from-top-2"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full bg-white/95 backdrop-blur-2xl rounded-3xl border border-stone-200/90 shadow-[0_16px_50px_rgba(28,25,23,0.12)] p-6 lg:p-8">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="font-['Playfair_Display'] font-bold text-lg text-[#122e20]">
                    Sơ Đồ Hệ Thống WrapFit Platform
                  </span>
                  <span className="font-['JetBrains_Mono'] text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                    44 Màn Hình • 5 Phân Hệ
                  </span>
                </div>
                <div className="text-xs text-stone-400 font-['JetBrains_Mono']">
                  Bấm vào mục bất kỳ để di chuyển tức thì
                </div>
              </div>

              {/* 5-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {menuSections.map((section, idx) => (
                  <div key={idx} className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#122e20]">
                          {section.icon}
                        </span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900 font-['Plus_Jakarta_Sans']">
                          {section.title}
                        </h4>
                      </div>
                      {section.badge && (
                        <span className="text-[9px] font-bold font-['JetBrains_Mono'] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {section.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {section.items.map((item, itemIdx) => {
                        const isCurrent = pathname === item.href;
                        return (
                          <Link
                            key={itemIdx}
                            href={item.href}
                            onClick={() => setMegaMenuOpen(false)}
                            className={`group flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                              isCurrent
                                ? 'bg-emerald-50/80 border border-emerald-200/60'
                                : 'hover:bg-stone-50 border border-transparent'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[17px] text-stone-400 group-hover:text-[#122e20] transition-colors mt-0.5 shrink-0">
                              {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-stone-800 group-hover:text-[#122e20] truncate">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="text-[9px] font-bold font-['JetBrains_Mono'] px-1 py-0.2 rounded bg-stone-100 text-stone-600 shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 line-clamp-1 leading-tight mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Quick Bar */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4 text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
                    <span>Chuẩn FEFCO / ECMA</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-blue-600">tune</span>
                    <span>Dung Sai Dao Bế Caliper K-0.45</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/editor/step-1"
                    onClick={() => setMegaMenuOpen(false)}
                    className="inline-flex items-center gap-1.5 font-bold text-[#122e20] hover:underline"
                  >
                    <span>Khởi tạo Hộp Quà Ngay</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden pointer-events-auto px-4 max-w-lg mx-auto animate-in slide-in-from-top-4 duration-200 pb-8">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-stone-200/80 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="font-['Playfair_Display'] font-bold text-base text-[#122e20]">
                Danh Mục Toàn Trang
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-stone-500 hover:bg-stone-100"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Mobile Categorized Sections */}
            <div className="space-y-4">
              {menuSections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-['JetBrains_Mono']">
                    {section.title}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {section.items.map((item, itemIdx) => (
                      <Link
                        key={itemIdx}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 text-xs font-medium text-stone-700"
                      >
                        <span className="material-symbols-outlined text-base text-stone-400">
                          {item.icon}
                        </span>
                        <span className="truncate">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              {status === 'loading' ? (
                // Neutral placeholder while the session is checked: no flash of the login button.
                <span aria-hidden className="flex-1 h-[38px] rounded-full bg-stone-100 animate-pulse motion-reduce:animate-none" />
              ) : user ? (
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 min-w-0 py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full bg-stone-100 text-stone-800"
                >
                  <span className="material-symbols-outlined text-base text-stone-500" aria-hidden>
                    account_circle
                  </span>
                  <span className="truncate">{displayName(user)}</span>
                </Link>
              ) : (
                <Link
                  href={loginHref(pathname)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 text-center text-xs font-semibold rounded-full bg-stone-100 text-stone-800"
                >
                  Đăng Nhập
                </Link>
              )}
              <Link
                href="/editor/step-1"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center text-xs font-semibold rounded-full bg-[#122e20] text-white"
              >
                Tạo Hộp Quà
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
