"use client";

import {
  Coins,
  CreditCard,
  Bell,
  FolderOpen,
  Layers,
  LayoutGrid,
  Palette,
  Plus,
  Receipt,
  Ruler,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Every workspace / admin page renders its own shell, so the sidebar is mounted again on each navigation and would
 * jump back to the top. Its scroll position is kept for the tab and put back before the new page paints.
 */
const SIDEBAR_SCROLL_KEY = "wf:sidebar-scroll";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function usePersistentSidebarScroll(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const saved = Number(window.sessionStorage.getItem(key));
      if (saved > 0) el.scrollTop = saved;
    } catch {
      // Storage blocked (private mode): the sidebar simply starts at the top.
    }
    const save = () => {
      try {
        window.sessionStorage.setItem(key, String(el.scrollTop));
      } catch {
        /* ignore */
      }
    };
    el.addEventListener("scroll", save, { passive: true });
    return () => el.removeEventListener("scroll", save);
  }, [key]);
  return ref;
}
import { landingFontVariables } from "@/assets/fonts/landing";
import { primaryButton } from "@/components/library";
import { buttonClass } from "@/components/ui";
import { AdminHeader, MainHeader } from "@/components/layout";
import { ROUTES, TIER_LABELS } from "@/constants";
import { ADMIN_HOME, isAccountPage, isRealAdmin, useAuth } from "@/features/auth";
import { WorkspaceSkeleton } from "./WorkspaceSkeleton";
import { ADMIN_NAV, HealthCard } from "./AdminShell";
import { formatBytes, usagePercent, useStorageUsage } from "@/features/dashboard";
import { cn } from "@/utils/helpers";
import { AdminFrameContext, AdminSkinContext } from "./adminSkin";

// Workspace of a signed-in user, in the pacdora.com style (white page, side menu with a black-outlined active item,
// grey tiles, hairline panels) with the greens of WrapFit.

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export type NavGroup = { title: string; items: NavItem[] };

export const WORKSPACE_NAV: NavGroup[] = [
  {
    title: "Không gian",
    items: [
      { href: ROUTES.dashboard, label: "Tổng quan", icon: LayoutGrid },
      { href: ROUTES.projects, label: "Dự án", icon: FolderOpen },
      { href: "/notifications", label: "Thông báo", icon: Bell },
    ],
  },
  {
    title: "Thương hiệu & sản xuất",
    items: [
      { href: ROUTES.brandKit, label: "Bộ nhận diện", icon: Palette },
      { href: "/dashboard/materials", label: "Vật liệu", icon: Layers },
      { href: "/dashboard/specs", label: "Quy chuẩn hộp", icon: Ruler },
      { href: "/dashboard/orders", label: "Đơn hàng", icon: Receipt },
      { href: "/team", label: "Đội ngũ & xưởng in", icon: Users },
    ],
  },
  {
    title: "Tài khoản",
    items: [
      { href: ROUTES.profile, label: "Hồ sơ", icon: UserRound },
      { href: "/dashboard/wallet", label: "Ví xu Wrap", icon: Coins },
      { href: "/dashboard/billing", label: "Thanh toán & gói", icon: CreditCard },
      { href: ROUTES.settings, label: "Cài đặt", icon: Settings },
    ],
  },
];

interface WorkspaceShellProps {
  title: string;
  description?: React.ReactNode;
  /** Buttons at the right of the title. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Header and menu of the maker workspace, mounted once in app/dashboard/layout.tsx: they stay on screen while the
 * dashboard pages change, and each page's WorkspaceShell renders only its title row and content.
 */
export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (isRealAdmin(user)) {
    return (
      <ShellLayout mode="frame" title="" nav={ADMIN_NAV} root={{ label: "Quản trị", href: ADMIN_HOME }} isAdmin={true}>
        {children}
      </ShellLayout>
    );
  }
  return (
    <ShellLayout
      mode="frame"
      title=""
      nav={WORKSPACE_NAV}
      root={{ label: "Không gian làm việc", href: ROUTES.dashboard }}
      sidebarTop={
        <Link href={ROUTES.editorDemo} data-tour="create-box" className={buttonClass({ variant: "brand", shape: "rounded", block: true, className: "px-4 font-semibold" })}>
          <Plus className="size-4" aria-hidden />
          Tạo dự án
        </Link>
      }
      sidebarBottom={<PlanCard />}
      isAdmin={false}
    >
      {children}
    </ShellLayout>
  );
}

