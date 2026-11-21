"use client";

import React from "react";
import { Component, Grid, ImagePlus, Layers, Palette, Ruler, Shapes, ShieldCheck, Type, Upload, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/helpers";

/** Artwork tools shown in the inspector next to the canvas. */
export type DesignRailId = "elements" | "text" | "shapes" | "uploads" | "colors" | "patterns" | "aiImage" | "layers" | "dimensions" | "fitcheck";

export const DESIGN_RAIL: { id: DesignRailId; label: string; title: string; icon: LucideIcon; shortcut?: string }[] = [
  { id: "elements", label: "Thành phần", title: "Thành phần & bộ mẫu", icon: Component, shortcut: "S" },
  { id: "text", label: "Văn bản", title: "Văn bản", icon: Type, shortcut: "T" },
  { id: "shapes", label: "Hình khối", title: "Hình khối", icon: Shapes, shortcut: "H" },
  { id: "uploads", label: "Tải lên", title: "Ảnh & logo của bạn", icon: Upload, shortcut: "U" },
  { id: "colors", label: "Màu & nền", title: "Bảng màu & nền hộp", icon: Palette, shortcut: "C" },
  { id: "patterns", label: "Hoa văn", title: "Hoa văn họa tiết", icon: Grid, shortcut: "A" },
  { id: "aiImage", label: "Ảnh AI", title: "Ảnh AI", icon: ImagePlus, shortcut: "I" },
  { id: "layers", label: "Lớp", title: "Lớp & thứ tự", icon: Layers, shortcut: "L" },
  { id: "dimensions", label: "Kích thước", title: "Kích thước hộp", icon: Ruler },
  { id: "fitcheck", label: "FitCheck", title: "FitCheck™", icon: ShieldCheck },
];

interface DesignRailProps {
  active: DesignRailId | null;
  onSelect(id: DesignRailId): void;
  /** Small red count on the FitCheck item. */
  fitcheckIssues: number;
}

export function DesignRail({ active, onSelect, fitcheckIssues }: DesignRailProps) {
  return (
    <nav
      role="toolbar"
      aria-label="Công cụ thiết kế"
      className="grid grid-cols-5 gap-1 border-b border-line pb-3"
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
              "group relative flex min-h-12 min-w-0 shrink-0 flex-col items-center justify-center gap-1 rounded-control px-1 py-1.5 text-center outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/50",
              on ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <span
              className={cn(
                "relative flex size-8 items-center justify-center rounded-control transition-colors",
                on ? "bg-accent-bg text-accent" : "group-hover:bg-surface-sunken",
              )}
            >
              <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              {item.id === "fitcheck" && fitcheckIssues > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-danger-solid font-sans font-bold tabular-nums text-caption text-white">
                  {Math.min(9, fitcheckIssues)}
                </span>
              )}
            </span>
            <span className={cn("text-caption leading-tight", on ? "font-semibold" : "font-medium")}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
