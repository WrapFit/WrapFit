"use client";

import React, { useId, useRef, useState } from "react";
import type { SafeUser } from "@/types/api";
import { displayName } from "./accountFormat";
import { ModalDialog } from "./ModalDialog";
import { useDeleteAccount } from "./useAccounts";
import { Icon } from "@/components/ui";

const PANEL =
  "relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(28,25,23,0.12)] flex flex-col gap-5 max-h-[calc(100dvh-2rem)] overflow-y-auto";
const CANCEL_BUTTON =
  "px-4 py-2.5 min-h-[44px] rounded-xl bg-library-panel hover:bg-library-tile text-library-ink font-medium text-sm transition-all";

interface ConfirmLockDialogProps {
  user: SafeUser;
  onCancel(): void;
  onConfirm(): void;
}

/** Locking signs the user out everywhere: one confirmation first. Focus starts on "Huỷ". */
export function ConfirmLockDialog({ user, onCancel, onConfirm }: ConfirmLockDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <ModalDialog
      variant="center"
      layerClassName="z-[60]"
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocus={cancelRef}
      panelClassName={PANEL}
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-warning-bg/40 text-warning-fg flex items-center justify-center">
          <Icon name="lock" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="font-medium text-lg font-semibold text-library-ink">
            Khoá tài khoản này?
          </h2>
          <p className="font-mono text-cad-spec-micro text-library-sub truncate">{user.email}</p>
        </div>
      </div>
      <div id={descriptionId} className="flex flex-col gap-2 text-sm text-library-sub">
        <p>
          <strong className="font-semibold text-library-ink">{displayName(user)}</strong> sẽ bị đăng xuất khỏi mọi thiết
          bị ngay lập tức và không đăng nhập được cho tới khi bạn mở khoá.
        </p>
        <p>Dự án và tệp của người này vẫn được giữ nguyên.</p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onCancel} className={CANCEL_BUTTON}>
          Huỷ
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-5 py-2.5 min-h-[44px] rounded-xl bg-fpt-orange text-white hover:bg-black font-medium text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Icon name="lock" className="size-[18px]" />
          Khoá tài khoản
        </button>
      </div>
    </ModalDialog>
  );
}

interface ConfirmDeleteDialogProps {
  user: SafeUser;
  onClose(): void;
}

/**
 * Two steps: the admin opened this dialog, then types the account's email to unlock the delete button. Stays open
 * while the request runs and closes once the account is gone; a failure keeps it open with an error toast.
 */
export function ConfirmDeleteDialog({ user, onClose }: ConfirmDeleteDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const remove = useDeleteAccount();
  const confirmed = typed.trim().toLowerCase() === user.email.toLowerCase();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmed || remove.isPending) return;
    remove.mutate(user, { onSuccess: onClose });
  };

  return (
    <ModalDialog
      variant="center"
      layerClassName="z-[60]"
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocus={inputRef}
      panelClassName={PANEL}
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-danger-bg text-danger-fg flex items-center justify-center">
            <Icon name="delete_forever" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="font-medium text-lg font-semibold text-library-ink">
              Xoá vĩnh viễn tài khoản?
            </h2>
            <p className="font-mono text-cad-spec-micro text-library-sub truncate">
              {displayName(user)}
            </p>
          </div>
        </div>

        <div id={descriptionId} className="flex flex-col gap-2 text-sm text-library-sub">
          <p>
            Tài khoản <strong className="font-semibold text-library-ink break-all">{user.email}</strong> sẽ bị xoá cùng{" "}
            <strong className="font-semibold text-danger-fg">toàn bộ dự án, bộ sưu tập và tệp của người này</strong> (ảnh đã
            tải lên, file in đã xuất, mốc phiên bản). Không thể hoàn tác.
          </p>
          <p className="text-sm">
            Ảnh đang được dùng trong bản remix của người khác được giữ lại cho bản remix đó.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="font-medium text-sm text-library-ink">
            Nhập email <span className="font-mono break-all">{user.email}</span> để xác nhận
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="email"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={user.email}
            readOnly={remove.isPending}
            className="w-full px-3.5 py-2.5 rounded-xl bg-library-panel text-library-ink placeholder:text-library-sub/50 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-danger"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className={CANCEL_BUTTON}>
            Huỷ
          </button>
          <button
            type="submit"
            disabled={!confirmed}
            aria-disabled={remove.isPending}
            className="px-5 py-2.5 min-h-[44px] rounded-xl bg-danger text-white enabled:hover:opacity-90 font-medium text-sm shadow-sm enabled:active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed aria-disabled:cursor-wait aria-disabled:opacity-70"
          >
            <Icon name={remove.isPending ? "progress_activity" : "delete_forever"} className={`size-[18px] ${remove.isPending ? "animate-spin motion-reduce:animate-none" : ""}`} />
            {remove.isPending ? "Đang xoá…" : "Xoá vĩnh viễn"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
