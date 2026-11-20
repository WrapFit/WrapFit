"use client";

import React, { useEffect, useState } from "react";
import { Box, Maximize2, Minus } from "lucide-react";
import type { BoxDimensions, CanvasElement } from "@wrapfit/shared";
import { mediaUp } from "@/assets/styles/tokens";
import { useDebouncedValue } from "@/hooks/shared";
import { cn } from "@/utils/helpers";
import { Box3DView } from "./Box3DView";
import type { BoxMaterialTheme, BoxStructureType, FaceHit } from "./InteractiveFoldingBox3D";

const COLLAPSED_KEY = "wrapfit:studio-preview3d-collapsed";
/** The box is rebuilt (every face texture redrawn) once the artwork has stopped changing this long, not during a drag. */
const SETTLE_MS = 250;

interface Preview3DCardProps {
  dimensions: BoxDimensions;
  boxType: BoxStructureType;
  theme: BoxMaterialTheme;
  elements: CanvasElement[];
  formulaVersion?: number;
  backgroundPatternSvg?: string | null;
  foldProgress: number;
  onFoldChange(progress: number): void;
  lidOpen: boolean;
  /** Face lit on the box: the panel under the pointer on the dieline (none otherwise, so the artwork keeps its colours). */
  highlightPanelId: string | null;
  /** A click on a face (no drag): the page selects that face on the dieline. */
  onFaceClick?: (hit: FaceHit) => void;
  /** Opens the full 3D view of the stage. */
  onExpand(): void;
  className?: string;
}

const iconButton =
  "flex size-8 shrink-0 items-center justify-center rounded-control text-fg-muted outline-none transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40";

/**
 * Small 3D box over the corner of the dieline (docs/21 S2): the artwork shows on the folded box while it is designed,
 * the face under the pointer on the dieline lights up on the box, and a click on the box picks a face. Collapsible to
 * a pill; the choice is kept in the browser. Collapsed, the 3D stage is unmounted and its WebGL context released.
 */
export function Preview3DCard({
  dimensions,
  boxType,
  theme,
  elements,
  formulaVersion,
  backgroundPatternSvg = null,
  foldProgress,
  onFoldChange,
  lidOpen,
  highlightPanelId,
  onFaceClick,
  onExpand,
  className,
}: Preview3DCardProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
    } catch {
      /* Keep the choice for this session. */
    }
  };
  const settledElements = useDebouncedValue(elements, SETTLE_MS);
  const settledPattern = useDebouncedValue(backgroundPatternSvg, SETTLE_MS);
  // Tablets and up: the phone stage is too small to share, and a hidden card would still hold a WebGL context.
  const [roomy, setRoomy] = useState(() => window.matchMedia(mediaUp("md")).matches);
  useEffect(() => {
    const md = window.matchMedia(mediaUp("md"));
    const change = () => setRoomy(md.matches);
    md.addEventListener("change", change);
    return () => md.removeEventListener("change", change);
  }, []);

  if (!roomy) return null;
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-expanded={false}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface-raised px-3 text-label-sm font-semibold text-fg shadow-popover outline-none transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-focus/40",
          className,
        )}
      >
        <Box className="size-4 text-accent" aria-hidden />
        Xem trước 3D
      </button>
    );
  }

  const percent = Math.round(foldProgress * 100);
  return (
    <section aria-label="Xem trước hộp 3D" className={cn("w-60 overflow-hidden rounded-panel border border-line bg-surface-raised shadow-popover", className)}>
      <header className="flex items-center gap-1 border-b border-line py-1 pl-3 pr-1">
        <Box className="size-4 text-accent" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-label-sm font-semibold text-fg">Xem trước 3D</h2>
        <button type="button" onClick={onExpand} className={iconButton} aria-label="Mở hộp 3D cỡ lớn" title="Mở hộp 3D cỡ lớn">
          <Maximize2 className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={toggle} aria-expanded className={iconButton} aria-label="Thu gọn xem trước 3D" title="Thu gọn">
          <Minus className="size-4" aria-hidden />
        </button>
      </header>
      <div className="relative h-44 bg-surface-sunken">
        <Box3DView
          dimensions={dimensions}
          boxType={boxType}
          theme={theme}
          elements={settledElements}
          formulaVersion={formulaVersion}
          backgroundPatternSvg={settledPattern}
          foldProgress={foldProgress}
          interactiveOpenState={lidOpen}
          highlightPanelId={highlightPanelId}
          onFaceClick={onFaceClick}
          environment="transparent"
          showHud={false}
          showStatusBar={false}
          viewControls={false}
          enableMacroZoom={false}
          frameless
          minHeight={false}
          className="h-full w-full"
        />
        <p className="pointer-events-none absolute bottom-1.5 left-2 text-caption text-fg-muted">Kéo để xoay · bấm mặt để chọn</p>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3 py-1.5">
        <span className="text-caption text-fg-muted">Mở</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(e) => onFoldChange(Number(e.target.value) / 100)}
          aria-label="Mức gập hộp xem trước"
          aria-valuetext={`${percent}% gập`}
          className="min-w-0 flex-1 cursor-pointer accent-fpt-orange"
        />
        <span className="text-caption text-fg-muted">Gập</span>
      </div>
    </section>
  );
}
