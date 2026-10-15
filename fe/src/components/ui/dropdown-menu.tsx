"use client";

import { Check, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/utils/helpers";

/**
 * Dropdown menu (WAI-ARIA menu button). Trigger: any button you render with `renderTrigger`. Items: label, optional
 * leading icon, optional shortcut on the right, `danger` styling for actions that cannot be undone, `disabled`
 * (visible, skipped by the keyboard), separators, group labels and one level of submenu.
 *
 * Keyboard: ↓/↑ move, Home/End jump, → opens a submenu and ← closes it, Enter/Space choose, Escape closes and returns
 * focus to the trigger, Tab closes. The menu opens below the trigger and flips above (or to the other side) when it
 * would leave the viewport.
 */

export type MenuEntry =
  | {
      type?: "item";
      id: string;
      label: React.ReactNode;
      icon?: React.ReactNode;
      /** Shown right-aligned, e.g. "Ctrl+D". */
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      /** Shows a check (toggle items). */
      checked?: boolean;
      onSelect?: () => void;
      /** Opens a submenu instead of selecting. */
      children?: MenuEntry[];
    }
  | { type: "separator"; id: string }
  | { type: "label"; id: string; label: React.ReactNode };

export interface DropdownMenuProps {
  /** Names the menu for screen readers. */
  label: string;
  items: MenuEntry[];
  /** Render the trigger; spread `props` on the button. */
  renderTrigger(props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick(): void;
    onKeyDown(event: React.KeyboardEvent): void;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls"?: string;
  }): React.ReactNode;
  align?: "start" | "end";
  /** Width of the menu panel. */
  widthClassName?: string;
  className?: string;
}

const ITEM =
  "flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body-sm outline-none transition-colors focus-visible:bg-surface-sunken hover:bg-surface-sunken aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent [&_svg]:size-4 [&_svg]:shrink-0";

function MenuPanel({
  items,
  label,
  id,
  anchor,
  side,
  onClose,
  onCloseSubmenu,
  widthClassName,
}: {
  items: MenuEntry[];
  label: string;
  id: string;
  anchor: HTMLElement | null;
  side: "below" | "right";
  onClose(refocus: boolean): void;
  onCloseSubmenu?: () => void;
  widthClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ flipY: boolean; flipX: boolean }>({ flipY: false, flipX: false });
  const [submenu, setSubmenu] = useState<string | null>(null);
  const subAnchors = useRef<Record<string, HTMLButtonElement | null>>({});

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    setPlacement({ flipY: rect.bottom > window.innerHeight - 8, flipX: rect.right > window.innerWidth - 8 || rect.left < 8 });
  }, [anchor]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Keys pressed inside a submenu belong to that submenu.
    if (!(event.target instanceof HTMLElement) || event.target.closest('[role="menu"]') !== ref.current) return;
    const enabled = Array.from(ref.current?.querySelectorAll<HTMLElement>(':scope > div > [role^="menuitem"]:not([aria-disabled="true"])') ?? []);
    const index = enabled.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => enabled[(next + enabled.length) % enabled.length]?.focus();
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
        focusAt(enabled.length - 1);
        break;
      case "ArrowLeft":
        if (onCloseSubmenu) {
          event.preventDefault();
          event.stopPropagation();
          onCloseSubmenu();
        }
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        if (onCloseSubmenu) onCloseSubmenu();
        else onClose(true);
        break;
      case "Tab":
        onClose(false);
        break;
    }
  };

  const position =
    side === "below"
      ? cn(placement.flipY ? "bottom-full mb-2" : "top-full mt-2", placement.flipX ? "left-0" : "right-0")
      : cn("-top-1.5", placement.flipX ? "right-full mr-1" : "left-full ml-1");

  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "absolute z-50 flex max-w-[calc(100vw-2rem)] animate-pop-in flex-col rounded-panel border border-line bg-surface-raised p-1.5 text-fg shadow-popover",
        widthClassName ?? "w-60",
        position,
      )}
    >
      {items.map((entry) => {
        if (entry.type === "separator") return <div key={entry.id} role="separator" className="my-1 h-px bg-line" />;
        if (entry.type === "label")
          return (
            <div key={entry.id} role="presentation" className="px-2.5 pb-1 pt-2 text-overline uppercase text-fg-muted">
              {entry.label}
            </div>
          );
        const hasChildren = Boolean(entry.children?.length);
        const role = entry.checked !== undefined ? "menuitemcheckbox" : "menuitem";
        return (
          <div key={entry.id} className="relative" role="none">
            <button
              ref={(node) => {
                subAnchors.current[entry.id] = node;
              }}
              type="button"
              role={role}
              tabIndex={-1}
              aria-disabled={entry.disabled || undefined}
              aria-checked={entry.checked}
              aria-haspopup={hasChildren ? "menu" : undefined}
              aria-expanded={hasChildren ? submenu === entry.id : undefined}
              onClick={() => {
                if (entry.disabled) return;
                if (hasChildren) {
                  setSubmenu((open) => (open === entry.id ? null : entry.id));
                  return;
                }
                onClose(true);
                entry.onSelect?.();
              }}
              onKeyDown={(event) => {
                if (hasChildren && event.key === "ArrowRight" && !entry.disabled) {
                  event.preventDefault();
                  event.stopPropagation();
                  setSubmenu(entry.id);
                }
              }}
              className={cn(ITEM, entry.danger ? "text-danger-fg hover:bg-danger-bg focus-visible:bg-danger-bg" : "text-fg")}
            >
              {entry.checked !== undefined ? <Check className={cn(!entry.checked && "invisible")} aria-hidden /> : entry.icon}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {entry.shortcut && <kbd className="ml-3 font-mono text-cad-spec-micro text-fg-muted">{entry.shortcut}</kbd>}
              {hasChildren && <ChevronRight className="text-fg-muted" aria-hidden />}
            </button>
            {hasChildren && submenu === entry.id && (
              <MenuPanel
                items={entry.children!}
                label={typeof entry.label === "string" ? entry.label : label}
                id={`${id}-${entry.id}`}
                anchor={subAnchors.current[entry.id]}
                side="right"
                onClose={onClose}
                onCloseSubmenu={() => {
                  setSubmenu(null);
                  subAnchors.current[entry.id]?.focus();
                }}
                widthClassName="w-52"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DropdownMenu({ label, items, renderTrigger, widthClassName, className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      {renderTrigger({
        ref: triggerRef,
        onClick: () => setOpen((value) => !value),
        onKeyDown: (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
      })}
      {open && <MenuPanel items={items} label={label} id={menuId} anchor={triggerRef.current} side="below" onClose={close} widthClassName={widthClassName} />}
    </div>
  );
}
