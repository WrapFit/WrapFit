"use client";

import { animate } from "animejs";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/services/api";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Shown small so the user can quote it when reporting a bug. */
  requestId?: string;
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

const TONES: Record<ToastTone, { icon: typeof Info; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: "bg-landing-green/10 text-landing-green-deep" },
  error: { icon: AlertTriangle, iconClass: "bg-vibrant-coral/15 text-vibrant-coral-dark" },
  info: { icon: Info, iconClass: "bg-vibrant-cobalt/10 text-vibrant-cobalt-dark" },
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Toasts sit at the top on phones and slide down from there; from md up they rise from the bottom corner. */
const slide = (distance: number) => (window.matchMedia("(min-width: 768px)").matches ? distance : -distance);

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
    const durationMs = input.durationMs ?? (tone === "error" ? 8000 : 4500);
    setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), { ...input, id, tone, durationMs }]);
    return id;
  }, []);

  const error = useCallback(
    (cause: unknown, title = "Không thực hiện được") =>
      show({
        tone: "error",
        title,
        description: errorMessage(cause),
        requestId: cause instanceof ApiError ? cause.requestId : undefined,
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
    const timer = window.setTimeout(leave, toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [leave, toast.durationMs]);

  return (
    <div
      ref={ref}
      role={toast.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-stone-200/80 bg-white/90 p-4 pr-2 shadow-[0_4px_20px_-2px_rgba(31,36,33,0.08)] backdrop-blur-md"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-stone-900">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-[13px] leading-snug text-stone-600">{toast.description}</p>}
        {toast.requestId && (
          <p className="mt-1.5 break-all font-mono text-[10px] uppercase tracking-wider text-stone-500">
            Mã lỗi · {toast.requestId}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={leave}
        aria-label="Đóng thông báo"
        className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
