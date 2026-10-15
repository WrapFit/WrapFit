"use client";

import React from "react";
import { DropdownMenu, Icon, type MenuEntry } from "@/components/ui";

export interface MenuAction {
  id: string;
  label: string;
  /** Material Symbols name, drawn with the lucide equivalent (components/ui/icon). */
  icon: string;
  tone?: "danger";
  /** Visible but not available (e.g. the plan does not allow it). */
  disabled?: boolean;
  /** Keyboard shortcut shown on the right, e.g. "Ctrl+D". */
  shortcut?: string;
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
 * "More" menu of a project card: the shared DropdownMenu (arrows, Home/End, Escape returns focus, click outside
 * closes, flips to stay inside the viewport). Destructive actions sit last, after a separator, in the danger colour.
 */
export function ProjectActionsMenu({ projectTitle, actions, disabled = false, className }: ProjectActionsMenuProps) {
  const safe = actions.filter((action) => action.tone !== "danger");
  const danger = actions.filter((action) => action.tone === "danger");
  const toEntry = (action: MenuAction): MenuEntry => ({
    id: action.id,
    label: action.label,
    icon: <Icon name={action.icon} />,
    danger: action.tone === "danger",
    disabled: action.disabled,
    shortcut: action.shortcut,
    onSelect: action.onSelect,
  });
  const items: MenuEntry[] = [...safe.map(toEntry), ...(danger.length ? [{ type: "separator" as const, id: "sep-danger" }] : []), ...danger.map(toEntry)];

  return (
    <DropdownMenu
      label={`Thao tác với “${projectTitle}”`}
      items={items}
      renderTrigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`Thao tác khác với “${projectTitle}”`}
          disabled={disabled}
          className={className}
        >
          <Icon name={disabled ? "progress_activity" : "more_horiz"} className={`size-4 ${disabled ? "animate-spin motion-reduce:animate-none" : ""}`} />
        </button>
      )}
    />
  );
}
