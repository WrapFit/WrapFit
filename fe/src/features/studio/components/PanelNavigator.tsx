"use client";

import React from "react";
import { Layers, Check, Focus, MoveHorizontal, Square } from "lucide-react";

import { DielineGeometry } from "@wrapfit/shared";
import { formatMm } from "@/features/studio/utils/dieline";

interface PanelNavigatorProps {
  dieline: DielineGeometry;
  activePanelId: string;
  onSelectPanel: (panelId: string) => void;
  className?: string;
}

export const PanelNavigator: React.FC<PanelNavigatorProps> = ({
  dieline,
  activePanelId,
  onSelectPanel,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1 ${className}`}
    >
      <div className="flex items-center gap-1 pl-2 pr-1 text-landing-muted font-semibold text-xs whitespace-nowrap">
        <Focus className="w-3.5 h-3.5 text-landing-green" />
        <span className="hidden sm:inline">Mặt hộp:</span>
      </div>

      <button
        type="button"
        onClick={() => {
          
          onSelectPanel("all");
        }}
        className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
          activePanelId === "all"
            ? "bg-landing-green-night text-white shadow-sm"
            : "text-landing-muted hover:bg-landing-canvas"
        }`}
      >
        Toàn bộ
      </button>

      {dieline.panels.map((panel) => {
        const isSelected = activePanelId === panel.id;
        return (
          <button
            key={panel.id}
            type="button"
            onClick={() => {
              
              onSelectPanel(panel.id);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              isSelected
                ? "bg-landing-green text-white shadow-cobalt-glow scale-105"
                : "bg-landing-canvas text-landing-ink hover:bg-landing-canvas border border-landing-line"
            }`}
          >
            <span>{panel.name}</span>
            <span className="text-[10px] font-mono opacity-70">
              {formatMm(panel.bounds.width)}×{formatMm(panel.bounds.height)}
            </span>
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        );
      })}
    </div>
  );
};
