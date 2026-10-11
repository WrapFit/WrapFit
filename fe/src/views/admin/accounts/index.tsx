"use client";

/**
 * Stitch screen `admin-accounts`, wired to `GET` · `PATCH` · `DELETE /users` (status "wired": `stitch:sync` keeps this
 * file). The markup and classes come from the generated screen; its CSS and tokens are scoped to `data-stitch`.
 * Tiles and controls that have no API behind them stay static (docs/12, D6).
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState } from "@/components/common/StatusViews";
import { AdminSidebarNav } from "@/components/layout";
import { ROLE_LABELS } from "@/constants";
import {
  ACCOUNT_FILTERS,
  AccountAvatar,
  AccountDetailDrawer,
  AccountsTable,
  ConfirmDeleteDialog,
  ConfirmLockDialog,
  displayName,
  foldText,
  formatCount,
  formatTime,
  matchesFilter,
  matchesSearch,
  useAccountsPage,
  useBusyAccountIds,
  useUpdateAccount,
  type AccountActions,
  type AccountFilter,
} from "@/features/admin";
import { RequireAuth, useAuth } from "@/features/auth";
import type { SafeUser } from "@/types/api";

export default function AdminAccountsPage() {
  return (
    <RequireAuth role="ADMIN">
      <AdminAccountsScreen />
    </RequireAuth>
  );
}

type Confirmation = { kind: "lock" | "delete"; user: SafeUser };

const FILTER_ACTIVE =
  "filter-btn px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary font-label-ui text-label-ui shadow-sm whitespace-nowrap";
const FILTER_IDLE =
  "filter-btn px-3.5 py-1.5 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all font-label-ui text-label-ui whitespace-nowrap";
const PAGE_BUTTON =
  "w-11 h-11 md:w-8 md:h-8 rounded-full bg-surface-container-lowest text-on-surface-variant enabled:hover:text-on-surface enabled:hover:bg-surface-container transition-all flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed";
/** The shared PRIMARY_BUTTON uses `brand-forest`, which this screen's tokens unset: same role, screen colours. */
const ACTION_BUTTON =
  "px-5 py-2.5 min-h-[44px] rounded-xl bg-primary-container text-on-primary enabled:hover:bg-primary font-label-ui text-label-ui shadow-sm active:scale-[0.98] transition-all flex items-center gap-2 disabled:cursor-wait disabled:opacity-60";

