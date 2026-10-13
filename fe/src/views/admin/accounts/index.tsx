"use client";

/**
 * `/admin/accounts` in the workspace style of the admin console, wired to `GET` · `PATCH` · `DELETE /users`.
 * The filters and the search act on the loaded page: the API has no search.
 */

import { FilterX, Search, Users } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pagination, outlineButton } from "@/components/library";
import { AdminShell, StatTile, WORKSPACE_INPUT, WorkspaceEmpty, WorkspaceError } from "@/components/workspace";
import { ROLE_LABELS } from "@/constants";
import {
  ACCOUNT_FILTERS,
  AccountDetailDrawer,
  AccountsTable,
  ConfirmDeleteDialog,
  ConfirmLockDialog,
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
import { cn } from "@/utils/helpers";

export default function AdminAccountsPage() {
  return (
    <RequireAuth role="ADMIN">
      <AdminAccountsScreen />
    </RequireAuth>
  );
}

type Confirmation = { kind: "lock" | "delete"; user: SafeUser };

function AdminAccountsScreen() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [shortcut, setShortcut] = useState("Ctrl F");
  const searchRef = useRef<HTMLInputElement>(null);

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
      if (!input || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      <div className="p-4 sm:p-6">
        <WorkspaceError error={accounts.error} title="Không tải được danh sách tài khoản" onRetry={() => void accounts.refetch()} retrying={accounts.isFetching} />
      </div>
    );
  } else if (meta && meta.total === 0) {
    listBody = (
      <div className="p-4 sm:p-6">
        <WorkspaceEmpty icon={Users} title="Chưa có tài khoản nào" description="Tài khoản sẽ hiện ở đây ngay khi có người đăng ký WrapFit." />
      </div>
    );
  } else if (items.length > 0 && visible.length === 0) {
    listBody = (
      <div className="p-4 sm:p-6">
        <WorkspaceEmpty
          icon={FilterX}
          title="Không có tài khoản phù hợp"
          description={`Bộ lọc chỉ xét ${items.length} tài khoản của trang ${page}. Hãy thử trang khác hoặc xoá bộ lọc.`}
          action={
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
              className={outlineButton}
            >
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
    <AdminShell
      title="Tài khoản"
      description="Mọi tài khoản WrapFit: vai trò, xác minh email và trạng thái khoá. Bấm vào một dòng để xem chi tiết."
      actions={<span className="text-sm text-library-muted">{syncLabel}</span>}
    >
      <div className="flex flex-col gap-6">
        <section aria-label="Số tài khoản" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Tổng tài khoản" value={meta ? formatCount(meta.total) : "–"} hint="Toàn hệ thống" />
          <StatTile label={ROLE_LABELS.PRINT_SHOP} value={meta ? formatCount(counts.get("PRINT_SHOP") ?? 0) : "–"} hint={`Trong trang ${page}`} />
          <StatTile label="Chưa xác minh" value={meta ? formatCount(counts.get("unverified") ?? 0) : "–"} hint={`Trong trang ${page}`} />
          <StatTile label="Đã khoá" value={meta ? formatCount(counts.get("locked") ?? 0) : "–"} hint={`Trong trang ${page}`} />
        </section>

        <section aria-label="Danh sách tài khoản" className="overflow-hidden rounded-2xl border border-library-line bg-white">
          {/* Filters the loaded page only: the API has no search. */}
          <div className="flex flex-col gap-3 border-b border-library-line p-4 md:flex-row md:items-center md:justify-between">
            <div role="group" aria-label="Lọc theo vai trò hoặc trạng thái, trong trang này" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] md:pb-0">
              {ACCOUNT_FILTERS.map(({ id, label, countTone }) => {
                const active = filter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(id)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm transition-colors",
                      active ? "border-library-ink bg-library-lime-ink text-white" : "border-library-line text-library-ink hover:border-library-ink",
                    )}
                  >
                    {label}
                    <span className={cn("font-mono text-xs", active ? "text-white/80" : countTone)}>{meta ? counts.get(id) : "–"}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative w-full md:w-72">
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-library-muted" />
              <input
                ref={searchRef}
                className={cn(WORKSPACE_INPUT, "rounded-full border-library-ink pl-10 pr-16")}
                aria-label="Lọc tài khoản trong trang này theo tên, email hoặc cửa hàng"
                placeholder="Lọc trong trang: tên, email…"
                type="text"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && search) setSearch("");
                }}
              />
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-library-panel px-1.5 py-0.5 font-mono text-[11px] text-library-sub sm:inline">{shortcut}</kbd>
            </div>
          </div>

          {listBody}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-library-line p-4">
            <p className="text-sm text-library-muted">
              {!meta
                ? "Đang tải hồ sơ…"
                : filtering
                  ? `Lọc được ${visible.length} / ${items.length} tài khoản của trang này`
                  : `Hiển thị ${items.length} trong số ${formatCount(meta.total)} tài khoản`}
              {accounts.isRefetchError && !accounts.isFetching && (
                <button type="button" onClick={() => void accounts.refetch()} className="ml-2 font-medium text-library-accent hover:underline">
                  Thử lại
                </button>
              )}
            </p>
            <Pagination page={page} totalPages={totalPages} busy={accounts.isPlaceholderData} onPage={setPage} />
          </div>
        </section>

        <p className="text-sm leading-[1.6] text-library-muted">
          Vai trò: {[ROLE_LABELS.ADMIN, ROLE_LABELS.PRINT_SHOP, ROLE_LABELS.PRO_ARTISAN, ROLE_LABELS.MAKER].join(" · ")}. Khoá tài khoản sẽ đăng xuất mọi phiên của người
          đó; xoá tài khoản xoá luôn dự án và tệp của họ.
        </p>
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
      {confirmation?.kind === "delete" && <ConfirmDeleteDialog user={confirmation.user} onClose={() => setConfirmation(null)} />}
    </AdminShell>
  );
}
