"use client";

import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X, type LucideIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { Tone } from "@/assets/styles/tokens";
import { cn } from "@/utils/helpers";

/**
 * Alert (inline, next to what it is about) and Banner (full width, top of a page or section).
 *
 * Copy: say what happened and what to do ("Không lưu được thiết kế. Kiểm tra mạng rồi bấm Thử lại."), never just
 * "Lỗi". The icon repeats the tone for colour-blind readers. Placement: inline under the field or at the top of the
 * form it concerns; several alerts stack newest first, errors before warnings before the rest.
 */

const ICONS: Record<Tone, LucideIcon> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
};

const SURFACE: Record<Tone, string> = {
  neutral: "border-line bg-surface-raised text-fg",
  info: "border-info/25 bg-info-bg text-info-fg",
  success: "border-success/25 bg-success-bg text-success-fg",
  warning: "border-warning/30 bg-warning-bg text-warning-fg",
  danger: "border-danger/25 bg-danger-bg text-danger-fg",
};

const ICON_COLOR: Record<Tone, string> = {
  neutral: "text-fg-muted",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export interface AlertProps {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Replaces the tone's icon. */
  icon?: LucideIcon;
  /** The most useful next step: a Button, a ButtonLink. */
  action?: React.ReactNode;
  /** Shows a close button. Use for information the reader can put away, not for errors that still apply. */
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ tone = "info", title, children, icon, action, onDismiss, className }: AlertProps) {
  const Icon = icon ?? ICONS[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-panel border p-4", SURFACE[tone], className)}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", ICON_COLOR[tone])} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="text-body-sm font-semibold">{title}</p>}
        {children && <div className="text-body-sm [&_a]:font-semibold [&_a]:underline">{children}</div>}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-full opacity-80 outline-none transition hover:bg-fg/5 hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-focus/40"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export interface BannerProps {
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /**
   * Remember the dismissal on this device under this key. Only neutral, info and success banners can be closed:
   * warnings and errors stay until the problem is fixed.
   */
  dismissKey?: string;
  className?: string;
}

/**
 * Page-wide message: maintenance, sample data, email not verified, a new feature. Sits at the top of the page
 * content (under the header), one at a time.
 */
export function Banner({ tone = "info", title, description, action, dismissKey, className }: BannerProps) {
  const dismissible = Boolean(dismissKey) && (tone === "neutral" || tone === "info" || tone === "success");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!dismissible || !dismissKey) return;
    try {
      setHidden(localStorage.getItem(`wrapfit:banner:${dismissKey}`) === "1");
    } catch {
      // Storage blocked: the banner shows.
    }
  }, [dismissible, dismissKey]);

  if (hidden) return null;
  const Icon = ICONS[tone];
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(`wrapfit:banner:${dismissKey}`, "1");
    } catch {
      // Hidden for this visit only.
    }
  };

  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex flex-col gap-3 rounded-3xl border px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5", SURFACE[tone], className)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", ICON_COLOR[tone])} aria-hidden />
        <div className="min-w-0">
          <p className="text-body-sm font-semibold">{title}</p>
          {description && <p className="mt-0.5 text-body-sm opacity-90">{description}</p>}
        </div>
      </div>
      {(action || dismissible) && (
        <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
          {action}
          {dismissible && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Ẩn thông báo này"
              className="flex size-10 items-center justify-center rounded-full outline-none transition hover:bg-fg/5 focus-visible:ring-[3px] focus-visible:ring-focus/40"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
