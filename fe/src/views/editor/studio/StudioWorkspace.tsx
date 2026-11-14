"use client";

import dynamic from "next/dynamic";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useCtrlWheelZoom } from "@/hooks/dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/features/auth";
import { queryKeys } from "@/hooks/data";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
import {
  CircleHelp,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Trash2,
  ImageUp,
  History,
  Share2,
  RotateCcw,
  Save,
  LogIn,
  X,
  Box,
  LayoutPanelTop,
  PackageOpen,
  PenTool,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Ruler,
  Type,
  Upload,
  Undo2,
  Redo2,
} from "lucide-react";
import { buttonClass, hasSeenTour, markTourSeen, ProductTour, useTourContinuation } from "@/components/ui";
import { STUDIO_INTRO_TOUR, STUDIO_INTRO_TOUR_ID, STUDIO_STEP_TOURS, studioStepTourId } from "@/features/studio/studioTour";
import { ViewToggle } from "@/features/studio/components/studioUi";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { cn } from "@/utils/helpers";
import {
  artPaletteOf,
  autoFixElements,
  type QuoteFinish,
  boxBackgrounds,
  BoxDimensions,
  CANVAS_SCHEMA_VERSION,
  CanvasElement,
  duplicateElements,
  groupElements,
  canGroup,
  ungroupElements,
  newElementId,
  TEXT_COMBOS,
  textComboStyle,
  FitCheckReport,
  insidePieces,
  isBackground,
  mainPanelOf,
  moveLayer,
  orderElements,
  panelTouchesGlue,
  parseLibraryArt,
  printsInside,
  quoteFinishesOf,
  recolorDesign,
  refitBackgrounds,
  reflowElements,
  PRODUCT_LABEL_DISCLAIMER,
  safeMarginsOf,
  samePanel,
  setPanelBackground,
  sideOf,
  type CustomFont,
  type PrintSide,
} from "@wrapfit/shared";
import { copyId, LayersPanel } from "@/features/studio/components/layers/LayersPanel";
import {
  CustomFontsContext,
  DesignColorsContext,
  designColorsOf,
  ElementInspector,
  ImageInspector,
  newShape,
  ShapeInspector,
  ShapePicker,
  TEXT_PRESETS,
  TextInspector,
} from "@/features/studio/components/inspector/ElementInspector";
import { layoutBoxText } from "@/features/studio/components/canvas/boxText";
import { SelectionToolbar } from "@/features/studio/components/inspector/SelectionToolbar";
import { usePresentMode } from "@/features/demo/presentMode";
import { AiCopilotAssistant } from "@/features/studio/components/copilot/AiCopilotAssistant";
import { DielineCanvas2D } from "@/features/studio/components/canvas/DielineCanvas2D";
import { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { DimensionControls } from "@/features/studio/components/DimensionControls";
import { FitCheckDrawer } from "@/features/studio/components/fitcheck/FitCheckDrawer";
import { DesignFlyout, DesignRail, type DesignRailId } from "@/features/studio/components/DesignRail";
import { PanelNavigator } from "@/features/studio/components/PanelNavigator";
import {
  BoxBackgroundPicker,
  ColorPaletteSelector,
  paletteColors,
} from "@/features/studio/components/ColorPaletteSelector";
import {
  FontSelectorCards,
  CURATED_FONT_PRESETS,
  FontPresetCard,
} from "@/features/studio/components/FontSelectorCards";
import { Step1BoxTemplatePicker } from "@/features/studio/components/Step1BoxTemplatePicker";
import { Step2DimensionAndMaterial } from "@/features/studio/components/Step2DimensionAndMaterial";
import { Step3PaperFinish } from "@/features/studio/components/Step3PaperFinish";
import { Step5Model3DWithEnvironments } from "@/features/studio/components/Step5Model3DWithEnvironments";
import { Step6ReviewExport } from "@/features/studio/components/Step6ReviewExport";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import { StudioStepper, type StudioStep } from "@/features/studio/components/StudioStepper";
import { UnsavedChangesError, useProjectSync, type SyncState } from "@/features/studio/hooks/useProjectSync";
import { recordAutoFix, useStudioHeartbeat } from "@/features/studio/hooks/useStudioHeartbeat";
import { checkDesign, dielinePiecesOf, dimensionErrors, formatMm, pieceIndexOfPanel } from "@/features/studio/utils/dieline";
import { finishesOf, materialSpecFor, materialThemeOf } from "@/features/studio/utils/projectMaterial";
import { renderThumbnail } from "@/features/studio/utils/thumbnail";
import { createProject, errorMessage, inspectFont, restoreSnapshot, uploadFileToStorage } from "@/api";
import { asFontFile, FONT_ACCEPT, inspectFontFile, MAX_FONT_BYTES, registerCustomFont } from "@/features/studio/utils/customFonts";
import { useToast } from "@/components/common/Toast";
import { ROUTES } from "@/constants";
import type { AiImageOutput, BoxStructure, ProjectDetail, SnapshotSummary, TemplateDetail } from "@/types/api";
import { FormulaUpgrade } from "@/features/studio/components/formula/FormulaUpgrade";

// Code splitting: panels and dialogs opened on demand load their own chunk the first time they are needed, so the
// studio's first paint only waits for the dieline canvas and the 3D view.
const LibraryPanel = dynamic<React.ComponentProps<typeof import("@/features/studio/components/library/LibraryPanel").LibraryPanel>>(() => import("@/features/studio/components/library/LibraryPanel").then((m) => m.LibraryPanel), { ssr: false });
const AiImagePanel = dynamic<React.ComponentProps<typeof import("@/features/studio/components/ai-image/AiImagePanel").AiImagePanel>>(() => import("@/features/studio/components/ai-image/AiImagePanel").then((m) => m.AiImagePanel), { ssr: false });
const AiPatternPanel = dynamic<React.ComponentProps<typeof import("@/features/studio/components/ai-pattern/AiPatternPanel").AiPatternPanel>>(() => import("@/features/studio/components/ai-pattern/AiPatternPanel").then((m) => m.AiPatternPanel), { ssr: false });
const VersionConflictDialog = dynamic<React.ComponentProps<typeof import("@/features/studio/components/sync/VersionConflictDialog").VersionConflictDialog>>(() => import("@/features/studio/components/sync/VersionConflictDialog").then((m) => m.VersionConflictDialog), { ssr: false });
const ExportDialog = dynamic<React.ComponentProps<typeof import("@/features/studio/components/export/ExportDialog").ExportDialog>>(() => import("@/features/studio/components/export/ExportDialog").then((m) => m.ExportDialog), { ssr: false });
const ShareDialog = dynamic<React.ComponentProps<typeof import("@/features/studio/components/share/ShareDialog").ShareDialog>>(() => import("@/features/studio/components/share/ShareDialog").then((m) => m.ShareDialog), { ssr: false });
const SnapshotsDialog = dynamic<React.ComponentProps<typeof import("@/features/studio/components/snapshots/SnapshotsDialog").SnapshotsDialog>>(() => import("@/features/studio/components/snapshots/SnapshotsDialog").then((m) => m.SnapshotsDialog), { ssr: false });
const UnboxingDialog = dynamic<React.ComponentProps<typeof import("@/features/studio/components/unboxing/UnboxingDialog").UnboxingDialog>>(() => import("@/features/studio/components/unboxing/UnboxingDialog").then((m) => m.UnboxingDialog), { ssr: false });

/** Formats the image upload accepts: photos (purpose IMAGE) and vector logos (purpose LOGO). */
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VECTOR_TYPES = ["image/svg+xml"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Undo history of the artwork: changes this close together are one step; at most this many steps. */
const HISTORY_GAP_MS = 600;
const HISTORY_LIMIT = 60;

/** Keys of the step 4 rail (DesignRail shows the same letters in its tooltips). */
const RAIL_KEYS: Record<string, DesignRailId> = { t: "text", h: "shapes", u: "uploads", s: "elements", c: "colors", a: "patterns", i: "aiImage", l: "layers" };

/** Seamless patterns of older designs (`canvasState.backgroundPattern`), shown on screen only: converted to printed
 *  library backgrounds when the design opens. */
const LEGACY_PATTERNS: Record<string, { design: string; palette: string }> = {
  tet: { design: "bg-blossoms", palette: "son-do" },
  xmas: { design: "bg-stripes", palette: "rung-thong" },
  botanical: { design: "bg-dots", palette: "xanh-reu" },
  gold: { design: "bg-diamonds", palette: "kim-ngan" },
};
/** Faces that take the unboxing QR code, in order of preference (back or bottom first). */
const QR_PANELS = ["panel_back", "sleeve_bottom", "pillow_back", "mailer_back", "gable_back", "card_back", "base_bottom", "lid_top", "panel_front", "sleeve_top", "pillow_front"];
/** The QR code of the gift's unboxing page (online `/unbox/<slug>`, offline `/unbox/demo#g=…`). */
const isUnboxingQr = (el: CanvasElement) => el.type === "barcode" && el.content.includes("/unbox/");
/** Palette of a background chosen before any palette. */
const DEFAULT_BACKGROUND_PALETTE = "kem-sua";
/** Library backgrounds (`bg-*` art on a pattern element). */
const isLibraryBackground = (el: CanvasElement) => el.type === "pattern" && !!parseLibraryArt(el.content)?.design.startsWith("bg-");

/** Icon button of the light toolbars around the stage: 40 px, orange tint when on. */
const lightToolButton = (on: boolean, className?: string) =>
  cn(
    "flex size-10 shrink-0 items-center justify-center rounded-control outline-none transition-[background-color,color,transform] duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:ring-[3px] focus-visible:ring-focus/50 disabled:pointer-events-none disabled:opacity-35",
    on ? "bg-fpt-orange-light text-accent" : "text-fg-muted hover:bg-surface-sunken hover:text-fg",
    className,
  );

/** Colours of the FitCheck pill by score: pass, needs a look, blocks the print file. */
const scoreToneOf = (score: number) =>
  score >= 90
    ? { pill: "bg-success-bg/95 text-success-fg ring-success/30", dot: "bg-success" }
    : score >= 70
      ? { pill: "bg-warning-bg/95 text-warning-fg ring-warning/30", dot: "bg-warning" }
      : { pill: "bg-danger-bg/95 text-danger-fg ring-danger/30", dot: "bg-danger" };

/** Design of the offline demo (`/editor/demo`). */
const DEMO_ELEMENTS: CanvasElement[] = [];

const SYNC_LABELS: Record<SyncState, { label: string; tone: "ok" | "busy" | "warn" | "muted" }> = {
  demo: { label: "Bản dùng thử · không lưu", tone: "muted" },
  saved: { label: "Đã lưu trên Cloud", tone: "ok" },
  pending: { label: "Đang lưu…", tone: "busy" },
  saving: { label: "Đang lưu…", tone: "busy" },
  invalid: { label: "Chưa lưu: kích thước ngoài giới hạn", tone: "warn" },
  error: { label: "Chưa lưu được", tone: "warn" },
  conflict: { label: "Có bản mới hơn ở nơi khác", tone: "warn" },
  trash: { label: "Chỉ xem (thùng rác)", tone: "muted" },
};

const DOT_CLASS = {
  ok: "bg-success",
  busy: "bg-warning animate-pulse motion-reduce:animate-none",
  warn: "bg-vibrant-coral",
  muted: "bg-landing-muted",
};

/** Pixel size of an image file; null when the browser cannot tell (e.g. an SVG without a size). */
async function imageSizeOf(file: File): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image.naturalWidth && image.naturalHeight ? { width: image.naturalWidth, height: image.naturalHeight } : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A snapshot was just restored, or the formulas upgraded: the editor offers to undo it. */
export interface RestoreNotice {
  snapshotName: string;
  /** Snapshot of the design just before the restore or the upgrade. */
  backupId: string;
  /** "formula": the dieline moved to newer formulas (FormulaUpgrade). Default: a snapshot restore. */
  kind?: "restore" | "formula";
}

type StudioDialogId = "export" | "snapshots" | "share" | "unboxing";

interface StudioWorkspaceProps {
  /** The saved project; null runs the offline demo (nothing is sent to the API). */
  project: ProjectDetail | null;
  /** Box structures of the API, for the dimension limits; omitted in the demo. */
  structures?: BoxStructure[];
  /** Opens the version on the server again (after a version conflict). */
  onReload?: () => void;
  reloading?: boolean;
  /** The server replaced the design (snapshot restored): mount the editor again with `project`. */
  onReplaced?: (project: ProjectDetail, notice: RestoreNotice | null) => void;
  /** Shown after a restore, with an undo button. */
  notice?: RestoreNotice | null;
  /** Offline demo only: the template it starts from (`/editor/demo?template=<id>`). */
  demoTemplate?: TemplateDetail | null;
}

/** Steps 1–4 of the studio for one design. Mount it again (new `key`) to load another state of the project. */
export function StudioWorkspace({
  project,
  structures,
  onReload,
  reloading = false,
  onReplaced,
  notice = null,
  demoTemplate = null,
}: StudioWorkspaceProps) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const isDemo = project === null;
  const presenting = usePresentMode();
  useStudioHeartbeat(project?.id ?? null);

  // Guided tour: the overview of the screen once, then a short guide the first time each step opens.
  const tourContinued = useTourContinuation();
  const [introSeen, setIntroSeen] = useState(true);
  useEffect(() => setIntroSeen(hasSeenTour(STUDIO_INTRO_TOUR_ID)), []);
  // "Hướng dẫn" button: counts the replays (remounts the intro) and, once a replayed intro is finished, names the
  // step whose own tour then runs.
  const [replay, setReplay] = useState(0);
  const [chainedStep, setChainedStep] = useState<StudioStep | null>(null);

  // Query parameter overrides for demo mode (home page, structure pages, template hub or direct links)
  const paramStructure = searchParams.get("structure") as BoxStructureType | null;
  const initialStructure =
    isDemo && paramStructure && BOX_STRUCTURES.some((s) => s.id === paramStructure)
      ? paramStructure
      : (project?.template.id ?? demoTemplate?.structure.id ?? "tuck-top");

  const paramL = Number(searchParams.get("l") || searchParams.get("length"));
  const paramW = Number(searchParams.get("w") || searchParams.get("width"));
  const paramH = Number(searchParams.get("h") || searchParams.get("height") || searchParams.get("d") || searchParams.get("depth"));
  const paramPaper = searchParams.get("paper") as BoxMaterialTheme | null;
  const hasParamDims =
    isDemo && Number.isFinite(paramL) && paramL > 0 && Number.isFinite(paramW) && paramW > 0 && Number.isFinite(paramH) && paramH > 0;

  // Stepper: 1 structure → 2 size → 3 paper → 4 artwork → 5 3D & gift → 6 FitCheck & export.
  const firstStep: StudioStep = isDemo ? 1 : 2;
  const paramStepRaw = searchParams.get("step");
  const paramStep = paramStepRaw ? Number(paramStepRaw) : null;
  const [currentStep, setCurrentStep] = useState<StudioStep>(() => {
    if (paramStep && paramStep >= 1 && paramStep <= 6) return paramStep as StudioStep;
    if (project) return 4;
    if (hasParamDims || paramStructure || demoTemplate) return 4;
    return 1;
  });

  // Going to another step while the intro is open leaves the intro (counted as skipped); that step's own tour starts
  // if it was not seen. The first value, from the address or the project, is not a change.
  const previousStep = useRef(currentStep);
  useEffect(() => {
    if (previousStep.current === currentStep) return;
    previousStep.current = currentStep;
    if (!introSeen) {
      markTourSeen(STUDIO_INTRO_TOUR_ID, false);
      setIntroSeen(true);
    }
  }, [currentStep, introSeen]);

  // Project Core State: a saved project fills it once, on mount
  const [projectTitle, setProjectTitle] = useState<string>(project?.title ?? demoTemplate?.title ?? "Bao bì quà tặng sang trọng");
  const [boxType, setBoxType] = useState<BoxStructureType>(initialStructure);
  const [activeMaterial, setActiveMaterial] = useState<BoxMaterialTheme>(() => {
    if (project) return materialThemeOf(project.canvasState?.materialTheme, project.materialSpec);
    if (isDemo && paramPaper && ["ivory", "kraft", "black_matte", "white_gloss", "metallics"].includes(paramPaper)) {
      return paramPaper;
    }
    if (demoTemplate) return materialThemeOf(demoTemplate.canvasState?.materialTheme, demoTemplate.materialSpec);
    return "ivory";
  });
  // The design before the last palette change; offered back while that change is still the last edit.
  const [paletteUndo, setPaletteUndo] = useState<{ paletteId: string | null; elements: CanvasElement[]; applied: CanvasElement[] } | null>(null);
  // Occasion of the design (template, quick start): the scenes of step 5 suggest the one that suits it.
  const [occasion, setOccasion] = useState<string | null>(project?.occasion ?? demoTemplate?.occasion ?? null);
  // Finishes of the print shop (lamination, foil, spot UV): priced in steps 3 and 6, stored with the canvas.
  const [finishes, setFinishes] = useState<QuoteFinish[]>(() => finishesOf(project?.canvasState?.finishes ?? demoTemplate?.canvasState?.finishes));
  const [backgroundPatternSvg, setBackgroundPatternSvg] = useState<string | null>(
    project?.canvasState?.backgroundPattern ?? demoTemplate?.canvasState?.backgroundPattern ?? null
  );

  // Image 2 Inspired Palette & Typography states
  // Palette of the design (a library palette); choosing one recolours the printed artwork. Null until one is chosen.
  const [paletteId, setPaletteId] = useState<string | null>(() => {
    const canvas = project?.canvasState ?? demoTemplate?.canvasState;
    if (canvas?.backgroundTheme && artPaletteOf(canvas.backgroundTheme)) return canvas.backgroundTheme;
    for (const el of canvas?.elements ?? []) {
      const ref = parseLibraryArt(el.content);
      if (ref && el.type === "pattern") return ref.palette;
    }
    return null;
  });
  const [selectedFont, setSelectedFont] = useState<FontPresetCard>(CURATED_FONT_PRESETS[0]);

  // Box Dimensions in mm
  const [dimensions, setDimensions] = useState<BoxDimensions>(() => {
    if (project?.dimensions) return project.dimensions;
    if (hasParamDims) {
      return {
        length: Math.round(paramL),
        width: Math.round(paramW),
        height: Math.round(paramH),
        paperThickness: 0.38, // 300 GSM
      };
    }
    if (demoTemplate) return { ...demoTemplate.dimensions };
    return {
      length: 120,
      width: 80,
      height: 60,
      paperThickness: 0.38, // 300 GSM
    };
  });
  const limits = structures?.find((s) => s.id === boxType)?.dimensionLimits;

  // 2D Canvas State
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [activePanelId, setActivePanelId] = useState<string>("panel_front");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Step 4 rail: the open flyout panel (Canva-like); clicking the open one again folds it.
  const [railPanel, setRailPanel] = useState<DesignRailId | null>("elements");

  // Step 4 stage: the flat dieline to edit, or the folded box to check it; the dock's text tool opens the composer
  const [artView, setArtView] = useState<"2d" | "3d">("2d");
  // Side of the sheet being designed (docs/23 S5): the inside is edited on the dieline mirrored, as seen from inside.
  const [editSide, setEditSide] = useState<PrintSide>("outside");
  const [foldProgress, setFoldProgress] = useState<number>(1);
  const [lidOpen, setLidOpen] = useState<boolean>(false);
  const [textComposerOpen, setTextComposerOpen] = useState<boolean>(false);

  // Ctrl/⌘ + wheel (or trackpad pinch) over the stage zooms the dieline, never the browser page. In 3D the box's own
  // OrbitControls zoom; the listener still swallows the event there so the page does not zoom either.
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomStage = useCallback(
    (factor: number) => {
      if (artView !== "2d") return;
      setZoomScale((s) => Math.min(2.5, Math.max(0.4, Number((s * factor).toFixed(3)))));
    },
    [artView]
  );
  useCtrlWheelZoom(stageRef, zoomStage);

  // Artwork Canvas Elements
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    const saved = project ? (project.canvasState?.elements ?? []) : (demoTemplate?.canvasState?.elements ?? DEMO_ELEMENTS);
    return refitBackgrounds(orderElements(saved), dielinePiecesOf(boxType, dimensions, project?.formulaVersion));
  });
  // Finishes the quote prices: those chosen in step 3 and those of the elements; a second pass for the inside.
  const quoteFinishes = useMemo(() => [...new Set([...finishes, ...quoteFinishesOf(elements)])], [finishes, elements]);
  const insidePrint = useMemo(() => printsInside(elements), [elements]);
  const selectedElement = elements.find((el) => el.id === selectedElementId && !isBackground(el)) ?? null;
  // Layers selected together (Shift + click, selection rectangle, a group). A selection made elsewhere (layers panel,
  // a new element) collapses it to that one layer.
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const selectedIds = useMemo(
    () => (selectedElementId && multiIds.includes(selectedElementId) ? multiIds : selectedElementId ? [selectedElementId] : []),
    [selectedElementId, multiIds]
  );
  const selectIds = useCallback((ids: string[], primary?: string | null) => {
    setMultiIds(ids);
    setSelectedElementId(primary !== undefined ? primary : (ids[ids.length - 1] ?? null));
  }, []);
  const updateElement = useCallback((element: CanvasElement) => setElements((prev) => prev.map((el) => (el.id === element.id ? element : el))), []);
  /** Copied layer (Ctrl+C), pasted with Ctrl+V on the face that receives new elements. */
  const clipboard = useRef<CanvasElement | null>(null);
  // Fonts uploaded for this design (docs/23 S13), saved with the canvas.
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => (project ?? demoTemplate)?.canvasState?.customFonts ?? []);

  // Undo / redo of the artwork. Changes closer than HISTORY_GAP_MS to the previous one (a drag, a resize) make one step.
  const history = useRef({ past: [] as CanvasElement[][], future: [] as CanvasElement[][], current: elements, at: 0, travelling: false });
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });
  useEffect(() => {
    const h = history.current;
    if (h.current === elements) return;
    if (h.travelling) {
      h.travelling = false;
    } else {
      const now = Date.now();
      if (now - h.at > HISTORY_GAP_MS) h.past = [...h.past.slice(-(HISTORY_LIMIT - 1)), h.current];
      h.at = now;
      h.future = [];
    }
    h.current = elements;
    setHistorySize({ past: h.past.length, future: h.future.length });
  }, [elements]);
  const travel = useCallback((direction: "undo" | "redo") => {
    const h = history.current;
    const target = direction === "undo" ? h.past.at(-1) : h.future[0];
    if (!target) return;
    if (direction === "undo") {
      h.past = h.past.slice(0, -1);
      h.future = [h.current, ...h.future];
    } else {
      h.future = h.future.slice(1);
      h.past = [...h.past, h.current];
    }
    h.travelling = true;
    h.at = 0;
    setElements(target);
    setSelectedElementId(null);
  }, []);
  const [uploading, setUploading] = useState<boolean>(false);

  const paramDialog = searchParams.get("dialog") as StudioDialogId | null;
  const [dialog, setDialog] = useState<StudioDialogId | null>(() => paramDialog ?? null);
  const [restoreNotice, setRestoreNotice] = useState<RestoreNotice | null>(notice);
  const [undoing, setUndoing] = useState<boolean>(false);

  // 1. Mathematical CAD Dieline: the pieces of the formulas the project is pinned to, as they get printed
  const pieces = useMemo(
    () => dielinePiecesOf(boxType, dimensions, project?.formulaVersion),
    [boxType, dimensions, project?.formulaVersion]
  );
  // Opens on the piece that carries the artwork (e.g. the lid of a lid & base box from a template)
  const [pieceIndex, setPieceIndex] = useState<number>(() =>
    elements.length ? Math.max(0, pieceIndexOfPanel(pieces, elements[0].panelId)) : 0
  );
  const editPieces = useMemo(() => (editSide === "inside" ? insidePieces(pieces) : pieces), [editSide, pieces]);
  const dieline = (editPieces[pieceIndex] ?? editPieces[0]).geometry;
  // Backgrounds follow their faces when the size, the structure or the formulas change (docs/23 D4); the other
  // elements keep their place on their face by their anchor (docs/23 S20).
  const fittedPieces = useRef(pieces);
  useEffect(() => {
    if (fittedPieces.current === pieces) return;
    const before = fittedPieces.current;
    fittedPieces.current = pieces;
    setElements((prev) => refitBackgrounds(reflowElements(before, pieces, prev), pieces));
  }, [pieces]);
  // Panel that receives new elements: the selected one, else the front (or first) panel of the piece on screen
  const placementPanel =
    dieline.panels.find((p) => p.id === activePanelId) ??
    dieline.panels.find((p) => p.id === "panel_front") ??
    dieline.panels[0];

  const selectPanel = useCallback(
    (panelId: string) => {
      setActivePanelId(panelId);
      const index = pieceIndexOfPanel(pieces, panelId);
      if (index >= 0) setPieceIndex(index);
    },
    [pieces]
  );

  // 2. Physical FitCheck™ of the whole box, computed like the server does
  const fitcheckReport = useMemo(() => checkDesign(pieces, elements), [pieces, elements]);

  // 3. Cloud persistence: autosave, version conflicts, trash, thumbnail
  const invalidReason = dimensionErrors(dimensions, limits, boxType)[0] ?? null;
  const payload = useMemo(
    () => ({
      title: projectTitle.trim() || "Dự án chưa đặt tên",
      dimensions,
      materialSpec: materialSpecFor(activeMaterial, dimensions.paperThickness, finishes),
      canvasState: {
        schemaVersion: CANVAS_SCHEMA_VERSION,
        elements,
        backgroundPattern: backgroundPatternSvg,
        backgroundTheme: paletteId,
        customFonts,
        materialTheme: activeMaterial,
        finishes,
      },
    }),
    [projectTitle, dimensions, activeMaterial, finishes, elements, backgroundPatternSvg, paletteId, customFonts]
  );
  const renderPreview = () => renderThumbnail(pieces, elements, activeMaterial);
  const sync = useProjectSync({ project, payload, invalidReason, renderThumbnail: renderPreview });
  // 422 of the last export, shown in the FitCheck tab while the design is the one the server checked.
  const payloadKey = useMemo(() => JSON.stringify(payload), [payload]);
  const [exportBlock, setExportBlock] = useState<{ report: FitCheckReport; key: string } | null>(null);
  const blockingReport = exportBlock?.key === payloadKey ? exportBlock.report : null;
  const readOnly = sync.state === "trash";
  // The score the server stored with the last save; while a change waits for its save, the score of the browser.
  const displayReport = sync.dirty || !sync.serverReport ? fitcheckReport : sync.serverReport;
  const scoreTone = scoreToneOf(displayReport.score);
  const flaggedElementIds = useMemo(
    () => new Set(fitcheckReport.violations.flatMap((v) => (v.elementId ? [v.elementId] : []))),
    [fitcheckReport]
  );
  const syncLabel =
    sync.state === "error" ? `Chưa lưu được: ${errorMessage(sync.error)}` : sync.state === "invalid" && invalidReason ? `Chưa lưu: ${invalidReason}` : SYNC_LABELS[sync.state].label;
  const syncTone = SYNC_LABELS[sync.state].tone;

  const restoreProject = async () => {
    try {
      await sync.restore();
      toast.show({ tone: "success", title: "Đã khôi phục dự án", description: "Bạn có thể tiếp tục chỉnh sửa." });
    } catch (err) {
      toast.error(err, "Chưa khôi phục được dự án");
    }
  };

  // 1-click fix of the safe margin and bleed breaches, on every side of every panel (rules of the shared FitCheck)
  const handleAutoFix = useCallback(() => {
    recordAutoFix(project?.id ?? null, pieces, elements);
    setElements((prev) => autoFixElements(pieces, prev));
  }, [pieces, elements, project?.id]);

  /** The one-click fix of one FitCheck violation (docs/23 S21: turn a text upright). */
  const handleFixViolation = useCallback((violation: { elementId?: string; fix?: { rotation: number } }) => {
    const { elementId, fix } = violation;
    if (!elementId || !fix) return;
    setElements((prev) => prev.map((el) => (el.id === elementId ? { ...el, rotation: fix.rotation } : el)));
  }, []);

  // Background over the whole box (all pieces), in the design's palette; null leaves the paper.
  const boxBackgroundDesign = useMemo(() => {
    const designs = elements.filter(isLibraryBackground).map((el) => parseLibraryArt(el.content)!.design);
    return designs.find((d) => d !== "bg-solid") ?? designs[0] ?? null;
  }, [elements]);
  const applyBoxBackground = useCallback(
    (design: string | null) => {
      const palette = paletteId ?? DEFAULT_BACKGROUND_PALETTE;
      if (!paletteId && design) setPaletteId(palette);
      setElements((prev) => {
        const kept = prev.filter((el) => !isLibraryBackground(el));
        if (!design) return kept;
        const fills = boxBackgrounds(pieces, { design, palette }, mainPanelOf(boxType) ?? undefined).map((el) => ({ ...el, id: `fill_${el.id}` }));
        return [...fills, ...kept];
      });
    },
    [paletteId, pieces, boxType]
  );
  // Older designs: their screen-only seamless pattern becomes a printed background once.
  useEffect(() => {
    const legacy = backgroundPatternSvg ? LEGACY_PATTERNS[backgroundPatternSvg] : null;
    if (!legacy) return;
    setBackgroundPatternSvg(null);
    if (!paletteId) setPaletteId(legacy.palette);
    setElements((prev) =>
      prev.some(isLibraryBackground) ? prev : [...boxBackgrounds(pieces, legacy, mainPanelOf(boxType) ?? undefined).map((el) => ({ ...el, id: `fill_${el.id}` })), ...prev]
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // QR code of the unboxing page, printed on the box (one at a time): the back or bottom face, lower-right corner of its
  // safe area, so it stays out of the way of the front design.
  const placeUnboxingQr = useCallback(
    (url: string) => {
      for (const panelId of QR_PANELS) {
        const piece = pieces.find((p) => p.geometry.panels.some((panel) => panel.id === panelId));
        const panel = piece?.geometry.panels.find((item) => item.id === panelId);
        if (!piece || !panel) continue;
        const m = safeMarginsOf(panel, piece.geometry);
        const size = Math.round(Math.min(24, panel.bounds.width - m.left - m.right - 2, panel.bounds.height - m.top - m.bottom - 2));
        if (size < 15) continue; // FitCheck's smallest QR that scans
        const qr: CanvasElement = {
          id: `qr_unbox_${Date.now().toString(36)}`,
          type: "barcode",
          panelId: panel.id,
          x: Math.round((panel.bounds.width - m.right - 1 - size) * 10) / 10,
          y: Math.round((panel.bounds.height - m.bottom - 1 - size) * 10) / 10,
          width: size,
          height: size,
          rotation: 0,
          content: url,
        };
        setElements((prev) => [...prev.filter((el) => !isUnboxingQr(el)), qr]);
        toast.show({ tone: "success", title: "Đã đặt mã QR lên hộp", description: `${panel.name.replace(/\s*\(.*\)$/, "")}, ${size} × ${size} mm, in đen K100.` });
        return;
      }
      toast.show({ tone: "error", title: "Chưa đặt được mã QR", description: "Hộp không có mặt nào đủ chỗ cho mã QR 15 mm." });
    },
    [pieces, toast]
  );

  // Add Element from Sticker Bank or Image Upload
  const handleAddElement = useCallback(
    (newEl: CanvasElement) => {
      // New elements go on the side of the sheet being designed.
      setElements((prev) => [...prev, editSide === "inside" ? { ...newEl, side: "inside" } : newEl]);
      setSelectedElementId(newEl.id);
    },
    [editSide]
  );

  // Image / logo upload: the file goes to WrapFit storage first, the canvas keeps its URL (the API refuses data URLs).
  // The demo stays offline: the image is only shown in this tab.
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const file = input.files?.[0];
      input.value = "";
      if (!file || !placementPanel) return;

      const isVector = VECTOR_TYPES.includes(file.type);
      if (!isVector && !PHOTO_TYPES.includes(file.type)) {
        toast.show({ tone: "error", title: "Định dạng ảnh chưa hỗ trợ", description: "Chọn ảnh PNG, JPG, WebP hoặc logo SVG." });
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.show({ tone: "error", title: "Ảnh quá lớn", description: "Mỗi ảnh tối đa 15 MB." });
        return;
      }

      // Fits the panel (60% of it at most) with the proportions of the image, centred.
      const size = await imageSizeOf(file);
      const ratio = size ? size.height / size.width : 1;
      const { width: panelW, height: panelH } = placementPanel.bounds;
      let width = Math.min(panelW * 0.6, 60);
      let height = width * ratio;
      if (height > panelH * 0.6) {
        height = panelH * 0.6;
        width = height / ratio;
      }
      width = Math.round(width * 10) / 10;
      height = Math.round(height * 10) / 10;

      let content: string;
      if (!project) {
        content = URL.createObjectURL(file);
      } else {
        setUploading(true);
        try {
          content = (await uploadFileToStorage(file, isVector ? "LOGO" : "IMAGE", project.id)).fileUrl;
        } catch (err) {
          toast.error(err, "Chưa tải được ảnh lên");
          return;
        } finally {
          setUploading(false);
        }
      }

      handleAddElement({
        id: `img_${Date.now()}`,
        type: isVector ? "logo" : "image",
        panelId: placementPanel.id,
        x: Math.round(((panelW - width) / 2) * 10) / 10,
        y: Math.round(((panelH - height) / 2) * 10) / 10,
        width,
        height,
        rotation: 0,
        content,
        // Print resolution at this size; vectors print sharp at any size.
        dpi: size && !isVector ? Math.round(size.width / (width / 25.4)) : 300,
      });
    },
    [placementPanel, project, toast, handleAddElement]
  );

  // "Thay ảnh, giữ khung" (docs/23 S10): another file in the same box, crop reset, DPI of the new file.
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);
  const requestReplaceImage = useCallback((elementId: string) => {
    replaceTarget.current = elementId;
    replaceInputRef.current?.click();
  }, []);
  const handleReplaceImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const file = input.files?.[0];
      input.value = "";
      const targetId = replaceTarget.current;
      const target = elements.find((el) => el.id === targetId);
      if (!file || !target) return;
      const isVector = VECTOR_TYPES.includes(file.type);
      if (!isVector && !PHOTO_TYPES.includes(file.type)) {
        toast.show({ tone: "error", title: "Định dạng ảnh chưa hỗ trợ", description: "Chọn ảnh PNG, JPG, WebP hoặc logo SVG." });
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.show({ tone: "error", title: "Ảnh quá lớn", description: "Mỗi ảnh tối đa 15 MB." });
        return;
      }
      const size = await imageSizeOf(file);
      let content: string;
      if (!project) {
        content = URL.createObjectURL(file);
      } else {
        setUploading(true);
        try {
          content = (await uploadFileToStorage(file, isVector ? "LOGO" : "IMAGE", project.id)).fileUrl;
        } catch (err) {
          toast.error(err, "Chưa tải được ảnh lên");
          return;
        } finally {
          setUploading(false);
        }
      }
      setElements((prev) =>
        prev.map((el) =>
          el.id === target.id
            ? {
                ...el,
                type: isVector ? "logo" : "image",
                content,
                crop: undefined,
                dpi: size && !isVector ? Math.round(size.width / (el.width / 25.4)) : 300,
              }
            : el
        )
      );
    },
    [elements, project, toast]
  );
  const { user: signedInUser } = useAuth();
  const brandFonts = signedInUser?.brandKit?.fonts ?? [];
  /** A ready-made text (heading, subheading, body) on the face, in the brand fonts when the Brand Kit has some. */
  const addPresetText = useCallback(
    (presetId: string) => {
      const preset = TEXT_PRESETS.find((p) => p.id === presetId);
      if (!preset || !placementPanel) return;
      const family = presetId === "body" ? (brandFonts[1] ?? brandFonts[0]) : brandFonts[0];
      const style = { color: "#1A362B", fontFamily: family ? `'${family}', sans-serif` : presetId === "heading" ? "'Playfair Display', serif" : "Inter, sans-serif", ...preset.style };
      const maxWidth = Math.max(10, placementPanel.bounds.width - 10);
      const probe = layoutBoxText({ content: preset.content, width: maxWidth, height: 1000, style });
      const width = Math.round((Math.min(maxWidth, Math.max(...probe.lines.map((line) => line.width))) + 2) * 10) / 10;
      const height = Math.round((probe.lines.length * probe.lineHeightMm + 2) * 10) / 10;
      handleAddElement({
        id: newElementId("text"),
        type: "text",
        panelId: placementPanel.id,
        x: Math.round(((placementPanel.bounds.width - width) / 2) * 10) / 10,
        y: Math.round(((placementPanel.bounds.height - height) / 2) * 10) / 10,
        width,
        height,
        rotation: 0,
        content: preset.content,
        style,
      });
    },
    [placementPanel, brandFonts, handleAddElement]
  );
  /** A ready-made text combo (docs/23 S14): its lines stacked and centred on the face, grouped to move as one. */
  const addTextCombo = useCallback(
    (comboId: string) => {
      const combo = TEXT_COMBOS.find((c) => c.id === comboId);
      if (!combo || !placementPanel) return;
      const maxWidth = Math.max(10, placementPanel.bounds.width - 10);
      const lines = combo.lines.map((line) => {
        const style = textComboStyle(combo, line);
        const probe = layoutBoxText({ content: line.text, width: maxWidth, height: 1000, style });
        const width = Math.round((Math.min(maxWidth, Math.max(...probe.lines.map((l) => l.width))) + 2) * 10) / 10;
        const height = Math.round((probe.lines.length * probe.lineHeightMm + 1) * 10) / 10;
        return { line, style, width, height };
      });
      const total = lines.reduce((sum, l) => sum + l.height, 0);
      const groupId = newElementId("group");
      let y = Math.round(((placementPanel.bounds.height - total) / 2) * 10) / 10;
      for (const { line, style, width, height } of lines) {
        handleAddElement({
          id: newElementId("text"),
          type: "text",
          panelId: placementPanel.id,
          x: Math.round(((placementPanel.bounds.width - width) / 2) * 10) / 10,
          y,
          width,
          height,
          rotation: 0,
          content: line.text,
          style,
          groupId,
        });
        y = Math.round((y + height) * 10) / 10;
      }
    },
    [placementPanel, handleAddElement]
  );
  const designColors = useMemo(() => designColorsOf(elements), [elements]);

  // Fonts uploaded for this design (docs/23 S13, D11): checked for the Vietnamese letters in the browser, then by the
  // API after the upload; kept in the canvas so the design keeps them.
  useEffect(() => {
    customFonts.forEach((font) => void registerCustomFont(font));
  }, [customFonts]);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [fontRights, setFontRights] = useState(false);
  const [fontBusy, setFontBusy] = useState(false);
  const applyCustomFont = useCallback(
    (font: CustomFont) => {
      if (selectedElement?.type !== "text") return;
      updateElement({ ...selectedElement, style: { ...selectedElement.style, fontFamily: `'${font.family}', sans-serif`, fontUrl: font.url, fontWeight: undefined, fontStyle: undefined } });
    },
    [selectedElement, updateElement]
  );
  const handleFontUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const picked = input.files?.[0];
      input.value = "";
      if (!picked) return;
      const file = asFontFile(picked);
      if (!file) {
        toast.show({ tone: "error", title: "Định dạng phông chưa hỗ trợ", description: "Chọn tệp TTF, OTF, WOFF hoặc WOFF2." });
        return;
      }
      if (file.size > MAX_FONT_BYTES) {
        toast.show({ tone: "error", title: "Phông quá lớn", description: "Mỗi tệp phông tối đa 10 MB." });
        return;
      }
      setFontBusy(true);
      try {
        const checked = await inspectFontFile(file);
        if (!checked) {
          toast.show({ tone: "error", title: "Không đọc được phông", description: "Tệp này không phải phông chữ hoặc đã hỏng." });
          return;
        }
        if (checked.missing.length) {
          toast.show({
            tone: "error",
            title: "Phông thiếu dấu tiếng Việt",
            description: `Phông không vẽ được: ${checked.missing.slice(0, 16).join(" ")}${checked.missing.length > 16 ? " …" : ""}. Chữ có dấu sẽ in thành ô trống.`,
          });
          return;
        }
        let font: CustomFont;
        if (!project) {
          // The demo keeps the font in this tab only, like its images.
          font = { family: checked.family, url: URL.createObjectURL(file) };
        } else {
          const { fileUrl } = await uploadFileToStorage(file, "FONT", project.id);
          font = { family: checked.family, url: fileUrl };
          // The API checks the file again (the browser check could be bypassed) and names its family.
          if (/^https?:/.test(fileUrl)) font = { family: (await inspectFont(fileUrl)).family, url: fileUrl };
        }
        await registerCustomFont(font);
        setCustomFonts((list) => [...list.filter((item) => item.url !== font.url), font]);
        applyCustomFont(font);
        toast.show({ tone: "success", title: "Đã thêm phông", description: `${font.family} có đủ dấu tiếng Việt và sẽ được nhúng vào file in.` });
      } catch (err) {
        toast.error(err, "Chưa thêm được phông");
      } finally {
        setFontBusy(false);
      }
    },
    [project, toast, applyCustomFont]
  );

  // AI image (docs/19 S4): as large as the safe area of the face allows, with the image's proportions, centred. Same
  // element and DPI as an uploaded image, so FitCheck judges it the same way; the file is already in WrapFit storage.
  const handlePlaceAiImage = useCallback(
    (output: AiImageOutput): { dpi: number } | null => {
      if (!placementPanel || !output.url) return null;
      const isVector = output.width === null || output.height === null;
      const ratio = isVector ? 1 : output.height! / output.width!;
      const m = safeMarginsOf(placementPanel, dieline);
      // Half a millimetre more than the safe margin, so rounding never puts the image on the line.
      const left = m.left + 0.5;
      const top = m.top + 0.5;
      const maxW = placementPanel.bounds.width - left - m.right - 0.5;
      const maxH = placementPanel.bounds.height - top - m.bottom - 0.5;
      if (maxW <= 0 || maxH <= 0) return null;
      let width = maxW;
      let height = width * ratio;
      if (height > maxH) {
        height = maxH;
        width = height / ratio;
      }
      width = Math.floor(width * 10) / 10;
      height = Math.floor(height * 10) / 10;
      const dpi = isVector ? 300 : Math.round(output.width! / (width / 25.4));
      handleAddElement({
        id: `aiimg_${Date.now()}`,
        type: isVector ? "logo" : "image",
        panelId: placementPanel.id,
        x: Math.round((left + (maxW - width) / 2) * 10) / 10,
        y: Math.round((top + (maxH - height) / 2) * 10) / 10,
        width,
        height,
        rotation: 0,
        content: output.url,
        dpi,
      });
      return { dpi };
    },
    [placementPanel, dieline, handleAddElement]
  );

  // AI pattern: under the other elements of the panel
  const handleInsertPattern = useCallback(
    (pattern: CanvasElement) => {
      setElements((prev) =>
        refitBackgrounds(
          orderElements([
            { ...pattern, role: "background", ...(editSide === "inside" ? { side: "inside" as const } : {}) },
            ...prev.filter((el) => !(isBackground(el) && samePanel(el.panelId, pattern.panelId) && sideOf(el) === sideOf(pattern))),
          ]),
          pieces
        )
      );
      setSelectedElementId(null);
    },
    [pieces, editSide]
  );
  // Background of the face that receives new elements, and copying it to every face.
  const faceBackground = placementPanel
    ? elements.find((el) => isBackground(el) && samePanel(el.panelId, placementPanel.id) && sideOf(el) === editSide) ?? null
    : null;
  const applyFaceBackgroundEverywhere = useCallback(() => {
    if (!faceBackground) return;
    setElements((prev) => {
      let next = prev;
      for (const piece of editPieces) {
        for (const panel of piece.geometry.panels) {
          if (!panelTouchesGlue(panel, piece.geometry)) next = setPanelBackground(next, panel, piece.geometry, faceBackground.content, { side: editSide });
        }
      }
      return next;
    });
  }, [faceBackground, editPieces, editSide]);
  const removeFaceBackground = useCallback(() => {
    if (!placementPanel) return;
    setElements((prev) => setPanelBackground(prev, placementPanel, dieline, null, { side: editSide }));
  }, [placementPanel, dieline, editSide]);

  // Step 4 rail: "Văn bản" opens the text composer on the flat dieline, "Tải lên" the file picker (shortcut U).
  const imageInputRef = useRef<HTMLInputElement>(null);
  const openTextComposer = useCallback(() => {
    setArtView("2d");
    setTextComposerOpen(true);
  }, []);
  const toggleRail = useCallback((id: DesignRailId) => setRailPanel((open) => (open === id ? null : id)), []);
  const selectRailKey = useCallback(
    (id: DesignRailId) => {
      setRailPanel(id);
      if (id === "text") openTextComposer();
      if (id === "uploads" && !uploading) imageInputRef.current?.click();
    },
    [openTextComposer, uploading]
  );

  // Keyboard of step 4: tool letters, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, never while typing in a field.
  useEffect(() => {
    if (currentStep !== 4 || readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const key = e.key.toLowerCase();
      const sel = elements.find((el) => el.id === selectedElementId && !isBackground(el)) ?? null;
      const chosen = elements.filter((el) => selectedIds.includes(el.id) && !isBackground(el));
      const movable = chosen.filter((el) => !el.locked);
      if (e.ctrlKey || e.metaKey) {
        if (key === "a" && placementPanel) {
          // Ctrl + A: every layer of the face on screen.
          e.preventDefault();
          const ids = elements.filter((el) => samePanel(el.panelId, placementPanel.id) && sideOf(el) === editSide && !isBackground(el) && !el.hidden).map((el) => el.id);
          selectIds(ids);
          return;
        }
        if (key === "g" && chosen.length) {
          e.preventDefault();
          const ids = chosen.map((el) => el.id);
          if (e.shiftKey) setElements((prev) => ungroupElements(prev, ids));
          else if (canGroup(elements, ids)) setElements((prev) => groupElements(prev, ids, newElementId("group")));
          return;
        }
        if (key === "z" || key === "y") {
          e.preventDefault();
          travel(key === "y" || e.shiftKey ? "redo" : "undo");
        } else if (sel && (e.code === "BracketRight" || e.code === "BracketLeft")) {
          e.preventDefault();
          const up = e.code === "BracketRight";
          setElements((prev) => moveLayer(prev, sel.id, up ? (e.shiftKey ? "front" : "forward") : e.shiftKey ? "back" : "backward"));
        } else if (chosen.length && key === "d") {
          e.preventDefault();
          const result = duplicateElements(elements, chosen.map((el) => el.id), copyId);
          setElements(result.elements);
          selectIds(result.ids);
        } else if (sel && key === "c") {
          clipboard.current = sel;
        } else if (key === "v" && clipboard.current && placementPanel) {
          e.preventDefault();
          const source = clipboard.current;
          const same = samePanel(source.panelId, placementPanel.id);
          const copy: CanvasElement = {
            ...source,
            id: copyId(source),
            panelId: placementPanel.id,
            x: same ? source.x + 5 : Math.round((placementPanel.bounds.width - source.width) / 2),
            y: same ? source.y + 5 : Math.round((placementPanel.bounds.height - source.height) / 2),
            locked: undefined,
            groupId: null,
            side: editSide === "inside" ? "inside" : undefined,
          };
          clipboard.current = copy;
          setElements((prev) => [...prev, copy]);
          setSelectedElementId(copy.id);
        }
        return;
      }
      if (key === "escape" && selectedIds.length) {
        selectIds([], null);
        return;
      }
      if (movable.length && (key === "delete" || key === "backspace")) {
        e.preventDefault();
        const gone = new Set(movable.map((el) => el.id));
        setElements((prev) => prev.filter((el) => !gone.has(el.id)));
        selectIds([], null);
        return;
      }
      if (movable.length && key.startsWith("arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        const moving = new Set(movable.map((el) => el.id));
        setElements((prev) => prev.map((el) => (moving.has(el.id) ? { ...el, x: Math.round((el.x + dx) * 10) / 10, y: Math.round((el.y + dy) * 10) / 10 } : el)));
        return;
      }
      if (e.altKey || textComposerOpen) return;
      const rail = RAIL_KEYS[key];
      if (rail) {
        e.preventDefault();
        selectRailKey(rail);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentStep, readOnly, textComposerOpen, travel, selectRailKey, elements, selectedElementId, placementPanel, selectedIds, selectIds, editSide]);

  // Export, snapshots, sharing and the QR code work on the saved project: none of them in the demo.
  const openDialog = (id: StudioDialogId) => {
    // The QR code is built in the browser when there is no saved project (demo, Vercel); the print file never is.
    if (!project && id !== "unboxing") {
      toast.show({
        tone: "info",
        title: "Bản dùng thử chưa lưu lên Cloud",
        description: "Đăng nhập và tạo dự án để xuất file in, lưu mốc, chia sẻ và tạo mã QR.",
      });
      return;
    }
    setDialog(id);
  };

  const showBlockingReport = (report: FitCheckReport) => {
    setExportBlock({ report, key: payloadKey });
    setDialog(null);
    setCurrentStep(6);
  };

  const undoRestore = async () => {
    if (!project || !restoreNotice) return;
    setUndoing(true);
    try {
      const undone = await sync.replace(async () => (await restoreSnapshot(project.id, restoreNotice.backupId)).project);
      toast.show(
        restoreNotice.kind === "formula"
          ? { tone: "success", title: "Đã quay lại công thức cũ", description: "Phôi và điểm FitCheck như trước khi cập nhật." }
          : { tone: "success", title: "Đã hoàn tác khôi phục", description: "Thiết kế quay về như trước khi khôi phục." }
      );
      onReplaced?.(undone, null);
    } catch (err) {
      if (err instanceof UnsavedChangesError) toast.show({ tone: "error", title: "Chưa hoàn tác được", description: err.message });
      else toast.error(err, "Chưa hoàn tác được");
      setUndoing(false);
    }
  };

  // /editor/demo is the only way into the studio (no more /editor/new): a signed-in user saves the demo as a project
  // (POST /projects) and lands on /editor/<id>, where it autosaves and the print file can be bought and exported.
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status: authStatus } = useAuth();
  const [savingProject, setSavingProject] = useState(false);
  const saveAsProject = async () => {
    if (invalidReason) {
      toast.show({ tone: "error", title: "Chưa lưu được dự án", description: invalidReason });
      return;
    }
    setSavingProject(true);
    try {
      // Images uploaded in the demo live only in this tab (blob: URLs) and the API refuses them: the user is signed in
      // now, so they go to WrapFit storage first. Only the ones that fail are left out.
      const uploaded = new Map<string, string | null>();
      for (const url of new Set(elements.filter((el) => el.content.startsWith("blob:")).map((el) => el.content))) {
        try {
          const blob = await (await fetch(url)).blob();
          const purpose = VECTOR_TYPES.includes(blob.type) ? "LOGO" : "IMAGE";
          uploaded.set(url, (await uploadFileToStorage(blob, purpose)).fileUrl);
        } catch {
          uploaded.set(url, null);
        }
      }
      const local = [...uploaded.values()].filter((v) => v === null);
      const savedElements = elements
        .map((el) => (uploaded.has(el.content) ? { ...el, content: uploaded.get(el.content) ?? "" } : el))
        .filter((el) => el.content !== "");
      const created = await createProject({
        templateId: boxType,
        title: payload.title,
        dimensions,
        materialSpec: payload.materialSpec,
        canvasState: { ...payload.canvasState, elements: savedElements },
        occasion: (occasion as never) ?? undefined,
      });
      queryClient.setQueryData(queryKeys.projects.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.show({
        tone: "success",
        title: "Đã lưu thành dự án",
        description: local.length ? `${local.length} ảnh tải lên ở bản dùng thử chưa lưu được: hãy tải lại trong dự án.` : "Thiết kế giờ tự lưu lên cloud.",
      });
      router.replace(`${ROUTES.editor(created.id)}?step=${currentStep}`);
    } catch (err) {
      toast.error(err, "Chưa lưu được dự án");
      setSavingProject(false);
    }
  };

  // A saved project autosaves; this button saves now, at any step, whatever FitCheck says (only the print file is sold).
  const saveNow = async () => {
    if (invalidReason) {
      toast.show({ tone: "error", title: "Chưa lưu được dự án", description: invalidReason });
      return;
    }
    setSavingProject(true);
    try {
      if (await sync.flush()) toast.show({ tone: "success", title: "Đã lưu dự án", description: "Thiết kế đã lưu trên Cloud." });
      else toast.show({ tone: "error", title: "Chưa lưu được dự án", description: "Thử lại sau vài giây." });
    } catch (err) {
      toast.error(err, "Chưa lưu được dự án");
    } finally {
      setSavingProject(false);
    }
  };


  const projectActions = (
    <>
      <button
        type="button"
        onClick={() => openDialog("snapshots")}
        disabled={readOnly}
        aria-label="Mốc phiên bản"
        title="Mốc phiên bản"
        className="min-h-[40px] min-w-[40px] px-2.5 rounded-full border border-landing-line bg-white hover:bg-landing-canvas text-landing-ink text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
      >
        <History className="w-4 h-4" aria-hidden />
        <span className="hidden 2xl:inline">Mốc</span>
      </button>
      <button
        type="button"
        onClick={() => openDialog("share")}
        disabled={readOnly}
        aria-label="Chia sẻ"
        title="Chia sẻ"
        className="min-h-[40px] min-w-[40px] px-2.5 rounded-full border border-landing-line bg-white hover:bg-landing-canvas text-landing-ink text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
      >
        <Share2 className="w-4 h-4" aria-hidden />
        <span className="hidden 2xl:inline">Chia sẻ</span>
      </button>
    </>
  );

  return (
    <div className={`${landingFontVariables} min-h-screen bg-landing-canvas flex flex-col font-landing-body select-none overflow-x-hidden`}>
      {/* ================= 1. GLOBAL TOP STEPPER NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-3">
          {/* Left: logo */}
          <div className="flex items-center gap-3 shrink-0">
            <LandingLogo size="sm" />
          </div>

          {/* Center: 4-Step Segmented Breadcrumb Stepper */}
          <StudioStepper
            current={currentStep}
            onSelect={setCurrentStep}
            locked={isDemo ? {} : { 1: "Cấu trúc hộp cố định sau khi tạo dự án. Tạo dự án mới để đổi kiểu hộp." }}
          />

          {/* Right: Cloud Save Status, FitCheck & Export. Never shrinks: the stepper scrolls instead. */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Save status: the label from 2xl, a dot below (only for saved projects) */}
            {!isDemo && (
              <div
                role="status"
                title={syncLabel}
                className="flex items-center gap-1.5 2xl:px-3 py-1 rounded-full 2xl:bg-landing-canvas text-landing-muted text-xs max-w-[220px]"
              >
                <span className={`w-2 h-2 flex-shrink-0 rounded-full ${DOT_CLASS[syncTone]}`} aria-hidden />
                <span title={syncLabel} className="sr-only 2xl:not-sr-only text-caption font-medium truncate whitespace-nowrap">
                  {syncLabel}
                </span>
              </div>
            )}

            {/* FitCheck Badge */}
            <button
              type="button"
              onClick={() => {
                setCurrentStep(6);
              }}
              title={sync.dirty || !sync.serverReport ? "Điểm tạm tính, chưa lưu" : "Điểm máy chủ kiểm khi lưu"}
              data-tour="studio-fitcheck"
              aria-label={`FitCheck: ${displayReport.score}/100`}
              className="hidden sm:flex items-center gap-1.5 h-10 px-3 xl:px-4 rounded-full whitespace-nowrap bg-orange-50 text-fpt-orange-ink border border-orange-200/60 text-sm font-semibold tabular-nums transition-colors hover:bg-orange-100/80"
            >
              <ShieldCheck className="w-4 h-4 text-fpt-orange" />
              {/* Laptops and tablets: the score alone */}
              <span aria-hidden>
                <span className="hidden xl:inline">FitCheck: </span>
                {displayReport.score}
                <span className="hidden xl:inline">/100</span>
              </span>
            </button>

            <button
              type="button"
              title="Hướng dẫn"
              onClick={() => {
                setChainedStep(null);
                setReplay((count) => count + 1);
                setIntroSeen(false);
              }}
              className={buttonClass({ variant: "ghost", size: "sm", className: "hidden md:inline-flex" })}
            >
              <CircleHelp aria-hidden />
              <span className="sr-only xl:not-sr-only">Hướng dẫn</span>
            </button>

            {/* Snapshots & sharing: icons, labels from 2xl; on phones they sit in the step 3 toolbar */}
            {!isDemo && <div className="hidden sm:flex items-center gap-2">{projectActions}</div>}

            {!isDemo && !readOnly && (
              <button
                type="button"
                onClick={() => void saveNow()}
                disabled={savingProject || sync.state === "saving"}
                className={buttonClass({ variant: "brand", size: "sm", className: "min-h-10" })}
              >
                <Save aria-hidden />
                <span className="hidden sm:inline">{savingProject ? "Đang lưu…" : "Lưu dự án"}</span>
              </button>
            )}

            {isDemo &&
              (authStatus === "authenticated" ? (
                <button
                  type="button"
                  onClick={() => void saveAsProject()}
                  disabled={savingProject}
                  className={buttonClass({ variant: "brand", size: "sm", className: "min-h-10" })}
                >
                  <Save aria-hidden />
                  {savingProject ? "Đang lưu…" : "Lưu dự án"}
                </button>
              ) : (
                <Link href={`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.editorDemo)}`} className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-10" })}>
                  <LogIn aria-hidden />
                  <span className="hidden sm:inline">Đăng nhập để lưu</span>
                </Link>
              ))}

            {/* No export button here: the print file is sold. Step 6 shows "Thanh toán", which becomes "Xuất file in"
                once a package covers the design (ExportPurchaseCard). */}
          </div>
        </div>
      </header>

      {/* Trashed project: read-only until restored */}
      {readOnly && (
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 pt-4">
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-sheet bg-white"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 flex-shrink-0 rounded-full bg-landing-canvas text-landing-muted flex items-center justify-center">
                <Trash2 className="w-5 h-5" aria-hidden />
              </span>
              <div className="text-sm text-landing-ink">
                <span className="font-landing-heading font-bold text-landing-ink block">Dự án đang ở thùng rác</span>
                Chỉ xem được. Khôi phục để tiếp tục chỉnh sửa và xuất file.
              </div>
            </div>
            <button
              type="button"
              onClick={() => void restoreProject()}
              disabled={sync.restoring}
              className="min-h-[44px] px-6 rounded-full bg-landing-green-night hover:bg-black text-white text-sm font-semibold shadow-none transition disabled:cursor-wait disabled:opacity-60"
            >
              {sync.restoring ? "Đang khôi phục…" : "Khôi phục dự án"}
            </button>
          </div>
        </div>
      )}

      {/* Dieline on older formulas than its box structure: offer the upgrade (with undo) */}
      {project && !readOnly && !restoreNotice && (
        <FormulaUpgrade
          project={project}
          replace={sync.replace}
          onUpgraded={(upgraded, backup) =>
            onReplaced?.(upgraded, { snapshotName: backup.name, backupId: backup.id, kind: "formula" })
          }
        />
      )}

      {/* Snapshot just restored: undo it */}
      {restoreNotice && !readOnly && (
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 pt-4">
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-3xl bg-white border border-orange-200 shadow-none"
          >
            <div className="flex items-center gap-3 text-sm text-landing-ink min-w-0">
              <span className="w-9 h-9 flex-shrink-0 rounded-full bg-orange-50 text-fpt-orange flex items-center justify-center">
                <RotateCcw className="w-4 h-4" aria-hidden />
              </span>
              <span className="min-w-0">
                {restoreNotice.kind === "formula" ? (
                  <>
                    Phôi đã lên công thức bản {project?.formulaVersion}. Bản cũ được lưu thành mốc tự động{" "}
                    <strong className="text-landing-ink">“{restoreNotice.snapshotName}”</strong>.
                  </>
                ) : (
                  <>
                    Đã khôi phục mốc <strong className="text-landing-ink">“{restoreNotice.snapshotName}”</strong>. Bản trước
                    đó được lưu thành mốc tự động.
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => void undoRestore()}
                disabled={undoing}
                className="min-h-[40px] px-4 rounded-full bg-fpt-orange hover:bg-fpt-orange-ink text-white text-xs font-semibold transition disabled:opacity-60 disabled:cursor-wait"
              >
                {undoing ? "Đang hoàn tác…" : "Hoàn tác"}
              </button>
              <button
                type="button"
                onClick={() => setRestoreNotice(null)}
                disabled={undoing}
                aria-label="Ẩn thông báo"
                className="w-10 h-10 rounded-full hover:bg-landing-canvas text-landing-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      {!introSeen ? (
        <ProductTour
          key={`intro-${replay}`}
          id={STUDIO_INTRO_TOUR_ID}
          steps={STUDIO_INTRO_TOUR}
          force={tourContinued || replay > 0}
          onClose={(completed) => {
            setIntroSeen(true);
            // A replayed intro that was finished goes on with the tour of the step that is open; skipped, it stops.
            if (completed && replay > 0) setChainedStep(currentStep);
          }}
        />
      ) : (
        // Keyed by step: each step has its own tour, started on its first visit (or by the replay above).
        <ProductTour
          key={chainedStep === currentStep ? `${currentStep}-replay-${replay}` : currentStep}
          id={studioStepTourId(currentStep)}
          steps={STUDIO_STEP_TOURS[currentStep]}
          force={chainedStep === currentStep}
          onClose={() => setChainedStep(null)}
        />
      )}

      {/* ================= 2. DYNAMIC STEP VIEW CONTENT ================= */}
      {/* `inert`: a trashed project can be looked at, not edited */}
      <main className="flex-1 w-full flex flex-col" inert={readOnly || undefined}>
        {/* STEP 1: CHỌN MẪU HỘP (demo only) */}
        {currentStep === 1 && (
          <Step1BoxTemplatePicker
            selectedStructure={boxType}
            onSelectStructure={(t) => {
              setBoxType(t);
              setPieceIndex(0);
            }}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {/* STEP 2: NHẬP KÍCH THƯỚC & VẬT LIỆU */}
        {currentStep === 2 && (
          <Step2DimensionAndMaterial
            dimensions={dimensions}
            onDimensionsChange={setDimensions}
            activeMaterial={activeMaterial}
            onMaterialChange={(m) => setActiveMaterial(m as BoxMaterialTheme)}
            fitCheckReport={displayReport}
            limits={limits}
            structure={boxType}
            formulaVersion={project?.formulaVersion}
            onBack={isDemo ? () => setCurrentStep(1) : undefined}
            onNext={() => setCurrentStep(3)}
            elements={elements}
            backgroundPatternSvg={backgroundPatternSvg}
          />
        )}

        {/* STEP 3: GIẤY & BỀ MẶT */}
        {currentStep === 3 && (
          <Step3PaperFinish
            boxType={boxType}
            dimensions={dimensions}
            onDimensionsChange={setDimensions}
            activeMaterial={activeMaterial}
            onMaterialChange={setActiveMaterial}
            finishes={finishes}
            onFinishesChange={setFinishes}
            pieces={pieces}
            limits={limits}
            elements={elements}
            backgroundPatternSvg={backgroundPatternSvg}
            formulaVersion={project?.formulaVersion}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {/* STEP 4: THIẾT KẾ — Canva-like: icon rail on the left, its flyout panel next to it, the stage (dieline or folded
            box) like a slide in the middle, the faces of the dieline as a page strip and the zoom at the bottom. */}
        {currentStep === 4 && (
          <section
            aria-label="Thiết kế hình in trên khuôn bế"
            className="flex flex-1 flex-col bg-surface-sunken lg:h-[calc(100dvh-72px)] lg:min-h-[640px] lg:flex-none lg:flex-row lg:overflow-hidden"
          >
            <DesignRail active={railPanel} onSelect={toggleRail} fitcheckIssues={displayReport.violations.filter((v) => v.severity !== "info").length} />
            <input
              ref={imageInputRef}
              type="file"
              accept={[...PHOTO_TYPES, ...VECTOR_TYPES].join(",")}
              onChange={(e) => void handleImageUpload(e)}
              className="hidden"
              tabIndex={-1}
              aria-hidden
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept={[...PHOTO_TYPES, ...VECTOR_TYPES].join(",")}
              onChange={(e) => void handleReplaceImage(e)}
              className="hidden"
              tabIndex={-1}
              aria-hidden
            />

            {railPanel && (
              <DesignFlyout id={railPanel} onClose={() => setRailPanel(null)}>
                <DesignColorsContext.Provider value={designColors}>
                <CustomFontsContext.Provider value={customFonts}>
                {railPanel === "elements" && placementPanel && (
                  <LibraryPanel
                    panel={placementPanel}
                    geometry={dieline}
                    onAddElement={(element: CanvasElement) => {
                      // A background replaces the one of its face, under the artwork (docs/23 D4).
                      if (element.type === "pattern") handleInsertPattern(element);
                      else handleAddElement(element);
                    }}
                    selectedElement={elements.find((el) => el.id === selectedElementId) ?? null}
                    onUpdateElement={(element: CanvasElement) => setElements((prev) => prev.map((el) => (el.id === element.id ? element : el)))}
                    box={{ structure: boxType, dimensions, formulaVersion: project?.formulaVersion, title: projectTitle }}
                    designElements={elements}
                  />
                )}

                {railPanel === "text" && (
                  <div className="space-y-5">
                    <button type="button" onClick={openTextComposer} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
                      <Type className="size-4" aria-hidden />
                      Thêm hộp văn bản
                    </button>
                    <p className="text-caption leading-5 text-fg-muted">
                      Chữ được đặt lên <strong className="text-fg">{placementPanel?.name ?? "mặt đang chọn"}</strong>. Chọn mặt khác ở dải “Mặt hộp” dưới khung thiết kế.
                      Bấm đúp vào chữ trên khung để sửa ngay tại chỗ.
                    </p>
                    <div role="group" aria-label="Kiểu chữ dựng sẵn" className="grid gap-2">
                      {TEXT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => addPresetText(preset.id)}
                          className={cn(
                            "min-h-11 rounded-panel bg-surface-sunken px-4 text-left text-fg ring-1 ring-inset ring-transparent transition hover:ring-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                            preset.id === "heading" ? "text-heading-sm font-bold" : preset.id === "subheading" ? "text-label font-bold uppercase tracking-wider" : "text-body-sm"
                          )}
                          style={brandFonts[0] && preset.id !== "body" ? { fontFamily: `'${brandFonts[0]}', sans-serif` } : undefined}
                        >
                          Thêm {preset.label.toLowerCase()}
                        </button>
                      ))}
                      {brandFonts.length > 0 && <p className="text-caption text-fg-muted">Dùng phông trong Brand Kit của bạn.</p>}
                      <p className="text-caption leading-5 text-fg-muted">{PRODUCT_LABEL_DISCLAIMER}</p>
                    </div>
                    <section aria-labelledby="text-combos" className="space-y-2">
                      <h3 id="text-combos" className="text-label font-semibold text-fg">
                        Tổ hợp chữ <span className="font-normal text-fg-muted">· thêm cả nhóm, sửa chữ sau</span>
                      </h3>
                      <ul className="grid grid-cols-2 gap-2">
                        {TEXT_COMBOS.map((combo) => (
                          <li key={combo.id}>
                            <button
                              type="button"
                              onClick={() => addTextCombo(combo.id)}
                              title={combo.name}
                              aria-label={`Thêm tổ hợp chữ: ${combo.name}`}
                              className="flex min-h-20 w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-panel bg-white px-2 py-2 text-center ring-1 ring-line transition hover:ring-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
                            >
                              {combo.lines.map((line, i) => {
                                const style = textComboStyle(combo, line);
                                return (
                                  <span
                                    key={i}
                                    className="block max-w-full truncate leading-tight"
                                    style={{
                                      fontFamily: style.fontFamily,
                                      fontWeight: style.fontWeight,
                                      fontStyle: style.fontStyle,
                                      color: style.color,
                                      fontSize: `${Math.max(8, Math.min(18, line.sizePt * 0.62))}px`,
                                      letterSpacing: style.letterSpacing ? `${style.letterSpacing / 1000}em` : undefined,
                                    }}
                                  >
                                    {line.text}
                                  </span>
                                );
                              })}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section aria-label="Phông của bạn" className="space-y-3 rounded-panel bg-surface-sunken p-3">
                      <h3 className="text-label font-semibold text-fg">Phông của bạn</h3>
                      {customFonts.length > 0 && (
                        <ul className="space-y-1">
                          {customFonts.map((font) => (
                            <li key={font.url} className="flex items-center justify-between gap-2">
                              <span className="truncate text-body-sm text-fg">{font.family}</span>
                              <button
                                type="button"
                                disabled={selectedElement?.type !== "text"}
                                className={buttonClass({ variant: "ghost", size: "sm", shape: "rounded" })}
                                title={selectedElement?.type === "text" ? "Dùng cho chữ đang chọn" : "Chọn một chữ trước"}
                                onClick={() => applyCustomFont(font)}
                              >
                                Dùng
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <label className="flex items-start gap-2 text-caption leading-5 text-fg-muted">
                        <input type="checkbox" checked={fontRights} onChange={(e) => setFontRights(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
                        Tôi có quyền dùng phông này cho bao bì in (phông tự làm, đã mua giấy phép, hoặc giấy phép mở như OFL).
                      </label>
                      <input ref={fontInputRef} type="file" accept={FONT_ACCEPT} onChange={(e) => void handleFontUpload(e)} className="hidden" tabIndex={-1} aria-hidden />
                      <button
                        type="button"
                        disabled={!fontRights || fontBusy || readOnly}
                        onClick={() => fontInputRef.current?.click()}
                        className={buttonClass({ variant: "secondary", size: "sm", block: true })}
                      >
                        <Upload className="size-4" aria-hidden />
                        {fontBusy ? "Đang kiểm tra phông…" : "Tải phông lên (TTF, OTF, WOFF)"}
                      </button>
                      <p className="text-caption leading-5 text-fg-muted">Phông phải có đủ dấu tiếng Việt. Một tệp là một kiểu chữ (muốn đậm thì tải tệp Bold).</p>
                    </section>
                    {selectedElement?.type === "text" && (
                      <section aria-label="Chữ đang chọn" className="space-y-3 rounded-panel bg-surface-sunken p-3">
                        <h3 className="text-label font-semibold text-fg">Chữ đang chọn</h3>
                        <TextInspector
                          element={selectedElement}
                          onChange={updateElement}
                          onApplyFontToAll={(fontFamily) =>
                            setElements((prev) => prev.map((el) => (el.type === "text" ? { ...el, style: { ...el.style, fontFamily } } : el)))
                          }
                        />
                      </section>
                    )}
                    <p className="text-caption leading-5 text-fg-muted">
                      {selectedElement?.type === "text" ? "Bộ phông dưới đây đổi phông của chữ đang chọn." : "Chưa chọn chữ nào: bộ phông dưới đây đổi phông của mọi chữ."}
                    </p>
                    <FontSelectorCards
                      selectedFontId={selectedFont.id}
                      onSelectFont={(f) => {
                        setSelectedFont(f);
                        const target = selectedElement?.type === "text" ? selectedElement.id : null;
                        setElements((prev) =>
                          prev.map((el) => (el.type === "text" && (!target || el.id === target) ? { ...el, style: { ...el.style, fontFamily: f.fontFamilyHeading } } : el))
                        );
                      }}
                    />
                  </div>
                )}

                {railPanel === "uploads" && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => imageInputRef.current?.click()}
                      className={buttonClass({ variant: "brand", size: "lg", block: true })}
                    >
                      <Upload className="size-4" aria-hidden />
                      {uploading ? "Đang tải ảnh…" : "Tải ảnh hoặc logo lên"}
                    </button>
                    <ul className="list-disc space-y-1.5 rounded-panel bg-surface-sunken py-3 pl-8 pr-4 text-caption leading-5 text-fg-muted">
                      <li>Ảnh PNG, JPG, WebP hoặc logo SVG, tối đa 15 MB.</li>
                      <li>Ảnh cần ≥ 300 DPI ở kích thước in để rõ nét; FitCheck báo khi ảnh mờ.</li>
                      <li>Logo SVG in sắc nét ở mọi cỡ.</li>
                    </ul>
                    {selectedElement && (selectedElement.type === "image" || selectedElement.type === "logo") && !parseLibraryArt(selectedElement.content) && (
                      <section aria-label="Ảnh đang chọn" className="space-y-3 rounded-panel bg-surface-sunken p-3">
                        <h3 className="text-label font-semibold text-fg">Ảnh đang chọn</h3>
                        <ImageInspector element={selectedElement} onChange={updateElement} onReplaceImage={requestReplaceImage} />
                      </section>
                    )}
                  </div>
                )}

                {railPanel === "colors" && (
                  <div className="space-y-5">
                    <ColorPaletteSelector
                      selectedPaletteId={paletteId}
                      onSelectPalette={(id) => {
                        const next = recolorDesign(elements, id);
                        setPaletteUndo({ paletteId, elements, applied: next });
                        setPaletteId(id);
                        setElements(next);
                      }}
                      undo={
                        paletteUndo && paletteUndo.applied === elements
                          ? {
                              paletteName: artPaletteOf(paletteUndo.paletteId ?? "")?.name ?? "màu cũ",
                              onUndo: () => {
                                setPaletteId(paletteUndo.paletteId);
                                setElements(paletteUndo.elements);
                                setPaletteUndo(null);
                              },
                            }
                          : null
                      }
                    />
                    <BoxBackgroundPicker selectedDesign={boxBackgroundDesign} paletteId={paletteId ?? DEFAULT_BACKGROUND_PALETTE} onSelect={applyBoxBackground} />
                    <section aria-label="Nền của mặt đang chọn" className="space-y-2 rounded-panel bg-surface-sunken p-3">
                      <h3 className="text-label font-semibold text-fg">Nền mặt {placementPanel?.name ?? ""}</h3>
                      <p className="text-caption leading-5 text-fg-muted">
                        {faceBackground
                          ? "Nền gắn chặt vào mặt, phủ cả phần tràn lề và tự khớp khi đổi kích thước."
                          : "Mặt này chưa có nền riêng. Chọn một nền ở “Thành phần” hoặc tạo bằng “Hoa văn AI”."}
                      </p>
                      {faceBackground && !readOnly && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={buttonClass({ variant: "secondary", size: "sm" })} onClick={applyFaceBackgroundEverywhere}>
                            Áp nền này cho mọi mặt
                          </button>
                          <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={removeFaceBackground}>
                            Xóa nền mặt này
                          </button>
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {railPanel === "shapes" && (
                  <div className="space-y-5">
                    <p className="text-caption leading-5 text-fg-muted">
                      Hình được đặt lên <strong className="text-fg">{placementPanel?.name ?? "mặt đang chọn"}</strong>, trong vùng an toàn.
                    </p>
                    <ShapePicker
                      disabled={!placementPanel}
                      onPick={(kind) => placementPanel && handleAddElement(newShape(kind, placementPanel, dieline, `shape_${Date.now().toString(36)}`))}
                    />
                    {selectedElement?.type === "shape" && (
                      <section aria-label="Hình đang chọn" className="space-y-3 rounded-panel bg-surface-sunken p-3">
                        <h3 className="text-label font-semibold text-fg">Hình đang chọn</h3>
                        <ShapeInspector element={selectedElement} onChange={updateElement} />
                      </section>
                    )}
                  </div>
                )}

                {railPanel === "layers" && placementPanel && (
                  <div className="space-y-5">
                    <LayersPanel
                      elements={elements}
                      onChange={setElements}
                      selectedId={selectedElement?.id ?? null}
                      onSelect={setSelectedElementId}
                      faces={pieces.flatMap((piece) => piece.geometry.panels.map((panel) => ({ id: panel.id, name: pieces.length > 1 ? `${piece.name} · ${panel.name}` : panel.name })))}
                      faceId={placementPanel.id}
                      onFaceChange={selectPanel}
                      readOnly={readOnly}
                      side={editSide}
                    />
                    {selectedElement && !readOnly && (
                      <section aria-label="Thuộc tính lớp đang chọn" className="space-y-3 rounded-panel bg-surface-sunken p-3">
                        <h3 className="text-label font-semibold text-fg">Thuộc tính</h3>
                        <ElementInspector element={selectedElement} onChange={updateElement} onReplaceImage={requestReplaceImage} />
                      </section>
                    )}
                  </div>
                )}

                {railPanel === "patterns" && (
                  <AiPatternPanel projectId={project?.id ?? null} panel={placementPanel} geometry={dieline} colors={paletteColors(paletteId)} onInsert={handleInsertPattern} />
                )}

                {railPanel === "aiImage" && <AiImagePanel projectId={project?.id ?? null} panel={placementPanel} onPlace={handlePlaceAiImage} />}

                {railPanel === "dimensions" && <DimensionControls dimensions={dimensions} onChange={setDimensions} limits={limits} />}

                {railPanel === "fitcheck" && (
                  <div className="space-y-3">
                    {!isDemo && (
                      <p className="text-caption leading-relaxed text-fg-muted">
                        {sync.dirty || !sync.serverReport
                          ? "Điểm tạm tính trên trình duyệt; máy chủ kiểm lại khi lưu."
                          : "Điểm do máy chủ kiểm ở lần lưu gần nhất, cũng là điểm dùng khi xuất file in."}
                      </p>
                    )}
                    {blockingReport && (
                      <p role="alert" className="flex gap-2 rounded-panel bg-danger-bg p-3 text-label-sm text-danger-fg">
                        <ShieldAlert className="size-4 shrink-0" aria-hidden />
                        Máy chủ chặn xuất file vì các lỗi dưới đây. Sửa xong thì xuất lại.
                      </p>
                    )}
                    <FitCheckDrawer report={blockingReport ?? displayReport} onAutoFix={handleAutoFix} onFixViolation={handleFixViolation} />
                  </div>
                )}
                </CustomFontsContext.Provider>
                </DesignColorsContext.Provider>
              </DesignFlyout>
            )}

            {/* ── The workspace: toolbar, stage, page strip and zoom ── */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Context toolbar */}
              {/* Three columns from md: tools | 2D/3D switch, always centred | "Tiếp". */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-raised px-3 py-2 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-2">
                <div className="flex min-w-0 items-center gap-1">
                  <button type="button" aria-label="Hoàn tác" title="Hoàn tác · Ctrl+Z" disabled={historySize.past === 0} onClick={() => travel("undo")} className={lightToolButton(false)}>
                    <Undo2 className="size-4" aria-hidden />
                  </button>
                  <button type="button" aria-label="Làm lại" title="Làm lại · Ctrl+Y" disabled={historySize.future === 0} onClick={() => travel("redo")} className={lightToolButton(false)}>
                    <Redo2 className="size-4" aria-hidden />
                  </button>
                  <span className="mx-1 h-6 w-px bg-line" aria-hidden />
                  <button
                    type="button"
                    aria-pressed={showRulers}
                    aria-label="Thước đo mm"
                    title={showRulers ? "Ẩn thước mm" : "Hiện thước mm"}
                    onClick={() => setShowRulers((on) => !on)}
                    className={lightToolButton(showRulers)}
                  >
                    <Ruler className="size-4" aria-hidden />
                  </button>
                  {uploading && (
                    <span role="status" className="ml-1 flex min-h-9 items-center gap-1.5 rounded-full bg-info-bg px-3 text-label-sm font-semibold text-info-fg">
                      <ImageUp className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden />
                      <span className="hidden sm:inline">Đang tải ảnh…</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <ViewToggle<"2d" | "3d">
                    label="Chế độ xem"
                    value={artView}
                    onChange={setArtView}
                    options={[
                      { value: "2d", label: "Khuôn bế 2D", icon: LayoutPanelTop },
                      { value: "3d", label: "Gập hộp 3D", icon: Box },
                    ]}
                  />
                  {artView === "2d" && (
                    <ViewToggle<PrintSide>
                      label="Mặt giấy đang thiết kế"
                      value={editSide}
                      onChange={(side) => {
                        setEditSide(side);
                        setSelectedElementId(null);
                      }}
                      options={[
                        { value: "outside", label: "Mặt ngoài" },
                        { value: "inside", label: "Mặt trong" },
                      ]}
                    />
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <button type="button" data-tour="studio-next" onClick={() => setCurrentStep(5)} className={buttonClass({ variant: "brand", size: "md", className: "ml-auto min-h-10 shrink-0" })}>
                    <span>
                      Tiếp: <span className="hidden md:inline">3D &amp; </span>quà
                    </span>
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Right under the 2D/3D switch: the pieces of a two-part box and the faces of the dieline (like Canva's pages),
                  where new elements land. 2D only: the folded box shows every face at once. */}
              {artView === "2d" && (
                <div className="flex items-center gap-2 overflow-x-auto border-b border-line bg-surface-raised px-3 py-1.5 no-scrollbar">
                  <div className="mx-auto flex min-w-max items-center gap-2">
                    {/* Pieces of a two-part box (sleeve & drawer, lid & base): which dieline is edited. */}
                    {pieces.length > 1 && (
                      <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-surface-sunken p-0.5" role="group" aria-label="Mảnh phôi">
                        {pieces.map((piece, index) => (
                          <button
                            key={piece.name}
                            type="button"
                            aria-pressed={index === pieceIndex}
                            onClick={() => {
                              setPieceIndex(index);
                              setActivePanelId("all");
                              setArtView("2d");
                            }}
                            className={`min-h-9 whitespace-nowrap rounded-full px-3.5 text-label-sm font-semibold transition-colors ${
                              index === pieceIndex ? "bg-surface-raised text-fg shadow-xs" : "text-fg-muted hover:text-fg"
                            }`}
                          >
                            {piece.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <PanelNavigator dieline={dieline} activePanelId={activePanelId} onSelectPanel={selectPanel} />
                  </div>
                </div>
              )}

              {/* Toolbar of the selection (docs/23 S8): exact place, size and turn, align, group */}
              {artView === "2d" && !readOnly && selectedIds.length > 0 && (
                <SelectionToolbar
                  elements={elements}
                  selectedIds={selectedIds}
                  onChange={setElements}
                  onSelect={selectIds}
                  faceSize={(panelId) => {
                    for (const piece of editPieces) {
                      const panel = piece.geometry.panels.find((p) => samePanel(p.id, panelId));
                      if (panel) return { width: panel.bounds.width, height: panel.bounds.height };
                    }
                    return null;
                  }}
                  onOpenSettings={() => setRailPanel(selectedElement?.type === "text" ? "text" : selectedElement?.type === "shape" ? "shapes" : "layers")}
                />
              )}

              {/* Stage: the dieline sits on the grey desk like a slide */}
              <div ref={stageRef} data-tour="studio-stage" className="relative h-[62vh] min-h-[420px] overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
                {artView === "2d" ? (
                  <DielineCanvas2D
                    variant="stage"
                    dieline={dieline}
                    scale={zoomScale}
                    onScaleChange={setZoomScale}
                    elements={elements}
                    onElementsChange={setElements}
                    selectedElementId={selectedElementId}
                    onSelectElement={setSelectedElementId}
                    selectedIds={selectedIds}
                    onSelectIds={setMultiIds}
                    backgroundPatternSvg={backgroundPatternSvg}
                    activePanelId={activePanelId}
                    onSelectPanel={selectPanel}
                    showRulers={showRulers}
                    flaggedElementIds={flaggedElementIds}
                    textComposerOpen={textComposerOpen}
                    onTextComposerOpenChange={setTextComposerOpen}
                    side={editSide}
                  />
                ) : (
                  <Box3DView
                    dimensions={dimensions}
                    foldProgress={foldProgress}
                    faceLabels
                    boxType={boxType}
                    theme={activeMaterial}
                    elements={elements}
                    formulaVersion={project?.formulaVersion}
                    backgroundPatternSvg={backgroundPatternSvg}
                    environment="transparent"
                    interactiveOpenState={lidOpen}
                    showHud={false}
                    showStatusBar={false}
                    frameless
                    minHeight={false}
                  />
                )}
              </div>

              {/* Bottom bar: zoom (2D) or folding (3D) */}
              <div
                role="toolbar"
                aria-label={artView === "2d" ? "Thu phóng khuôn bế" : "Gập hộp 3D"}
                className="flex min-h-12 items-center justify-between gap-2 border-t border-line bg-surface-raised px-3 py-1.5 md:pr-24"
              >
                {artView === "2d" ? (
                  <>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => setArtView("3d")} className={lightToolButton(false, "w-auto gap-1.5 px-3 text-label-sm font-semibold")}>
                        <Box className="size-4" aria-hidden />
                        Gập thử
                      </button>
                      <span className="mx-1 h-6 w-px bg-line" aria-hidden />
                      <button type="button" onClick={() => setZoomScale((s) => Math.max(0.4, +(s - 0.15).toFixed(2)))} className={lightToolButton(false)} aria-label="Thu nhỏ" title="Thu nhỏ">
                        <ZoomOut className="size-4" aria-hidden />
                      </button>
                      <input
                        type="range"
                        min={40}
                        max={250}
                        step={5}
                        value={Math.round(zoomScale * 100)}
                        onChange={(e) => setZoomScale(Number(e.target.value) / 100)}
                        aria-label="Mức thu phóng"
                        className="hidden w-32 cursor-pointer accent-fpt-orange sm:block"
                      />
                      <button type="button" onClick={() => setZoomScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)))} className={lightToolButton(false)} aria-label="Phóng to" title="Phóng to">
                        <ZoomIn className="size-4" aria-hidden />
                      </button>
                      <span className="w-12 text-center text-label-sm font-semibold tabular-nums text-fg" aria-live="polite">
                        {Math.round(zoomScale * 100)}%
                      </span>
                      <button type="button" onClick={() => setZoomScale(1)} className={lightToolButton(zoomScale === 1)} aria-label="Vừa màn hình" title="Vừa màn hình">
                        <Maximize2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setArtView("2d")} className={lightToolButton(false, "w-auto gap-1.5 px-3 text-label-sm font-semibold")}>
                      <PenTool className="size-4" aria-hidden />
                      Sửa hình in
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLidOpen(false);
                          setFoldProgress(0);
                        }}
                        className={lightToolButton(foldProgress === 0)}
                        aria-label="Trải phẳng"
                        title="Trải phẳng"
                      >
                        <LayoutPanelTop className="size-4" aria-hidden />
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(foldProgress * 100)}
                        onChange={(e) => {
                          const value = Number(e.target.value) / 100;
                          setFoldProgress(value);
                          if (value < 0.9) setLidOpen(false);
                        }}
                        aria-label="Mức gập hộp"
                        aria-valuetext={`${Math.round(foldProgress * 100)}% gập`}
                        className="w-28 cursor-pointer accent-fpt-orange sm:w-40"
                      />
                      <span className="w-10 text-right text-label-sm font-semibold tabular-nums text-fg">{Math.round(foldProgress * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLidOpen(false);
                          setFoldProgress(1);
                        }}
                        className={lightToolButton(foldProgress === 1 && !lidOpen)}
                        aria-label="Gập kín"
                        title="Gập kín"
                      >
                        <Box className="size-4" aria-hidden />
                      </button>
                      {boxType !== "pillow" && (
                        <button
                          type="button"
                          aria-pressed={lidOpen}
                          onClick={() => {
                            setFoldProgress(1);
                            setLidOpen((open) => !open);
                          }}
                          className={lightToolButton(lidOpen, "w-auto gap-1.5 px-3 text-label-sm font-semibold")}
                        >
                          <PackageOpen className="size-4" aria-hidden />
                          {lidOpen ? "Đóng nắp" : "Mở nắp"}
                        </button>
                      )}
                    </div>
                  </>
                )}
                {!isDemo && <div className="flex items-center gap-1 sm:hidden">{projectActions}</div>}
              </div>
            </div>
          </section>
        )}

        {/* STEP 5: XEM 3D, BỐI CẢNH & QUÀ TẶNG */}
        {currentStep === 5 && (
          <Step5Model3DWithEnvironments
            dimensions={dimensions}
            boxType={boxType}
            activeMaterial={activeMaterial}
            backgroundPatternSvg={backgroundPatternSvg}
            elements={elements}
            formulaVersion={project?.formulaVersion}
            occasion={occasion}
            title={projectTitle}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
            onOpenQrModal={() => openDialog("unboxing")}
            hasUnboxingQr={elements.some(isUnboxingQr)}
          />
        )}

        {/* STEP 6: FITCHECK & XUẤT FILE */}
        {currentStep === 6 && (
          <Step6ReviewExport
            structureName={structures?.find((s) => s.id === boxType)?.name ?? BOX_STRUCTURES.find((s) => s.id === boxType)?.vietnameseName ?? "Hộp"}
            boxType={boxType}
            dimensions={dimensions}
            activeMaterial={activeMaterial}
            finishes={quoteFinishes}
            insidePrint={insidePrint}
            elements={elements}
            backgroundPatternSvg={backgroundPatternSvg}
            formulaVersion={project?.formulaVersion}
            pieces={pieces}
            report={blockingReport ?? displayReport}
            blocked={!!blockingReport}
            onBack={() => setCurrentStep(5)}
            onAutoFix={handleAutoFix}
            onExport={() => openDialog("export")}
            signedIn={authStatus === "authenticated"}
            onSaveProject={isDemo ? () => void saveAsProject() : undefined}
            saving={savingProject}
            title={projectTitle}
            projectId={project?.id ?? null}
            onDesign={() => {
              setCurrentStep(4);
              setRailPanel("elements");
            }}
          />
        )}
      </main>

      {/* Gói, the packaging copilot: gift presets, FitCheck fixes, questions. Opened by `?copilot=open`. */}
      {!presenting && <AiCopilotAssistant
        currentDimensions={dimensions}
        onApplyDimensions={setDimensions}
        fitCheckReport={displayReport}
        onAutoFixFitCheck={handleAutoFix}
        defaultExpanded={searchParams.get("copilot") === "open"}
      />}

      {/* Another tab saved first: reload its version or overwrite it */}
      {sync.conflict && (
        <VersionConflictDialog
          onReload={() => onReload?.()}
          reloading={reloading}
          onOverwrite={sync.overwrite}
        />
      )}

      {/* ================= 3. PROJECT DIALOGS ================= */}
      {project && dialog === "export" && (
        <ExportDialog
          projectId={project.id}
          flush={sync.flush}
          onBlocked={showBlockingReport}
          onClose={() => setDialog(null)}
          design={{ title: projectTitle, structure: boxType, formulaVersion: project?.formulaVersion, dimensions, elements }}
          report={fitcheckReport}
        />
      )}
      {project && dialog === "snapshots" && (
        <SnapshotsDialog
          projectId={project.id}
          flush={sync.flush}
          replace={sync.replace}
          renderPreview={renderPreview}
          onRestored={(restored: ProjectDetail, backup: SnapshotSummary, snapshotName: string) => onReplaced?.(restored, { snapshotName, backupId: backup.id })}
          onClose={() => setDialog(null)}
        />
      )}
      {project && dialog === "share" && (
        <ShareDialog
          project={project}
          score={sync.serverReport?.score ?? project.fitcheckScore}
          patch={sync.patch}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "unboxing" && (
        <UnboxingDialog
          projectId={project?.id ?? "demo"}
          onClose={() => setDialog(null)}
          box={{ title: projectTitle, structure: boxType, dimensions, materialTheme: activeMaterial }}
          onPlaceOnBox={placeUnboxingQr}
        />
      )}
    </div>
  );
}
