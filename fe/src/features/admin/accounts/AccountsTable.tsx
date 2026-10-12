"use client";

import React, { useState } from "react";
import type { Role, SafeUser } from "@/types/api";
import { AccountAvatar } from "./AccountAvatar";
import { displayName, formatDate, formatDateTime, ROLE_LABELS, SELF_EDIT_HINT, TIER_LABELS } from "./accountFormat";
import { RoleSelect } from "./RoleSelect";

export interface AccountActions {
  onOpen(user: SafeUser): void;
  onChangeRole(user: SafeUser, role: Role): void;
  /** Locking asks first (sessions are revoked); unlocking applies at once. */
  onToggleLock(user: SafeUser): void;
  /** Opens the two-step delete confirmation. */
  onDelete(user: SafeUser): void;
}

interface AccountsTableProps extends AccountActions {
  users: SafeUser[];
  /** First load: skeleton rows. */
  loading: boolean;
  /** Another page is loading: the current rows stay, dimmed. */
  stale: boolean;
  selfId: string | undefined;
  busyIds: ReadonlySet<string>;
}

const ICON_BUTTON =
  "w-11 h-11 md:w-8 md:h-8 rounded-full transition-all inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed";

export function AccountsTable({ users, loading, stale, selfId, busyIds, ...actions }: AccountsTableProps) {
  return (
    // `relative`: the `sr-only` labels (position absolute) must scroll with the table, not widen the page.
    <div className="relative overflow-x-auto w-full">
      <table className="w-full min-w-[880px] text-left">
        <caption className="sr-only">Danh sách tài khoản, mới tạo trước</caption>
        <thead>
          <tr className="bg-surface-container-low/30 text-on-surface-variant font-cad-spec-micro text-cad-spec-micro uppercase tracking-wider">
            <th scope="col" className="py-3.5 px-6 font-semibold">
              Tài Khoản
            </th>
            <th scope="col" className="py-3.5 px-3 font-semibold">
              Vai Trò
            </th>
            <th scope="col" className="py-3.5 px-3 font-semibold">
              Gói
            </th>
            <th scope="col" className="py-3.5 px-3 font-semibold">
              Trạng Thái
            </th>
            <th scope="col" className="py-3.5 px-3 font-semibold">
              Ngày Tạo
            </th>
            <th scope="col" className="py-3.5 px-6 text-right font-semibold">
              Thao Tác
            </th>
          </tr>
        </thead>
        <tbody
          aria-busy={loading || stale}
          className={`divide-y divide-surface-container-low text-on-surface transition-opacity ${
            loading ? "animate-pulse motion-reduce:animate-none" : ""
          } ${stale ? "opacity-60" : ""}`}
        >
          {loading
            ? Array.from({ length: 6 }, (_, index) => <SkeletonRow key={index} />)
            : users.map((user) => (
                <AccountRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === selfId}
                  busy={busyIds.has(user.id)}
                  {...actions}
                />
              ))}
        </tbody>
      </table>
    </div>
  );
}

interface AccountRowProps extends AccountActions {
  user: SafeUser;
  isSelf: boolean;
  busy: boolean;
}

