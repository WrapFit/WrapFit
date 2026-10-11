"use client";

import { animate } from "animejs";
import React, { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs; the page scrolls again when the last one closes. */
let openDialogs = 0;
let bodyOverflow = "";

interface ModalDialogProps {
  onClose(): void;
  /** Id of the element naming the dialog. */
  labelledBy: string;
  describedBy?: string;
  /** Focused on open; the first focusable element of the panel otherwise. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  panelClassName: string;
  children: React.ReactNode;
}

/**
 * Centred modal, mounted only while open (pattern of `features/admin/accounts/ModalDialog`): Escape and the backdrop
 * close it, Tab stays inside, focus goes back to the element that opened it. Rendered inside the screen's
 * `[data-stitch]` root, so its colour tokens apply; the backdrop uses plain Tailwind colours that every screen has.
 * On phones it sits at the bottom, in reach of the thumb.
 */
export function ModalDialog({
  onClose,
  labelledBy,
  describedBy,
  initialFocus,
  panelClassName,
  children,
}: ModalDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (initialFocus?.current ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus({ preventScroll: true });

    if (openDialogs++ === 0) {
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animate(panel, { opacity: [0, 1], translateY: [24, 0], scale: [0.97, 1], duration: 380, ease: "outBack" });
    }
    return () => {
      if (--openDialogs === 0) document.body.style.overflow = bodyOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [initialFocus]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    const panel = panelRef.current;
    if (event.key !== "Tab" || !panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (item) => item.getClientRects().length > 0,
    );
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4"
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative outline-none w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
