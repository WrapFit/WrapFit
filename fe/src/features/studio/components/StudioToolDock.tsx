"use client";

import React from "react";
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
    { id: "select", label: "Con Trỏ", icon: MousePointer, shortcut: "V" },
    { id: "panels", label: "Mặt Bìa", icon: Layers, shortcut: "P" },
    { id: "text", label: "Chữ In", icon: Type, shortcut: "T" },
    { id: "stickers", label: "Stickers", icon: Gift, shortcut: "S", badge: "Hot" },
    { id: "image", label: "Tải Logo", icon: Upload, shortcut: "U" },
    { id: "palette", label: "Bảng Màu", icon: Palette, shortcut: "C" },
    { id: "patterns", label: "Hoa Văn", icon: Sparkles, shortcut: "A" },
  ];

  return (
    <div
      className={`flex flex-row lg:flex-col items-center gap-1.5 max-w-full overflow-x-auto lg:overflow-visible bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-3xl p-2 shadow-tactile-lg select-none ${className}`}
    >
      {/* Primary Tools */}
      <div className="flex flex-row lg:flex-col items-center gap-1 flex-shrink-0 lg:w-full">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                
                onSelectTool(t.id as StudioToolId);
              }}
              className={`relative group w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
                isActive
                  ? "bg-brand-forest text-white shadow-sm scale-105"
                  : "text-stone-600 hover:text-brand-forest hover:bg-stone-100"
              }`}
              title={`${t.label} (${t.shortcut})`}
            >
              <Icon className="w-5 h-5" />
              {t.badge && !isActive && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-vibrant-coral text-white text-[8px] font-bold">
                  {t.badge}
                </span>
              )}

              {/* Tooltip on hover */}
              <div className="absolute left-14 px-2.5 py-1 rounded-xl bg-stone-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                {t.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-[1px] h-6 lg:w-6 lg:h-[1px] flex-shrink-0 bg-stone-200 mx-1 lg:mx-0 lg:my-1" />

      {/* CAD Ruler Toggle */}
      <button
        type="button"
        onClick={() => {
          
          onToggleRulers();
        }}
        className={`w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center transition ${
          showRulers
            ? "bg-amber-100 text-amber-900 border border-amber-300"
            : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
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
          className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
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
          className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Làm lại (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
