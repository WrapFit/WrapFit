"use client";

import React from "react";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { useDelayedFlag } from "@/hooks/shared";
import { cn } from "@/utils/helpers";

/**
 * Loading states.
 * - Skeleton: flat sunken shapes in the size of what is coming, with a slow pulse (none for reduced motion).
 * - FadeIn: wrap the real content so it replaces the skeleton with a short fade instead of a jump.
 * - Spinner / LoadingState: for waits with no known layout. They appear only after LOADING_DELAY_MS (300 ms), so
 *   quick answers never flash; long waits (export, AI) can show the mascot.
 */

export function Skeleton({ className, shape = "block" }: { className?: string; shape?: "block" | "text" | "circle" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block animate-pulse bg-surface-sunken motion-reduce:animate-none",
        shape === "block" && "rounded-panel",
        shape === "text" && "h-3.5 rounded-md",
        shape === "circle" && "rounded-full",
        className,
      )}
    />
  );
}

/** A few text lines, the last one shorter. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} shape="text" className={i === lines - 1 ? "w-2/3" : "w-full"} />
      ))}
    </span>
  );
}

/** Fades its content in when it mounts: put it around what replaces a skeleton. */
export function FadeIn({ as: Tag = "div", className, children }: { as?: "div" | "section" | "ul" | "span"; className?: string; children: React.ReactNode }) {
  return <Tag className={cn("animate-fade-in motion-reduce:animate-none", className)}>{children}</Tag>;
}

export function Spinner({ size = "md", className, label }: { size?: "sm" | "md" | "lg"; className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex items-center">
      <span
        aria-hidden
        className={cn(
          "inline-block animate-spin rounded-full border-2 border-surface-sunken border-t-accent motion-reduce:animate-none",
          size === "sm" && "size-4",
          size === "md" && "size-6",
          size === "lg" && "size-9 border-[3px]",
          className,
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export interface LoadingStateProps {
  /** Shown and read: "Đang tải mẫu hộp…". */
  label?: string;
  /** Second line for long waits: "Thường mất khoảng 20 giây". */
  detail?: string;
  /** Mascot instead of the spinner, for long waits (export, AI). */
  mascot?: MascotPose;
  /** Fills the screen height (page loads). */
  fullHeight?: boolean;
  /** Wait before showing; 0 shows at once. */
  delayMs?: number;
  className?: string;
}

export function LoadingState({ label = "Đang tải…", detail, mascot, fullHeight = false, delayMs, className }: LoadingStateProps) {
  const visible = useDelayedFlag(true, delayMs);
  return (
    <div
      role="status"
      aria-live="polite"
      data-app-tokens=""
      className={cn("flex flex-col items-center justify-center gap-3 px-4 py-10 text-center", fullHeight && "min-h-[60vh]", className)}
    >
      {visible ? (
        <>
          {mascot ? <GoiMascot pose={mascot} size={96} showPhotoBadge={false} enableTracking={false} /> : <Spinner size="lg" />}
          <span className="text-label text-fg">{label}</span>
          {detail && <span className="max-w-xs text-caption text-fg-muted">{detail}</span>}
        </>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
