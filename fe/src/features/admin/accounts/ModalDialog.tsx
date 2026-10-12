"use client";

import { animate } from "animejs";
import React, { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs; the page scrolls again when the last one closes (a confirmation can sit on top of the drawer). */
let openDialogs = 0;
let bodyOverflow = "";

interface ModalDialogProps {
  onClose(): void;
  /** Id of the element naming the dialog. */
  labelledBy: string;
  describedBy?: string;
  /** Focused on open; the first focusable element of the panel otherwise. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** "sheet" slides in from the right edge, "center" is a card in the middle of the screen. */
  variant: "sheet" | "center";
  /** Stacking class of the layer: a confirmation goes above the drawer. */
  layerClassName?: string;
  panelClassName: string;
  children: React.ReactNode;
}

/**
 * Modal layer, mounted only while open: Escape and the backdrop close it, Tab stays inside, and focus goes back to the
 * element that opened it. Rendered inside the `[data-stitch]` root so the screen's colour tokens apply.
 */
export function ModalDialog({
  onClose,
  labelledBy,
  describedBy,
  initialFocus,
  variant,
  layerClassName = "z-50",
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
      animate(
        panel,
        variant === "sheet"
          ? { translateX: ["100%", "0%"], duration: 420, ease: "outExpo" }
          : { opacity: [0, 1], scale: [0.96, 1], duration: 320, ease: "outBack" },
      );
    }
    return () => {
      if (--openDialogs === 0) document.body.style.overflow = bodyOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [initialFocus, variant]);

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
      className={`fixed inset-0 ${layerClassName} ${variant === "center" ? "flex items-center justify-center p-4" : ""}`}
      onKeyDown={onKeyDown}
    >
      <div className="absolute inset-0 bg-inverse-surface/20 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
