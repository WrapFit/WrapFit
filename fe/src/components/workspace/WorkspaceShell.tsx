"use client";

import {
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
import { usePathname } from "next/navigation";
import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { primaryButton } from "@/components/library";
import { MainFooter, MainHeader } from "@/components/layout";
import { ROUTES, TIER_LABELS } from "@/constants";
import { useAuth } from "@/features/auth";
import { formatBytes, usagePercent, useStorageUsage } from "@/features/dashboard";
import { cn } from "@/utils/helpers";

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

/** Site header, workspace menu on the left (tabs on small screens), title row, then the page. */
export function WorkspaceShell(props: WorkspaceShellProps) {
  return (
    <ShellLayout
      {...props}
      nav={WORKSPACE_NAV}
      root={{ label: "Không gian làm việc", href: ROUTES.dashboard }}
      sidebarTop={
        <Link href={ROUTES.editorNew} className={cn(primaryButton, "w-full")}>
          <Plus className="size-4" aria-hidden />
          Tạo dự án
        </Link>
      }
      sidebarBottom={<PlanCard />}
    />
  );
}

interface ShellLayoutProps extends WorkspaceShellProps {
  nav: NavGroup[];
  /** First crumb of the title row. */
  root: { label: string; href: string };
  sidebarTop?: React.ReactNode;
  sidebarBottom?: React.ReactNode;
}

/** Layout shared by the workspace and the admin console. */
export function ShellLayout({ title, description, actions, children, nav, root, sidebarTop, sidebarBottom }: ShellLayoutProps) {
  const pathname = usePathname();
  const items = nav.flatMap((group) => group.items);
  return (
    <>
      <MainHeader />
      <div className={`${landingFontVariables} min-h-screen bg-white pt-16 font-landing-heading text-library-text`}>
        {/* Bottom padding below md clears the floating mobile navigation bar. */}
        <div className="mx-auto flex w-full max-w-[1440px] gap-8 px-4 pb-28 pt-6 sm:px-6 md:pb-16 lg:px-10">
          <aside className="hidden w-[248px] shrink-0 lg:block" aria-label={root.label}>
            <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-5 overflow-y-auto pb-4 pr-1">
              {sidebarTop}
              <nav className="flex flex-col gap-4">
                {nav.map((group) => (
                  <div key={group.title}>
                    <p className="px-3 pb-1.5 text-xs text-library-muted">{group.title}</p>
                    <ul className="flex flex-col gap-1">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <NavLink item={item} active={pathname === item.href} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
              {sidebarBottom}
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <nav aria-label={root.label} className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm",
                    pathname === item.href ? "border-library-ink bg-fpt-orange text-white" : "border-library-line text-library-ink"
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </nav>

            <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-library-muted">
                  <Link href={root.href} className="hover:text-library-ink hover:underline">
                    {root.label}
                  </Link>
                  <span className="mx-2">/</span>
                  <span>{title}</span>
                </p>
                <h1 className="mt-1 text-2xl font-medium text-library-ink sm:text-heading-lg sm:leading-tight">{title}</h1>
                {description && <div className="mt-1.5 max-w-2xl text-base leading-[1.6] text-library-sub">{description}</div>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </header>

            {children}
          </main>
        </div>
      </div>
      <MainFooter />
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-lg border-[1.5px] px-3 text-body text-library-ink transition-colors",
        active ? "border-library-ink bg-white shadow-hard-sm" : "border-transparent hover:bg-library-panel"
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
  const percent = storage.data ? usagePercent(storage.data.usedBytes, storage.data.quotaBytes) : 0;
  return (
    <div className="rounded-2xl border border-library-line bg-library-tile p-4">
      <p className="text-xs text-library-muted">Gói hiện tại</p>
      <p className="text-base font-medium text-library-ink">{TIER_LABELS[user.subscriptionTier]}</p>
      {storage.data && (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden>
            <div className={cn("h-full rounded-full", percent >= 90 ? "bg-danger" : "bg-fpt-orange")} style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-library-sub">
            {formatBytes(storage.data.usedBytes)} / {formatBytes(storage.data.quotaBytes)}
          </p>
        </>
      )}
      <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-fpt-orange-ink hover:underline">
        Xem các gói
      </Link>
    </div>
  );
}
