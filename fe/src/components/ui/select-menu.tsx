"use client";

import { Check, ChevronDown } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/utils/helpers";
import { INPUT_BASE, INPUT_SIZES } from "./field-styles";

export interface SelectMenuOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A select whose list drops down with a short animation (the native <select> list cannot be styled): a button that
 * shows the choice, a listbox under it. ↑/↓ move, Enter or Space picks, Escape and a click outside close.
 */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: SelectMenuOption<T>[];
  onChange(value: T): void;
  /** Names the control for screen readers. */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };
  const pick = (option: SelectMenuOption<T>) => {
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(options[active]);
    } else if (event.key === "Tab") setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current?.label ?? ""}`}
        onClick={() => (open ? setOpen(false) : openList())}
        className={cn(INPUT_BASE, INPUT_SIZES.md, "flex items-center justify-between gap-2 text-left")}
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-fg-muted transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${active}`}
          className="absolute inset-x-0 top-full z-40 mt-1.5 origin-top animate-pop-in overflow-hidden rounded-panel border border-line bg-surface-raised p-1 shadow-popover"
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(index)}
                onClick={() => pick(option)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-body-sm transition-colors",
                  index === active ? "bg-surface-sunken text-fg" : "text-fg",
                  selected && "font-semibold",
                )}
              >
                {option.label}
                {selected && <Check className="size-4 shrink-0" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
