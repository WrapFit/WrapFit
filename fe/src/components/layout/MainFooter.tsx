'use client';

import { ArrowUp, Clock, Facebook, GraduationCap, Mail, MapPin, MessageCircle, Music2, Phone } from 'lucide-react';
import { PaymentLogos } from './PaymentLogos';
import Link from 'next/link';
import React from 'react';
import { landingFontVariables } from '@/assets/fonts/landing';
import { ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import { useBoxStructures } from '@/features/templates/hooks';
import { useHydrated } from '@/hooks/dom';
import { cn } from '@/utils/helpers';
import { LandingLogo } from './LandingLogo';
import { SOCIAL_LINKS } from '@/features/site/social';
import { COMPANY_LINKS, INDUSTRY_LINKS, LEGAL_LINKS, RESOURCE_LINKS, STUDIO_LINKS, structureLinks, type NavLink } from './navigation';

const SOCIAL_ICONS = { facebook: Facebook, tiktok: Music2, zalo: MessageCircle, email: Mail } as const;

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
 * FPT blue site footer: Left side has brand, slogan and contact info.
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
    { title: 'Studio', links: [...STUDIO_LINKS, { label: 'Giỏ in mẫu', href: '/cart' }] },
    { title: 'Mẫu hộp', links: structureLinks(hydrated ? structures.data : undefined) },
    { title: 'Ngành hàng & dịp', links: [...industries, ...occasions.slice(0, 3)] },
    { title: 'Tài nguyên', links: RESOURCE_LINKS.filter((link) => link.href !== ROUTES.about) },
    { title: 'Công ty', links: COMPANY_LINKS },
    { title: 'Tài khoản', links: user ? ACCOUNT_SIGNED_IN : ACCOUNT_ANONYMOUS },
  ];

  return (
    <footer data-app-tokens className={cn(landingFontVariables, 'w-full bg-gradient-to-b from-fpt-blue-dark to-[#00315E] font-landing-body select-none' /* ds-allow: deepest stop of the FPT blue footer */, className)}>
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

              <p className="max-w-md text-sm font-medium leading-relaxed text-wf-orange-200">
                <span className="font-serif italic font-semibold text-white">&ldquo;Make Every Present, Present.&rdquo;</span> — Nền tảng thiết kế &amp; dựng khuôn bế bao bì thông minh theo kích thước món quà, đảm bảo 100% khả thi sản xuất từ bản đo milimét.
              </p>

              {/* Contact Information */}
              <div className="space-y-3 pt-1 text-xs text-white/90">
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-4 shrink-0 text-wf-orange-200 mt-0.5" aria-hidden />
                  <span>Đại học FPT TP. Hồ Chí Minh · Lô E2a-7, Đường D1, Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-white/80" aria-hidden />
                  <a href="mailto:contact@wrapfit.vn" className="hover:text-wf-orange-200 transition-colors">
                    contact@wrapfit.vn
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-fpt-green-light" aria-hidden />
                  <a href="tel:0901234567" className="hover:text-wf-orange-200 transition-colors">
                    (+84) 90 123 4567 (Tư vấn kỹ thuật &amp; in ấn)
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="size-4 shrink-0 text-wf-amber-300" aria-hidden />
                  <span>Dự án Khởi nghiệp Thực nghiệm (EXE101) — FPT University</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 shrink-0 text-white/60" aria-hidden />
                  <span>Giờ làm việc: 08:30 – 18:00 (Thứ 2 – Thứ 7)</span>
                </div>
              </div>

              {/* Direct Link to Contact Page */}
              <div>
                <Link
                  href={ROUTES.contact}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white/90 hover:text-white border border-white/15 transition-colors"
                >
                  <span>Xem trang Liên hệ &amp; Gửi yêu cầu</span>
                  <span aria-hidden="true">→</span>
                </Link>
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
                          className="block min-h-6 py-1 text-xs text-white/90 transition-colors hover:text-wf-orange-200 lg:text-sm"
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

        {!compact && (
          <div className="flex w-full flex-col gap-5 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <ul className="flex flex-wrap items-center gap-2" aria-label="Mạng xã hội">
              {SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.id];
                return (
                  <li key={social.id}>
                    <a
                      href={social.href}
                      target={social.id === 'email' ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white/90 ring-1 ring-white/15 transition-colors hover:bg-white/20 hover:text-white"
                    >
                      <Icon className="size-4" aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-2 text-caption text-white/80">
              <span>Thanh toán:</span>
              <PaymentLogos className="flex flex-wrap items-center gap-2" />
            </div>
          </div>
        )}

        <div className="flex w-full flex-col items-center gap-3 border-t border-white/10 pt-6 text-center text-xs text-white/80 lg:flex-row lg:justify-between lg:text-left">
          <div className="flex flex-col gap-1.5">
            <p>© {new Date().getFullYear()} WrapFit · Make Every Present, Present. · Đại học FPT (EXE101)</p>
            <nav aria-label="Pháp lý" className="flex flex-wrap justify-center gap-x-4 gap-y-1 lg:justify-start">
              {LEGAL_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-wf-orange-200">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/20 hover:text-white"
          >
            <ArrowUp className="size-3.5" aria-hidden /> Về đầu trang
          </button>
        </div>
      </div>
    </footer>
  );
}
