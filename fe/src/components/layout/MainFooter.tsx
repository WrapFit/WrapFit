'use client';

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
 * Dark green site footer in the pack.ly manner: logo and tagline, six columns of links (the box structures from the
 * API, the hub filters, the account pages of the visitor), then the closing line.
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
          'mx-auto flex w-full max-w-screen-xl flex-col items-center gap-12 px-4 pb-28 md:pb-6 lg:gap-16 lg:px-8 lg:pb-12 2xl:max-w-screen-2xl',
          compact ? 'pt-10' : 'pt-12 lg:pt-24'
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <LandingLogo tone="light" />
          <p className="text-sm font-medium text-stone-300 xl:text-base">Nền tảng thiết kế hộp quà vừa khít</p>
        </div>

        {!compact && (
          <nav aria-label="Liên kết cuối trang" className="grid w-full grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="font-landing-heading text-base font-semibold text-white lg:text-xl">{column.title}</h2>
                <ul className="mt-1 flex flex-col">
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
        )}

        <div className="flex w-full flex-col items-center gap-2 border-t border-white/10 pt-6 text-center text-xs text-landing-lime-mist/80">
          <p>Khuôn bế · FitCheck™ · Xem trước 3D · File in PDF, SVG, DXF · Mở hộp bằng mã QR</p>
          <p>© {new Date().getFullYear()} WrapFit · Make Every Present, Present. · Đại học FPT (EXE101)</p>
        </div>
      </div>
    </footer>
  );
}
