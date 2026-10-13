"use client";

import React, { useState, useRef } from "react";
import { DielineGeometry, CanvasElement, matchesPanel, TEXT_FONT_WEIGHT } from "@wrapfit/shared";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  Trash2,
  Plus,
  Type,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  Move,
  CornerDownRight,
  Eye,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { cssFontFamily, layoutBoxText, useBoxFonts } from "./boxText";
import { formatMm } from "@/features/studio/utils/dieline";
import { printFontOf, textBlockHeight } from "@wrapfit/shared";

/** Font of the texts added with "Thêm Chữ" (a print font, so the PDF embeds it). */
const NEW_TEXT_STYLE = { fontFamily: "Cormorant Garamond, serif", fontSize: 12, color: "#1A362B" };
/** FitCheck safe margin: new texts start this far inside the panel. */
const NEW_TEXT_MARGIN_MM = 4;
/** Loaded ahead, so the first text added is measured with its real font. */
const NEW_TEXT_FONTS = [printFontOf(NEW_TEXT_STYLE.fontFamily)];


interface DielineCanvas2DProps {
  dieline: DielineGeometry;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  elements?: CanvasElement[];
  onElementsChange?: (elements: CanvasElement[]) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  backgroundPatternSvg?: string | null;
  activePanelId?: string;
  onSelectPanel?: (panelId: string) => void;
  showRulers?: boolean;
  /** Elements FitCheck flags (margin, bleed, glue…): drawn with a red badge. */
  flaggedElementIds?: ReadonlySet<string>;
  className?: string;
}

interface DragState {
  elementId: string;
  startPointerMm: { x: number; y: number };
  startElX: number;
  startElY: number;
  startElWidth: number;
  startElHeight: number;
  startPanelBounds: { x: number; y: number; width: number; height: number };
  mode: "move" | "resize";
  resizeHandle?: "tl" | "tr" | "bl" | "br";
}

