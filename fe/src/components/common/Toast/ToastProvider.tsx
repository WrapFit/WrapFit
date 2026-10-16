"use client";

import { animate } from "animejs";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from "lucide-react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mediaUp } from "@/assets/styles/tokens";
import { errorMessage } from "@/services/api";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  tone: ToastTone;
  durationMs: number;
}

export interface ToastApi {
  show(toast: ToastInput): number;
  /** Toast of a failed call: Vietnamese message of the API error and its request id. */
  error(error: unknown, title?: string): number;
  dismiss(id: number): void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** At most this many toasts at once: a new one pushes the oldest out. */
const MAX_TOASTS = 4;

/** Feedback tokens shared with Alert and Badge (assets/styles/tokens.ts). */
const TONES: Record<ToastTone, { icon: typeof Info; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: "bg-success-bg text-success-fg" },
  error: { icon: OctagonAlert, iconClass: "bg-danger-bg text-danger-fg" },
  warning: { icon: AlertTriangle, iconClass: "bg-warning-bg text-warning-fg" },
  info: { icon: Info, iconClass: "bg-info-bg text-info-fg" },
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Toasts sit at the top on phones and slide down from there; from md up they rise from the bottom corner. */
const slide = (distance: number) => (window.matchMedia(mediaUp("md")).matches ? distance : -distance);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    const tone = input.tone ?? "info";
    // Long enough to read (≈ 4.5 s), longer for problems the reader may need to act on.
    const durationMs = input.durationMs ?? (tone === "error" ? 8000 : tone === "warning" ? 6500 : 4500);
    setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), { ...input, id, tone, durationMs }]);
    return id;
  }, []);

  const error = useCallback(
    (cause: unknown, title = "Không thực hiện được") =>
      show({
        tone: "error",
        title,
        description: errorMessage(cause),
      }),
    [show],
  );

  const api = useMemo<ToastApi>(() => ({ show, error, dismiss }), [show, error, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Phones: under the header, so a toast never covers the buttons of a bottom sheet or the bottom navigation.
          Bottom-right corner from md up. */}
      <div className="pointer-events-none fixed inset-x-4 top-20 z-[100] flex flex-col gap-2 md:inset-x-auto md:top-auto md:bottom-6 md:right-6 md:w-[380px]">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const { icon: Icon, iconClass } = TONES[toast.tone];

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    if (!ref.current || reducedMotion()) return onDismiss(toast.id);
    animate(ref.current, {
      opacity: [1, 0],
      translateY: [0, slide(12)],
      duration: 180,
      ease: "inQuad",
      onComplete: () => onDismiss(toast.id),
    });
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (ref.current && !reducedMotion()) {
      animate(ref.current, { opacity: [0, 1], translateY: [slide(16), 0], scale: [0.96, 1], duration: 420, ease: "outBack" });
    }
  }, []);

  // The countdown pauses while the pointer is over the toast or focus is inside it, so it never vanishes mid-read.
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.durationMs);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(leave, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(1200, remaining.current - (Date.now() - started));
    };
  }, [leave, paused]);

  return (
    <div
      ref={ref}
      role={toast.tone === "error" || toast.tone === "warning" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line/80 bg-white/90 p-4 pr-2 shadow-[0_4px_20px_-2px_rgba(31,36,33,0.08)] backdrop-blur-md"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-body-sm font-semibold text-fg">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-body-sm leading-snug text-fg-muted">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={leave}
        aria-label="Đóng thông báo"
        className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-muted outline-none transition hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
