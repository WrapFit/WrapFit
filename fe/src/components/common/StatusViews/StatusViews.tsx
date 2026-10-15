import { AlertTriangle } from "lucide-react";
import React from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { buttonClass } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/feedback";
import { ApiError, errorMessage } from "@/services/api";

/**
 * The views below carry `data-app-tokens` (see features/stitch/tailwindStitch.ts): inside a Stitch screen they keep the
 * app's colours and fonts.
 */
const CARD =
  "mx-auto w-full max-w-md rounded-sheet border border-line bg-surface-raised p-8 text-center font-landing-body";

/** Lime main action (shared Button, lg = 44 px). */
export const PRIMARY_BUTTON = buttonClass({ variant: "primary", size: "lg", className: "text-label" });

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
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-bg text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="font-landing-heading text-heading-md text-fg">{title}</h2>
      <p className="mt-2 text-body-sm text-fg-muted">{description ?? errorMessage(error)}</p>
      {requestId && <p className="mt-3 break-all font-mono text-cad-spec-micro uppercase tracking-wider text-fg-muted">Mã lỗi · {requestId}</p>}
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
      <h2 className="font-landing-heading text-heading-md text-fg">{title}</h2>
      {description && <p className="mt-2 text-body-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}

/**
 * Full-height placeholder while a page waits for data or for the session check: the shared LoadingState, which
 * appears only after 300 ms so fast pages never flash it.
 */
export function PageLoader({ label = "Đang tải…" }: { label?: string }) {
  return <LoadingState label={label} fullHeight />;
}
