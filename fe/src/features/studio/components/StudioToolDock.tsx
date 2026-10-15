"use client";

import React from "react";
import { Tooltip } from "@/components/ui";
import {
  MousePointer,
  Type,
  Gift,
  Upload,
  Palette,
  Sparkles,
  Ruler,
  Undo2,
  Redo2,
  Layers,
  ZoomIn,
  ZoomOut,
} from "lucide-react";


export type StudioToolId =
  | "select"
  | "panels"
  | "text"
  | "stickers"
  | "image"
  | "palette"
  | "patterns"
  | "rulers";

interface StudioToolDockProps {
  activeTool: StudioToolId;
  onSelectTool: (tool: StudioToolId) => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  className?: string;
}

export const StudioToolDock: React.FC<StudioToolDockProps> = ({
  activeTool,
  onSelectTool,
  showRulers,
  onToggleRulers,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  className = "",
}) => {
  const tools = [
    { id: "select", label: "Chọn", icon: MousePointer, shortcut: "V" },
    { id: "panels", label: "Mặt hộp", icon: Layers, shortcut: "P" },
    { id: "text", label: "Chữ", icon: Type, shortcut: "T" },
    { id: "stickers", label: "Sticker", icon: Gift, shortcut: "S", badge: "Mới" },
    { id: "image", label: "Tải logo", icon: Upload, shortcut: "U" },
    { id: "palette", label: "Bảng màu", icon: Palette, shortcut: "C" },
    { id: "patterns", label: "Hoa văn", icon: Sparkles, shortcut: "A" },
  ];

  return (
    <div
      className={`flex flex-row lg:flex-col items-center gap-1.5 max-w-full overflow-x-auto lg:overflow-visible bg-white rounded-3xl p-2 select-none ${className}`}
    >
      {/* Primary Tools */}
      <div className="flex flex-row lg:flex-col items-center gap-1 flex-shrink-0 lg:w-full">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <Tooltip key={t.id} side="right" content={`${t.label} · phím tắt ${t.shortcut}`} className="hidden lg:block">
              <button
                type="button"
                aria-pressed={isActive}
                aria-keyshortcuts={t.shortcut}
                onClick={() => onSelectTool(t.id as StudioToolId)}
                className={`relative group w-16 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 ${
                  isActive
                    ? "bg-landing-lime text-landing-green-night"
                    : "text-landing-muted hover:text-landing-ink hover:bg-landing-canvas"
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden />
                <span className="text-caption font-medium leading-none">{t.label}</span>
                {t.badge && !isActive && (
                  <span className="absolute top-0.5 right-0.5 px-1.5 py-0.5 rounded-full bg-landing-green-night text-landing-lime text-caption font-bold leading-none">
                    {t.badge}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-[1px] h-6 lg:w-6 lg:h-[1px] flex-shrink-0 bg-landing-line mx-1 lg:mx-0 lg:my-1" />

      {/* CAD Ruler Toggle */}
      <button
        type="button"
        onClick={() => {
          
          onToggleRulers();
        }}
        className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
          showRulers
            ? "bg-landing-lime-mist text-landing-green-deep"
            : "text-landing-muted hover:text-landing-ink hover:bg-landing-canvas"
        }`}
        title={showRulers ? "Ẩn thước đo CAD" : "Hiện thước đo CAD (mm)"}
      >
        <Ruler className="w-5 h-5" />
      </button>

      {/* Undo & Redo */}
      <div className="flex flex-row lg:flex-col items-center gap-1 flex-shrink-0 lg:pt-1">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => {
            
            if (onUndo) onUndo();
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-landing-muted hover:text-landing-ink hover:bg-landing-canvas disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={!canRedo}
          onClick={() => {
            
            if (onRedo) onRedo();
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-landing-muted hover:text-landing-ink hover:bg-landing-canvas disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Làm lại (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
