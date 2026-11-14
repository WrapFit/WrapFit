"use client";

import { stageBarButton } from "@/features/studio/components/studioUi";
import React, { useEffect, useId, useMemo, useState, useRef } from "react";
import {
  BLEED_BOX_MM,
  canMoveLayer,
  duplicateElements,
  envelopeOf,
  resizeBox,
  selectionOf,
  snapBox,
  type Handle,
  type SnapLine,
  FINISH_SPOTS,
  DielineGeometry,
  CanvasElement,
  isBackground,
  isMovable,
  matchesPanel,
  moveLayer,
  newElementId,
  orderElements,
  panelPrintBox,
  safeMarginsOf,
  SAFE_MARGIN_CUT_MM,
  SAFE_MARGIN_CREASE_MM,
  sideOf,
  type LayerMove,
  type PrintSide,
} from "@wrapfit/shared";
import { ZoomIn, ZoomOut, Maximize2, RotateCw, Trash2, Type, Move, Sparkles, Info } from "lucide-react";
import { layoutBoxText, useBoxFonts } from "./boxText";
import { ArtShapes, elementArt } from "../library/elementArt";
import { FramedImage, TextVisual, useImageSizes } from "./elementVisuals";
import { formatMm } from "@/features/studio/utils/dieline";
import { elementLabel } from "@/features/studio/utils/elementLabel";
import { sheetPath } from "@/features/studio/utils/dielineOutline";
import { printFontOf, textBlockHeight } from "@wrapfit/shared";
import { Checkbox } from "@/components/ui";
import { useCtrlWheelZoom } from "@/hooks/dom";

/** Font of the texts added with "Thêm Chữ" (a print font, so the PDF embeds it). */
const NEW_TEXT_STYLE = { fontFamily: "Cormorant Garamond, serif", fontSize: 12, color: "#1A362B" };
/** FitCheck safe margin (5 mm from a cut line) with room to spare: new texts start this far inside the panel. */
const NEW_TEXT_MARGIN_MM = SAFE_MARGIN_CUT_MM + 1;
/** Loaded ahead, so the first text added is measured with its real font. */
const NEW_TEXT_FONTS = [printFontOf(NEW_TEXT_STYLE.fontFamily)];
/** Bleed of the print file: the artwork may run this far past the cut lines. */
const BLEED_MM = BLEED_BOX_MM;


/** Layers of the dieline that can be hidden. */
export interface DielineLayers {
  cut: boolean;
  crease: boolean;
  bleed: boolean;
  safeMargin: boolean;
  dimensions: boolean;
  /** 5 mm grid on the sheet; moved layers snap to it (docs/23 S12). */
  grid: boolean;
}

export const DEFAULT_DIELINE_LAYERS: DielineLayers = { cut: true, crease: true, bleed: true, safeMargin: true, dimensions: true, grid: false };

/** Grid step of the sheet, mm. */
const GRID_MM = 5;
/** Distance under which a moved layer snaps to a guide, an edge or the grid, mm. */
const SNAP_MM = 1.5;

const LEGEND_LAYERS = [
  { key: "cut", label: "Nét cắt", hint: "Nét cắt dao", swatch: "h-0.5 bg-dieline-cut rounded-full" },
  { key: "crease", label: "Nếp gấp", hint: "Nếp cấn gập", swatch: "h-0 border-b-2 border-dashed border-dieline-crease" },
  { key: "bleed", label: "Tràn lề", hint: "Tràn lề ≥ 2 mm", swatch: "h-0 border-b-2 border-dotted border-dieline-bleed" },
  { key: "safeMargin", label: "Vùng an toàn", hint: `Vùng an toàn ≥ ${SAFE_MARGIN_CUT_MM} mm từ nét cắt, ${SAFE_MARGIN_CREASE_MM} mm từ nếp gấp`, swatch: "h-0 border-b-2 border-dashed border-warning" },
  { key: "grid", label: "Lưới", hint: "Lưới 5 mm (phần tử bắt dính vào lưới)", swatch: "h-2 border border-dashed border-line-strong" },
] as const;

