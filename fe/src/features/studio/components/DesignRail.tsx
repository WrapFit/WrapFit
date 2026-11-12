"use client";

import React from "react";
import { ChevronLeft, Gift, ImagePlus, Palette, Ruler, ShieldCheck, Sparkles, Type, Upload, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/helpers";

/** Sections of the left rail of the design step (Canva-like): each opens its own flyout panel. */
export type DesignRailId = "elements" | "text" | "uploads" | "colors" | "patterns" | "aiImage" | "dimensions" | "fitcheck";

export const DESIGN_RAIL: { id: DesignRailId; label: string; title: string; icon: LucideIcon; shortcut?: string }[] = [
  { id: "elements", label: "Thành phần", title: "Thành phần & bộ mẫu", icon: Gift, shortcut: "S" },
  { id: "text", label: "Văn bản", title: "Văn bản", icon: Type, shortcut: "T" },
  { id: "uploads", label: "Tải lên", title: "Ảnh & logo của bạn", icon: Upload, shortcut: "U" },
  { id: "colors", label: "Màu & nền", title: "Bảng màu & nền hộp", icon: Palette, shortcut: "C" },
  { id: "patterns", label: "Hoa văn AI", title: "Hoa văn AI", icon: Sparkles, shortcut: "A" },
  { id: "aiImage", label: "Ảnh AI", title: "Ảnh AI", icon: ImagePlus, shortcut: "I" },
  { id: "dimensions", label: "Kích thước", title: "Kích thước hộp", icon: Ruler },
  { id: "fitcheck", label: "FitCheck", title: "FitCheck™", icon: ShieldCheck },
];

interface DesignRailProps {
  active: DesignRailId | null;
  onSelect(id: DesignRailId): void;
  /** Small red count on the FitCheck item. */
  fitcheckIssues: number;
}

/**
 * Left rail of the design step, like Canva's: icon over label, the open section highlighted. A column on desktop, a
 * scrolling row on phones.
 */
export function DesignRail({ active, onSelect, fitcheckIssues }: DesignRailProps) {
  return (
    <nav
      role="toolbar"
      aria-label="Công cụ thiết kế"
      aria-orientation="vertical"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-surface-raised px-2 py-1.5 no-scrollbar lg:w-[76px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-1.5 lg:py-3"
    >
      {DESIGN_RAIL.map((item) => {
        const on = active === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            aria-keyshortcuts={item.shortcut}
            title={item.shortcut ? `${item.title} · ${item.shortcut}` : item.title}
            onClick={() => onSelect(item.id)}
            className={cn(
              "group relative flex min-h-[60px] min-w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-control px-1 py-1.5 text-center outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/50",
              on ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <span
              className={cn(
                "relative flex size-9 items-center justify-center rounded-control transition-colors",
                on ? "bg-fpt-orange-light text-accent shadow-xs ring-1 ring-fpt-orange/30" : "group-hover:bg-surface-sunken",
              )}
            >
              <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              {item.id === "fitcheck" && fitcheckIssues > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-danger-solid font-mono text-cad-spec-micro text-white">
                  {Math.min(9, fitcheckIssues)}
                </span>
              )}
            </span>
            <span className={cn("text-[11px] leading-tight", on ? "font-semibold" : "font-medium")}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

interface DesignFlyoutProps {
  id: DesignRailId;
  onClose(): void;
  children: React.ReactNode;
}

/** The panel a rail section opens, between the rail and the stage; the tab on its edge folds it away (like Canva). */
export function DesignFlyout({ id, onClose, children }: DesignFlyoutProps) {
  const item = DESIGN_RAIL.find((r) => r.id === id)!;
  return (
    <aside
      aria-label="Bảng công cụ"
      className="relative flex max-h-[60vh] min-h-0 shrink-0 flex-col border-b border-line bg-surface-raised lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r xl:w-[360px]"
    >
      {/* No title row: the open rail item already names the panel. Phones keep a fold button. */}
      <h2 className="sr-only">{item.title}</h2>
      <div className="flex justify-end px-3 pt-2 lg:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Thu gọn bảng"
          className="flex size-9 items-center justify-center rounded-full text-fg-muted outline-none hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/50 lg:hidden"
        >
          <ChevronLeft className="size-4 rotate-90" aria-hidden />
        </button>
      </div>
      <div key={id} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-1 animate-fadeIn lg:pt-5">
        {children}
      </div>
      {/* Canva-style fold tab on the right edge (desktop) */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Thu gọn bảng công cụ"
        title="Thu gọn"
        className="absolute -right-4 top-1/2 z-10 hidden h-16 w-4 -translate-y-1/2 items-center justify-center rounded-r-control border border-l-0 border-line bg-surface-raised text-fg-muted shadow-xs outline-none hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/50 lg:flex"
      >
        <ChevronLeft className="size-3.5" aria-hidden />
      </button>
    </aside>
  );
}