/** Site header, workspace menu on the left (tabs on small screens), title row, then the page. */
export function WorkspaceShell(props: WorkspaceShellProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // The maker workspace is not the administrator's: send them to the console (their profile and settings stay open).
  const redirectAdmin = isRealAdmin(user) && !isAccountPage(pathname);
  useEffect(() => {
    if (redirectAdmin) router.replace(ADMIN_HOME);
  }, [redirectAdmin, router]);
  if (redirectAdmin) return <WorkspaceSkeleton label="Đang mở trang quản trị…" isAdmin={true} />;

  // An administrator on account pages (profile, settings) sees the admin console layout and system health.
  if (isRealAdmin(user)) {
    return (
      <ShellLayout
        {...props}
        nav={ADMIN_NAV}
        root={{ label: "Quản trị", href: ADMIN_HOME }}
        sidebarBottom={<HealthCard />}
        isAdmin={true}
      />
    );
  }

  return (
    <ShellLayout
      {...props}
      nav={WORKSPACE_NAV}
      root={{ label: "Không gian làm việc", href: ROUTES.dashboard }}
      sidebarTop={
        <Link href={ROUTES.editorDemo} className={cn(primaryButton, "w-full")}>
          <Plus className="size-4" aria-hidden />
          Tạo dự án
        </Link>
      }
      sidebarBottom={<PlanCard />}
      isAdmin={false}
    />
  );
}

interface ShellLayoutProps extends WorkspaceShellProps {
  nav: NavGroup[];
  /** First crumb of the title row. */
  root: { label: string; href: string };
  sidebarTop?: React.ReactNode;
  sidebarBottom?: React.ReactNode;
  isAdmin?: boolean;
  /** "frame": the persistent chrome only (header, sidebar), children are the pages; "page" (default): a full page. */
  mode?: "page" | "frame";
}

