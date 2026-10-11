"use client";

import React, { useId, useRef } from "react";
import { ModalDialog } from "./ModalDialog";

export const DIALOG_PANEL =
  "max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(28,25,23,0.12)] flex flex-col gap-5";
export const DIALOG_CANCEL =
  "px-4 py-2.5 min-h-[44px] rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-stone-400";
/** Stitch's `error` colour (#BA1A1A), spelled out: some screens leave the `error` token unset. */
export const DIALOG_DANGER =
  "px-5 py-2.5 min-h-[44px] rounded-xl bg-[#ba1a1a] text-white enabled:hover:bg-[#93000a] text-sm font-semibold shadow-sm enabled:active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-[#ba1a1a]/40";

interface ConfirmDialogProps {
  title: string;
  /** Material Symbols name of the icon beside the title. */
  icon: string;
  children: React.ReactNode;
  confirmLabel: string;
  busyLabel: string;
  busy?: boolean;
  /** Class of the confirm button; destructive by default. */
  confirmClassName?: string;
  onConfirm(): void;
  onClose(): void;
}

/**
 * Confirmation of an action that cannot be undone. Focus starts on "Huỷ"; the dialog stays open while the request runs
 * (the caller closes it on success) so a failure can be retried.
 */
export function ConfirmDialog({
  title,
  icon,
  children,
  confirmLabel,
  busyLabel,
  busy = false,
  confirmClassName = DIALOG_DANGER,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = confirmClassName === DIALOG_DANGER;

  return (
    <ModalDialog
      onClose={busy ? () => undefined : onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocus={cancelRef}
      panelClassName={DIALOG_PANEL}
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${
            danger ? "bg-[#ffdad6] text-[#93000a]" : "bg-stone-100 text-stone-700"
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">
            {icon}
          </span>
        </span>
        <h2 id={titleId} className="pt-1.5 font-['Playfair_Display'] text-xl font-semibold text-stone-900 leading-snug">
          {title}
        </h2>
      </div>
      <div id={descriptionId} className="flex flex-col gap-2 text-sm leading-relaxed text-stone-600">
        {children}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onClose} disabled={busy} className={DIALOG_CANCEL}>
          Huỷ
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={confirmClassName}>
          {busy && (
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-lg animate-spin motion-reduce:animate-none"
            >
              progress_activity
            </span>
          )}
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </ModalDialog>
  );
}
