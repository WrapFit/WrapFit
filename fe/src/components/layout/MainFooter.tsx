'use client';

import { ArrowUp, Clock, GraduationCap, Mail, MapPin } from 'lucide-react';
import { BrandIcon } from '@/components/common/BrandIcon';
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


export interface MainFooterProps {
  /** Optional custom class */
  className?: string;
  /** Logo and closing line only, for pages that are mostly a tool */
  compact?: boolean;
}

const ACCOUNT_SIGNED_IN: NavLink[] = [
  { label: 'Tổng quan', href: ROUTES.dashboard },
  { label: 'Bộ nhận diện', href: ROUTES.brandKit },
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
    { title: 'Ngành hàng', links: [...industries, ...occasions.slice(0, 3)] },
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
            <div className="flex flex-col items-start gap-5 lg:col-span-4 xl:col-span-3">
              <LandingLogo tone="light" />

              {/* Contact Information */}
              <div className="space-y-3 pt-1 text-xs text-white/90">
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-4 shrink-0 text-wf-orange-200 mt-0.5" aria-hidden />
                  <span>Đại học FPT</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-white/80" aria-hidden />
                  <a href="mailto:contact@wrapfit.vn" className="hover:text-wf-orange-200 transition-colors">
                    contact@wrapfit.vn
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="size-4 shrink-0 text-wf-amber-300" aria-hidden />
                  <span>Dự án khởi nghiệp EXE101 — Đại học FPT</span>
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
                  <span>Liên hệ với chúng tôi</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

            </div>

            {/* Right Column: Navigation Categories shifted to the right */}
            <nav
              aria-label="Liên kết cuối trang"
              className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-3 xl:col-span-9 xl:grid-cols-6"
            >
              {columns.map((column) => (
                <div key={column.title}>
                  <h2 className="whitespace-nowrap font-landing-heading text-base font-semibold text-white">{column.title}</h2>
                  <ul className="mt-3 flex flex-col gap-0.5">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block min-h-6 py-1 text-sm leading-snug text-white/85 transition-colors hover:text-wf-orange-200"
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
                return (
                  <li key={social.id}>
                    <a
                      href={social.href}
                      target={social.id === 'email' ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="inline-flex size-11 items-center justify-center rounded-full bg-white ring-1 ring-white/15 transition-transform hover:scale-105"
                    >
                      {social.id === 'email' ? (
                        <Mail className="size-5 text-fg" aria-hidden />
                      ) : (
                        <BrandIcon brand={social.id} className="size-5" />
                      )}
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