function AdminAccountsScreen() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl F");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const navCloseRef = useRef<HTMLButtonElement>(null);
  const navId = useId();

  const accounts = useAccountsPage(page);
  const update = useUpdateAccount();
  const busyIds = useBusyAccountIds();

  const meta = accounts.data?.meta;
  const items = useMemo(() => accounts.data?.items ?? [], [accounts.data]);
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const query = foldText(search.trim());
  const filtering = filter !== "all" || query !== "";
  const visible = useMemo(
    () => items.filter((user) => matchesFilter(user, filter) && matchesSearch(user, query)),
    [items, filter, query],
  );
  const counts = useMemo(
    () => new Map(ACCOUNT_FILTERS.map(({ id }) => [id, items.filter((user) => matchesFilter(user, id)).length])),
    [items],
  );
  const selected = selectedId ? items.find((user) => user.id === selectedId) : undefined;

  // The last row of a page was deleted (or the list shrank elsewhere): go back to the last page that still exists.
  useEffect(() => {
    if (meta && !accounts.isPlaceholderData && page > 1 && items.length === 0) {
      setPage(Math.max(1, Math.min(page - 1, meta.totalPages)));
    }
  }, [meta, items.length, page, accounts.isPlaceholderData]);

  // Ctrl/Cmd+F focuses the page filter, except inside a dialog where the browser's own search stays.
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setShortcut("⌘F");
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "f") return;
      const input = searchRef.current;
      if (!input || rootRef.current?.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The admin menu opens over the page below `lg`: focus moves into it, Escape closes it.
  useEffect(() => {
    if (!navOpen) return;
    navCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNavOpen(false);
      navToggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const isSelf = (user: SafeUser) => user.id === me?.id;
  const actions: AccountActions = {
    onOpen: (user) => setSelectedId(user.id),
    onChangeRole: (user, role) => {
      if (!isSelf(user)) update.mutate({ user, data: { role } });
    },
    onToggleLock: (user) => {
      if (isSelf(user)) return;
      if (user.isActive) setConfirmation({ kind: "lock", user });
      else update.mutate({ user, data: { isActive: true } });
    },
    onDelete: (user) => {
      if (!isSelf(user)) setConfirmation({ kind: "delete", user });
    },
  };

  const syncLabel = accounts.isFetching
    ? "Đang đồng bộ…"
    : accounts.isRefetchError
      ? "Không làm mới được"
      : accounts.dataUpdatedAt
        ? `Đồng bộ lúc ${formatTime(accounts.dataUpdatedAt)}`
        : "";

  let listBody: React.ReactNode;
  if (accounts.isError && !accounts.data) {
    listBody = (
      <div className="px-4 py-10 sm:px-10">
        <ErrorState
          error={accounts.error}
          title="Không tải được danh sách tài khoản"
          action={
            <button
              type="button"
              onClick={() => void accounts.refetch()}
              disabled={accounts.isFetching}
              className={ACTION_BUTTON}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                refresh
              </span>
              {accounts.isFetching ? "Đang thử lại…" : "Thử lại"}
            </button>
          }
        />
      </div>
    );
  } else if (meta && meta.total === 0) {
    listBody = (
      <div className="px-4 py-10 sm:px-10">
        <EmptyState
          title="Chưa có tài khoản nào"
          description="Tài khoản sẽ hiện ở đây ngay khi có người đăng ký WrapFit."
        />
      </div>
    );
  } else if (items.length > 0 && visible.length === 0) {
    listBody = (
      <div className="px-4 py-10 sm:px-10">
        <EmptyState
          title="Không có tài khoản phù hợp"
          description={`Bộ lọc chỉ xét ${items.length} tài khoản của trang ${page}. Hãy thử trang khác hoặc xoá bộ lọc.`}
          action={
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
              className={ACTION_BUTTON}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                filter_alt_off
              </span>
              Xoá bộ lọc
            </button>
          }
        />
      </div>
    );
  } else {
    listBody = (
      <>
        {accounts.isPending && (
          <span role="status" className="sr-only">
            Đang tải danh sách tài khoản…
          </span>
        )}
        <AccountsTable
          users={visible}
          loading={accounts.isPending}
          stale={accounts.isPlaceholderData}
          selfId={me?.id}
          busyIds={busyIds}
          {...actions}
        />
      </>
    );
  }

  return (
    <div ref={rootRef} data-stitch="admin-accounts" className="bg-background font-body-md text-on-surface antialiased">
      {navOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[45] bg-inverse-surface/20 backdrop-blur-sm lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        id={navId}
        className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-surface-container-low z-50 ${
          navOpen ? "flex" : "hidden"
        } lg:flex flex-col justify-between py-6 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-2xl">deployed_code</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                  WrapFit
                </span>
                <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-cad-spec-micro text-cad-spec-micro uppercase">
                  PRO CAD
                </span>
              </div>
              <span className="font-label-ui text-cad-spec-micro text-on-surface-variant uppercase tracking-wider block">
                Admin Engine v4.2
              </span>
            </div>
            <button
              ref={navCloseRef}
              type="button"
              onClick={() => {
                setNavOpen(false);
                navToggleRef.current?.focus();
              }}
              aria-label="Đóng menu quản trị"
              className="lg:hidden ml-auto w-11 h-11 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          <div className="px-3">
            <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-ui text-body-sm text-on-surface">12/12 Cụm In Online</span>
              </div>
              <span className="font-cad-dimension text-cad-dimension text-on-surface-variant font-semibold">100%</span>
            </div>
          </div>
          <AdminSidebarNav mobileToggle={false} />
        </div>
        <div className="px-3 pt-3 bg-surface-container-low">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-tertiary text-lg">terminal</span>
              <div>
                <p className="font-cad-dimension text-cad-spec-micro text-on-surface font-semibold">CALIBRATION</p>
                <p className="font-cad-spec-micro text-cad-spec-micro text-on-surface-variant">{"ΔE < 0.45 Lab"}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-cad-dimension text-cad-spec-micro">
              ISO 12647
            </span>
          </div>
        </div>
      </aside>
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/85 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 w-full px-4 sm:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-6 min-w-0">
              <button
                ref={navToggleRef}
                type="button"
                onClick={() => setNavOpen((open) => !open)}
                aria-expanded={navOpen}
                aria-controls={navId}
                aria-label="Mở menu quản trị"
                className="lg:hidden w-11 h-11 shrink-0 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-xl">menu</span>
              </button>
              <div className="relative hidden md:flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-lg">
                  search
                </span>
                <input
                  className="w-64 xl:w-96 pl-10 pr-4 py-2 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest transition-colors shadow-[0_1px_3px_rgba(28,25,23,0.02)]"
                  placeholder="Tra cứu dieline CAD, lệnh sản xuất, batch ID (#WF-)..."
                  type="text"
                />
              </div>
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="font-label-ui text-body-sm text-on-surface font-medium whitespace-nowrap">
                  12/12 Cụm In Trực Tuyến
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low">
                <span className="font-label-ui text-body-sm text-on-surface-variant">Safe Mode</span>
                <button
                  className="w-9 h-5 bg-secondary-container rounded-full relative flex items-center p-0.5 transition-colors"
                  type="button"
                >
                  <span className="w-4 h-4 rounded-full bg-secondary shadow-sm ml-auto" />
                </button>
              </div>
              <button
                aria-label="Thông báo"
                className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors relative"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-container ring-2 ring-surface" />
              </button>
              {me && (
                <div className="flex items-center gap-3 pl-2">
                  <div className="text-right hidden sm:block">
                    <p className="font-label-ui text-label-ui text-on-surface font-semibold leading-tight truncate max-w-[180px]">
                      {displayName(me)}
                    </p>
                    <p className="font-cad-dimension text-cad-spec-micro text-on-surface-variant leading-none">
                      Quản trị • WrapFit Core
                    </p>
                  </div>
                  <AccountAvatar
                    user={me}
                    className="w-8 h-8 shrink-0 rounded-full font-cad-dimension text-cad-spec-micro font-semibold"
                  />
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="w-full pt-16 bg-surface flex-1">
          <div className="flex flex-col w-full">
            <div className="p-4 sm:p-8 pb-28 md:pb-8 flex flex-col gap-6 w-full max-w-[1720px] mx-auto">
              {/* Top Meta & Title Section */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-cad-spec-micro text-cad-spec-micro uppercase tracking-wider text-secondary font-semibold">
                      BKLIT IDENTITY CORE
                    </span>
                    <span className="text-outline-variant text-xs">•</span>
                    <span className="font-cad-spec-micro text-cad-spec-micro uppercase tracking-wider text-on-surface-variant">
                      MULTI-TENANT RBAC
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-cad-dimension text-cad-spec-micro font-medium">
                      TIER-V4 MATRIX
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-medium tracking-tight">
                    {"Quản Lý & Phân Hạng Người Dùng"}
                  </h1>
                </div>
                {/* Quick Section Switcher Pills */}
                <div className="flex items-center p-1.5 bg-surface-container-low rounded-2xl shadow-sm self-start lg:self-auto max-w-full overflow-x-auto">
                  <button
                    className="px-4 py-2 rounded-xl bg-surface-container-lowest text-primary font-label-ui text-label-ui shadow-sm transition-all flex items-center gap-2 shrink-0 whitespace-nowrap"
                    type="button"
                    aria-current="page"
                  >
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                      badge
                    </span>
                    Danh Sách & Phân Hạng
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all font-label-ui text-label-ui flex items-center gap-2 shrink-0 whitespace-nowrap"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">architecture</span>
                    Chi Tiết Cấp Quyền CAD
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all font-label-ui text-label-ui flex items-center gap-2 shrink-0 whitespace-nowrap"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">encrypted</span>
                    Bảo Mật Zero-Trust & RBAC
                  </button>
                </div>
              </div>
              {/* 4 High-Precision Visual Metric Badges: the first is live, the others have no API yet (D6) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(28,25,23,0.03)] flex flex-col justify-between transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-label-ui text-body-sm text-on-surface-variant font-medium">
                      Tổng Tài Khoản
                    </span>
                    <div className="w-9 h-9 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-lg">group</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg font-medium text-on-surface tracking-tight">
                      {meta ? formatCount(meta.total) : "—"}
                    </span>
                    <span className="font-cad-dimension text-cad-dimension text-secondary font-semibold">
                      toàn hệ thống
                    </span>
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(28,25,23,0.03)] flex flex-col justify-between transition-all hover:shadow-md cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-label-ui text-body-sm text-on-surface-variant font-medium">Gói Solo Pro</span>
                    <div className="w-9 h-9 rounded-full bg-secondary-container/60 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-lg">person</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg font-medium text-on-surface tracking-tight">
                      12,450
                    </span>
                    <span className="font-cad-dimension text-cad-dimension text-on-surface-variant font-medium">
                      84%
                    </span>
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(28,25,23,0.03)] flex flex-col justify-between transition-all hover:shadow-md cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-label-ui text-body-sm text-on-surface-variant font-medium">
                      Enterprise OEM
                    </span>
                    <div className="w-9 h-9 rounded-full bg-tertiary-fixed/30 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-lg">factory</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg font-medium text-on-surface tracking-tight">
                      420
                    </span>
                    <span className="font-cad-dimension text-cad-dimension text-secondary font-semibold">99.8%</span>
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-surface-container-lowest shadow-[0_1px_3px_rgba(28,25,23,0.03)] flex flex-col justify-between transition-all hover:shadow-md cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-label-ui text-body-sm text-on-surface-variant font-medium">
                      FIDO2 Hardware Key
                    </span>
                    <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                      <span className="material-symbols-outlined text-lg">key</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg font-medium text-on-surface tracking-tight">
                      98.6%
                    </span>
                    <span className="font-cad-dimension text-cad-dimension text-primary font-semibold">Bảo Mật</span>
                  </div>
                </div>
              </div>
              {/* Center Main Smart Card */}
              <section
                aria-label="Danh sách tài khoản"
                className="bg-surface-container-lowest rounded-3xl shadow-[0_4px_24px_rgba(28,25,23,0.03)] flex flex-col overflow-hidden"
              >
                {/* Toolbar & Filter Area: filters the loaded page only, the API has no search */}
                <div className="p-5 bg-surface-container-low/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0"
                    id="filterContainer"
                    role="group"
                    aria-label="Lọc theo vai trò hoặc trạng thái, trong trang này"
                  >
                    {ACCOUNT_FILTERS.map(({ id, label, countTone }) => {
                      const active = filter === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setFilter(id)}
                          className={active ? FILTER_ACTIVE : FILTER_IDLE}
                        >
                          {label}
                          <span
                            className={`font-cad-dimension text-cad-spec-micro ml-1 ${active ? "opacity-80" : `${countTone} font-medium`}`}
                          >
                            {meta ? counts.get(id) : "–"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative flex items-center w-full md:w-auto md:min-w-[280px]">
                    <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-base">
                      search
                    </span>
                    <input
                      ref={searchRef}
                      className="w-full pl-9 pr-4 sm:pr-16 py-2 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/70 font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      id="userQuickSearch"
                      aria-label="Lọc tài khoản trong trang này theo tên, email hoặc cửa hàng"
                      placeholder="Lọc trong trang này: tên, email…"
                      type="text"
                      autoComplete="off"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape" && search) setSearch("");
                      }}
                    />
                    <kbd className="hidden sm:inline absolute right-3 px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-cad-dimension text-cad-spec-micro">
                      {shortcut}
                    </kbd>
                  </div>
                </div>
                {/* Identity Grid / Table View */}
                {listBody}
                {/* Pagination & Slide Navigator Footer */}
                <div className="p-4 bg-surface-container-low/40 flex flex-wrap items-center justify-between gap-3 border-t-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-cad-spec-micro text-cad-spec-micro text-on-surface-variant uppercase tracking-wider">
                      {!meta
                        ? "Đang tải hồ sơ…"
                        : filtering
                          ? `Lọc được ${visible.length} / ${items.length} tài khoản của trang này`
                          : `Hiển thị ${items.length} trong số ${formatCount(meta.total)} tài khoản`}
                    </span>
                    {syncLabel && (
                      <>
                        <span className="h-3 w-px bg-surface-container-high" />
                        <span className="font-cad-dimension text-cad-spec-micro text-on-surface font-semibold">
                          {syncLabel}
                        </span>
                      </>
                    )}
                    {accounts.isRefetchError && !accounts.isFetching && (
                      <button
                        type="button"
                        onClick={() => void accounts.refetch()}
                        className="font-cad-dimension text-cad-spec-micro text-primary font-semibold underline-offset-2 hover:underline"
                      >
                        Thử lại
                      </button>
                    )}
                  </div>
                  {/* Subtle Prev/Next Circular Arrow Controls */}
                  <nav aria-label="Phân trang" className="flex items-center gap-3">
                    <button
                      aria-label="Trang trước"
                      className={PAGE_BUTTON}
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container font-cad-dimension text-cad-dimension text-on-surface font-medium">
                      <span aria-live="polite">
                        Trang {page} / {totalPages}
                      </span>
                    </div>
                    <button
                      aria-label="Trang sau"
                      className={PAGE_BUTTON}
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </nav>
                </div>
              </section>
              {/* Floating Dock / Quick Action Bar (no API behind these actions yet, D6) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-lowest shadow-[0_4px_20px_rgba(28,25,23,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                    <span className="material-symbols-outlined text-xl">shield_person</span>
                  </div>
                  <div>
                    <p className="font-label-ui text-label-ui font-semibold text-on-surface">
                      Khung Phân Quyền Hạt Nhân (RBAC Policy Engine v2.4)
                    </p>
                    <p className="font-cad-spec-micro text-cad-spec-micro text-on-surface-variant">
                      {`Vai trò: ${[ROLE_LABELS.ADMIN, ROLE_LABELS.PRINT_SHOP, ROLE_LABELS.PRO_ARTISAN, ROLE_LABELS.MAKER].join(" · ")}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-all flex items-center gap-2"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    <span>Xuất Báo Cáo Audit</span>
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary hover:bg-primary font-label-ui text-label-ui shadow-sm active:scale-[0.98] transition-all flex items-center gap-2"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    <span>Thêm Tài Khoản Mới</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {selected && (
        <AccountDetailDrawer
          key={selected.id}
          user={selected}
          isSelf={isSelf(selected)}
          busy={busyIds.has(selected.id)}
          onClose={() => setSelectedId(null)}
          onChangeRole={actions.onChangeRole}
          onToggleLock={actions.onToggleLock}
          onDelete={actions.onDelete}
        />
      )}
      {confirmation?.kind === "lock" && (
        <ConfirmLockDialog
          user={confirmation.user}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            const user = items.find((item) => item.id === confirmation.user.id) ?? confirmation.user;
            update.mutate({ user, data: { isActive: false } });
            setConfirmation(null);
          }}
        />
      )}
      {confirmation?.kind === "delete" && (
        <ConfirmDeleteDialog user={confirmation.user} onClose={() => setConfirmation(null)} />
      )}
    </div>
  );
}
