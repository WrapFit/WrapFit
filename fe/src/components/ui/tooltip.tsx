"use client";

import React, { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/utils/helpers";

export interface TooltipProps {
  /** One short sentence. Never the only place an essential instruction lives. */
  content: React.ReactNode;
  /** The element described: a button, an icon button, a link. It must be focusable. */
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  side?: "top" | "bottom" | "left" | "right";
  /** Wait before showing on hover so moving the pointer across a toolbar does not flash tips. */
  delayMs?: number;
  className?: string;
}

/**
 * Tooltip for icons and short hints: shows on hover and on keyboard focus, hides on Escape, blur or pointer leave.
 * Dark background on any surface (14:1). Replaces `title=""`, which never shows on touch or keyboard.
 */
export function Tooltip({ content, children, side = "top", delayMs = 250, className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = (immediate: boolean) => {
    window.clearTimeout(timer.current);
    if (immediate) setOpen(true);
    else timer.current = window.setTimeout(() => setOpen(true), delayMs);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && hide();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!isValidElement(children)) return children;
  const child = children;
  const trigger = cloneElement(child, {
    "aria-describedby": open ? id : child.props["aria-describedby"],
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      child.props.onMouseEnter?.(event);
      show(false);
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      child.props.onMouseLeave?.(event);
      hide();
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      child.props.onFocus?.(event);
      show(true);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      child.props.onBlur?.(event);
      hide();
    },
  });

  return (
    <span className="relative inline-flex">
      {trigger}
      {open && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute z-[70] w-max max-w-[16rem] animate-fade-in rounded-lg bg-fg px-2.5 py-1.5 text-caption font-medium text-fg-inverse shadow-popover",
            side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
            side === "bottom" && "left-1/2 top-full mt-2 -translate-x-1/2",
            side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
            side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2",
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