/** Layout shared by the workspace and the admin console. */
export function ShellLayout({
  title,
  description,
  actions,
  children,
  nav,
  root,
  sidebarTop,
  sidebarBottom,
  isAdmin: isAdminProp,
  mode = "page",
}: ShellLayoutProps) {
  const pathname = usePathname();
  const inFrame = React.useContext(AdminFrameContext);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  React.useEffect(() => setPendingHref(null), [pathname]);
  const activeHref = pendingHref ?? pathname;
  const items = nav.flatMap((group) => group.items);
  const isAdminLayout = isAdminProp ?? (root.href === ADMIN_HOME || pathname.startsWith("/admin"));
  const sidebarScrollRef = usePersistentSidebarScroll(`${SIDEBAR_SCROLL_KEY}:${isAdminLayout ? "admin" : "workspace"}`);
  // Admin console and maker workspace share one console look (L-shaped frame, slate canvas, white cards); only the
  // header and the menu differ.
  const consoleLayout = true;

  const pageHeader = (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {/* Breadcrumb in the workspace only: the admin sidebar already shows where you are. */}
        {!consoleLayout && (
          <p className="text-sm text-library-muted">
            <Link href={root.href} className="hover:text-library-ink hover:underline">
              {root.label}
            </Link>
            <span className="mx-2">/</span>
            <span>{title}</span>
          </p>
        )}
        <h1
          className={cn(
            "text-2xl sm:text-heading-lg sm:leading-tight", !consoleLayout && "mt-1",
            consoleLayout ? "font-bold tracking-tight text-landing-ink" : "font-medium text-library-ink"
          )}
        >
          {title}
        </h1>
        {description && <div className={cn("mt-1.5 max-w-2xl text-base leading-[1.6]", consoleLayout ? "text-fg-muted" : "text-library-sub")}>{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );

  // Inside the persistent admin frame the chrome is already on screen: render the title row and the content only.
  if (inFrame && mode === "page") {
    return (
      <>
        {pageHeader}
        {children}
      </>
    );
  }

  return (
    <AdminFrameContext.Provider value={mode === "frame"}>
    <AdminSkinContext.Provider value={consoleLayout}>
      {isAdminLayout ? <AdminHeader /> : <MainHeader />}
      {pendingHref && (
        <div role="progressbar" aria-label="Đang chuyển trang" className="fixed inset-x-0 top-16 z-50 h-0.5 overflow-hidden bg-fpt-orange-light">
          <div className="h-full w-1/3 animate-[admin-progress_1s_ease-in-out_infinite] rounded-full bg-fpt-orange motion-reduce:animate-none" />
        </div>
      )}
      <div
        className={cn(
          landingFontVariables,
          "min-h-screen pt-16 font-landing-heading",
          consoleLayout ? "bg-landing-canvas text-landing-ink" : "bg-white text-library-text"
        )}
      >
        {/* Bottom padding below md clears the floating mobile navigation bar. */}
        <div
          className={cn(
            "flex w-full",
            consoleLayout ? "" : "mx-auto max-w-[1440px] gap-8 px-4 pb-28 pt-6 sm:px-6 md:pb-16 lg:px-10"
          )}
        >
          {/* Admin: the sidebar is joined to the header (one white L-shaped frame), flush left, full height. */}
          <aside
            className={cn(
              "hidden shrink-0 lg:block",
              consoleLayout ? "sticky top-16 h-[calc(100vh-4rem)] w-[248px] border-r border-line/70 bg-white" : "w-[248px]"
            )}
            aria-label={root.label}
          >
            <div
              ref={sidebarScrollRef}
              className={cn(
                "flex flex-col overflow-y-auto",
                consoleLayout ? "admin-scroll h-full gap-4 px-3 py-5" : "sticky top-24 max-h-[calc(100vh-7rem)] gap-5 pb-4 pr-1"
              )}
            >
              {sidebarTop}
              <nav className={cn("flex flex-col", consoleLayout ? "gap-3" : "gap-4")} data-tour="workspace-nav">
                {nav.map((group) => (
                  <div key={group.title}>
                    <p
                      className={cn(
                        "px-3 pb-1.5",
                        consoleLayout ? "pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted" : "text-xs text-library-muted"
                      )}
                    >
                      {group.title}
                    </p>
                    <ul className={cn("flex flex-col", consoleLayout ? "gap-0.5" : "gap-1")}>
                      {group.items.map((item) => (
                        <li key={item.href}>
                          {consoleLayout ? (
                            <AdminNavLink item={item} active={activeHref === item.href} onNavigate={() => item.href !== pathname && setPendingHref(item.href)} />
                          ) : (
                            <NavLink item={item} active={activeHref === item.href} onNavigate={() => item.href !== pathname && setPendingHref(item.href)} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
              {sidebarBottom}
            </div>
          </aside>

          <main className={cn("min-w-0 flex-1", consoleLayout && "px-4 pb-16 pt-6 sm:px-6 lg:px-8")}>
            <nav aria-label={root.label} data-tour="workspace-nav" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm",
                    pathname === item.href
                      ? consoleLayout
                        ? "border-transparent bg-fpt-orange-light font-semibold text-accent"
                        : "border-library-ink bg-fpt-orange text-white"
                      : consoleLayout
                        ? "border-transparent bg-white text-landing-ink shadow-xs"
                        : "border-library-line text-library-ink"
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </nav>

            {mode === "frame" ? (
              // Persistent frame: only the page changes, with a short fade.
              <div key={pathname} className="animate-[admin-page-in_180ms_ease-out_both] motion-reduce:animate-none">
                {children}
              </div>
            ) : (
              <>
                {pageHeader}
                {children}
              </>
            )}
          </main>
        </div>
      </div>
      {/* No site footer in the console layout (admin and workspace): it is an app, the frame fills the screen. */}
    </AdminSkinContext.Provider>
    </AdminFrameContext.Provider>
  );
}

/** Sidebar link of the admin console: orange tint and a short accent bar when active (pack.ly style). */
function AdminNavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) onNavigate?.();
      }}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
        active ? "bg-fpt-orange-light font-semibold text-accent" : "font-medium text-landing-ink/80 hover:bg-landing-canvas hover:text-landing-ink"
      )}
    >
      {active && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-fpt-orange" />}
      <Icon className={cn("size-[18px]", active ? "text-fpt-orange" : "text-fg-muted group-hover:text-landing-ink")} strokeWidth={1.9} aria-hidden />
      {item.label}
    </Link>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) onNavigate?.();
      }}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-lg border-[1.5px] px-3 text-body text-library-ink transition-colors",
        active ? "border-transparent bg-fpt-orange-light font-semibold text-accent" : "border-transparent hover:bg-library-panel"
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      {item.label}
    </Link>
  );
}

/** Plan of the user and the storage it leaves (`GET /storage/usage`). */
function PlanCard() {
  const { user } = useAuth();
  const storage = useStorageUsage();
  if (!user) return null;
  const tierName = (user.subscriptionTier && TIER_LABELS[user.subscriptionTier]) || "Gói Miễn phí";
  const used = storage.data?.usedBytes ?? 0;
  const quota = storage.data?.quotaBytes ?? 0;
  const percent = quota > 0 ? usagePercent(used, quota) : 0;
  return (
    <div className="rounded-2xl border border-library-line bg-library-tile p-4">
      <p className="text-xs text-library-muted">Gói hiện tại</p>
      <p className="text-base font-medium text-library-ink">{tierName}</p>
      {storage.data && quota > 0 && (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden>
            <div className={cn("h-full rounded-full", percent >= 90 ? "bg-danger" : "bg-fpt-orange")} style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-library-sub">
            {formatBytes(used)} / {formatBytes(quota)}
          </p>
        </>
      )}
      <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-fpt-orange-ink hover:underline">
        Xem các gói
      </Link>
    </div>
  );
}
