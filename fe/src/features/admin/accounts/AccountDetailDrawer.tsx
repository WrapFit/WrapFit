"use client";

import React, { useId, useState } from "react";
import type { Role, SafeUser } from "@/types/api";
import { AccountAvatar } from "./AccountAvatar";
import { ActiveBadge, EmailBadge, type AccountActions } from "./AccountsTable";
import { displayName, formatDateTime, ROLE_LABELS, SELF_EDIT_HINT, TIER_LABELS } from "./accountFormat";
import { ModalDialog } from "./ModalDialog";
import { RoleSelect } from "./RoleSelect";

interface AccountDetailDrawerProps extends Omit<AccountActions, "onOpen"> {
  user: SafeUser;
  isSelf: boolean;
  busy: boolean;
  onClose(): void;
}

const LABEL = "font-medium text-[11px] text-library-sub uppercase";
const VALUE = "font-mono text-xs font-medium text-library-ink text-right min-w-0 truncate";

/** Side sheet with every field of the account and its admin actions. Mount it with `key={user.id}`. */
export function AccountDetailDrawer({
  user,
  isSelf,
  busy,
  onClose,
  onChangeRole,
  onToggleLock,
  onDelete,
}: AccountDetailDrawerProps) {
  const titleId = useId();
  const roleId = useId();
  const [draft, setDraft] = useState<Role | null>(null);
  const role = draft ?? user.role;
  const dirty = role !== user.role;
  const frozen = isSelf || busy;

  const saveRole = () => {
    if (dirty) onChangeRole(user, role);
    setDraft(null);
  };

  return (
    <ModalDialog
      variant="sheet"
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-[0_4px_24px_rgba(28,25,23,0.12)] p-6 sm:p-8 flex flex-col justify-between gap-6 overflow-y-auto z-10"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-library-line">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-library-accent text-xl">
              manage_accounts
            </span>
            <span className="font-medium text-sm font-semibold text-library-ink">Hồ Sơ Tài Khoản</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            className="w-11 h-11 md:w-8 md:h-8 rounded-full bg-library-panel hover:bg-library-tile flex items-center justify-center text-library-ink transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <AccountAvatar
            user={user}
            className="w-16 h-16 shrink-0 rounded-3xl font-medium font-semibold text-2xl shadow-sm"
          />
          <div className="flex flex-col min-w-0">
            <h2 id={titleId} className="font-medium text-lg font-semibold text-library-ink truncate">
              {displayName(user)}
            </h2>
            <p
              className="font-mono text-[11px] text-library-sub font-medium truncate"
              title={user.id}
            >
              ID · {user.id}
            </p>
            <p className="font-mono text-[11px] text-library-muted truncate">{user.email}</p>
          </div>
        </div>

        <dl className="flex flex-col gap-3 p-4 rounded-2xl bg-library-panel/60">
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Vai trò</dt>
            <dd className={`${VALUE} font-semibold text-library-accent`}>{ROLE_LABELS[user.role]}</dd>
          </div>
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Gói</dt>
            <dd className={VALUE}>{TIER_LABELS[user.subscriptionTier]}</dd>
          </div>
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Trạng thái</dt>
            <dd>
              <ActiveBadge active={user.isActive} />
            </dd>
          </div>
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Email</dt>
            <dd>
              <EmailBadge verifiedAt={user.emailVerifiedAt} />
            </dd>
          </div>
          {user.emailVerifiedAt && (
            <div className="flex justify-between items-center gap-4">
              <dt className={LABEL}>Xác minh lúc</dt>
              <dd className={VALUE}>{formatDateTime(user.emailVerifiedAt)}</dd>
            </div>
          )}
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Cửa hàng</dt>
            <dd className={user.shopName ? VALUE : `${VALUE} text-library-sub italic`}>
              {user.shopName || "Chưa đặt"}
            </dd>
          </div>
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Mã giới thiệu</dt>
            <dd className={user.referralCode ? VALUE : `${VALUE} text-library-sub italic`}>
              {user.referralCode || "Chưa có"}
            </dd>
          </div>
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Ngày tạo</dt>
            <dd className={VALUE}>{formatDateTime(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Cập nhật</dt>
            <dd className={VALUE}>{formatDateTime(user.updatedAt)}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2.5">
          <p className="font-medium text-[11px] uppercase text-library-sub font-semibold tracking-wider">
            Quản Lý Quyền Hạn
          </p>
          {isSelf && (
            <p className="flex items-center gap-2 p-3 rounded-xl bg-library-accent-mist/30 font-medium text-sm text-library-accent">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                info
              </span>
              {SELF_EDIT_HINT}.
            </p>
          )}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-library-panel/40">
            <label htmlFor={roleId} className="font-medium text-sm text-library-ink">
              Vai trò
            </label>
            <RoleSelect
              variant="field"
              id={roleId}
              value={role}
              onChange={(next) => setDraft(next === user.role ? null : next)}
              disabled={frozen}
              title={isSelf ? SELF_EDIT_HINT : undefined}
            />
          </div>
          <div className="flex flex-col gap-2" title={isSelf ? SELF_EDIT_HINT : undefined}>
            <button
              type="button"
              disabled={frozen}
              onClick={() => onToggleLock(user)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-library-panel/40 enabled:hover:bg-library-panel text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-library-accent">
                  {user.isActive ? "lock" : "lock_open"}
                </span>
                <span className="font-medium text-sm text-library-ink">
                  {user.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                </span>
              </span>
              <span className="font-mono text-[11px] text-library-sub font-medium text-right">
                {user.isActive ? "Đăng xuất mọi thiết bị" : "Cho đăng nhập lại"}
              </span>
            </button>
            <button
              type="button"
              disabled={frozen}
              onClick={() => onDelete(user)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-library-panel/40 enabled:hover:bg-red-50/60 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-red-700">
                  delete_forever
                </span>
                <span className="font-medium text-sm text-red-700">Xoá tài khoản</span>
              </span>
              <span className="font-mono text-[11px] text-library-sub font-medium text-right">
                Mất cả dự án và tệp
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-6 border-t border-library-line">
        <button
          type="button"
          onClick={saveRole}
          disabled={!dirty || frozen}
          className="w-full py-3 rounded-2xl bg-library-lime-ink text-white enabled:hover:bg-black font-medium text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span
            aria-hidden="true"
            className={`material-symbols-outlined text-lg ${busy ? "animate-spin motion-reduce:animate-none" : ""}`}
          >
            {busy ? "progress_activity" : "sync_lock"}
          </span>
          <span>{busy ? "Đang cập nhật…" : dirty ? `Đổi thành ${ROLE_LABELS[role]}` : "Cập Nhật Quyền Hạn"}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-library-panel hover:bg-library-tile text-library-ink font-medium text-sm transition-all"
        >
          Đóng Chi Tiết
        </button>
      </div>
    </ModalDialog>
  );
}
