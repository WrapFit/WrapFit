import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import React from "react";
import { ApiError, errorMessage } from "@/services/api";

export type FormAlertTone = "error" | "success" | "info";

const TONES: Record<FormAlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  // Coral marks the problem; the text stays dark ink so it keeps AA contrast on the tinted paper.
  error: {
    box: "border-vibrant-coral/40 bg-vibrant-coral/10 text-stone-800",
    icon: "text-vibrant-coral-dark",
    Icon: AlertTriangle,
  },
  success: {
    box: "border-brand-forest/20 bg-brand-forest/5 text-brand-forest",
    icon: "text-brand-forest",
    Icon: CheckCircle2,
  },
  info: {
    box: "border-vibrant-cobalt/20 bg-vibrant-cobalt/5 text-stone-800",
    icon: "text-vibrant-cobalt-dark",
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
      className={`flex gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-xs leading-relaxed sm:text-[13px] ${box} ${className}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
        {requestId && (
          <p className="mt-1 break-all font-mono text-[10px] uppercase tracking-wider opacity-75">
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