/** The legend of the dieline lines as a row of chips; each chip shows or hides its layer. */
export function DielineLayerLegend({
  layers,
  onChange,
  className = "",
}: {
  layers: DielineLayers;
  onChange(layers: DielineLayers): void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Lớp khuôn bế" className={`flex items-center gap-0.5 rounded-full bg-surface-raised/85 p-1 ring-1 ring-line/70 ${className}`}>
      {LEGEND_LAYERS.map((layer) => {
        const on = layers[layer.key];
        return (
          <button
            key={layer.key}
            type="button"
            aria-pressed={on}
            aria-label={layer.hint}
            onClick={() => onChange({ ...layers, [layer.key]: !on })}
            title={on ? `Ẩn lớp ${layer.hint}` : `Hiện lớp ${layer.hint}`}
            className={`flex min-h-8 items-center whitespace-nowrap rounded-full px-2.5 text-caption outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 ${
              on ? "text-fg hover:bg-surface-sunken" : "text-fg-muted line-through decoration-fg-muted/60 hover:bg-surface-sunken"
            }`}
          >
            <span className={`inline-block w-4 ${layer.swatch} ${on ? "" : "opacity-40"}`} aria-hidden />
            <span className="ml-1.5">{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface DielineCanvas2DProps {
  dieline: DielineGeometry;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  elements?: CanvasElement[];
  onElementsChange?: (elements: CanvasElement[]) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  /** Every selected layer (docs/23 S12); `selectedElementId` alone when omitted. */
  selectedIds?: string[];
  onSelectIds?: (ids: string[]) => void;
  backgroundPatternSvg?: string | null;
  activePanelId?: string;
  onSelectPanel?: (panelId: string) => void;
  showRulers?: boolean;
  /** Elements FitCheck flags (margin, bleed, glue…): drawn with a red badge. */
  flaggedElementIds?: ReadonlySet<string>;
  /**
   * `card` (default): a framed card with its own top bar (zoom) and bottom bar (layers, cursor). `stage`: no frame and
   * no bars, the dieline floats on the page's backdrop; the page owns the zoom and the layers sit in a floating legend.
   */
  variant?: "card" | "stage";
  /** Opens the "Thêm chữ" composer from outside (a tool dock); uncontrolled when omitted. */
  textComposerOpen?: boolean;
  onTextComposerOpenChange?: (open: boolean) => void;
  /** Side of the sheet on screen: the outside (default) or the inside (docs/23 S5). */
  side?: PrintSide;
  className?: string;
}

/** What the pointer is doing (docs/23 S8, S12). Points are SVG coordinates (mm, padding included). */
type DragState =
  | {
      mode: "move";
      startPointerMm: { x: number; y: number };
      starts: Record<string, { x: number; y: number }>;
      primaryId: string;
      /** A click (no move) on a layer of a larger selection selects that layer (or its group) alone, like Canva. */
      collapseTo: string[] | null;
    }
  | {
      mode: "resize";
      elementId: string;
      handle: Handle;
      startPointerMm: { x: number; y: number };
      start: { x: number; y: number; width: number; height: number; rotation: number };
      startFontSize?: number;
      /** Print resolution of a raster when the drag started (recomputed from it, never from a rounded value). */
      startDpi?: number;
    }
  | { mode: "rotate"; elementId: string; center: { x: number; y: number }; startRotation: number; startAngle: number }
  | { mode: "marquee"; start: { x: number; y: number }; current: { x: number; y: number } }
  | { mode: "guide"; guideId: number };

/** The 8 resize handles, clockwise from the top-left corner. */
const HANDLES: { key: string; handle: Handle; cursor: string }[] = [
  { key: "tl", handle: { sx: -1, sy: -1 }, cursor: "cursor-nwse-resize" },
  { key: "t", handle: { sx: 0, sy: -1 }, cursor: "cursor-ns-resize" },
  { key: "tr", handle: { sx: 1, sy: -1 }, cursor: "cursor-nesw-resize" },
  { key: "r", handle: { sx: 1, sy: 0 }, cursor: "cursor-ew-resize" },
  { key: "br", handle: { sx: 1, sy: 1 }, cursor: "cursor-nwse-resize" },
  { key: "b", handle: { sx: 0, sy: 1 }, cursor: "cursor-ns-resize" },
  { key: "bl", handle: { sx: -1, sy: 1 }, cursor: "cursor-nesw-resize" },
  { key: "l", handle: { sx: -1, sy: 0 }, cursor: "cursor-ew-resize" },
];

const PHOTO_TYPES = new Set<CanvasElement["type"]>(["image", "logo", "pattern"]);
const round1 = (value: number) => Math.round(value * 10) / 10;

export const DielineCanvas2D: React.FC<DielineCanvas2DProps> = ({
  dieline,
  scale = 1.0,
  onScaleChange,
  elements = [],
  onElementsChange,
  selectedElementId,
  onSelectElement,
  selectedIds,
  onSelectIds,
  backgroundPatternSvg,
  activePanelId = "panel_front",
  onSelectPanel,
  showRulers = true,
  flaggedElementIds,
  variant = "card",
  textComposerOpen,
  onTextComposerOpenChange,
  side = "outside",
  className = "",
}) => {
  const isStage = variant === "stage";
  const [showLayers, setShowLayers] = useState<DielineLayers>(DEFAULT_DIELINE_LAYERS);

  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, "");
  const [hoveredPanelId, setHoveredPanelId] = useState<string | null>(null);
  const sheet = useMemo(() => sheetPath(dieline), [dieline]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [newTextValue, setNewTextValue] = useState<string>("");
  const [ownTextComposerOpen, setOwnTextComposerOpen] = useState<boolean>(false);
  const showAddTextModal = textComposerOpen ?? ownTextComposerOpen;
  const setShowAddTextModal = (open: boolean) => {
    setOwnTextComposerOpen(open);
    onTextComposerOpenChange?.(open);
  };
  // Changes once the fonts of the texts are loaded: texts first measured with a fallback font are laid out again.
  // Fonts of the texts, of the library art (stickers, labels) and of the next text added.
  const artFonts = useMemo(
    () => [...NEW_TEXT_FONTS, ...elements.flatMap((el) => elementArt(el)?.texts.map((t) => t.font) ?? [])],
    [elements]
  );
  const fontsVersion = useBoxFonts(elements, artFonts);
  // Re-renders once the sizes of cropped photos are known (docs/23 S10).
  const imagesVersion = useImageSizes(elements);

  const { width: totalW, height: totalH } = dieline.totalBoundingBox;
  const padding = 20; // 20 mm around the sheet: the 14 mm rulers and the bleed fit, the dieline gets the rest
  const viewBoxW = totalW + 2 * padding;
  const viewBoxH = totalH + 2 * padding;

  const selectedEl = elements.find((e) => e.id === selectedElementId && !isBackground(e));
  // Every selected layer: a click selects one layer (or its group), Shift + click adds / removes, a drag on the empty
  // sheet selects what the rectangle touches (docs/23 S12).
  const selection = selectedIds ?? (selectedElementId ? [selectedElementId] : []);
  const select = (ids: string[], primary?: string | null) => {
    onSelectIds?.(ids);
    onSelectElement?.(primary !== undefined ? primary : (ids[ids.length - 1] ?? null));
  };
  // Lines the moved layer snapped to, the marquee, the ruler guides (sheet mm) and the text being edited in place.
  const [snapHits, setSnapHits] = useState<SnapLine[]>([]);
  const [guides, setGuides] = useState<{ id: number; axis: "x" | "y"; at: number }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  // Right-click menu of a layer, at the pointer (px from the top-left of the canvas root).
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [menu]);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Is the sheet point (mm in the SVG, padding included) inside the turned box of the element? */
  const contains = (el: CanvasElement, pt: { x: number; y: number }) => {
    const panel = dieline.panels.find((p) => matchesPanel(p, el.panelId));
    if (!panel) return false;
    const cx = panel.bounds.x + el.x + el.width / 2 + padding;
    const cy = panel.bounds.y + el.y + el.height / 2 + padding;
    const a = (-(el.rotation || 0) * Math.PI) / 180;
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) <= el.width / 2 && Math.abs(ly) <= el.height / 2;
  };

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

  // Pointer down on a layer or one of its handles: select, then move, resize or turn it.
  const handleElementPointerDown = (
    e: React.PointerEvent,
    el: CanvasElement,
    mode: "move" | "resize" | "rotate" = "move",
    handle?: Handle
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button === 2) return; // the context menu handles right-clicks
    const pt = getSvgCoordinates(e.clientX, e.clientY);

    if (mode === "move") {
      if (e.altKey && onSelectElement) {
        const hits = orderElements(elements)
          .filter((item) => !item.hidden && !isBackground(item) && sideOf(item) === side && contains(item, pt))
          .reverse(); // top first
        if (hits.length > 1) {
          const current = hits.findIndex((item) => item.id === selectedElementId);
          select([hits[(current + 1) % hits.length].id]);
          return;
        }
      }
      const group = selectionOf(elements, el.id);
      if (e.shiftKey) {
        const has = group.every((id) => selection.includes(id));
        const next = has ? selection.filter((id) => !group.includes(id)) : [...new Set([...selection, ...group])];
        select(next, has ? (next[next.length - 1] ?? null) : el.id);
        return;
      }
      const ids = selection.includes(el.id) ? selection : group;
      select(ids, el.id);
      const movers = elements.filter((item) => ids.includes(item.id) && isMovable(item));
      if (!movers.length || !onElementsChange) return;
      const collapseTo = selection.includes(el.id) && selection.length > group.length ? group : null;
      setDragState({ mode: "move", startPointerMm: pt, starts: Object.fromEntries(movers.map((m) => [m.id, { x: m.x, y: m.y }])), primaryId: el.id, collapseTo });
      return;
    }

    if (!isMovable(el) || !onElementsChange) return;
    const panel = dieline.panels.find((p) => matchesPanel(p, el.panelId));
    if (!panel) return;
    if (mode === "rotate") {
      const center = { x: panel.bounds.x + el.x + el.width / 2 + padding, y: panel.bounds.y + el.y + el.height / 2 + padding };
      setDragState({ mode: "rotate", elementId: el.id, center, startRotation: el.rotation || 0, startAngle: Math.atan2(pt.y - center.y, pt.x - center.x) });
      return;
    }
    setDragState({
      mode: "resize",
      elementId: el.id,
      handle: handle ?? { sx: 1, sy: 1 },
      startPointerMm: pt,
      start: { x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation || 0 },
      startFontSize: el.style?.fontSize,
      startDpi: el.dpi,
    });
  };

  /** Lines a layer moving on `panel` snaps to, in panel coordinates: the face, its safe area, other layers, guides, grid. */
  const snapLinesFor = (panel: DielineGeometry["panels"][number], moving: string[], box: { x: number; y: number; width: number; height: number }): SnapLine[] => {
    const { width, height } = panel.bounds;
    const m = safeMarginsOf(panel, dieline);
    const lines: SnapLine[] = [
      { axis: "x", at: 0 }, { axis: "x", at: width / 2 }, { axis: "x", at: width },
      { axis: "y", at: 0 }, { axis: "y", at: height / 2 }, { axis: "y", at: height },
      { axis: "x", at: m.left }, { axis: "x", at: width - m.right }, { axis: "y", at: m.top }, { axis: "y", at: height - m.bottom },
    ];
    for (const other of elements) {
      if (moving.includes(other.id) || other.hidden || isBackground(other) || sideOf(other) !== side || !matchesPanel(panel, other.panelId)) continue;
      const env = envelopeOf(other);
      lines.push({ axis: "x", at: env.x }, { axis: "x", at: env.x + env.width / 2 }, { axis: "x", at: env.x + env.width });
      lines.push({ axis: "y", at: env.y }, { axis: "y", at: env.y + env.height / 2 }, { axis: "y", at: env.y + env.height });
    }
    for (const guide of guides) lines.push({ axis: guide.axis, at: guide.at - (guide.axis === "x" ? panel.bounds.x : panel.bounds.y) });
    if (showLayers.grid) {
      // The grid lines nearest to the edges of the box (sheet coordinates), as panel lines.
      for (const x of [box.x, box.x + box.width]) lines.push({ axis: "x", at: Math.round((panel.bounds.x + x) / GRID_MM) * GRID_MM - panel.bounds.x });
      for (const y of [box.y, box.y + box.height]) lines.push({ axis: "y", at: Math.round((panel.bounds.y + y) / GRID_MM) * GRID_MM - panel.bounds.y });
    }
    return lines;
  };

  // Pointer move over the sheet: the crosshair, then the current drag.
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getSvgCoordinates(e.clientX, e.clientY);
    const mmX = Math.round(pt.x - padding);
    const mmY = Math.round(pt.y - padding);
    // The measuring guides follow the pointer only over the sheet (and its rulers): outside it they would float in the
    // empty part of a wide stage.
    const onSheet = mmX >= 0 && mmY >= 0 && mmX <= viewBoxW - 2 * padding && mmY <= viewBoxH - 2 * padding;
    setCursorMm(onSheet ? { x: mmX, y: mmY } : null);
    if (!dragState) return;

    if (dragState.mode === "marquee") {
      setDragState({ ...dragState, current: pt });
      return;
    }
    if (dragState.mode === "guide") {
      setGuides((list) => list.map((g) => (g.id === dragState.guideId ? { ...g, at: round1((g.axis === "x" ? pt.x : pt.y) - padding) } : g)));
      return;
    }
    if (!onElementsChange) return;

    if (dragState.mode === "move") {
      let dx = pt.x - dragState.startPointerMm.x;
      let dy = pt.y - dragState.startPointerMm.y;
      const primary = elements.find((item) => item.id === dragState.primaryId);
      const start = dragState.starts[dragState.primaryId];
      const panel = primary && dieline.panels.find((p) => matchesPanel(p, primary.panelId));
      // Alt moves freely; otherwise the box snaps to the face, the safe area, other layers, guides and the grid.
      if (primary && start && panel && !e.altKey) {
        const box = envelopeOf({ ...primary, x: start.x + dx, y: start.y + dy });
        const snap = snapBox(box, snapLinesFor(panel, Object.keys(dragState.starts), box), SNAP_MM);
        dx += snap.dx;
        dy += snap.dy;
        setSnapHits(snap.hits.map((hit) => ({ axis: hit.axis, at: hit.at + (hit.axis === "x" ? panel.bounds.x : panel.bounds.y) + padding })));
      } else {
        setSnapHits([]);
      }
      // The layers keep their faces (docs/23 D5): what leaves the face + bleed is cut, FitCheck flags it.
      const next = elements.map((item) => {
        const from = dragState.starts[item.id];
        return from ? { ...item, x: round1(from.x + dx), y: round1(from.y + dy) } : item;
      });
      if (next.some((item, i) => item !== elements[i] && (item.x !== elements[i].x || item.y !== elements[i].y))) onElementsChange(next);
      return;
    }

    const el = elements.find((item) => item.id === dragState.elementId);
    if (!el) return;
    if (dragState.mode === "rotate") {
      const angle = Math.atan2(pt.y - dragState.center.y, pt.x - dragState.center.x);
      let rotation = dragState.startRotation + ((angle - dragState.startAngle) * 180) / Math.PI;
      if (e.shiftKey) rotation = Math.round(rotation / 15) * 15; // Shift: steps of 15°
      rotation = round1(((((rotation + 180) % 360) + 360) % 360) - 180);
      if (rotation !== el.rotation) onElementsChange(elements.map((item) => (item.id === el.id ? { ...item, rotation } : item)));
      return;
    }

    // Resize in the element's own (turned) axes; photos and corners of texts keep their proportions.
    const dx = pt.x - dragState.startPointerMm.x;
    const dy = pt.y - dragState.startPointerMm.y;
    const a = (-dragState.start.rotation * Math.PI) / 180;
    const local = { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
    const corner = !!dragState.handle.sx && !!dragState.handle.sy;
    const textCorner = el.type === "text" && corner;
    const box = resizeBox(dragState.start, dragState.handle, local, {
      keepRatio: e.shiftKey !== (corner && (PHOTO_TYPES.has(el.type) || textCorner)),
      fromCenter: e.altKey,
      min: 1,
    });
    // A text dragged by a corner scales its letters too (like Canva); by a side it only rewraps.
    const fontSize = textCorner && dragState.startFontSize ? round1((dragState.startFontSize * box.width) / dragState.start.width) : undefined;
    onElementsChange(
      elements.map((item) =>
        item.id === el.id
          ? {
              ...item,
              ...box,
              ...(fontSize ? { style: { ...item.style, fontSize } } : {}),
              // A raster printed bigger has fewer pixels per inch: FitCheck reads the DPI at the new size.
              ...(dragState.startDpi ? { dpi: Math.round((dragState.startDpi * dragState.start.width) / box.width) } : {}),
            }
          : item
      )
    );
  };

  // Pointer up: ends the drag; a marquee selects what it touches; a guide dropped off the sheet is removed.
  const handleSvgPointerUp = () => {
    if (!dragState) return;
    if (dragState.mode === "marquee") {
      const [x1, x2] = [Math.min(dragState.start.x, dragState.current.x), Math.max(dragState.start.x, dragState.current.x)];
      const [y1, y2] = [Math.min(dragState.start.y, dragState.current.y), Math.max(dragState.start.y, dragState.current.y)];
      if (x2 - x1 < 1.5 && y2 - y1 < 1.5) {
        if (selection.length) select([], null); // a click on the empty sheet clears the selection
      } else {
        const ids = elements
          .filter((item) => {
            const panel = dieline.panels.find((p) => matchesPanel(p, item.panelId));
            if (!panel || item.hidden || isBackground(item) || sideOf(item) !== side) return false;
            const env = envelopeOf(item);
            const [ex, ey] = [panel.bounds.x + env.x + padding, panel.bounds.y + env.y + padding];
            return ex < x2 && ex + env.width > x1 && ey < y2 && ey + env.height > y1;
          })
          .map((item) => item.id);
        select(ids);
      }
    } else if (dragState.mode === "guide") {
      setGuides((list) => list.filter((g) => g.id !== dragState.guideId || (g.at > 0 && g.at < (g.axis === "x" ? totalW : totalH))));
    } else if (dragState.mode === "move") {
      const el = elements.find((item) => item.id === dragState.primaryId);
      if (el && onSelectPanel) onSelectPanel(el.panelId);
      const still = elements.every((item) => !dragState.starts[item.id] || (item.x === dragState.starts[item.id].x && item.y === dragState.starts[item.id].y));
      if (still && dragState.collapseTo) select(dragState.collapseTo, dragState.primaryId);
    }
    setSnapHits([]);
    setDragState(null);
  };

  // Pointer down on the empty sheet: starts a selection rectangle.
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || !onSelectElement || !onElementsChange) return;
    const pt = getSvgCoordinates(e.clientX, e.clientY);
    setDragState({ mode: "marquee", start: pt, current: pt });
  };

  // Pointer down on a ruler: a new guide, dragged into place (drop it back on the ruler to remove it).
  const startGuide = (e: React.PointerEvent, axis: "x" | "y") => {
    e.stopPropagation();
    e.preventDefault();
    const pt = getSvgCoordinates(e.clientX, e.clientY);
    const id = Date.now();
    setGuides((list) => [...list, { id, axis, at: round1((axis === "x" ? pt.x : pt.y) - padding) }]);
    setDragState({ mode: "guide", guideId: id });
  };

  // Text edited in place (double-click), committed on blur or Ctrl + Enter.
  const commitEditing = () => {
    if (editingId && onElementsChange) {
      const text = editingText.replace(/\s+$/, "");
      onElementsChange(text ? elements.map((item) => (item.id === editingId ? { ...item, content: text } : item)) : elements.filter((item) => item.id !== editingId));
    }
    setEditingId(null);
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    
    if (onScaleChange) {
      const next = Math.min(2.5, Math.max(0.4, Number((scale + delta).toFixed(2))));
      onScaleChange(next);
    }
  };

  // Ctrl/⌘ + wheel zooms the card. The stage variant is zoomed by the page, which owns that listener.
  const rootRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  useCtrlWheelZoom(
    rootRef,
    (factor) => onScaleChange?.(Math.min(2.5, Math.max(0.4, Number((scaleRef.current * factor).toFixed(3))))),
    !isStage && !!onScaleChange
  );

  const handleResetZoom = () => {
    
    if (onScaleChange) onScaleChange(1.0);
  };

  // Rotate Element
  const handleRotate = (angleDelta: number) => {
    if (!selectedEl || !onElementsChange || selectedEl.locked) return;
    
    const updated = elements.map((el) =>
      el.id === selectedEl.id
        ? { ...el, rotation: (el.rotation + angleDelta) % 360 }
        : el
    );
    onElementsChange(updated);
  };

  // Resize Element via Button
  const handleResize = (multiplier: number) => {
    if (!selectedEl || !onElementsChange || selectedEl.locked) return;
    
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
    if (!selectedEl || !onElementsChange || selectedEl.locked) return;
    
    onElementsChange(elements.filter((el) => el.id !== selectedEl.id));
    if (onSelectElement) onSelectElement(null);
  };

  // Nudge Move
  const handleMove = (dx: number, dy: number) => {
    if (!selectedEl || !onElementsChange || selectedEl.locked) return;
    
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
      ...(side === "inside" ? { side } : {}),
    };

    onElementsChange([...elements, newElement]);
    setNewTextValue("");
    setShowAddTextModal(false);
    if (onSelectElement) onSelectElement(newElement.id);
  };

  return (
    <div
      ref={rootRef}
      className={
        isStage
          ? `relative flex w-full h-full flex-col ${className}`
          : `flex w-full h-full min-h-[560px] flex-col overflow-hidden rounded-sheet bg-surface-raised ring-1 ring-line ${className}`
      }
    >
      {/* Top bar: what the canvas shows, adding text, zoom. Attached to the canvas, nothing floats over the dieline. */}
      {!isStage && (
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-3 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-fg-muted">
          <span className="font-semibold text-fg">Khuôn bế phẳng</span>
          <span className="tabular-nums">
            {formatMm(totalW)} × {formatMm(totalH)} mm
          </span>
          {backgroundPatternSvg && (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-warning" aria-hidden />
              <span className="max-w-[140px] truncate">
                {backgroundPatternSvg.includes("tet")
                  ? "Hoa mai Tết"
                  : backgroundPatternSvg.includes("xmas")
                  ? "Giáng Sinh"
                  : backgroundPatternSvg.includes("botanical")
                  ? "Botanical"
                  : backgroundPatternSvg.includes("gold")
                  ? "Ép kim vàng"
                  : "Hoa văn AI"}
              </span>
            </span>
          )}
        </div>
        <div role="toolbar" aria-label="Khuôn bế" className="flex items-center gap-0.5">
          {/* Add text: not on a read-only canvas (no onElementsChange) */}
          {onElementsChange && (
            <>
              <button type="button" onClick={() => setShowAddTextModal(true)} className={stageBarButton()}>
                <Type className="size-3.5" aria-hidden />
                Thêm chữ
              </button>
              <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
            </>
          )}
          <button type="button" onClick={() => handleZoom(-0.15)} className={stageBarButton()} aria-label="Thu nhỏ" title="Thu nhỏ">
            <ZoomOut className="size-3.5" aria-hidden />
          </button>
          <span className="w-12 select-none text-center text-label-sm tabular-nums text-fg" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button type="button" onClick={() => handleZoom(0.15)} className={stageBarButton()} aria-label="Phóng to" title="Phóng to">
            <ZoomIn className="size-3.5" aria-hidden />
          </button>
          <button type="button" onClick={handleResetZoom} className={stageBarButton()} aria-label="Về 100%" title="Về 100%">
            <Maximize2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      )}

      <div className={`relative flex min-h-0 flex-1 items-center justify-center ${isStage ? "" : "overflow-hidden bg-mist-150 p-2"}`}>
      {/* Cutting mat: fine dot grid with a soft light in the middle (the stage shows the page's own backdrop) */}
      {!isStage && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(#C9D2C3_1px,transparent_1px)] opacity-70 [background-size:14px_14px]" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(255,255,255,0.75),transparent_75%)]" />
        </>
      )}

      {menu && onElementsChange && (() => {
        const target = elements.find((item) => item.id === menu.id);
        if (!target) return null;
        const close = () => setMenu(null);
        const apply = (next: CanvasElement[]) => {
          onElementsChange(next);
          close();
        };
        const others = dieline.panels.filter((p) => !matchesPanel(p, target.panelId));
        const item = "flex min-h-10 w-full items-center gap-2 rounded-control px-3 text-left text-body-sm text-fg hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none disabled:opacity-40";
        const order: [LayerMove, string][] = [
          ["front", "Lên trên cùng"],
          ["forward", "Lên một lớp"],
          ["backward", "Xuống một lớp"],
          ["back", "Xuống dưới cùng"],
        ];
        return (
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Thao tác với ${elementLabel(target)}`}
            className="absolute z-40 max-h-[min(420px,calc(100%-16px))] w-56 overflow-y-auto rounded-panel bg-surface-raised p-1 shadow-popover ring-1 ring-line"
            style={{ left: Math.max(8, menu.x), top: Math.max(8, menu.y) }}
          >
            {order.map(([how, label]) => (
              <button key={how} type="button" role="menuitem" className={item} disabled={!canMoveLayer(elements, target.id, how)} onClick={() => apply(moveLayer(elements, target.id, how))}>
                {label}
              </button>
            ))}
            <div className="my-1 h-px bg-line" role="separator" />
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                const result = duplicateElements(elements, [target.id], (el) => newElementId(el.type));
                apply(result.elements);
                onSelectElement?.(result.ids[0] ?? null);
              }}
            >
              Nhân bản
            </button>
            <button type="button" role="menuitem" className={item} onClick={() => apply(elements.map((el) => (el.id === target.id ? { ...el, locked: !el.locked || undefined } : el)))}>
              {target.locked ? "Mở khóa" : "Khóa lớp"}
            </button>
            <button type="button" role="menuitem" className={item} onClick={() => apply(elements.map((el) => (el.id === target.id ? { ...el, hidden: true } : el)))}>
              Ẩn lớp
            </button>
            {others.length > 0 && !target.locked && (
              <>
                <div className="my-1 h-px bg-line" role="separator" />
                <p className="px-3 pb-0.5 pt-1 text-caption text-fg-muted">Chuyển sang mặt</p>
                {others.map((panel) => (
                  <button
                    key={panel.id}
                    type="button"
                    role="menuitem"
                    className={item}
                    onClick={() =>
                      apply(
                        elements.map((el) =>
                          el.id === target.id
                            ? {
                                ...el,
                                panelId: panel.id,
                                x: Math.round(((panel.bounds.width - el.width) / 2) * 10) / 10,
                                y: Math.round(((panel.bounds.height - el.height) / 2) * 10) / 10,
                              }
                            : el
                        )
                      )
                    }
                  >
                    {panel.name}
                  </button>
                ))}
              </>
            )}
            <div className="my-1 h-px bg-line" role="separator" />
            <button
              type="button"
              role="menuitem"
              className={`${item} text-danger-fg`}
              disabled={!!target.locked}
              onClick={() => {
                apply(elements.filter((el) => el.id !== target.id));
                onSelectElement?.(null);
              }}
            >
              Xóa
            </button>
          </div>
        );
      })()}

      {side === "inside" && (
        <p className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-fg/85 px-3 py-1 text-caption font-semibold text-fg-inverse">
          Mặt trong · khuôn nhìn từ trong hộp ra (đã lật gương)
        </p>
      )}

      {/* FLOATING GIZMO TOOLBAR FOR SELECTED ELEMENT
          Bottom-centre, clear of the flaps and rulers; one line while it fits. */}
      {selectedEl && !isStage && (
        <div className={`absolute ${isStage ? "bottom-2" : "bottom-6"} left-1/2 -translate-x-1/2 z-30 flex w-max max-w-[calc(100%-1rem)] flex-wrap items-center gap-2 bg-landing-ink/95 text-white backdrop-blur-xl px-4 py-2 rounded-2xl shadow-popover ring-1 ring-white/10 text-xs animate-fadeIn`}>
          <div className="flex items-center gap-2 pr-2.5 border-r border-white/20">
            <Move className="w-3.5 h-3.5 text-fpt-orange-ink animate-pulse" />
            <span className="font-semibold text-fpt-orange-ink truncate max-w-[110px]">
              {elementLabel(selectedEl)}
            </span>
            <span className="font-mono text-cad-spec-micro text-landing-muted">
              {formatMm(selectedEl.width)}×{formatMm(selectedEl.height)}mm
            </span>
          </div>

          {/* Micro Move arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleMove(-2, 0)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-caption"
              title="Sang trái 2mm"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => handleMove(2, 0)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-caption"
              title="Sang phải 2mm"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => handleMove(0, -2)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-caption"
              title="Lên trên 2mm"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleMove(0, 2)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition text-caption"
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
              className="px-2 py-1 rounded hover:bg-white/20 transition flex items-center gap-1 text-caption"
              title="Xoay 45 độ"
            >
              <RotateCw className="w-3 h-3" />
              <span>45°</span>
            </button>
            <button
              type="button"
              onClick={() => handleRotate(90)}
              className="px-2 py-1 rounded hover:bg-white/20 transition flex items-center gap-1 text-caption"
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
              className="px-2 py-0.5 rounded hover:bg-white/20 text-cad-spec-micro font-mono"
              title="Thu nhỏ 10%"
            >
              -10%
            </button>
            <button
              type="button"
              onClick={() => handleResize(1.1)}
              className="px-2 py-0.5 rounded hover:bg-white/20 text-cad-spec-micro font-mono"
              title="Phóng to 10%"
            >
              +10%
            </button>
          </div>

          {/* Delete Action */}
          <button
            type="button"
            onClick={handleDeleteElement}
            className="p-1.5 hover:bg-danger/80 rounded-full transition text-red-300 hover:text-white ml-1.5"
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
          className={`relative w-full h-full max-h-[94%] ${
            dragState ? "cursor-grabbing" : "cursor-default"
          }`}
          onPointerDown={handleSvgPointerDown}
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

          {/* The die-cut sheet: its outline (cut lines joined), the artwork area (outline + 2 mm bleed) and a ring
              exactly 2 mm outside it for the bleed line. */}
          <defs>
            <filter id={`${uid}-shadow`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1.6" stdDeviation="2.4" floodColor="#0F172A" floodOpacity="0.12" />
            </filter>
            <mask id={`${uid}-art`} maskUnits="userSpaceOnUse">
              <path d={sheet} transform={`translate(${padding} ${padding})`} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={BLEED_MM * 2} strokeLinejoin="round" />
            </mask>
            <mask id={`${uid}-ring`} maskUnits="userSpaceOnUse">
              <g transform={`translate(${padding} ${padding})`} strokeLinejoin="round">
                <path d={sheet} fill="none" stroke="#FFFFFF" strokeWidth={BLEED_MM * 2 + 0.9} />
                <path d={sheet} fill="#000000" stroke="#000000" strokeWidth={BLEED_MM * 2 - 0.9} />
              </g>
            </mask>
            <pattern id={`${uid}-bleed-dots`} width="2.2" height="2.2" patternUnits="userSpaceOnUse">
              <circle cx="1.1" cy="1.1" r="0.6" fill="#38A169" />
            </pattern>
            <pattern id={`${uid}-glue`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="3" stroke="#94A3B8" strokeWidth="0.6" strokeOpacity="0.55" />
            </pattern>
          </defs>

          {/* Layer 0: the paper itself, lifted off the cutting mat */}
          <path
            d={sheet}
            transform={`translate(${padding} ${padding})`}
            fill="#FFFFFF"
            filter={`url(#${uid}-shadow)`}
            className="pointer-events-none"
          />

          {/* Layer 1: Background AI / Festive Pattern, on the sheet and its bleed only */}
          {backgroundPatternSvg && (
            <rect
              x={padding - BLEED_MM}
              y={padding - BLEED_MM}
              width={totalW + BLEED_MM * 2}
              height={totalH + BLEED_MM * 2}
              mask={`url(#${uid}-art)`}
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

          {/* Windows and hand holes: cut out, nothing printed there remains (FitCheck UNDER_OPENING, docs/23 S17) */}
          {dieline.openings?.map((opening, index) => (
            <g key={`opening_${index}`} className="pointer-events-none">
              <rect
                x={opening.x + padding}
                y={opening.y + padding}
                width={opening.width}
                height={opening.height}
                rx={opening.radius}
                fill={opening.kind === "window" ? "#E0F2FE" : "#F1F5F9"}
                fillOpacity={0.7}
              />
              {opening.kind === "window" && opening.width >= 24 && (
                <text
                  x={opening.x + padding + opening.width / 2}
                  y={opening.y + padding + opening.height / 2}
                  fontSize="3.4"
                  fontWeight="600"
                  fill="#0369A1"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  CỬA SỔ (MÀNG PET)
                </text>
              )}
            </g>
          ))}

          {/* Glue flaps: no ink there (FitCheck GLUE_CONTAMINATED), hatched like on a die maker's drawing */}
          {dieline.glueAreas?.map((area, index) => (
            <g key={`glue_${index}`} className="pointer-events-none">
              <rect
                x={area.x + padding}
                y={area.y + padding}
                width={area.width}
                height={area.height}
                fill="#F8FAFC"
              />
              <rect
                x={area.x + padding}
                y={area.y + padding}
                width={area.width}
                height={area.height}
                fill={`url(#${uid}-glue)`}
              />
              {area.width >= 8 && area.height >= 14 && (
                <text
                  x={area.x + padding + area.width / 2}
                  y={area.y + padding + area.height / 2}
                  fontSize="3.4"
                  fontWeight="600"
                  fill="#64748B"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={
                    area.height > area.width
                      ? `rotate(-90 ${area.x + padding + area.width / 2} ${area.y + padding + area.height / 2})`
                      : undefined
                  }
                  style={{ fontFamily: "var(--font-landing-body), Inter, sans-serif" }}
                >
                  Mép dán keo
                </text>
              )}
            </g>
          ))}

          {/* Bleed line, 2 mm outside the cut */}
          {showLayers.bleed && (
            <rect
              x={padding - BLEED_MM - 1}
              y={padding - BLEED_MM - 1}
              width={totalW + BLEED_MM * 2 + 2}
              height={totalH + BLEED_MM * 2 + 2}
              fill={`url(#${uid}-bleed-dots)`}
              mask={`url(#${uid}-ring)`}
              className="pointer-events-none"
            />
          )}

          {/* Layer 2: Panels Surface & Safe Margins */}
          {dieline.panels.map((panel) => {
            const px = panel.bounds.x + padding;
            const py = panel.bounds.y + padding;
            const pw = panel.bounds.width;
            const ph = panel.bounds.height;
            // FitCheck safe area: 5 mm inside the cut lines, 3 mm inside the folds.
            const safe = safeMarginsOf(panel, dieline);
            const safeInset = Math.min(safe.top, safe.left);
            const isPanelActive = panel.id === activePanelId;
            const isHovered = panel.id === hoveredPanelId;
            // Labels scale with the panel, within a readable range (mm of the sheet).
            const labelSize = Math.min(5, Math.max(3, Math.min(pw, ph) / 9));
            const showLabel = showLayers.dimensions && pw >= labelSize * 6 && ph >= labelSize * 3.2;

            return (
              <g
                key={panel.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectPanel) onSelectPanel(panel.id);
                }}
                onPointerEnter={() => setHoveredPanelId(panel.id)}
                onPointerLeave={() => setHoveredPanelId((current) => (current === panel.id ? null : current))}
                className="cursor-pointer"
              >
                {/* Panel surface: clear on the paper, lime tint when selected */}
                <rect
                  x={px}
                  y={py}
                  width={pw}
                  height={ph}
                  fill={isPanelActive ? "rgba(242, 101, 34, 0.16)" : isHovered ? "rgba(15, 23, 42, 0.035)" : "rgba(255, 255, 255, 0)"}
                  stroke={isPanelActive ? "#F26522" : "none"}
                  strokeWidth="0.8"
                  className="transition-[fill] duration-150"
                />

                {/* Safe margin (≥ 5 mm from cuts, ≥ 3 mm from folds), strongest on the selected panel */}
                {showLayers.safeMargin && pw > safe.left + safe.right + 2 && ph > safe.top + safe.bottom + 2 && (
                  <rect
                    x={px + safe.left}
                    y={py + safe.top}
                    width={pw - safe.left - safe.right}
                    height={ph - safe.top - safe.bottom}
                    fill="none"
                    stroke="#D97706"
                    strokeOpacity={isPanelActive ? 0.9 : isHovered ? 0.55 : 0.28}
                    strokeWidth="0.4"
                    strokeDasharray="1.6 1.6"
                    className="pointer-events-none"
                  />
                )}

                {/* Panel name and size, a small tag in the corner */}
                {showLabel && (
                  <g className="pointer-events-none select-none" style={{ fontFamily: "var(--font-landing-body), Inter, sans-serif" }}>
                    {/* Frosted tag behind the text, so it reads over any artwork */}
                    <rect
                      x={px + safeInset}
                      y={py + safeInset}
                      width={Math.min(pw - 2 * safeInset, Math.max(panel.name.length * labelSize * 0.56, 15 * labelSize * 0.5) + 2.4)}
                      height={labelSize * 2.75}
                      rx={1.4}
                      fill="#FFFFFF"
                      fillOpacity={isPanelActive ? 0.95 : 0.82}
                    />
                    <text
                      x={px + safeInset + 1.2}
                      y={py + safeInset + labelSize + 0.6}
                      fontSize={labelSize}
                      fontWeight={isPanelActive ? 700 : 600}
                      fill={isPanelActive ? "#152B07" : "#475569"}
                      fillOpacity={isPanelActive || isHovered ? 1 : 0.75}
                    >
                      {panel.name}
                    </text>
                    <text
                      x={px + safeInset + 1.2}
                      y={py + safeInset + labelSize * 2.15 + 0.6}
                      fontSize={labelSize * 0.78}
                      fill={isPanelActive ? "#458C17" : "#94A3B8"}
                      style={{ fontFamily: "var(--font-landing-body), Inter, sans-serif" }}
                    >
                      {formatMm(pw)} × {formatMm(ph)} mm
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Layer 3: Crease & Cut Lines */}
          {dieline.segments.map((seg) => {
            const isCut = seg.type === "cut";
            if (isCut && !showLayers.cut) return null;
            if (!isCut && !showLayers.crease) return null;

            // Hairlines of constant width on screen, whatever the zoom (the layer colours of the print file).
            const stroke = {
              className: `pointer-events-none ${isCut ? "dieline-cut" : "dieline-crease"}`,
              vectorEffect: "non-scaling-stroke" as const,
              style: isCut ? { strokeWidth: 1.6 } : { strokeWidth: 1.3, strokeDasharray: "4 4" },
            };

            if (seg.pathString) {
              return (
                <path
                  key={seg.id}
                  d={seg.pathString}
                  transform={`translate(${padding} ${padding})`}
                  fill="none"
                  {...stroke}
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
                {...stroke}
              />
            );
          })}

          {/* Layer 4: the design, in paint order (docs/23 D3). Each element is cut to its face + bleed (D5), then turned
              and mirrored around its centre like the print files. Backgrounds are not grabbed: clicks reach the face. */}
          <defs>
            {dieline.panels.map((panel) => {
              const box = panelPrintBox(panel, dieline);
              return (
                <clipPath key={panel.id} id={`${uid}-face-${panel.id}`}>
                  <rect x={panel.bounds.x + box.x + padding} y={panel.bounds.y + box.y + padding} width={box.width} height={box.height} />
                </clipPath>
              );
            })}
          </defs>
          {orderElements(elements).map((el) => {
            // Elements of the other piece of a two-piece box are drawn when that piece is on screen.
            const targetPanel = dieline.panels.find((p) => matchesPanel(p, el.panelId));
            if (!targetPanel || el.hidden || sideOf(el) !== side) return null;
            const panelOffset = targetPanel.bounds;
            const elX = panelOffset.x + el.x + padding;
            const elY = panelOffset.y + el.y + padding;
            const cx = elX + el.width / 2;
            const cy = elY + el.height / 2;
            const isSelected = selection.includes(el.id);
            const single = isSelected && selection.length === 1;
            const editing = editingId === el.id;
            const background = isBackground(el);
            const movable = !!onElementsChange && isMovable(el);
            const turn = `rotate(${el.rotation || 0} ${cx} ${cy})`;
            const mirror = el.flipX || el.flipY ? ` translate(${cx} ${cy}) scale(${el.flipX ? -1 : 1} ${el.flipY ? -1 : 1}) translate(${-cx} ${-cy})` : "";
            const opacity = typeof el.style?.opacity === "number" ? el.style.opacity : undefined;

            // FitCheck flags it (safe margin on every side, bleed, glue flap…)
            const isMarginBreached = flaggedElementIds?.has(el.id) ?? false;
            // Shapes, library art and barcodes are vectors, drawn like the print files.
            const art = elementArt(el);

            const content = art ? (
              <ArtShapes art={art} x={elX} y={elY} />
            ) : el.type === "barcode" ? null : el.type === "image" || el.type === "logo" || el.type === "pattern" ? (
              <FramedImage el={el} x={elX} y={elY} />
            ) : (
              // Same lines, font, face, spacing, outline and curve as the print files (docs/12 Phase 9, docs/23 S9).
              <TextVisual el={el} x={elX} y={elY} fontsVersion={fontsVersion + imagesVersion} />
            );

            return (
              <g
                key={el.id}
                data-element-id={el.id}
                onPointerDown={background || editing ? undefined : (e) => handleElementPointerDown(e, el, "move")}
                onDoubleClick={
                  el.type === "text" && movable
                    ? (e) => {
                        e.stopPropagation();
                        setEditingText(el.content);
                        setEditingId(el.id);
                      }
                    : undefined
                }
                onContextMenu={
                  background || !onElementsChange
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                        onSelectElement?.(el.id);
                        const box = rootRef.current?.getBoundingClientRect();
                        // Kept inside the canvas: 224 px wide, at most 420 px tall (it scrolls past that).
                        const x = Math.min(e.clientX - (box?.left ?? 0), (box?.width ?? 0) - 232);
                        const y = Math.min(e.clientY - (box?.top ?? 0), (box?.height ?? 0) - Math.min(420, (box?.height ?? 0) - 16) - 8);
                        setMenu({ id: el.id, x, y });
                      }
                }
                className={background ? "pointer-events-none" : movable ? "cursor-grab active:cursor-grabbing select-none" : "cursor-pointer select-none"}
              >
                {/* Hit area and selection box (turned with the element, never cut) */}
                {!background && (
                  <rect
                    x={elX}
                    y={elY}
                    width={el.width}
                    height={el.height}
                    transform={turn}
                    fill={isSelected ? "rgba(37, 99, 235, 0.08)" : isMarginBreached ? "rgba(255, 107, 107, 0.12)" : "transparent"}
                    stroke={isSelected ? "#2563EB" : isMarginBreached ? "#FF6B6B" : "none"}
                    strokeWidth={isSelected ? "1" : "0.5"}
                    strokeDasharray={isSelected ? "3 2" : undefined}
                    rx="1"
                  />
                )}

                {/* Content: cut to the printable box of its face */}
                <g clipPath={`url(#${uid}-face-${targetPanel.id})`}>
                  <g transform={`${turn}${mirror}`} opacity={opacity}>
                    {editing ? null : content}
                  </g>
                </g>
                {/* Print finish (foil, UV, embossing): a dashed outline in the colour of its spot layer */}
                {el.finish && (
                  <rect
                    x={elX - 0.6}
                    y={elY - 0.6}
                    width={el.width + 1.2}
                    height={el.height + 1.2}
                    transform={turn}
                    fill="none"
                    stroke={FINISH_SPOTS[el.finish].display}
                    strokeWidth="0.6"
                    strokeDasharray="1.5 1"
                    rx="1"
                    className="pointer-events-none"
                  />
                )}

                <g transform={turn}>
                  {/* Safe margin breached warning badge */}
                  {isMarginBreached && <circle cx={elX + el.width} cy={elY} r="2.5" fill="#FF6B6B" />}
                  {/* Locked layer: a small lock in the corner while selected */}
                  {isSelected && el.locked && (
                    <g transform={`translate(${elX + el.width - 5} ${elY + 1})`} className="pointer-events-none">
                      <rect width="4" height="4" rx="1" fill="#1D293D" />
                      <path d="M 1.2 2 V 1.5 A 0.8 0.8 0 0 1 2.8 1.5 V 2 M 0.9 2 H 3.1 V 3.4 H 0.9 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.35" />
                    </g>
                  )}
                  {/* Handles of the one selected layer: 8 to resize (Shift keeps the proportions, Alt from the centre), one
                      above to turn (Shift: steps of 15°). Not for locked layers. */}
                  {single && movable && !editing && (
                    <>
                      <line x1={cx} y1={elY} x2={cx} y2={elY - 6} stroke="#2563EB" strokeWidth="0.4" className="pointer-events-none" />
                      <circle
                        cx={cx}
                        cy={elY - 7.5}
                        r={2.2}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth="0.6"
                        className="cursor-grab"
                        aria-label="Xoay"
                        onPointerDown={(e) => handleElementPointerDown(e, el, "rotate")}
                      />
                      {HANDLES.map(({ key, handle, cursor }) => {
                        const hx = elX + ((handle.sx + 1) / 2) * el.width;
                        const hy = elY + ((handle.sy + 1) / 2) * el.height;
                        const corner = handle.sx && handle.sy;
                        return (
                          <rect
                            key={key}
                            x={hx - (corner ? 2 : handle.sx ? 1.2 : 2.5)}
                            y={hy - (corner ? 2 : handle.sy ? 1.2 : 2.5)}
                            width={corner ? 4 : handle.sx ? 2.4 : 5}
                            height={corner ? 4 : handle.sy ? 2.4 : 5}
                            rx="0.6"
                            fill="#FFFFFF"
                            stroke="#2563EB"
                            strokeWidth="0.5"
                            className={cursor}
                            onPointerDown={(e) => handleElementPointerDown(e, el, "resize", handle)}
                          />
                        );
                      })}
                    </>
                  )}
                </g>
              </g>
            );
          })}

          {/* Grid (5 mm) over the sheet */}
          {showLayers.grid && (
            <g className="pointer-events-none" stroke="#7C8BA1" strokeOpacity="0.35" strokeWidth="0.15">
              {Array.from({ length: Math.floor(totalW / GRID_MM) + 1 }, (_, i) => (
                <line key={`gx${i}`} x1={padding + i * GRID_MM} y1={padding} x2={padding + i * GRID_MM} y2={padding + totalH} />
              ))}
              {Array.from({ length: Math.floor(totalH / GRID_MM) + 1 }, (_, i) => (
                <line key={`gy${i}`} x1={padding} y1={padding + i * GRID_MM} x2={padding + totalW} y2={padding + i * GRID_MM} />
              ))}
            </g>
          )}

          {/* Guides pulled from the rulers: drag to move, drop on the ruler to remove */}
          {guides.map((guide) =>
            guide.axis === "x" ? (
              <g key={guide.id}>
                <line x1={padding + guide.at} y1={padding - 4} x2={padding + guide.at} y2={padding + totalH} stroke="#06B6D4" strokeWidth="0.35" className="pointer-events-none" />
                <line
                  x1={padding + guide.at}
                  y1={padding - 4}
                  x2={padding + guide.at}
                  y2={padding + totalH}
                  stroke="transparent"
                  strokeWidth="2.5"
                  className="cursor-ew-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDragState({ mode: "guide", guideId: guide.id });
                  }}
                />
              </g>
            ) : (
              <g key={guide.id}>
                <line x1={padding - 4} y1={padding + guide.at} x2={padding + totalW} y2={padding + guide.at} stroke="#06B6D4" strokeWidth="0.35" className="pointer-events-none" />
                <line
                  x1={padding - 4}
                  y1={padding + guide.at}
                  x2={padding + totalW}
                  y2={padding + guide.at}
                  stroke="transparent"
                  strokeWidth="2.5"
                  className="cursor-ns-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDragState({ mode: "guide", guideId: guide.id });
                  }}
                />
              </g>
            )
          )}

          {/* Smart guides: the lines the moved layer snapped to */}
          {snapHits.map((hit, i) =>
            hit.axis === "x" ? (
              <line key={i} x1={hit.at} y1={padding} x2={hit.at} y2={padding + totalH} stroke="#DB2777" strokeWidth="0.35" strokeDasharray="1.5 1" className="pointer-events-none" />
            ) : (
              <line key={i} x1={padding} y1={hit.at} x2={padding + totalW} y2={hit.at} stroke="#DB2777" strokeWidth="0.35" strokeDasharray="1.5 1" className="pointer-events-none" />
            )
          )}

          {/* Selection rectangle */}
          {dragState?.mode === "marquee" && (
            <rect
              x={Math.min(dragState.start.x, dragState.current.x)}
              y={Math.min(dragState.start.y, dragState.current.y)}
              width={Math.abs(dragState.current.x - dragState.start.x)}
              height={Math.abs(dragState.current.y - dragState.start.y)}
              fill="rgba(37, 99, 235, 0.08)"
              stroke="#2563EB"
              strokeWidth="0.35"
              strokeDasharray="1.5 1"
              className="pointer-events-none"
            />
          )}

          {/* Text edited in place */}
          {editingId &&
            (() => {
              const el = elements.find((item) => item.id === editingId);
              const panel = el && dieline.panels.find((p) => matchesPanel(p, el.panelId));
              if (!el || !panel) return null;
              const box = layoutBoxText(el);
              const [ex, ey] = [panel.bounds.x + el.x + padding, panel.bounds.y + el.y + padding];
              return (
                <foreignObject
                  x={ex}
                  y={ey}
                  width={Math.max(el.width, 20)}
                  height={Math.max(el.height, box.lineHeightMm * 2)}
                  transform={`rotate(${el.rotation || 0} ${ex + el.width / 2} ${ey + el.height / 2})`}
                >
                  <textarea
                    autoFocus
                    value={editingText}
                    aria-label="Sửa chữ"
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={commitEditing}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitEditing();
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      fontSize: `${box.fontSizeMm}px`,
                      lineHeight: `${box.lineHeightMm}px`,
                      textAlign: el.style?.textAlign ?? "center",
                      color: el.style?.color ?? "#1C1917",
                      background: "rgba(255,255,255,0.85)",
                      border: "0.4px solid #2563EB",
                      padding: 0,
                      resize: "none",
                      outline: "none",
                      overflow: "hidden",
                    }}
                  />
                </foreignObject>
              );
            })()}

          {/* Layer 5: CAD Millimeter Rulers & Interactive Crosshairs */}
          {showRulers && (
            <g className="pointer-events-none select-none">
              {/* Top Horizontal Ruler */}
              <rect
                x={padding}
                y={padding - 14}
                width={totalW}
                height={10}
                fill="#FFFFFF"
                fillOpacity="0.92"
                rx="1.5"
                stroke="none"
                strokeWidth="0.4"
              />
              {/* Left Vertical Ruler */}
              <rect
                x={padding - 14}
                y={padding}
                width={10}
                height={totalH}
                fill="#FFFFFF"
                fillOpacity="0.92"
                rx="1.5"
                stroke="none"
                strokeWidth="0.4"
              />
              {/* Corner Origin Indicator */}
              <rect
                x={padding - 14}
                y={padding - 14}
                width={10}
                height={10}
                fill="#98E665"
                rx="1.5"
              />
              <text
                x={padding - 9}
                y={padding - 8}
                fontSize="3.2"
                fill="#152B07"
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
                      stroke="#B6BFB1"
                      strokeWidth={isMajor ? "0.4" : "0.25"}
                    />
                    {isMajor && (
                      <text
                        x={tickX}
                        y={padding - 9}
                        fontSize="2.8"
                        fontFamily="monospace"
                        fill="#8A9486"
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
                      stroke="#B6BFB1"
                      strokeWidth={isMajor ? "0.4" : "0.25"}
                    />
                    {isMajor && (
                      <text
                        x={padding - 9}
                        y={tickY + 1}
                        fontSize="2.8"
                        fontFamily="monospace"
                        fill="#8A9486"
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
                    stroke="#458C17"
                    strokeWidth="0.4"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  <line
                    x1={cursorMm.x + padding}
                    y1={padding}
                    x2={cursorMm.x + padding}
                    y2={totalH + padding}
                    stroke="#458C17"
                    strokeWidth="0.4"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  <polygon
                    points={`${cursorMm.x + padding - 2},${padding - 14} ${cursorMm.x + padding + 2},${padding - 14} ${cursorMm.x + padding},${padding - 10}`}
                    fill="#458C17"
                  />
                  <polygon
                    points={`${padding - 14},${cursorMm.y + padding - 2} ${padding - 14},${cursorMm.y + padding + 2} ${padding - 10},${cursorMm.y + padding}`}
                    fill="#458C17"
                  />
                </>
              )}
            </g>
          )}
          {showRulers && onElementsChange && (
            <g>
              <rect x={padding} y={padding - 14} width={totalW} height={10} fill="transparent" className="cursor-s-resize" onPointerDown={(e) => startGuide(e, "x")}>
                <title>Kéo xuống để tạo đường gióng dọc</title>
              </rect>
              <rect x={padding - 14} y={padding} width={10} height={totalH} fill="transparent" className="cursor-e-resize" onPointerDown={(e) => startGuide(e, "y")}>
                <title>Kéo sang phải để tạo đường gióng ngang</title>
              </rect>
            </g>
          )}
        </svg>
      </div>

      </div>

      {/* Stage: the layers as a one-line floating legend (each chip toggles its layer) with the cursor position after it.
          One line, so it covers as little of the dieline as it can on short laptop screens. */}
      {isStage && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 hidden flex-wrap items-center gap-1.5 md:flex">
          <DielineLayerLegend layers={showLayers} onChange={setShowLayers} className="pointer-events-auto shadow-soft-8 backdrop-blur-md" />
          <span className="w-fit rounded-full bg-surface-raised/85 px-2.5 py-1 font-mono text-cad-spec-micro tabular-nums text-fg-muted ring-1 ring-line/70 backdrop-blur-md" aria-hidden>
            {cursorMm ? `X ${cursorMm.x} · Y ${cursorMm.y} mm` : "X — · Y — mm"}
          </span>
        </div>
      )}

      {/* Bottom bar: layers of the dieline, cursor position in mm. */}
      {!isStage && (
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-3 py-1.5 text-caption text-fg-muted">
        <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 sm:flex">
          <Checkbox
            compact
            checked={showLayers.cut}
            onChange={(e) => setShowLayers({ ...showLayers, cut: e.target.checked })}
            label={<span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-dieline-cut rounded-full inline-block" aria-hidden />Nét cắt dao</span>}
            className="min-h-0 py-0"
          />
          <Checkbox
            compact
            checked={showLayers.crease}
            onChange={(e) => setShowLayers({ ...showLayers, crease: e.target.checked })}
            label={<span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 border-b border-dashed border-dieline-crease inline-block" aria-hidden />Nếp cấn gập</span>}
            className="min-h-0 py-0"
          />
          <Checkbox
            compact
            checked={showLayers.bleed}
            onChange={(e) => setShowLayers({ ...showLayers, bleed: e.target.checked })}
            label={<span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 border-b border-dotted border-dieline-bleed inline-block" aria-hidden />Tràn lề (Bleed ≥2mm)</span>}
            className="min-h-0 py-0"
          />
          <Checkbox
            compact
            checked={showLayers.safeMargin}
            onChange={(e) => setShowLayers({ ...showLayers, safeMargin: e.target.checked })}
            label={<span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 border-b border-dashed border-warning inline-block" aria-hidden />Vùng an toàn (≥3mm)</span>}
            className="min-h-0 py-0"
          />
        </div>
        <span className="tabular-nums" aria-hidden>
          {cursorMm ? `X ${cursorMm.x} mm · Y ${cursorMm.y} mm` : "Rê chuột lên khuôn để đo"}
        </span>
      </div>
      )}

      {/* Pretext Add Text Modal */}
      {showAddTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 border border-landing-line shadow-soft-16">
            <div className="flex items-center justify-between border-b border-landing-line pb-2.5">
              <h3 className="font-landing-heading font-bold text-landing-ink text-sm flex items-center gap-1.5">
                <Type className="w-4 h-4 text-fpt-orange" />
                <span>Thêm Văn Bản / Lời Chúc Mừng</span>
              </h3>
              <span className="text-cad-spec-micro font-mono text-fpt-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                Tự ngắt dòng
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-landing-ink mb-1">
                  Chọn mặt hộp muốn in chữ:
                </label>
                <select
                  value={activePanelId}
                  onChange={(e) => onSelectPanel?.(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-landing-canvas border border-landing-line text-landing-ink"
                >
                  {dieline.panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatMm(p.bounds.width)}×{formatMm(p.bounds.height)}mm)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-landing-ink mb-1">
                  Nội dung chữ:
                </label>
                <textarea
                  rows={3}
                  value={newTextValue}
                  onChange={(e) => setNewTextValue(e.target.value)}
                  placeholder="Ví dụ: chúc mừng sinh nhật Mai Anh ❤️..."
                  className="w-full p-2.5 text-xs rounded-xl bg-landing-canvas border border-landing-line focus:outline-none focus:border-fpt-orange text-landing-ink"
                />
              </div>

              <div className="text-caption text-landing-muted bg-landing-canvas p-2.5 rounded-xl border border-landing-line flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-fpt-orange flex-shrink-0 mt-0.5" />
                <span>
                  WrapFit tự động tính toán số dòng và ngắt câu vừa vặn
                  theo milimet của mặt hộp mà không làm đơ giật trình duyệt.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-landing-line">
              <button
                type="button"
                onClick={() => setShowAddTextModal(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-landing-muted hover:bg-landing-canvas transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="px-4 py-1.5 rounded-full bg-fpt-orange hover:bg-fpt-orange-dark text-white text-xs font-semibold shadow-xs transition"
              >
                Chèn vào mặt hộp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
