import { AlertTriangle } from "lucide-react";
import React from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { ApiError, errorMessage } from "@/services/api";

/**
 * The views below carry `data-app-tokens` (see features/stitch/tailwindStitch.ts): inside a Stitch screen they keep the
 * app's colours and fonts.
 */
const CARD =
  "mx-auto w-full max-w-md rounded-3xl border border-stone-200/80 bg-white/80 p-8 text-center shadow-[0_4px_20px_-2px_rgba(31,36,33,0.08)] backdrop-blur-md";

export const PRIMARY_BUTTON =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-brand-forest px-6 text-sm font-semibold text-white transition hover:bg-brand-forest-dark active:scale-95";

interface ErrorStateProps {
  /** The failure: its Vietnamese message and request id are shown. */
  error?: unknown;
  title?: string;
  /** Replaces the message derived from `error`. */
  description?: string;
  onRetry?: () => void;
  /** A retry is running: the button waits. */
  retrying?: boolean;
  /** Extra actions under the message (e.g. a link back home). */
  action?: React.ReactNode;
  className?: string;
}

/** A page or section that could not load. Never hides the error behind demo data. */
export function ErrorState({
  error,
  title = "Không tải được dữ liệu",
  description,
  onRetry,
  retrying = false,
  action,
  className = "",
}: ErrorStateProps) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div role="alert" data-app-tokens="" className={`${CARD} ${className}`}>
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant-coral/15 text-vibrant-coral-dark">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="font-serif text-2xl tracking-tight text-stone-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description ?? errorMessage(error)}</p>
      {requestId && (
        <p className="mt-3 break-all font-mono text-[10px] uppercase tracking-wider text-stone-500">Mã lỗi · {requestId}</p>
      )}
      {(onRetry || action) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className={`${PRIMARY_BUTTON} disabled:cursor-wait disabled:opacity-60`}
            >
              {retrying ? "Đang thử lại…" : "Thử lại"}
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Nothing to show yet: Gói is chilling. */
export function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div data-app-tokens="" className={`${CARD} ${className}`}>
      <div className="mb-3 flex justify-center">
        <GoiMascot pose="chilling" size={88} showPhotoBadge={false} enableTracking={false} />
      </div>
      <h2 className="font-serif text-2xl tracking-tight text-stone-900">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}

/** Full-height placeholder while a page waits for data or for the session check. */
export function PageLoader({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div role="status" data-app-tokens="" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-brand-forest motion-reduce:animate-none" />
      <span className="font-mono text-xs uppercase tracking-wider text-stone-500">{label}</span>
    </div>
  );
}
