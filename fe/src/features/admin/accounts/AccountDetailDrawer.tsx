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

const LABEL = "font-label-ui text-cad-spec-micro text-on-surface-variant uppercase";
const VALUE = "font-cad-dimension text-cad-dimension font-medium text-on-surface text-right min-w-0 truncate";

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
      panelClassName="absolute right-0 top-0 h-full w-full max-w-md bg-surface-container-lowest shadow-[0_4px_24px_rgba(28,25,23,0.12)] p-6 sm:p-8 flex flex-col justify-between gap-6 overflow-y-auto z-10"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">
              manage_accounts
            </span>
            <span className="font-label-ui text-body-sm font-semibold text-on-surface">Hồ Sơ Tài Khoản</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            className="w-11 h-11 md:w-8 md:h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <AccountAvatar
            user={user}
            className="w-16 h-16 shrink-0 rounded-3xl font-headline-md font-semibold text-2xl shadow-sm"
          />
          <div className="flex flex-col min-w-0">
            <h2 id={titleId} className="font-headline-sm text-headline-sm font-semibold text-on-surface truncate">
              {displayName(user)}
            </h2>
            <p
              className="font-cad-dimension text-cad-spec-micro text-on-surface-variant font-medium truncate"
              title={user.id}
            >
              ID · {user.id}
            </p>
            <p className="font-cad-dimension text-cad-spec-micro text-outline truncate">{user.email}</p>
          </div>
        </div>

        <dl className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-container-low/60">
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Vai trò</dt>
            <dd className={`${VALUE} font-semibold text-primary`}>{ROLE_LABELS[user.role]}</dd>
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
            <dd className={user.shopName ? VALUE : `${VALUE} text-on-surface-variant italic`}>
              {user.shopName || "Chưa đặt"}
            </dd>
          </div>
          <div className="flex justify-between items-center gap-4">
            <dt className={LABEL}>Mã giới thiệu</dt>
            <dd className={user.referralCode ? VALUE : `${VALUE} text-on-surface-variant italic`}>
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
          <p className="font-label-ui text-cad-spec-micro uppercase text-on-surface-variant font-semibold tracking-wider">
            Quản Lý Quyền Hạn
          </p>
          {isSelf && (
            <p className="flex items-center gap-2 p-3 rounded-xl bg-primary-fixed/30 font-label-ui text-body-sm text-primary">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                info
              </span>
              {SELF_EDIT_HINT}.
            </p>
          )}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low/40">
            <label htmlFor={roleId} className="font-label-ui text-body-sm text-on-surface">
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
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low/40 enabled:hover:bg-surface-container-low text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-secondary">
                  {user.isActive ? "lock" : "lock_open"}
                </span>
                <span className="font-label-ui text-body-sm text-on-surface">
                  {user.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                </span>
              </span>
              <span className="font-cad-spec-micro text-cad-spec-micro text-on-surface-variant font-medium text-right">
                {user.isActive ? "Đăng xuất mọi thiết bị" : "Cho đăng nhập lại"}
              </span>
            </button>
            <button
              type="button"
              disabled={frozen}
              onClick={() => onDelete(user)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low/40 enabled:hover:bg-error-container/60 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-base text-error">
                  delete_forever
                </span>
                <span className="font-label-ui text-body-sm text-error">Xoá tài khoản</span>
              </span>
              <span className="font-cad-spec-micro text-cad-spec-micro text-on-surface-variant font-medium text-right">
                Mất cả dự án và tệp
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-6 border-t border-surface-container-low">
        <button
          type="button"
          onClick={saveRole}
          disabled={!dirty || frozen}
          className="w-full py-3 rounded-2xl bg-primary-container text-on-primary enabled:hover:bg-primary font-label-ui text-label-ui font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full py-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-all"
        >
          Đóng Chi Tiết
        </button>
      </div>
    </ModalDialog>
  );
}