function AccountRow({ user, isSelf, busy, onOpen, onChangeRole, onToggleLock, onDelete }: AccountRowProps) {
  // A role picked in the select waits for an explicit save: arrow keys on a focused select fire `change`.
  const [draft, setDraft] = useState<Role | null>(null);
  const name = displayName(user);
  const dirty = draft !== null && draft !== user.role;
  const frozen = isSelf || busy;

  const saveRole = () => {
    if (draft && dirty) onChangeRole(user, draft);
    setDraft(null);
  };

  return (
    <tr
      aria-busy={busy}
      className="hover:bg-surface-container-low/60 transition-colors group cursor-pointer"
      onClick={(event) => {
        // Controls of the row do their own thing; anywhere else opens the detail drawer.
        if (!(event.target as HTMLElement).closest("button, select, a, input, label")) onOpen(user);
      }}
    >
      <td className="py-4 px-6">
        <div className="flex items-center gap-3.5">
          <AccountAvatar
            user={user}
            className="w-10 h-10 shrink-0 rounded-2xl font-cad-dimension font-semibold shadow-sm"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-label-ui font-semibold truncate max-w-[160px]">{name}</span>
              {isSelf && (
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed/40 text-primary font-cad-spec-micro text-cad-spec-micro font-medium">
                  Bạn
                </span>
              )}
            </div>
            {user.fullName?.trim() && (
              <span className="font-cad-dimension text-cad-spec-micro text-on-surface-variant truncate max-w-[180px]">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-3">
        <div className="flex items-center gap-1.5">
          <RoleSelect
            variant="badge"
            value={draft ?? user.role}
            onChange={(role) => setDraft(role === user.role ? null : role)}
            disabled={frozen}
            label={`Vai trò của ${name}`}
            title={isSelf ? SELF_EDIT_HINT : undefined}
          />
          {dirty && draft && (
            <>
              <button
                type="button"
                onClick={saveRole}
                aria-label={`Lưu vai trò ${ROLE_LABELS[draft]} cho ${name}`}
                title="Lưu vai trò"
                className="w-7 h-7 rounded-full bg-primary-container text-on-primary hover:bg-primary shadow-sm inline-flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">check</span>
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Huỷ đổi vai trò"
                title="Huỷ"
                className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface inline-flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </>
          )}
        </div>
      </td>
      <td className="py-4 px-3">
        <span className="font-cad-dimension text-cad-dimension font-semibold text-on-surface whitespace-nowrap">
          {TIER_LABELS[user.subscriptionTier]}
        </span>
      </td>
      <td className="py-4 px-3">
        <div className="flex flex-col items-start gap-1.5">
          <ActiveBadge active={user.isActive} />
          <EmailBadge verifiedAt={user.emailVerifiedAt} />
        </div>
      </td>
      <td className="py-4 px-3">
        <span
          className="font-cad-dimension text-cad-dimension text-on-surface-variant whitespace-nowrap"
          title={formatDateTime(user.createdAt)}
        >
          {formatDate(user.createdAt)}
        </span>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-end gap-1.5">
          {busy && (
            <span role="status" className="inline-flex text-primary">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-base animate-spin motion-reduce:animate-none"
              >
                progress_activity
              </span>
              <span className="sr-only">Đang cập nhật {name}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5" title={isSelf ? SELF_EDIT_HINT : undefined}>
            <button
              type="button"
              disabled={frozen}
              onClick={() => onToggleLock(user)}
              aria-label={user.isActive ? `Khoá tài khoản ${name}` : `Mở khoá tài khoản ${name}`}
              title={isSelf ? undefined : user.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
              className={`${ICON_BUTTON} bg-surface-container-low text-on-surface-variant enabled:hover:bg-surface-container enabled:hover:text-on-surface`}
            >
              <span className="material-symbols-outlined text-sm">{user.isActive ? "lock" : "lock_open"}</span>
            </button>
            <button
              type="button"
              disabled={frozen}
              onClick={() => onDelete(user)}
              aria-label={`Xoá tài khoản ${name}`}
              title={isSelf ? undefined : "Xoá tài khoản"}
              className={`${ICON_BUTTON} bg-surface-container-low text-on-surface-variant enabled:hover:bg-error-container enabled:hover:text-on-error-container`}
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
            {isSelf && <span className="sr-only">{SELF_EDIT_HINT}</span>}
          </span>
          <button
            type="button"
            onClick={() => onOpen(user)}
            aria-label={`Xem chi tiết ${name}`}
            title="Xem chi tiết"
            className={`${ICON_BUTTON} bg-surface-container-high group-hover:bg-primary group-hover:text-on-primary text-on-surface`}
          >
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/50 text-secondary font-cad-spec-micro text-cad-spec-micro font-semibold uppercase whitespace-nowrap">
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-secondary" />
      Hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-cad-spec-micro text-cad-spec-micro font-semibold uppercase whitespace-nowrap">
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-error" />
      Đã khoá
    </span>
  );
}

export function EmailBadge({ verifiedAt }: { verifiedAt: string | null }) {
  return verifiedAt ? (
    <span
      title={`Email xác minh lúc ${formatDateTime(verifiedAt)}`}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-cad-dimension text-cad-spec-micro font-semibold whitespace-nowrap"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-xs">
        mark_email_read
      </span>
      <span className="sr-only">Email </span>Đã xác minh
    </span>
  ) : (
    <span
      title="Email chưa được xác minh"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-cad-dimension text-cad-spec-micro whitespace-nowrap"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-xs">
        mail
      </span>
      <span className="sr-only">Email </span>Chưa xác minh
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-surface-container" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-36 rounded-full bg-surface-container" />
            <div className="h-2.5 w-44 rounded-full bg-surface-container-low" />
          </div>
        </div>
      </td>
      <td className="py-4 px-3">
        <div className="h-6 w-28 rounded-full bg-surface-container" />
      </td>
      <td className="py-4 px-3">
        <div className="h-3 w-20 rounded-full bg-surface-container" />
      </td>
      <td className="py-4 px-3">
        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-24 rounded-full bg-surface-container" />
          <div className="h-5 w-32 rounded-full bg-surface-container-low" />
        </div>
      </td>
      <td className="py-4 px-3">
        <div className="h-3 w-20 rounded-full bg-surface-container" />
      </td>
      <td className="py-4 px-6">
        <div className="ml-auto h-8 w-28 rounded-full bg-surface-container" />
      </td>
    </tr>
  );
}
