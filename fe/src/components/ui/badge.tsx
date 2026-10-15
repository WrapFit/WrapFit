import React from "react";
import type { Tone } from "@/assets/styles/tokens";
import { cn } from "@/utils/helpers";

/** Background + text of each tone; every pair reaches 4.5:1 for 12 px text. */
export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-fg-muted",
  info: "bg-info-bg text-info-fg",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
};

export const TONE_SOLID: Record<Tone, string> = {
  neutral: "bg-fg text-fg-inverse",
  info: "bg-info-solid text-white",
  success: "bg-success-solid text-white",
  warning: "bg-warning-solid text-white",
  danger: "bg-danger-solid text-white",
};

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-fg-muted",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export interface BadgeProps {
  tone?: Tone;
  /** `soft` tinted (default), `solid` filled, `outline` white with a ring. */
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  /** Small coloured dot before the text. */
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Status label: "Đã xuất", "Bản nháp", "Dữ liệu mẫu"… */
export function Badge({ tone = "neutral", variant = "soft", size = "md", dot = false, icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold [&_svg]:size-3.5",
        size === "sm" ? "h-5 px-2 text-label-sm" : "h-6 px-2.5 text-label-sm",
        variant === "soft" && TONE_SOFT[tone],
        variant === "solid" && TONE_SOLID[tone],
        variant === "outline" && "bg-surface-raised text-fg ring-1 ring-inset ring-line",
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", variant === "solid" ? "bg-current" : TONE_DOT[tone])} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}

/**
 * A number or a dot pinned to the top-right corner of its child (icon button, avatar): unread notifications, items in
 * the cart. `count` above `max` shows "max+"; 0 hides the badge.
 */
export function CountBadge({
  count,
  max = 99,
  dot = false,
  tone = "danger",
  label,
  children,
  className,
}: {
  count?: number;
  max?: number;
  /** Only a dot, no number. */
  dot?: boolean;
  tone?: Tone;
  /** Read by screen readers, e.g. "3 thông báo chưa đọc". */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const visible = dot || (count ?? 0) > 0;
  return (
    <span className={cn("relative inline-flex", className)}>
      {children}
      {visible && (
        <span
          className={cn(
            "pointer-events-none absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full font-bold ring-2 ring-surface-raised",
            dot ? "size-2.5" : "h-[18px] min-w-[18px] px-1 text-caption leading-none",
            TONE_SOLID[tone],
          )}
        >
          {!dot && ((count ?? 0) > max ? `${max}+` : count)}
        </span>
      )}
      <span className="sr-only">{visible ? label : ""}</span>
    </span>
  );
}
