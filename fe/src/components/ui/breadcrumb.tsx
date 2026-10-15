"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { cn } from "@/utils/helpers";

export interface BreadcrumbItem {
  label: string;
  /** Omit on the last item: the current page is not a link. */
  href?: string;
}

/**
 * Where the page sits: every level before the current page is a link, separated by a chevron; the current page is
 * plain bold text with `aria-current="page"`. Paths longer than `maxItems` keep the first and the last two and fold
 * the middle into a "…" button that unfolds them.
 */
export function Breadcrumb({ items, maxItems = 4, className }: { items: BreadcrumbItem[]; maxItems?: number; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const folded = !expanded && items.length > maxItems;
  const shown: (BreadcrumbItem | "fold")[] = folded ? [items[0], "fold", ...items.slice(-2)] : items;

  return (
    <nav aria-label="Đường dẫn" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-body-sm text-fg-muted">
        {shown.map((item, index) => {
          const last = index === shown.length - 1;
          return (
            <li key={item === "fold" ? "fold" : `${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {item === "fold" ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label={`Hiện ${items.length - 3} cấp bị ẩn`}
                  className="rounded-md px-1.5 py-0.5 outline-none hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40"
                >
                  …
                </button>
              ) : last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "font-semibold text-fg")}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex max-w-[12rem] items-center gap-1 truncate rounded-md underline-offset-4 outline-none hover:text-fg hover:underline focus-visible:ring-[3px] focus-visible:ring-focus/40"
                >
                  {index === 0 && item.href === "/" && <Home className="size-3.5 shrink-0" aria-hidden />}
                  {item.label}
                </Link>
              )}
              {!last && <ChevronRight className="size-3.5 shrink-0 text-fg-muted/70" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
