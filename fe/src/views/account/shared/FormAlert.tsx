import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import React from "react";
import { ApiError, errorMessage } from "@/services/api";

export type FormAlertTone = "error" | "success" | "info";

const TONES: Record<FormAlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  // The text stays dark ink so it keeps AA contrast on the tinted background.
  error: {
    box: "border-red-200 bg-red-50 text-landing-ink",
    icon: "text-red-600",
    Icon: AlertTriangle,
  },
  success: {
    box: "border-landing-green/25 bg-landing-lime-mist text-landing-green-night",
    icon: "text-landing-green",
    Icon: CheckCircle2,
  },
  info: {
    box: "border-landing-line bg-white text-landing-ink",
    icon: "text-landing-green",
    Icon: Info,
  },
};

interface FormAlertProps {
  tone?: FormAlertTone;
  title?: string;
  children?: React.ReactNode;
  /** Shown small so the user can quote it when reporting a bug. */
  requestId?: string;
  className?: string;
}

/** Message next to a form. Errors are announced at once (`role="alert"`), the rest politely. */
export function FormAlert({ tone = "error", title, children, requestId, className = "" }: FormAlertProps) {
  const { box, icon, Icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-2.5 rounded-xl border px-4 py-3 text-left text-sm leading-6 ${box} ${className}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
        {requestId && (
          <p className="mt-1 break-all font-mono text-[11px] opacity-75">
            Mã lỗi · {requestId}
          </p>
        )}
      </div>
    </div>
  );
}

/** A failed API call: its Vietnamese message (`errorMessage`) and request id. */
export function ApiErrorAlert({ error, className }: { error: unknown; className?: string }) {
  return (
    <FormAlert tone="error" requestId={error instanceof ApiError ? error.requestId : undefined} className={className}>
      {errorMessage(error)}
    </FormAlert>
  );
}
