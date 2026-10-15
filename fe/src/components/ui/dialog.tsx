"use client";

import { animate } from "animejs";
import { X } from "lucide-react";
import React, { useEffect, useId, useRef } from "react";
import { cn } from "@/utils/helpers";

/**
 * Modal layer shared by every dialog, drawer and confirmation of the app. Mount it only while open. It:
 * - moves focus inside (initialFocus, else the first focusable element) and back to the opener on close;
 * - keeps Tab inside, closes on Escape and on the backdrop (unless `dismissible` is false, e.g. while saving);
 * - locks the page scroll while at least one layer is open (a confirmation can sit on a drawer);
 * - animates in with anime.js, not at all for reduced motion.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openLayers = 0;
let bodyOverflow = "";

export type ModalPlacement =
  /** Card in the middle of the screen. */
  | "center"
  /** Bottom sheet on phones (thumb reach), centred card from sm. */
  | "responsive"
  /** Full-height panel from the right edge. */
  | "sheet-right"
  /** Full-height panel from the left edge (navigation). */
  | "sheet-left";

export interface ModalLayerProps {
  onClose(): void;
  /** Id of the element naming the dialog. */
  labelledBy: string;
  describedBy?: string;
  initialFocus?: React.RefObject<HTMLElement | null>;
  placement?: ModalPlacement;
  /** False while an action runs: Escape and the backdrop do nothing. */
  dismissible?: boolean;
  /** Stacking: a confirmation over a drawer passes a higher z. */
  layerClassName?: string;
  /** Darker backdrop (photos, 3D previews behind). */
  backdropClassName?: string;
  panelClassName?: string;
  children: React.ReactNode;
}

const LAYER: Record<ModalPlacement, string> = {
  center: "flex items-center justify-center p-4",
  responsive: "flex items-end justify-center p-3 sm:items-center sm:p-4",
  "sheet-right": "",
  "sheet-left": "",
};

const PANEL: Record<ModalPlacement, string> = {
  center: "relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto",
  responsive: "relative w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto",
  "sheet-right": "absolute inset-y-0 right-0 flex h-full w-full flex-col",
  "sheet-left": "absolute inset-y-0 left-0 flex h-full w-full flex-col",
};

export function ModalLayer({
  onClose,
  labelledBy,
  describedBy,
  initialFocus,
  placement = "responsive",
  dismissible = true,
  layerClassName = "z-[60]",
  backdropClassName = "bg-fg/30 backdrop-blur-sm",
  panelClassName,
  children,
}: ModalLayerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (initialFocus?.current ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus({ preventScroll: true });

    if (openLayers++ === 0) {
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (placement === "sheet-right" || placement === "sheet-left") {
        animate(panel, { translateX: [placement === "sheet-right" ? "100%" : "-100%", "0%"], duration: 420, ease: "outExpo" });
      } else {
        animate(panel, { opacity: [0, 1], translateY: [placement === "responsive" ? 24 : 0, 0], scale: [0.97, 1], duration: 340, ease: "outBack" });
      }
    }
    return () => {
      if (--openLayers === 0) document.body.style.overflow = bodyOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [initialFocus, placement]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (dismissibleRef.current) closeRef.current();
      return;
    }
    const panel = panelRef.current;
    if (event.key !== "Tab" || !panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) => item.getClientRects().length > 0);
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
    <div className={cn("fixed inset-0", layerClassName, LAYER[placement])} onKeyDown={onKeyDown}>
      <div
        className={cn("absolute inset-0 animate-fade-in", backdropClassName)}
        aria-hidden="true"
        onClick={() => dismissibleRef.current && closeRef.current()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn("outline-none", PANEL[placement], panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}

/** Panel width from sm. `none`: the caller sets it with className. */
const SIZES = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl", none: "" } as const;

function CloseButton({ onClose, disabled }: { onClose(): void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={disabled}
      aria-label="Đóng"
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-fg-muted outline-none transition hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:opacity-40"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}

export interface DialogProps {
  title: React.ReactNode;
  /** One or two lines under the title: what the dialog decides, the formats or limits. */
  description?: React.ReactNode;
  /** Icon in a lime tile left of the title. */
  icon?: React.ReactNode;
  onClose(): void;
  /** Buttons, right-aligned: secondary first, primary last. */
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  /** An action is running: closing is disabled. */
  busy?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
  layerClassName?: string;
  /** Description in monospace (formats, file names). */
  monoDescription?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/** Dialog with title, optional description, content and footer. A bottom sheet on phones, a centred card from sm. */
export function Dialog({ title, description, icon, onClose, footer, size = "md", busy = false, initialFocus, layerClassName, monoDescription, children, className }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <ModalLayer
      onClose={onClose}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      initialFocus={initialFocus}
      dismissible={!busy}
      layerClassName={layerClassName}
      panelClassName={cn(
        "flex flex-col overflow-hidden rounded-sheet border border-line bg-surface-raised shadow-popover sm:max-h-[88vh]",
        SIZES[size],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent-bg text-accent-fg [&_svg]:size-5" aria-hidden>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="font-landing-heading text-title text-fg">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className={cn("mt-0.5 text-caption text-fg-muted", monoDescription && "truncate font-mono")}>
                {description}
              </p>
            )}
          </div>
        </div>
        <CloseButton onClose={onClose} disabled={busy} />
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-sunken/40 px-5 py-3.5 sm:px-6">{footer}</div>}
    </ModalLayer>
  );
}

export interface DrawerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** `right` for details and settings, `left` for navigation. */
  side?: "left" | "right";
  onClose(): void;
  /** Fixed at the bottom: Save & Cancel. */
  footer?: React.ReactNode;
  /** Width from sm; phones get the full width. */
  width?: "sm" | "md" | "lg";
  busy?: boolean;
  layerClassName?: string;
  children: React.ReactNode;
}

const DRAWER_WIDTH = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-xl" } as const;

/** Side panel: full height, header with title and close, scrolling content, fixed footer. Closes on Esc, backdrop, ×. */
export function Drawer({ title, description, side = "right", onClose, footer, width = "md", busy = false, layerClassName, children }: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <ModalLayer
      onClose={onClose}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      placement={side === "right" ? "sheet-right" : "sheet-left"}
      dismissible={!busy}
      layerClassName={layerClassName}
      panelClassName={cn("bg-surface-raised shadow-popover", DRAWER_WIDTH[width])}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className="font-landing-heading text-heading-sm text-fg">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-0.5 text-body-sm text-fg-muted">
              {description}
            </p>
          )}
        </div>
        <CloseButton onClose={onClose} disabled={busy} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-raised px-5 py-4 sm:px-6">{footer}</div>}
    </ModalLayer>
  );
}