export const DielineCanvas2D: React.FC<DielineCanvas2DProps> = ({
  dieline,
  scale = 1.0,
  onScaleChange,
  elements = [],
  onElementsChange,
  selectedElementId,
  onSelectElement,
  backgroundPatternSvg,
  activePanelId = "panel_front",
  onSelectPanel,
  showRulers = true,
  flaggedElementIds,
  className = "",
}) => {
  const [showLayers, setShowLayers] = useState({
    cut: true,
    crease: true,
    bleed: true,
    safeMargin: true,
    dimensions: true,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [newTextValue, setNewTextValue] = useState<string>("");
  const [showAddTextModal, setShowAddTextModal] = useState<boolean>(false);
  // Changes once the fonts of the texts are loaded: texts first measured with a fallback font are laid out again.
  const fontsVersion = useBoxFonts(elements, NEW_TEXT_FONTS);

  const { width: totalW, height: totalH } = dieline.totalBoundingBox;
  const padding = 35; // 35mm margin
  const viewBoxW = totalW + 2 * padding;
  const viewBoxH = totalH + 2 * padding;

  const selectedEl = elements.find((e) => e.id === selectedElementId);

  // Convert client pointer event (px) to SVG viewBox millimeter coordinates
  const getSvgCoordinates = (clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return {
      x: transformed.x,
      y: transformed.y,
    };
  };

  // Pointer Down on Element or Handle -> Start Dragging
  const handleElementPointerDown = (
    e: React.PointerEvent,
    el: CanvasElement,
    mode: "move" | "resize" = "move",
    resizeHandle?: "tl" | "tr" | "bl" | "br"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    

    if (onSelectElement) onSelectElement(el.id);

    const targetPanel = dieline.panels.find((p) => matchesPanel(p, el.panelId));
    const panelBounds = targetPanel ? targetPanel.bounds : { x: 0, y: 0, width: 100, height: 100 };

    const pt = getSvgCoordinates(e.clientX, e.clientY);

    setDragState({
      elementId: el.id,
      startPointerMm: pt,
      startElX: el.x,
      startElY: el.y,
      startElWidth: el.width,
      startElHeight: el.height,
      startPanelBounds: panelBounds,
      mode,
      resizeHandle,
    });
  };

  // Pointer Move on SVG Canvas -> Drag, Glide & Auto-Bind Panel
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getSvgCoordinates(e.clientX, e.clientY);
    const mmX = Math.round(pt.x - padding);
    const mmY = Math.round(pt.y - padding);
    setCursorMm({ x: mmX, y: mmY });

    if (!dragState || !onElementsChange) return;

    const el = elements.find((item) => item.id === dragState.elementId);
    if (!el) return;

    const dx = pt.x - dragState.startPointerMm.x;
    const dy = pt.y - dragState.startPointerMm.y;

    if (dragState.mode === "move") {
      // Calculate current global millimeter coordinate
      const currentGlobalX = dragState.startPanelBounds.x + dragState.startElX + dx;
      const currentGlobalY = dragState.startPanelBounds.y + dragState.startElY + dy;

      // Element Center coordinate for Panel Auto-Detection
      const centerX = currentGlobalX + el.width / 2;
      const centerY = currentGlobalY + el.height / 2;

      // Detect which panel contains the element center
      const targetPanel =
        dieline.panels.find(
          (p) =>
            centerX >= p.bounds.x &&
            centerX <= p.bounds.x + p.bounds.width &&
            centerY >= p.bounds.y &&
            centerY <= p.bounds.y + p.bounds.height
        ) ||
        dieline.panels.find((p) => matchesPanel(p, el.panelId)) ||
        dieline.panels[0];

      // Relative coordinates inside target panel
      const relX = Math.round(currentGlobalX - targetPanel.bounds.x);
      const relY = Math.round(currentGlobalY - targetPanel.bounds.y);

      const updated = elements.map((item) =>
        item.id === el.id
          ? { ...item, panelId: targetPanel.id, x: relX, y: relY }
          : item
      );
      onElementsChange(updated);
    } else if (dragState.mode === "resize") {
      const isRight = dragState.resizeHandle?.includes("r");
      const isBottom = dragState.resizeHandle?.includes("b");
      const deltaW = isRight ? dx : -dx;
      const deltaH = isBottom ? dy : -dy;

      const newW = Math.max(15, Math.round(dragState.startElWidth + deltaW));
      const newH = Math.max(10, Math.round(dragState.startElHeight + deltaH));

      const updated = elements.map((item) =>
        item.id === el.id ? { ...item, width: newW, height: newH } : item
      );
      onElementsChange(updated);
    }
  };

  // Pointer Up -> Snap & Finish Drag
  const handleSvgPointerUp = () => {
    if (dragState) {
      
      const el = elements.find((item) => item.id === dragState.elementId);
      if (el && onSelectPanel) {
        onSelectPanel(el.panelId);
      }
      setDragState(null);
    }
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    
    if (onScaleChange) {
      const next = Math.min(2.5, Math.max(0.4, Number((scale + delta).toFixed(2))));
      onScaleChange(next);
    }
  };

  const handleResetZoom = () => {
    
    if (onScaleChange) onScaleChange(1.0);
  };

  // Rotate Element
  const handleRotate = (angleDelta: number) => {
    if (!selectedEl || !onElementsChange) return;
    
    const updated = elements.map((el) =>
      el.id === selectedEl.id
        ? { ...el, rotation: (el.rotation + angleDelta) % 360 }
        : el
    );
    onElementsChange(updated);
  };

  // Resize Element via Button
  const handleResize = (multiplier: number) => {
    if (!selectedEl || !onElementsChange) return;
    
    const updated = elements.map((el) => {
      if (el.id !== selectedEl.id) return el;
      return {
        ...el,
        width: Math.max(15, Math.round(el.width * multiplier)),
        height: Math.max(10, Math.round(el.height * multiplier)),
      };
    });
    onElementsChange(updated);
  };

  // Delete Element
  const handleDeleteElement = () => {
    if (!selectedEl || !onElementsChange) return;
    
    onElementsChange(elements.filter((el) => el.id !== selectedEl.id));
    if (onSelectElement) onSelectElement(null);
  };

  // Nudge Move
  const handleMove = (dx: number, dy: number) => {
    if (!selectedEl || !onElementsChange) return;
    
    const updated = elements.map((el) => {
      if (el.id !== selectedEl.id) return el;
      return {
        ...el,
        x: Math.round(el.x + dx),
        y: Math.round(el.y + dy),
      };
    });
    onElementsChange(updated);
  };

  // Add a text: a box that fits its lines (text model of the print files), centred on the panel, at the first height
  // where it covers no other element of that panel.
  const handleAddText = () => {
    if (!newTextValue.trim() || !onElementsChange) return;

    // "Toàn Bộ" selects no panel: the text goes on the first one.
    const targetPanel = dieline.panels.find((p) => p.id === activePanelId) || dieline.panels[0];
    const { width: panelW, height: panelH } = targetPanel.bounds;
    const content = newTextValue.trim();
    const maxWidth = Math.max(10, panelW - 2 * NEW_TEXT_MARGIN_MM);
    const wrapped = layoutBoxText({ content, width: maxWidth, height: 0, style: NEW_TEXT_STYLE });
    const width = Math.round(Math.min(maxWidth, Math.max(...wrapped.lines.map((line) => line.width)) + 2) * 10) / 10;
    const height = Math.round((textBlockHeight(wrapped) + 2) * 10) / 10;
    const x = Math.round(((panelW - width) / 2) * 10) / 10;

    const others = elements.filter((el) => el.panelId === targetPanel.id);
    const overlaps = (y: number) =>
      others.some((el) => x < el.x + el.width && el.x < x + width && y < el.y + el.height && el.y < y + height);
    // The free height closest to the middle of the panel (the middle itself when the panel is empty).
    const middle = Math.max(NEW_TEXT_MARGIN_MM, Math.round(((panelH - height) / 2) * 10) / 10);
    const candidates: number[] = [];
    for (let candidate = NEW_TEXT_MARGIN_MM; candidate + height <= panelH - NEW_TEXT_MARGIN_MM; candidate += 1) {
      candidates.push(candidate);
    }
    candidates.push(middle);
    candidates.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
    const y = candidates.find((candidate) => !overlaps(candidate)) ?? middle;

    const newElement: CanvasElement = {
      id: `text_${Date.now()}`,
      type: "text",
      panelId: targetPanel.id,
      x,
      y,
      width,
      height,
      rotation: 0,
      content,
      style: { ...NEW_TEXT_STYLE },
    };

    onElementsChange([...elements, newElement]);
    setNewTextValue("");
    setShowAddTextModal(false);
    if (onSelectElement) onSelectElement(newElement.id);
  };

  return (
    <div
      className={`relative w-full h-full min-h-[560px] bg-library-panel rounded-squircle-lg border border-stone-200 overflow-hidden flex items-center justify-center p-4 shadow-tactile ${className}`}
    >
      {/* Background CAD Grid Texture */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#C8A882_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-stone-200 shadow-tactile text-xs text-stone-700">
          <span className="font-landing-heading font-bold text-brand-forest">Bản Bế 2D Phẳng</span>
          <span className="text-stone-300">|</span>
          <span className="font-mono text-[11px] text-stone-500">
            {formatMm(totalW)} × {formatMm(totalH)} mm
          </span>
        </div>

        {/* Add Text / Element Button */}
        <button
          type="button"
          onClick={() => {
            
            setShowAddTextModal(true);
          }}
          className="px-3.5 py-1.5 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-xs font-semibold shadow-tactile flex items-center gap-1.5 transition"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Thêm Chữ / Lời Chúc (Pretext)</span>
        </button>

        {backgroundPatternSvg && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold shadow-tactile">
            <Sparkles className="w-3 h-3 text-amber-500 animate-spin" />
            <span className="truncate max-w-[140px]">
              {backgroundPatternSvg.includes("tet")
                ? "Hoa Mai Tết"
                : backgroundPatternSvg.includes("xmas")
                ? "Giáng Sinh"
                : backgroundPatternSvg.includes("botanical")
                ? "Botanical"
                : backgroundPatternSvg.includes("gold")
                ? "Ép Kim Vàng"
                : "Hoa Văn AI"}
            </span>
          </div>
        )}
      </div>

      {/* Top Right Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-full border border-stone-200 shadow-tactile">
        <button
          type="button"
          onClick={() => handleZoom(-0.15)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-stone-600 hover:text-brand-forest hover:bg-stone-100 transition"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono font-bold text-stone-700 px-1 select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => handleZoom(0.15)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-stone-600 hover:text-brand-forest hover:bg-stone-100 transition"
          title="Phóng to"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="w-7 h-7 rounded-full flex items-center justify-center text-stone-600 hover:text-brand-forest hover:bg-stone-100 transition"
          title="Đặt lại 100%"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>

      {/* FLOATING GIZMO TOOLBAR FOR SELECTED ELEMENT
          Placed at BOTTOM-CENTER so it NEVER blocks dieline panels, top flaps, or rulers */}
      {selectedEl && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-2 bg-stone-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-tactile-lg text-xs animate-fadeIn border border-white/20">
          <div className="flex items-center gap-2 pr-2.5 border-r border-white/20">
            <Move className="w-3.5 h-3.5 text-library-accent animate-pulse" />
            <span className="font-semibold text-brand-gold truncate max-w-[110px]">
              {selectedEl.content || "Phần tử"}
            </span>
            <span className="font-mono text-[10px] text-stone-400">
              {formatMm(selectedEl.width)}×{formatMm(selectedEl.height)}mm
            </span>
          </div>

          {/* Micro Move arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleMove(-2, 0)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-[11px]"
              title="Sang trái 2mm"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => handleMove(2, 0)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-[11px]"
              title="Sang phải 2mm"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => handleMove(0, -2)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-[11px]"
              title="Lên trên 2mm"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleMove(0, 2)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-[11px]"
              title="Xuống dưới 2mm"
            >
              ↓
            </button>
          </div>

          {/* Rotate buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-white/20">
            <button
              type="button"
              onClick={() => handleRotate(45)}
              className="px-2 py-1 rounded hover:bg-white/20 transition flex items-center gap-1 text-[11px]"
              title="Xoay 45 độ"
            >
              <RotateCw className="w-3 h-3" />
              <span>45°</span>
            </button>
            <button
              type="button"
              onClick={() => handleRotate(90)}
              className="px-2 py-1 rounded hover:bg-white/20 transition flex items-center gap-1 text-[11px]"
              title="Xoay 90 độ"
            >
              <span>90°</span>
            </button>
          </div>

          {/* Scale Multipliers */}
          <div className="flex items-center gap-1 pl-2 border-l border-white/20">
            <button
              type="button"
              onClick={() => handleResize(0.9)}
              className="px-2 py-0.5 rounded hover:bg-white/20 text-[11px] font-mono"
              title="Thu nhỏ 10%"
            >
              -10%
            </button>
            <button
              type="button"
              onClick={() => handleResize(1.1)}
              className="px-2 py-0.5 rounded hover:bg-white/20 text-[11px] font-mono"
              title="Phóng to 10%"
            >
              +10%
            </button>
          </div>

          {/* Delete Action */}
          <button
            type="button"
            onClick={handleDeleteElement}
            className="p-1.5 hover:bg-red-500/80 rounded-full transition text-red-300 hover:text-white ml-1.5"
            title="Xóa phần tử"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out select-none"
        style={{ transform: `scale(${scale})` }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
          className={`w-full h-full max-h-[85%] filter drop-shadow-sm ${
            dragState ? "cursor-grabbing" : "cursor-default"
          }`}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={handleSvgPointerUp}
        >
          {/* Pattern Definitions */}
          <defs>
            {/* 1. Tet 2026 Golden Plum Blossoms */}
            <pattern id="pattern-tet" width="32" height="32" patternUnits="userSpaceOnUse">
              <g fill="#D4AF37" fillOpacity="0.45" stroke="#AA771C" strokeWidth="0.25">
                <circle cx="16" cy="11.5" r="3.2" />
                <circle cx="20.3" cy="14.6" r="3.2" />
                <circle cx="18.6" cy="19.8" r="3.2" />
                <circle cx="13.4" cy="19.8" r="3.2" />
                <circle cx="11.7" cy="14.6" r="3.2" />
                <circle cx="16" cy="16" r="2.2" fill="#E65100" />
              </g>
              <circle cx="4" cy="4" r="1.2" fill="#D4AF37" fillOpacity="0.4" />
              <circle cx="28" cy="28" r="1.2" fill="#D4AF37" fillOpacity="0.4" />
            </pattern>

            {/* 2. Winter Christmas Pine */}
            <pattern id="pattern-xmas" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 16 6 L 16 26 M 16 12 L 10 9 M 16 12 L 22 9 M 16 18 L 9 15 M 16 18 L 23 15 M 16 24 L 11 21 M 16 24 L 21 21"
                stroke="#1B4D3E"
                strokeWidth="0.8"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
              <path
                d="M 4 4 L 4 10 M 1 7 L 7 7 M 2 5 L 6 9 M 2 9 L 6 5"
                stroke="#D4AF37"
                strokeWidth="0.6"
                strokeOpacity="0.5"
              />
            </pattern>

            {/* 3. Minimalist Botanical Eucalyptus Leaves */}
            <pattern id="pattern-botanical" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 8 28 Q 16 18 24 8"
                fill="none"
                stroke="#2D5A43"
                strokeWidth="0.75"
                strokeOpacity="0.4"
              />
              <ellipse cx="14" cy="19" rx="3.5" ry="2" transform="rotate(-35 14 19)" fill="#4A7C59" fillOpacity="0.35" />
              <ellipse cx="19" cy="14" rx="3.5" ry="2" transform="rotate(35 19 14)" fill="#4A7C59" fillOpacity="0.35" />
            </pattern>

            {/* 4. Luxury Art Deco Interlocking Gold Grid */}
            <pattern id="pattern-gold" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 12 0 L 24 12 L 12 24 L 0 12 Z M 12 3 L 21 12 L 12 21 L 3 12 Z"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="0.6"
                strokeOpacity="0.45"
              />
              <circle cx="12" cy="12" r="1.5" fill="#AA771C" fillOpacity="0.4" />
            </pattern>
          </defs>

          {/* Layer 0: Bleed Area (Green boundary) */}
          {showLayers.bleed && (
            <rect
              x={padding - 2}
              y={padding - 2}
              width={totalW + 4}
              height={totalH + 4}
              fill="none"
              stroke="#38A169"
              strokeWidth="0.5"
              strokeDasharray="1.5 1.5"
              className="pointer-events-none"
            />
          )}

          {/* Layer 1: Background AI / Festive Pattern */}
          {backgroundPatternSvg && (
            <rect
              x={padding - 2}
              y={padding - 2}
              width={totalW + 4}
              height={totalH + 4}
              fill={
                backgroundPatternSvg.includes("tet")
                  ? "url(#pattern-tet)"
                  : backgroundPatternSvg.includes("xmas")
                  ? "url(#pattern-xmas)"
                  : backgroundPatternSvg.includes("botanical")
                  ? "url(#pattern-botanical)"
                  : backgroundPatternSvg.includes("gold")
                  ? "url(#pattern-gold)"
                  : "url(#pattern-tet)"
              }
              className="pointer-events-none"
            />
          )}

          {/* Layer 2: Panels Surface & Safe Margins */}
          {dieline.panels.map((panel) => {
            const px = panel.bounds.x + padding;
            const py = panel.bounds.y + padding;
            const pw = panel.bounds.width;
            const ph = panel.bounds.height;
            const safeInset = 3; // 3mm safe margin
            const isPanelActive = panel.id === activePanelId;

            return (
              <g
                key={panel.id}
                onClick={(e) => {
                  e.stopPropagation();
                  
                  if (onSelectPanel) onSelectPanel(panel.id);
                }}
                className="cursor-pointer group"
              >
                {/* Panel surface */}
                <rect
                  x={px}
                  y={py}
                  width={pw}
                  height={ph}
                  fill={isPanelActive ? "rgba(37, 99, 235, 0.08)" : "rgba(255, 255, 255, 0.55)"}
                  stroke={isPanelActive ? "#2563EB" : "#CBD5E1"}
                  strokeWidth={isPanelActive ? "0.9" : "0.3"}
                  rx="1"
                />

                {/* Safe Margin Boundary Line (Yellow dashed) */}
                {showLayers.safeMargin && pw > 8 && ph > 8 && (
                  <rect
                    x={px + safeInset}
                    y={py + safeInset}
                    width={pw - 2 * safeInset}
                    height={ph - 2 * safeInset}
                    fill="none"
                    stroke={isPanelActive ? "#D97706" : "#ECC94B"}
                    strokeWidth="0.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Panel Label & Dimensions */}
                {showLayers.dimensions && (
                  <>
                    <text
                      x={px + 4}
                      y={py + 9}
                      fontSize="5"
                      fontFamily="sans-serif"
                      fill={isPanelActive ? "#1E40AF" : "#475569"}
                      fontWeight={isPanelActive ? "bold" : "600"}
                    >
                      {panel.name}
                    </text>
                    <text
                      x={px + 4}
                      y={py + 15}
                      fontSize="3.8"
                      fontFamily="monospace"
                      fill={isPanelActive ? "#2563EB" : "#94A3B8"}
                    >
                      {formatMm(pw)}×{formatMm(ph)}mm
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Layer 3: Crease & Cut Lines */}
          {dieline.segments.map((seg) => {
            const isCut = seg.type === "cut";
            if (isCut && !showLayers.cut) return null;
            if (!isCut && !showLayers.crease) return null;

            if (seg.pathString) {
              return (
                <path
                  key={seg.id}
                  d={seg.pathString}
                  transform={`translate(${padding} ${padding})`}
                  className={isCut ? "dieline-cut" : "dieline-crease"}
                  fill="none"
                />
              );
            }

            return (
              <line
                key={seg.id}
                x1={seg.start.x + padding}
                y1={seg.start.y + padding}
                x2={seg.end.x + padding}
                y2={seg.end.y + padding}
                className={isCut ? "dieline-cut" : "dieline-crease"}
              />
            );
          })}

          {/* Layer 4: Placed Artwork Elements (Images, Logos, Stickers, Texts)
              Now equipped with FREE DRAG & DROP POINTER LISTENERS! */}
          {elements.map((el) => {
            // Elements of the other piece of a two-piece box are drawn when that piece is on screen.
            const targetPanel = dieline.panels.find((p) => matchesPanel(p, el.panelId));
            if (!targetPanel) return null;
            const panelOffset = targetPanel.bounds;
            const elX = panelOffset.x + el.x + padding;
            const elY = panelOffset.y + el.y + padding;
            const isSelected = el.id === selectedElementId;

            // FitCheck flags it (safe margin on every side, bleed, glue flap…)
            const isMarginBreached = flaggedElementIds?.has(el.id) ?? false;

            return (
              <g
                key={el.id}
                onPointerDown={(e) => handleElementPointerDown(e, el, "move")}
                className="cursor-grab active:cursor-grabbing select-none"
                transform={`rotate(${el.rotation || 0} ${elX + el.width / 2} ${elY + el.height / 2})`}
              >
                {/* Selection / Warning Box */}
                <rect
                  x={elX}
                  y={elY}
                  width={el.width}
                  height={el.height}
                  fill={
                    isSelected
                      ? "rgba(37, 99, 235, 0.12)"
                      : isMarginBreached
                      ? "rgba(255, 107, 107, 0.12)"
                      : "rgba(255, 255, 255, 0.3)"
                  }
                  stroke={
                    isSelected
                      ? "#2563EB"
                      : isMarginBreached
                      ? "#FF6B6B"
                      : "#94A3B8"
                  }
                  strokeWidth={isSelected ? "1" : "0.5"}
                  strokeDasharray={isSelected ? "3 2" : undefined}
                  rx="1"
                />

                {/* Safe margin breached warning badge */}
                {isMarginBreached && (
                  <circle cx={elX + el.width} cy={elY} r="2.5" fill="#FF6B6B" />
                )}

                {/* Content: Image/Logo or Text */}
                {el.type === "image" || el.type === "logo" || el.type === "pattern" ? (
                  <image
                    href={el.content}
                    x={elX}
                    y={elY}
                    width={el.width}
                    height={el.height}
                    preserveAspectRatio="xMidYMid meet"
                    className="pointer-events-none"
                  />
                ) : (
                  // Same lines, font, size and alignment as the print files (docs/12 Phase 9).
                  (() => {
                    const box = layoutBoxText(el);
                    return (
                      <g
                        data-fonts={fontsVersion}
                        fontSize={box.fontSizeMm}
                        fontWeight={TEXT_FONT_WEIGHT}
                        fill={el.style?.color || "#1C1917"}
                        style={{ fontFamily: cssFontFamily(box.font) }}
                        className="pointer-events-none select-none"
                      >
                        {box.lines.map((line, index) =>
                          line.text ? (
                            <text key={index} x={elX + line.x} y={elY + line.baseline}>
                              {line.text}
                            </text>
                          ) : null
                        )}
                      </g>
                    );
                  })()
                )}

                {/* 4 Interactive Corner Resize Handles for selected element */}
                {isSelected && (
                  <>
                    <rect
                      x={elX - 2}
                      y={elY - 2}
                      width={4}
                      height={4}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="0.5"
                      className="cursor-nwse-resize"
                      onPointerDown={(e) => handleElementPointerDown(e, el, "resize", "tl")}
                    />
                    <rect
                      x={elX + el.width - 2}
                      y={elY - 2}
                      width={4}
                      height={4}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="0.5"
                      className="cursor-nesw-resize"
                      onPointerDown={(e) => handleElementPointerDown(e, el, "resize", "tr")}
                    />
                    <rect
                      x={elX - 2}
                      y={elY + el.height - 2}
                      width={4}
                      height={4}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="0.5"
                      className="cursor-nesw-resize"
                      onPointerDown={(e) => handleElementPointerDown(e, el, "resize", "bl")}
                    />
                    <rect
                      x={elX + el.width - 2}
                      y={elY + el.height - 2}
                      width={4}
                      height={4}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="0.5"
                      className="cursor-nwse-resize"
                      onPointerDown={(e) => handleElementPointerDown(e, el, "resize", "br")}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Layer 5: CAD Millimeter Rulers & Interactive Crosshairs */}
          {showRulers && (
            <g className="pointer-events-none select-none">
              {/* Top Horizontal Ruler */}
              <rect
                x={padding}
                y={padding - 14}
                width={totalW}
                height={10}
                fill="rgba(253, 251, 247, 0.95)"
                stroke="#D8C7B4"
                strokeWidth="0.4"
              />
              {/* Left Vertical Ruler */}
              <rect
                x={padding - 14}
                y={padding}
                width={10}
                height={totalH}
                fill="rgba(253, 251, 247, 0.95)"
                stroke="#D8C7B4"
                strokeWidth="0.4"
              />
              {/* Corner Origin Indicator */}
              <rect
                x={padding - 14}
                y={padding - 14}
                width={10}
                height={10}
                fill="#1A362B"
              />
              <text
                x={padding - 9}
                y={padding - 8}
                fontSize="3.2"
                fill="#FFFFFF"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                mm
              </text>

              {/* Top Ruler mm Ticks */}
              {Array.from({ length: Math.floor(totalW / 10) + 1 }).map((_, i) => {
                const tickX = padding + i * 10;
                const isMajor = i % 2 === 0;
                return (
                  <g key={`top_tick_${i}`}>
                    <line
                      x1={tickX}
                      y1={padding - 4}
                      x2={tickX}
                      y2={isMajor ? padding - 14 : padding - 8}
                      stroke="#A8A29E"
                      strokeWidth={isMajor ? "0.4" : "0.25"}
                    />
                    {isMajor && (
                      <text
                        x={tickX}
                        y={padding - 9}
                        fontSize="2.8"
                        fontFamily="monospace"
                        fill="#78716C"
                        textAnchor="middle"
                      >
                        {i * 10}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Left Ruler mm Ticks */}
              {Array.from({ length: Math.floor(totalH / 10) + 1 }).map((_, i) => {
                const tickY = padding + i * 10;
                const isMajor = i % 2 === 0;
                return (
                  <g key={`left_tick_${i}`}>
                    <line
                      x1={padding - 4}
                      y1={tickY}
                      x2={isMajor ? padding - 14 : padding - 8}
                      y2={tickY}
                      stroke="#A8A29E"
                      strokeWidth={isMajor ? "0.4" : "0.25"}
                    />
                    {isMajor && (
                      <text
                        x={padding - 9}
                        y={tickY + 1}
                        fontSize="2.8"
                        fontFamily="monospace"
                        fill="#78716C"
                        textAnchor="middle"
                      >
                        {i * 10}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Real-time Dynamic Hairline Crosshairs tracking cursor */}
              {cursorMm && (
                <>
                  <line
                    x1={padding}
                    y1={cursorMm.y + padding}
                    x2={totalW + padding}
                    y2={cursorMm.y + padding}
                    stroke="#2563EB"
                    strokeWidth="0.4"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  <line
                    x1={cursorMm.x + padding}
                    y1={padding}
                    x2={cursorMm.x + padding}
                    y2={totalH + padding}
                    stroke="#2563EB"
                    strokeWidth="0.4"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  <polygon
                    points={`${cursorMm.x + padding - 2},${padding - 14} ${cursorMm.x + padding + 2},${padding - 14} ${cursorMm.x + padding},${padding - 10}`}
                    fill="#2563EB"
                  />
                  <polygon
                    points={`${padding - 14},${cursorMm.y + padding - 2} ${padding - 14},${cursorMm.y + padding + 2} ${padding - 10},${cursorMm.y + padding}`}
                    fill="#2563EB"
                  />
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Right Live CAD Cursor Coordinate Badge */}
      {cursorMm && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none bg-stone-900/90 text-white font-mono text-[10px] px-2.5 py-1 rounded-squircle-sm backdrop-blur-md shadow-tactile border border-white/20">
          <span className="text-library-accent font-bold">CAD:</span> X: {cursorMm.x} mm | Y:{" "}
          {cursorMm.y} mm
        </div>
      )}

      {/* Bottom Legend Layer Toggles */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-stone-200 shadow-tactile text-[11px] text-stone-600">
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-900">
          <input
            type="checkbox"
            checked={showLayers.cut}
            onChange={(e) => setShowLayers({ ...showLayers, cut: e.target.checked })}
            className="w-3 h-3 rounded accent-red-600 cursor-pointer"
          />
          <span className="w-2.5 h-0.5 bg-[#E53E3E] rounded-full inline-block" />
          <span>Nét cắt dao</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-900">
          <input
            type="checkbox"
            checked={showLayers.crease}
            onChange={(e) => setShowLayers({ ...showLayers, crease: e.target.checked })}
            className="w-3 h-3 rounded accent-library-accent cursor-pointer"
          />
          <span className="w-2.5 h-0.5 border-b border-dashed border-[#3182CE] inline-block" />
          <span>Nếp cấn gập</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-900">
          <input
            type="checkbox"
            checked={showLayers.bleed}
            onChange={(e) => setShowLayers({ ...showLayers, bleed: e.target.checked })}
            className="w-3 h-3 rounded accent-emerald-600 cursor-pointer"
          />
          <span className="w-2.5 h-0.5 border-b border-dotted border-[#38A169] inline-block" />
          <span>Tràn lề (Bleed ≥2mm)</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer hover:text-stone-900">
          <input
            type="checkbox"
            checked={showLayers.safeMargin}
            onChange={(e) => setShowLayers({ ...showLayers, safeMargin: e.target.checked })}
            className="w-3 h-3 rounded accent-amber-500 cursor-pointer"
          />
          <span className="w-2.5 h-0.5 border-b border-dashed border-[#D97706] inline-block" />
          <span>Vùng an toàn (≥3mm)</span>
        </label>
      </div>

      {/* Pretext Add Text Modal */}
      {showAddTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 border border-stone-200 shadow-tactile-lg">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="font-landing-heading font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <Type className="w-4 h-4 text-library-accent" />
                <span>Thêm Văn Bản / Lời Chúc Mừng</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Pretext Engine
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Chọn mặt hộp muốn in chữ:
                </label>
                <select
                  value={activePanelId}
                  onChange={(e) => onSelectPanel?.(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-squircle bg-stone-50 border border-stone-200 text-stone-800"
                >
                  {dieline.panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatMm(p.bounds.width)}×{formatMm(p.bounds.height)}mm)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nội dung chữ:
                </label>
                <textarea
                  rows={3}
                  value={newTextValue}
                  onChange={(e) => setNewTextValue(e.target.value)}
                  placeholder="Ví dụ: Chúc mừng sinh nhật Mai Anh ❤️..."
                  className="w-full p-2.5 text-xs rounded-squircle bg-stone-50 border border-stone-200 focus:outline-none focus:border-library-accent text-stone-900"
                />
              </div>

              <div className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-squircle border border-stone-100 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-library-accent flex-shrink-0 mt-0.5" />
                <span>
                  Công nghệ <strong>Pretext Layout</strong> tự động tính toán số dòng và ngắt câu vừa vặn
                  theo milimet của mặt hộp mà không làm đơ giật trình duyệt.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowAddTextModal(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="px-4 py-1.5 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-xs font-semibold shadow-tactile transition"
              >
                Chèn Vào Mặt Hộp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
