"use client";

import React from "react";
import { Tooltip } from "@/components/ui";
import { MousePointer, Type, Gift, Upload, Palette, Sparkles, Ruler, Undo2, Redo2, ImagePlus } from "lucide-react";
import { cn } from "@/utils/helpers";

export type StudioToolId =
  | "select"
  | "panels"
  | "text"
  | "stickers"
  | "image"
  | "palette"
  | "patterns"
  | "aiImage"
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

const TOOLS: { id: StudioToolId; label: string; icon: typeof MousePointer; shortcut: string }[] = [
  { id: "select", label: "Chọn & di chuyển", icon: MousePointer, shortcut: "V" },
  { id: "text", label: "Thêm chữ", icon: Type, shortcut: "T" },
  { id: "image", label: "Tải ảnh / logo", icon: Upload, shortcut: "U" },
  { id: "stickers", label: "Sticker", icon: Gift, shortcut: "S" },
  { id: "palette", label: "Phông & bảng màu", icon: Palette, shortcut: "C" },
  { id: "aiImage", label: "Ảnh AI", icon: ImagePlus, shortcut: "I" },
  { id: "patterns", label: "Hoa văn AI", icon: Sparkles, shortcut: "A" },
];

/** Square icon button of the dark dock: 44 px, lime when on (dark green text, 10:1), cobalt focus ring. */
const dockButton = (on: boolean) =>
  cn(
    "relative flex size-11 shrink-0 items-center justify-center rounded-control outline-none transition-[background-color,color,transform] duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:ring-[3px] focus-visible:ring-focus/70 disabled:pointer-events-none disabled:opacity-30",
    on ? "bg-action text-action-fg shadow-xs" : "text-white/70 hover:bg-white/10 hover:text-white",
  );

/**
 * Floating dark dock of the artwork step: a vertical column at the left of the stage on desktop, a horizontal strip
 * on phones. Labels live in tooltips (and aria-label), shortcuts in aria-keyshortcuts.
 */
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
  return (
    <div
      role="toolbar"
      aria-label="Công cụ thiết kế"
      className={cn(
        "flex max-w-full select-none flex-row items-center gap-1 overflow-x-auto rounded-panel bg-landing-ink/95 p-1.5 shadow-popover ring-1 ring-white/10 backdrop-blur-xl no-scrollbar lg:flex-col lg:overflow-visible",
        className,
      )}
    >
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <Tooltip key={t.id} side="right" content={`${t.label} · ${t.shortcut}`}>
            <button
              type="button"
              aria-pressed={isActive}
              aria-label={t.label}
              aria-keyshortcuts={t.shortcut}
              onClick={() => onSelectTool(t.id)}
              className={dockButton(isActive)}
            >
              <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
            </button>
          </Tooltip>
        );
      })}

      <span className="mx-1 h-6 w-px shrink-0 bg-white/15 lg:mx-0 lg:my-1 lg:h-px lg:w-6" aria-hidden />

      <Tooltip side="right" content={showRulers ? "Ẩn thước mm" : "Hiện thước mm"}>
        <button
          type="button"
          aria-pressed={showRulers}
          aria-label="Thước đo mm"
          onClick={onToggleRulers}
          className={dockButton(showRulers)}
        >
          <Ruler className="size-[18px]" strokeWidth={1.9} aria-hidden />
        </button>
      </Tooltip>

      {(onUndo || onRedo) && (
        <>
          <Tooltip side="right" content="Hoàn tác · Ctrl+Z">
            <button type="button" aria-label="Hoàn tác" disabled={!canUndo} onClick={onUndo} className={dockButton(false)}>
              <Undo2 className="size-[18px]" strokeWidth={1.9} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip side="right" content="Làm lại · Ctrl+Y">
            <button type="button" aria-label="Làm lại" disabled={!canRedo} onClick={onRedo} className={dockButton(false)}>
              <Redo2 className="size-[18px]" strokeWidth={1.9} aria-hidden />
            </button>
          </Tooltip>
        </>
      )}
    </div>
  );
};
