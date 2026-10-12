"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface StudioDialogProps {
  title: string;
  /** Small line under the title (e.g. formats, limits). */
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  /** While true, Escape and the close button do nothing (e.g. during a restore). */
  busy?: boolean;
  /** Tailwind max-width of the panel. */
  widthClass?: string;
  children: React.ReactNode;
}

/**
 * Modal of the studio (export, snapshots, sharing, QR): a bottom sheet on phones, a centred card from `sm`.
 * Escape and the backdrop close it; focus moves into it on open and back to the opener on close.
 */
export function StudioDialog({
  title,
  subtitle,
  icon,
  onClose,
  busy = false,
  widthClass = "max-w-md",
  children,
}: StudioDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4 animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white w-full ${widthClass} max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-tactile-lg focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 flex-shrink-0 rounded-2xl bg-blue-50 text-vibrant-cobalt flex items-center justify-center">
              {icon}
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-serif font-bold text-stone-900 text-base leading-snug">
                {title}
              </h2>
              {subtitle && (
                <span title={subtitle} className="text-[11px] text-stone-500 font-mono block truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="w-10 h-10 flex-shrink-0 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-700 transition disabled:opacity-40"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-5">{children}</div>
      </div>
    </div>
  );
}
