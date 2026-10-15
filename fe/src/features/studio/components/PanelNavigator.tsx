"use client";

import React from "react";

import { DielineGeometry } from "@wrapfit/shared";
import { formatMm } from "@/features/studio/utils/dieline";
import { cn } from "@/utils/helpers";

interface PanelNavigatorProps {
  dieline: DielineGeometry;
  activePanelId: string;
  onSelectPanel: (panelId: string) => void;
  className?: string;
}

/** Chip of the navigator: dark when it is the panel that receives new elements. */
const chip = (on: boolean) =>
  cn(
    "flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-label-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40",
    on ? "bg-fg text-fg-inverse shadow-xs" : "text-fg-muted hover:bg-surface-sunken hover:text-fg",
  );

/** Panels of the piece on screen, as a scrolling row of chips with their size in mm. */
export const PanelNavigator: React.FC<PanelNavigatorProps> = ({ dieline, activePanelId, onSelectPanel, className = "" }) => {
  return (
    <div role="group" aria-label="Mặt hộp" className={cn("flex items-center gap-0.5 overflow-x-auto no-scrollbar", className)}>
      <button type="button" aria-pressed={activePanelId === "all"} onClick={() => onSelectPanel("all")} className={chip(activePanelId === "all")}>
        Toàn bộ
      </button>

      {dieline.panels.map((panel) => {
        const isSelected = activePanelId === panel.id;
        return (
          <button key={panel.id} type="button" aria-pressed={isSelected} onClick={() => onSelectPanel(panel.id)} className={chip(isSelected)}>
            <span>{panel.name}</span>
            <span className={cn("font-mono text-cad-spec-micro tabular-nums", isSelected ? "text-fg-inverse/70" : "text-fg-muted/80")}>
              {formatMm(panel.bounds.width)}×{formatMm(panel.bounds.height)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
