'use client';

import { ArrowRight, Bell, ChevronDown, FolderOpen, Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { landingFontVariables } from '@/assets/fonts/landing';
import { ROUTES } from '@/constants';
import { useAuth } from '@/features/auth';
import { useProjectCount } from '@/features/dashboard/useProjects';
import { useBoxStructures } from '@/features/templates/hooks';
import { useHydrated } from '@/hooks/dom';
import { cn } from '@/utils/helpers';
import { displayName, loginHref } from './account';
import { HeaderSearch } from './HeaderSearch';
import { LandingLogo } from './LandingLogo';
import { navGroups, type NavGroup } from './navigation';
import { UserAvatarDropdown } from './UserAvatarDropdown';
import { buttonClass } from "@/components/ui";

export interface MainHeaderProps {
  /** Optional custom class */
  className?: string;
  /** Whether to show the "Bắt đầu" call to action */
  showCta?: boolean;
}

/** Top-level pages of the site, for menus outside the header. */
export const MAIN_NAV_ITEMS = [
  { href: ROUTES.templates, label: 'Thư viện mẫu', icon: 'grid_view' },
  { href: ROUTES.editorNew, label: 'Studio 3D', icon: 'view_in_ar' },
  { href: '/pricing', label: 'Bảng giá', icon: 'payments' },
  { href: '/support', label: 'Hỗ trợ', icon: 'help' },
  { href: ROUTES.dashboard, label: 'Dự án của tôi', icon: 'folder_special' },
];

const ICON_BUTTON =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-landing-tile text-landing-ink transition-colors hover:bg-landing-accent outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/25';

/**
 * Site header in the pack.ly manner: logo, menus that open on hover or click, then the site search, "Bắt đầu", notifications, the
 * account and the number of my projects. The "Mẫu hộp" menu lists the structures of the API; a signed-in user sees
 * their own menu and project count. Fixed at the top; pages leave room for it.
 */
export function MainHeader({ className = '', showCta = true }: MainHeaderProps) {
  const pathname = usePathname();
  const session = useAuth();
  // The server renders a visitor whose session is unknown: the account part follows the session once hydrated.
  const hydrated = useHydrated();
  const user = hydrated ? session.user : null;
  const status = hydrated ? session.status : 'loading';
  const structures = useBoxStructures();
  const groups = navGroups(structures.data);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Menus close on Escape, on a press outside the header and on navigation.
  useEffect(() => {
    if (!openMenu && !mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openMenu, mobileOpen]);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  // Hover opens a menu for a mouse only; a tap uses the trigger's click.
  const hoverOpen = (id: string) => (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(id);
  };
  const hoverClose = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    closeTimer.current = setTimeout(() => setOpenMenu(null), 200);
  };

  return (
    // data-app-tokens: inside a Stitch screen the header keeps the app's fonts and colours, not the screen's.
    <header
      ref={headerRef}
      data-app-tokens
      className={cn(
        landingFontVariables,
        'fixed inset-x-0 top-0 z-50 border-b border-landing-line/60 bg-white/85 font-landing-body text-landing-ink backdrop-blur-md',
        className
      )}
    >
      <nav aria-label="Điều hướng chính" className="mx-auto flex h-16 w-full max-w-screen-xl items-center justify-between gap-4 px-4 lg:px-8 2xl:max-w-screen-2xl">
        <div className="flex min-w-0 items-center gap-6">
          <LandingLogo />
          <ul className="hidden items-center gap-1 xl:flex">
            {groups.map((group) => (
              <li key={group.id} className="relative" onPointerEnter={hoverOpen(group.id)} onPointerLeave={hoverClose}>
                <button
                  type="button"
                  aria-expanded={openMenu === group.id}
                  aria-controls={`menu-${group.id}`}
                  onClick={() => setOpenMenu((current) => (current === group.id ? null : group.id))}
                  className={cn(
                    'inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full px-3 2xl:px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/20',
                    openMenu === group.id ? 'bg-landing-tile' : 'hover:bg-landing-tile/70'
                  )}
                >
                  {group.label}
                  <ChevronDown className={cn('size-3.5 transition-transform', openMenu === group.id && 'rotate-180')} aria-hidden />
                </button>
                {openMenu === group.id && <MenuPanel group={group} pathname={pathname} onNavigate={() => setOpenMenu(null)} />}
              </li>
            ))}
            <li>
              <Link
                href="/pricing"
                aria-current={pathname === '/pricing' ? 'page' : undefined}
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 2xl:px-4 text-sm font-medium transition-colors hover:bg-landing-tile/70 aria-[current=page]:bg-landing-tile"
              >
                Bảng giá
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <HeaderSearch />
          {showCta && (
            <Link
              href={ROUTES.editorNew}
              className={buttonClass({ variant: "brand", className: "hidden px-4 sm:inline-flex" })}
            >
              Bắt đầu
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          {user && (
            <Link href="/notifications" className={cn(ICON_BUTTON, 'hidden sm:inline-flex')} aria-label="Thông báo" title="Thông báo">
              <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </Link>
          )}
          {user ? (
            <UserAvatarDropdown size="md" align="right" labelClassName="hidden" />
          ) : status === 'loading' ? (
            <span aria-hidden className="size-10 animate-pulse rounded-full bg-landing-tile motion-reduce:animate-none" />
          ) : (
            <Link href={loginHref(pathname)} className={ICON_BUTTON} aria-label="Đăng nhập" title="Đăng nhập">
              <User className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </Link>
          )}
          {user && <ProjectsPill />}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="menu-mobile"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            className={cn(ICON_BUTTON, 'xl:hidden')}
          >
            {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <MobileMenu
          groups={groups}
          userName={user ? displayName(user) : null}
          loginHref={loginHref(pathname)}
          onNavigate={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}

function MenuPanel({ group, pathname, onNavigate }: { group: NavGroup; pathname: string | null; onNavigate(): void }) {
  return (
    <div id={`menu-${group.id}`} className="absolute top-full left-0 pt-2">
      <ul
        className={cn(
          'grid gap-1 rounded-2xl bg-white p-2 shadow-[0_10px_30px_-6px_rgba(29,41,61,0.18)] ring-1 ring-landing-ink/10',
          group.wide ? 'w-[440px] grid-cols-2' : 'w-[360px] grid-cols-1'
        )}
      >
        {group.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              aria-current={pathname === link.href ? 'page' : undefined}
              className="flex flex-col gap-0.5 rounded-xl p-3 transition-colors hover:bg-landing-tile/60 aria-[current=page]:bg-landing-tile/60"
            >
              <span className="text-sm font-medium text-landing-ink">{link.label}</span>
              {link.description && <span className="line-clamp-2 text-xs leading-4 text-landing-muted">{link.description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** My active projects, like the cart pill of pack.ly (`GET /projects?status=ACTIVE&limit=1`). */
function ProjectsPill() {
  const count = useProjectCount('ACTIVE');
  return (
    <Link
      href={ROUTES.projects}
      className="hidden h-10 items-center gap-2 rounded-full bg-landing-tile pr-1.5 pl-3 text-landing-ink transition-colors hover:bg-landing-accent sm:inline-flex"
      aria-label={count.data !== undefined ? `Dự án của tôi: ${count.data}` : 'Dự án của tôi'}
    >
      <FolderOpen className="size-[18px]" strokeWidth={1.75} aria-hidden />
      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-medium">
        {count.data ?? '–'}
      </span>
    </Link>
  );
}

function MobileMenu({
  groups,
  userName,
  loginHref: login,
  onNavigate,
}: {
  groups: NavGroup[];
  userName: string | null;
  loginHref: string;
  onNavigate(): void;
}) {
  const [open, setOpen] = useState<string | null>(groups[0]?.id ?? null);
  return (
    <div id="menu-mobile" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-landing-line/60 bg-white xl:hidden">
      <div className="mx-auto flex max-w-screen-md flex-col gap-1 px-4 py-4">
        {groups.map((group) => (
          <div key={group.id} className="border-b border-landing-line/60 pb-1">
            <button
              type="button"
              aria-expanded={open === group.id}
              onClick={() => setOpen((current) => (current === group.id ? null : group.id))}
              className="flex h-12 w-full items-center justify-between text-base font-medium"
            >
              {group.label}
              <ChevronDown className={cn('size-4 transition-transform', open === group.id && 'rotate-180')} aria-hidden />
            </button>
            {open === group.id && (
              <ul className={cn('grid gap-1 pb-2', group.wide && 'grid-cols-2')}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={onNavigate} className="block rounded-lg px-3 py-2.5 text-sm text-landing-muted hover:bg-landing-tile/60">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <Link href="/pricing" onClick={onNavigate} className="flex h-12 items-center border-b border-landing-line/60 text-base font-medium">
          Bảng giá
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={userName ? ROUTES.dashboard : login}
            onClick={onNavigate}
            className="inline-flex h-11 items-center justify-center truncate rounded-full bg-landing-tile px-3 text-sm font-medium"
          >
            {userName ?? 'Đăng nhập'}
          </Link>
          <Link
            href={ROUTES.editorNew}
            onClick={onNavigate}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-fpt-orange text-sm font-semibold text-white hover:bg-fpt-orange-dark"
          >
            Bắt đầu
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
