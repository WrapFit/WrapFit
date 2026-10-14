'use client';

import { Clock, GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { landingFontVariables } from '@/assets/fonts/landing';
import { ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import { useBoxStructures } from '@/features/templates/hooks';
import { useHydrated } from '@/hooks/dom';
import { cn } from '@/utils/helpers';
import { LandingLogo } from './LandingLogo';
import { INDUSTRY_LINKS, RESOURCE_LINKS, STUDIO_LINKS, structureLinks, type NavLink } from './navigation';

export interface MainFooterProps {
  /** Optional custom class */
  className?: string;
  /** Logo and closing line only, for pages that are mostly a tool */
  compact?: boolean;
}

const ACCOUNT_SIGNED_IN: NavLink[] = [
  { label: 'Tổng quan', href: ROUTES.dashboard },
  { label: 'Brand kit', href: ROUTES.brandKit },
  { label: 'Hồ sơ', href: ROUTES.profile },
  { label: 'Cài đặt', href: ROUTES.settings },
];

const ACCOUNT_ANONYMOUS: NavLink[] = [
  { label: 'Đăng nhập', href: ROUTES.login },
  { label: 'Tạo tài khoản', href: ROUTES.register },
  { label: 'Quên mật khẩu', href: ROUTES.forgotPassword },
];

/**
 * Dark green site footer: Left side has brand, slogan and contact info.
 * Right side has navigation categories organized into columns.
 */
export function MainFooter({ className = '', compact = false }: MainFooterProps) {
  const { user: sessionUser } = useAuth();
  const structures = useBoxStructures();
  // The server knows neither the session nor the structures: show them once hydrated, so both renders match.
  const hydrated = useHydrated();
  const user = hydrated ? sessionUser : null;
  const industries = INDUSTRY_LINKS.slice(0, 5);
  const occasions = INDUSTRY_LINKS.slice(5);

  const columns: { title: string; links: NavLink[] }[] = [
    { title: 'Studio', links: STUDIO_LINKS },
    { title: 'Mẫu hộp', links: structureLinks(hydrated ? structures.data : undefined) },
    { title: 'Ngành hàng', links: industries },
    { title: 'Dịp tặng quà', links: occasions },
    { title: 'Tài nguyên', links: RESOURCE_LINKS },
    { title: 'Tài khoản', links: user ? ACCOUNT_SIGNED_IN : ACCOUNT_ANONYMOUS },
  ];

  return (
    <footer data-app-tokens className={cn(landingFontVariables, 'w-full bg-landing-green-night font-landing-body select-none', className)}>
      {/* Below md the floating BottomNavBar sits over the end of the page: the bottom padding keeps the last line clear. */}
      <div
        className={cn(
          'mx-auto flex w-full max-w-screen-xl flex-col items-center gap-12 px-4 pb-28 md:pb-6 lg:gap-14 lg:px-8 lg:pb-12 2xl:max-w-screen-2xl',
          compact ? 'pt-8' : 'pt-12 lg:pt-20'
        )}
      >
        {!compact && (
          <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Brand Logo, Slogan, Contact Info & University Affiliation */}
            <div className="flex flex-col items-start gap-5 lg:col-span-4 xl:col-span-5">
              <LandingLogo tone="light" />

              <p className="max-w-md text-sm font-medium leading-relaxed text-landing-lime-soft">
                <span className="font-serif italic font-semibold text-white">&ldquo;Make Every Present, Present.&rdquo;</span> — Nền tảng thiết kế &amp; dựng khuôn bế bao bì thông minh theo kích thước món quà, đảm bảo 100% khả thi sản xuất từ bản đo milimét.
              </p>

              {/* Contact Information */}
              <div className="space-y-3 pt-1 text-xs text-landing-lime-mist">
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-4 shrink-0 text-[#F26522] mt-0.5" aria-hidden />
                  <span>Đại học FPT · Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ Thăng Long, Hà Nội</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-[#005CA9]" aria-hidden />
                  <a href="mailto:contact@wrapfit.vn" className="hover:text-landing-lime transition-colors">
                    contact@wrapfit.vn
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-[#6DB33F]" aria-hidden />
                  <a href="tel:0901234567" className="hover:text-landing-lime transition-colors">
                    (+84) 90 123 4567 (Tư vấn kỹ thuật &amp; in ấn)
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="size-4 shrink-0 text-amber-300" aria-hidden />
                  <span>Dự án Khởi nghiệp Thực nghiệm (EXE101) — FPT University</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 shrink-0 text-stone-400" aria-hidden />
                  <span>Giờ làm việc: 08:30 – 18:00 (Thứ 2 – Thứ 7)</span>
                </div>
              </div>

              {/* Direct Link to Contact Page */}
              <div>
                <Link
                  href={ROUTES.contact}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-medium text-landing-lime-mist hover:text-white border border-white/15 transition-colors"
                >
                  <span>Xem trang Liên hệ &amp; Gửi yêu cầu</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              {/* Quality & Production Assurance Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-mono text-white border border-white/15">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CAD Engine 1:1 Active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-mono text-white border border-white/15">
                  ECMA / FEFCO Standard
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-mono text-white border border-white/15">
                  Zero MOQ Flatbed Proofing
                </span>
              </div>
            </div>

            {/* Right Column: Navigation Categories shifted to the right */}
            <nav
              aria-label="Liên kết cuối trang"
              className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-3 xl:col-span-7 xl:grid-cols-6"
            >
              {columns.map((column) => (
                <div key={column.title}>
                  <h2 className="font-landing-heading text-base font-semibold text-white lg:text-lg">{column.title}</h2>
                  <ul className="mt-2 flex flex-col">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block min-h-6 py-1 text-xs text-landing-lime-mist transition-colors hover:text-landing-lime lg:text-sm"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        )}

        <div className="flex w-full flex-col items-center gap-2 border-t border-white/10 pt-6 text-center text-xs text-landing-lime-mist/80">
          <p>Khuôn bế · FitCheck™ · Xem trước 3D · File in PDF, SVG, DXF · Mở hộp bằng mã QR</p>
          <p>© {new Date().getFullYear()} WrapFit · Make Every Present, Present. · Đại học FPT (EXE101)</p>
        </div>
      </div>
    </footer>
  );
}
