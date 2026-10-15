import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import React from "react";
import { errorMessage } from "@/services/api";

export type FormAlertTone = "error" | "success" | "info";

const TONES: Record<FormAlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  // The text stays dark ink so it keeps AA contrast on the tinted background.
  error: {
    box: "border-danger/30 bg-danger-bg text-landing-ink",
    icon: "text-danger-fg",
    Icon: AlertTriangle,
  },
  success: {
    box: "border-fpt-orange/25 bg-fpt-orange-light text-fg",
    icon: "text-fpt-orange-ink",
    Icon: CheckCircle2,
  },
  info: {
    box: "border-landing-line bg-white text-landing-ink",
    icon: "text-fpt-orange-ink",
    Icon: Info,
  },
};

interface FormAlertProps {
  tone?: FormAlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Message next to a form. Errors are announced at once (`role="alert"`), the rest politely. */
export function FormAlert({ tone = "error", title, children, className = "" }: FormAlertProps) {
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
      </div>
    </div>
  );
}

/** A failed API call: its Vietnamese message (`errorMessage`), without the request id. */
export function ApiErrorAlert({ error, className }: { error: unknown; className?: string }) {
  return (
    <FormAlert tone="error" className={className}>
      {errorMessage(error)}
    </FormAlert>
  );
}
