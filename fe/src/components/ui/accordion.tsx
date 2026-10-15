"use client";

import { ChevronDown } from "lucide-react";
import React, { useId, useState } from "react";
import { cn } from "@/utils/helpers";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  /** Small text right of the title ("Mới", a count…). */
  meta?: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** `single`: opening one closes the others (FAQ). `multiple`: each opens on its own (settings, filters). */
  type?: "single" | "multiple";
  /** Ids open at first. */
  defaultOpen?: string[];
  /** `card` white rounded cards (pack.ly FAQ), `plain` rows split by hairlines. */
  variant?: "card" | "plain";
  /** Heading level of the item titles. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/**
 * Show/hide sections. Each header is a button with `aria-expanded` inside a heading; the chevron turns when open.
 * States: collapsed, expanded, hover, focus (cobalt ring), disabled.
 */
export function Accordion({ items, type = "single", defaultOpen = [], variant = "card", headingLevel = 3, className }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen);
  const baseId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  const toggle = (id: string) =>
    setOpen((current) => (current.includes(id) ? current.filter((x) => x !== id) : type === "single" ? [id] : [...current, id]));

  return (
    <div className={cn("flex flex-col", variant === "card" ? "gap-3" : "divide-y divide-line border-y border-line", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div
            key={item.id}
            className={cn(
              variant === "card" && "overflow-hidden rounded-3xl bg-surface-raised ring-1 ring-fg/10 transition-shadow",
              variant === "card" && isOpen && "shadow-soft-16",
            )}
          >
            <Heading className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
                className={cn(
                  "group flex w-full items-center gap-4 text-left text-title text-fg outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-50",
                  variant === "card" ? "px-5 py-4 hover:bg-surface-sunken/50 sm:px-6" : "py-4 hover:text-fg-muted",
                )}
              >
                <span className="min-w-0 flex-1">{item.title}</span>
                {item.meta && <span className="shrink-0 text-caption text-fg-muted">{item.meta}</span>}
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-fg transition-transform duration-200 motion-reduce:transition-none",
                    isOpen && "rotate-180 bg-fg text-fg-inverse",
                  )}
                  aria-hidden
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={cn("text-body-sm text-fg-muted sm:text-body", variant === "card" ? "px-5 pb-5 sm:px-6" : "pb-4")}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
