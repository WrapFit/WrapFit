"use client";

import React, { useEffect, useId, useRef, useState } from "react";

export interface MenuAction {
  id: string;
  label: string;
  /** Material Symbols name. */
  icon: string;
  tone?: "danger";
  onSelect(): void;
}

interface ProjectActionsMenuProps {
  /** Names the project in the trigger's label. */
  projectTitle: string;
  actions: MenuAction[];
  disabled?: boolean;
  className: string;
}

/**
 * "More" menu of a project card (menu button pattern): arrows move between items, Escape closes and returns focus,
 * a click outside or Tab closes it. Opens upward, inside the card, so it never runs off the bottom of the grid.
 * Uses the `dashboard-projects` screen tokens.
 */
export function ProjectActionsMenu({ projectTitle, actions, disabled = false, className }: ProjectActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Thao tác khác với “${projectTitle}”`}
        title="Thao tác khác"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={className}
      >
        <span
          aria-hidden="true"
          className={`material-symbols-outlined text-base ${disabled ? "animate-spin motion-reduce:animate-none" : ""}`}
        >
          {disabled ? "progress_activity" : "more_horiz"}
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Thao tác với “${projectTitle}”`}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 bottom-full mb-2 z-30 w-60 max-w-[calc(100vw-2rem)] p-1.5 rounded-xl bg-surface-container-lowest shadow-[0_12px_32px_-6px_rgba(28,25,23,0.18)] ring-1 ring-black/5 flex flex-col"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close(true);
                action.onSelect();
              }}
              className={`min-h-[44px] px-3 rounded-lg flex items-center gap-2.5 text-left font-label-ui text-label-ui transition-colors focus:outline-none focus-visible:bg-surface-container-low hover:bg-surface-container-low ${
                action.tone === "danger" ? "text-error" : "text-on-surface"
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
