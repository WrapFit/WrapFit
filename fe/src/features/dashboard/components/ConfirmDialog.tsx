"use client";

import React, { useId, useRef } from "react";
import { ModalDialog } from "./ModalDialog";
import { Icon } from "@/components/ui";

/** Workspace dialog: white, black hairline and hard shadow (pacdora.com style). */
export const DIALOG_PANEL =
  "flex max-w-md flex-col gap-5 rounded-2xl border-[1.5px] border-library-ink bg-white p-6 font-landing-heading text-library-text shadow-hard sm:p-8";
export const DIALOG_CANCEL =
  "min-h-[44px] rounded-lg border border-library-ink bg-white px-4 py-2.5 text-sm font-medium text-library-ink transition-colors hover:bg-library-panel focus-visible:ring-[3px] focus-visible:ring-library-ink/20";
export const DIALOG_DANGER =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-danger px-5 py-2.5 text-sm font-medium text-white transition-colors enabled:hover:bg-danger disabled:cursor-wait disabled:opacity-60 focus-visible:ring-[3px] focus-visible:ring-danger/30";

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
            danger ? "bg-danger-bg text-danger-fg" : "bg-library-accent-mist text-library-accent"
          }`}
        >
          <Icon name={icon} className="size-5" />
        </span>
        <h2 id={titleId} className="pt-1.5 text-xl font-medium leading-snug text-library-ink">
          {title}
        </h2>
      </div>
      <div id={descriptionId} className="flex flex-col gap-2 text-sm leading-relaxed text-library-sub">
        {children}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button ref={cancelRef} type="button" onClick={onClose} disabled={busy} className={DIALOG_CANCEL}>
          Huỷ
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={confirmClassName}>
          {busy && (
            <Icon name="progress_activity" className="size-[18px] animate-spin motion-reduce:animate-none" />
          )}
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </ModalDialog>
  );
}
