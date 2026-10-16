"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
import {
  Download,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Trash2,
  ImageUp,
  History,
  Share2,
  RotateCcw,
  X,
  Box,
  LayoutPanelTop,
  PackageOpen,
  PenTool,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Gift,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { buttonClass } from "@/components/ui";
import { ViewToggle } from "@/features/studio/components/studioUi";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { cn } from "@/utils/helpers";
import { autoFixElements, BoxDimensions, CanvasElement, FitCheckReport } from "@wrapfit/shared";
import { DielineCanvas2D } from "@/features/studio/components/canvas/DielineCanvas2D";
import { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { DimensionControls } from "@/features/studio/components/DimensionControls";
import { FitCheckDrawer } from "@/features/studio/components/fitcheck/FitCheckDrawer";
import { StudioToolDock, StudioToolId } from "@/features/studio/components/StudioToolDock";
import { PanelNavigator } from "@/features/studio/components/PanelNavigator";
import {
  ColorPaletteSelector,
  CURATED_COLOR_FRAMES,
  ColorPaletteFrame,
} from "@/features/studio/components/ColorPaletteSelector";
import {
  FontSelectorCards,
  CURATED_FONT_PRESETS,
  FontPresetCard,
} from "@/features/studio/components/FontSelectorCards";
import { StickerAssetBank } from "@/features/studio/components/StickerAssetBank";
import { Step1BoxTemplatePicker } from "@/features/studio/components/Step1BoxTemplatePicker";
import { Step2DimensionAndMaterial } from "@/features/studio/components/Step2DimensionAndMaterial";
import { Step3PaperFinish } from "@/features/studio/components/Step3PaperFinish";
import { Step5Model3DWithEnvironments } from "@/features/studio/components/Step5Model3DWithEnvironments";
import { Step6ReviewExport } from "@/features/studio/components/Step6ReviewExport";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import { StudioStepper, type StudioStep } from "@/features/studio/components/StudioStepper";
import { VersionConflictDialog } from "@/features/studio/components/sync/VersionConflictDialog";
import { AiPatternPanel } from "@/features/studio/components/ai-pattern/AiPatternPanel";
import { ExportDialog } from "@/features/studio/components/export/ExportDialog";
import { ShareDialog } from "@/features/studio/components/share/ShareDialog";
import { SnapshotsDialog } from "@/features/studio/components/snapshots/SnapshotsDialog";
import { UnboxingDialog } from "@/features/studio/components/unboxing/UnboxingDialog";
import { UnsavedChangesError, useProjectSync, type SyncState } from "@/features/studio/hooks/useProjectSync";
import { checkDesign, dielinePiecesOf, dimensionErrors, formatMm, pieceIndexOfPanel } from "@/features/studio/utils/dieline";
import { materialSpecFor, materialThemeOf } from "@/features/studio/utils/projectMaterial";
import { renderThumbnail } from "@/features/studio/utils/thumbnail";
import { errorMessage, restoreSnapshot, uploadFileToStorage } from "@/api";
import { useToast } from "@/components/common/Toast";
import { ROUTES } from "@/constants";
import type { BoxStructure, ProjectDetail } from "@/types/api";
import { FormulaUpgrade } from "@/features/studio/components/formula/FormulaUpgrade";

/** Formats the image upload accepts: photos (purpose IMAGE) and vector logos (purpose LOGO). */
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VECTOR_TYPES = ["image/svg+xml"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Undo history of the artwork: changes this close together are one step; at most this many steps. */
const HISTORY_GAP_MS = 600;
const HISTORY_LIMIT = 60;

/** Keys of the step 4 tool dock (StudioToolDock shows the same letters). */
const TOOL_KEYS: Record<string, StudioToolId> = { v: "select", t: "text", u: "image", s: "stickers", c: "palette", a: "patterns" };

type InspectorTab = "style" | "stickers" | "dimensions" | "fitcheck";

const INSPECTOR_TABS: { id: InspectorTab; label: string; icon: LucideIcon }[] = [
  { id: "style", label: "Kiểu", icon: Palette },
  { id: "stickers", label: "Sticker", icon: Gift },
  { id: "dimensions", label: "Cỡ", icon: Ruler },
  { id: "fitcheck", label: "FitCheck", icon: ShieldCheck },
];

/** Seamless patterns drawn by DielineCanvas2D (its `pattern-*` defs) under the artwork. */
const SEAMLESS_PATTERNS = [
  { id: "tet", label: "Hoa mai Tết", dot: "bg-brand-gold" },
  { id: "xmas", label: "Giáng Sinh", dot: "bg-brand-forest" },
  { id: "botanical", label: "Lá khuynh diệp", dot: "bg-success" },
  { id: "gold", label: "Art Deco vàng", dot: "bg-warning" },
];

/** Icon button of the dark view dock under the stage: 40 px, lime when on. */
const darkDockButton = (on: boolean, className?: string) =>
  cn(
    "flex size-10 shrink-0 items-center justify-center rounded-control outline-none transition-[background-color,color,transform] duration-150 active:scale-95 motion-reduce:active:scale-100 focus-visible:ring-[3px] focus-visible:ring-focus/70",
    on ? "bg-action text-action-fg" : "text-white/75 hover:bg-white/10 hover:text-white",
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
}

/** Steps 1–4 of the studio for one design. Mount it again (new `key`) to load another state of the project. */
export function StudioWorkspace({
  project,
  structures,
  onReload,
  reloading = false,
  onReplaced,
  notice = null,
}: StudioWorkspaceProps) {
  const toast = useToast();
  const isDemo = project === null;
  // Stepper: 1 structure → 2 size → 3 paper → 4 artwork → 5 3D & gift → 6 FitCheck & export. The structure of a saved
  // project is fixed (it is its dieline), so step 1 only exists in the demo; a saved project opens on its artwork.
  const firstStep: StudioStep = isDemo ? 1 : 2;
  const [currentStep, setCurrentStep] = useState<StudioStep>(isDemo ? 1 : 4);

  // Project Core State: a saved project fills it once, on mount
  const [projectTitle, setProjectTitle] = useState<string>(project?.title ?? "Bao bì quà tặng sang trọng");
  const [boxType, setBoxType] = useState<BoxStructureType>(project?.template.id ?? "tuck-top");
  const [activeMaterial, setActiveMaterial] = useState<BoxMaterialTheme>(
    project ? materialThemeOf(project.canvasState?.materialTheme, project.materialSpec) : "ivory"
  );
  const [backgroundPatternSvg, setBackgroundPatternSvg] = useState<string | null>(
    project?.canvasState?.backgroundPattern ?? null
  );

  // Image 2 Inspired Palette & Typography states
  const [selectedPalette, setSelectedPalette] = useState<ColorPaletteFrame>(
    () => CURATED_COLOR_FRAMES.find((frame) => frame.id === project?.canvasState?.backgroundTheme) ?? CURATED_COLOR_FRAMES[0]
  );
  const [selectedFont, setSelectedFont] = useState<FontPresetCard>(CURATED_FONT_PRESETS[0]);

  // Box Dimensions in mm
  const [dimensions, setDimensions] = useState<BoxDimensions>(
    project?.dimensions ?? {
      length: 120,
      width: 80,
      height: 60,
      paperThickness: 0.38, // 300 GSM
    }
  );
  const limits = structures?.find((s) => s.id === boxType)?.dimensionLimits;

  // 2D Canvas State
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<StudioToolId>("select");
  const [activePanelId, setActivePanelId] = useState<string>("panel_front");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Inspector Tabs in Step 4: "style" | "dimensions" | "fitcheck" | "stickers"
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>("style");

  // Step 4 stage: the flat dieline to edit, or the folded box to check it; the dock's text tool opens the composer
  const [artView, setArtView] = useState<"2d" | "3d">("2d");
  const [foldProgress, setFoldProgress] = useState<number>(1);
  const [lidOpen, setLidOpen] = useState<boolean>(false);
  const [textComposerOpen, setTextComposerOpen] = useState<boolean>(false);

  // Artwork Canvas Elements
  const [elements, setElements] = useState<CanvasElement[]>(
    project ? (project.canvasState?.elements ?? []) : DEMO_ELEMENTS
  );

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

  const [dialog, setDialog] = useState<StudioDialogId | null>(null);
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
  const dieline = (pieces[pieceIndex] ?? pieces[0]).geometry;
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
      materialSpec: materialSpecFor(activeMaterial, dimensions.paperThickness),
      canvasState: {
        elements,
        backgroundPattern: backgroundPatternSvg,
        backgroundTheme: selectedPalette.id,
        materialTheme: activeMaterial,
      },
    }),
    [projectTitle, dimensions, activeMaterial, elements, backgroundPatternSvg, selectedPalette]
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
    setElements((prev) => autoFixElements(pieces, prev));
  }, [pieces]);

  // Add Element from Sticker Bank or Image Upload
  const handleAddElement = useCallback((newEl: CanvasElement) => {
    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  }, []);

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

  // AI pattern: under the other elements of the panel
  const handleInsertPattern = useCallback((pattern: CanvasElement) => {
    setElements((prev) => [pattern, ...prev]);
    setSelectedElementId(pattern.id);
  }, []);

  // Step 4 tool dock: text and image act on the flat dieline, the others open their inspector tab.
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectTool = useCallback(
    (tool: StudioToolId) => {
      if (tool === "image") {
        if (!uploading) imageInputRef.current?.click();
        return;
      }
      setActiveTool(tool);
      if (tool === "text") {
        setArtView("2d");
        setTextComposerOpen(true);
      }
      if (tool === "stickers") setActiveInspectorTab("stickers");
      if (tool === "palette" || tool === "patterns") setActiveInspectorTab("style");
    },
    [uploading]
  );

  // Keyboard of step 4: tool letters, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, never while typing in a field.
  useEffect(() => {
    if (currentStep !== 4 || readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (key === "z" || key === "y") {
          e.preventDefault();
          travel(key === "y" || e.shiftKey ? "redo" : "undo");
        }
        return;
      }
      if (e.altKey || textComposerOpen) return;
      const tool = TOOL_KEYS[key];
      if (tool) {
        e.preventDefault();
        selectTool(tool);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentStep, readOnly, textComposerOpen, travel, selectTool]);

  // Export, snapshots, sharing and the QR code work on the saved project: none of them in the demo.
  const openDialog = (id: StudioDialogId) => {
    if (!project) {
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
          <div className="flex items-center gap-3 min-w-0">
            <LandingLogo size="sm" />
          </div>

          {/* Center: 4-Step Segmented Breadcrumb Stepper */}
          <StudioStepper
            current={currentStep}
            onSelect={setCurrentStep}
            locked={isDemo ? {} : { 1: "Cấu trúc hộp cố định sau khi tạo dự án. Tạo dự án mới để đổi kiểu hộp." }}
          />

          {/* Right: Cloud Save Status, FitCheck & Export */}
          <div className="flex items-center gap-2">
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
              className="hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-full whitespace-nowrap bg-orange-50 text-fpt-orange-ink border border-orange-200/60 text-sm font-semibold transition-colors hover:bg-orange-100/80"
            >
              <ShieldCheck className="w-4 h-4 text-fpt-orange" />
              <span>FitCheck: {displayReport.score}/100</span>
            </button>

            {/* Snapshots & sharing: icons, labels from 2xl; on phones they sit in the step 3 toolbar */}
            {!isDemo && <div className="hidden sm:flex items-center gap-2">{projectActions}</div>}

            {/* Export CTA Button */}
            <button
              type="button"
              onClick={() => openDialog("export")}
              disabled={readOnly}
              aria-label="Xuất file in"
              className="min-h-[40px] px-4 py-2 rounded-full whitespace-nowrap bg-fpt-orange hover:bg-fpt-orange-dark text-white text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất file in</span>
            </button>
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
            limits={limits}
            elements={elements}
            backgroundPatternSvg={backgroundPatternSvg}
            formulaVersion={project?.formulaVersion}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {/* STEP 4: HÌNH IN — a full-height CAD stage: floating tool dock, dieline or folded box in the middle, inspector
            on the right, view dock at the bottom. On phones the same pieces stack in one column. */}
        {currentStep === 4 && (
          <section
            aria-label="Hình in trên khuôn bế"
            className="bg-studio-stage relative flex flex-1 flex-col gap-3 px-4 pb-8 pt-3 lg:block lg:h-[calc(100dvh-72px)] lg:min-h-[660px] lg:overflow-hidden lg:p-0"
          >
            {/* ── Top bar: 2D / 3D switch and the way to the next step ── */}
            <div className="pointer-events-none z-30 flex flex-wrap items-center justify-between gap-2 lg:absolute lg:inset-x-4 lg:top-4">
              <div className="pointer-events-none hidden sm:block sm:w-10" />

              <div className="pointer-events-auto order-last w-full rounded-full bg-surface-raised/90 p-1 shadow-soft-8 ring-1 ring-line/70 backdrop-blur-xl sm:order-none sm:w-auto">
                <ViewToggle<"2d" | "3d">
                  label="Chế độ xem"
                  value={artView}
                  onChange={setArtView}
                  options={[
                    { value: "2d", label: "Khuôn bế 2D", icon: LayoutPanelTop },
                    { value: "3d", label: "Gập hộp 3D", icon: Box },
                  ]}
                />
              </div>

              <div className="pointer-events-auto flex w-full items-center justify-end gap-2 sm:w-auto">
                {uploading && (
                  <span role="status" className="flex min-h-11 items-center gap-1.5 rounded-full bg-info-bg px-3.5 text-label-sm font-semibold text-info-fg">
                    <ImageUp className="size-4 animate-pulse motion-reduce:animate-none" aria-hidden />
                    <span className="hidden sm:inline">Đang tải ảnh…</span>
                  </span>
                )}
                <button type="button" onClick={() => setCurrentStep(5)} className={buttonClass({ variant: "brand", size: "md", className: "min-h-11" })}>
                  <span>
                    Tiếp: <span className="hidden md:inline">3D &amp; </span>quà
                  </span>
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            {/* ── Pieces and panels of the dieline (2D only): where new elements land ── */}
            {artView === "2d" && (
              <div className="pointer-events-none z-30 flex min-w-0 justify-center lg:absolute lg:left-[84px] lg:right-[396px] lg:top-[76px]">
              <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-1 rounded-full bg-surface-raised/90 p-1 shadow-soft-8 ring-1 ring-line/70 backdrop-blur-xl">
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
                        }}
                        className={`min-h-8 whitespace-nowrap rounded-full px-3 text-label-sm font-semibold transition-colors ${
                          index === pieceIndex ? "bg-surface-raised text-fg shadow-xs" : "text-fg-muted hover:text-fg"
                        }`}
                      >
                        {piece.name}
                      </button>
                    ))}
                  </div>
                )}
                <PanelNavigator dieline={dieline} activePanelId={activePanelId} onSelectPanel={selectPanel} className="min-w-0" />
              </div>
              </div>
            )}

            {/* ── Left: tool dock ── */}
            <div className="z-30 flex lg:absolute lg:left-4 lg:top-1/2 lg:-translate-y-1/2">
              <StudioToolDock
                activeTool={activeTool}
                onSelectTool={selectTool}
                showRulers={showRulers}
                onToggleRulers={() => setShowRulers((on) => !on)}
                canUndo={historySize.past > 0}
                canRedo={historySize.future > 0}
                onUndo={() => travel("undo")}
                onRedo={() => travel("redo")}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept={[...PHOTO_TYPES, ...VECTOR_TYPES].join(",")}
                onChange={(e) => void handleImageUpload(e)}
                className="hidden"
                tabIndex={-1}
                aria-hidden
              />
            </div>

            {/* ── Centre: the stage ── */}
            <div className="relative z-10 h-[62vh] min-h-[420px] overflow-hidden rounded-sheet bg-surface-raised/40 ring-1 ring-line/50 lg:absolute lg:inset-auto lg:bottom-[84px] lg:left-[84px] lg:right-[396px] lg:top-[124px] lg:h-auto lg:min-h-0 lg:overflow-visible lg:rounded-none lg:bg-transparent lg:ring-0">
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
                  backgroundPatternSvg={backgroundPatternSvg}
                  activePanelId={activePanelId}
                  onSelectPanel={selectPanel}
                  showRulers={showRulers}
                  flaggedElementIds={flaggedElementIds}
                  textComposerOpen={textComposerOpen}
                  onTextComposerOpenChange={(open) => {
                    setTextComposerOpen(open);
                    if (!open) setActiveTool("select");
                  }}
                />
              ) : (
                <Box3DView
                  dimensions={dimensions}
                  foldProgress={foldProgress}
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

            {/* ── Bottom: view dock (zoom in 2D, folding in 3D) ── */}
            <div className="pointer-events-none z-30 flex justify-center lg:absolute lg:bottom-4 lg:left-[84px] lg:right-[396px]">
              <div
                role="toolbar"
                aria-label={artView === "2d" ? "Thu phóng khuôn bế" : "Gập hộp 3D"}
                className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-panel bg-landing-ink/95 p-1.5 text-white shadow-popover ring-1 ring-white/10 backdrop-blur-xl no-scrollbar"
              >
                {artView === "2d" ? (
                  <>
                    <button type="button" onClick={() => setZoomScale((s) => Math.max(0.4, +(s - 0.15).toFixed(2)))} className={darkDockButton(false)} aria-label="Thu nhỏ" title="Thu nhỏ">
                      <ZoomOut className="size-4" aria-hidden />
                    </button>
                    <span className="w-14 text-center font-mono text-label-sm tabular-nums text-white" aria-live="polite">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button type="button" onClick={() => setZoomScale((s) => Math.min(2.5, +(s + 0.15).toFixed(2)))} className={darkDockButton(false)} aria-label="Phóng to" title="Phóng to">
                      <ZoomIn className="size-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => setZoomScale(1)} className={darkDockButton(zoomScale === 1)} aria-label="Vừa màn hình" title="Vừa màn hình">
                      <Maximize2 className="size-4" aria-hidden />
                    </button>
                    <span className="mx-1 h-6 w-px shrink-0 bg-white/15" aria-hidden />
                    <span className="hidden whitespace-nowrap px-2 text-caption text-white/70 xl:inline">
                      Đang in lên <strong className="font-semibold text-white">{placementPanel?.name ?? "—"}</strong>
                      {placementPanel && (
                        <span className="font-mono tabular-nums"> · {formatMm(placementPanel.bounds.width)}×{formatMm(placementPanel.bounds.height)} mm</span>
                      )}
                    </span>
                    <button type="button" onClick={() => setArtView("3d")} className={darkDockButton(false, "px-3 w-auto gap-1.5 text-label-sm font-semibold")}>
                      <Box className="size-4" aria-hidden />
                      Gập thử
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setLidOpen(false);
                        setFoldProgress(0);
                      }}
                      className={darkDockButton(foldProgress === 0)}
                      aria-label="Trải phẳng"
                      title="Trải phẳng"
                    >
                      <LayoutPanelTop className="size-4" aria-hidden />
                    </button>
                    <label className="flex items-center gap-2.5 px-2">
                      <span className="whitespace-nowrap font-mono text-cad-spec-micro text-white/70">Phẳng</span>
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
                        className="studio-dock-range w-28 cursor-pointer sm:w-40"
                      />
                      <span className="whitespace-nowrap font-mono text-cad-spec-micro text-white/70">Gập</span>
                      <span className="w-11 text-right font-mono text-label-sm font-bold tabular-nums text-action">{Math.round(foldProgress * 100)}%</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setLidOpen(false);
                        setFoldProgress(1);
                      }}
                      className={darkDockButton(foldProgress === 1 && !lidOpen)}
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
                        className={darkDockButton(lidOpen, "px-3 w-auto gap-1.5 text-label-sm font-semibold")}
                      >
                        <PackageOpen className="size-4" aria-hidden />
                        {lidOpen ? "Đóng nắp" : "Mở nắp"}
                      </button>
                    )}
                    <span className="mx-1 h-6 w-px shrink-0 bg-white/15" aria-hidden />
                    <button type="button" onClick={() => setArtView("2d")} className={darkDockButton(false, "px-3 w-auto gap-1.5 text-label-sm font-semibold")}>
                      <PenTool className="size-4" aria-hidden />
                      Sửa hình in
                    </button>
                  </>
                )}
                {!isDemo && (
                  <>
                    <span className="mx-1 h-6 w-px shrink-0 bg-white/15 sm:hidden" aria-hidden />
                    <div className="flex items-center gap-1 sm:hidden">{projectActions}</div>
                  </>
                )}
              </div>
            </div>

            {/* ── Right: inspector ── */}
            <aside
              aria-label="Bảng thuộc tính"
              className="z-20 flex flex-col overflow-hidden rounded-sheet bg-surface-raised/95 shadow-popover ring-1 ring-line/70 backdrop-blur-xl lg:absolute lg:bottom-4 lg:right-4 lg:top-[76px] lg:w-[364px]"
            >
              <div className="border-b border-line/70 p-3">
                <div role="tablist" aria-label="Bảng thuộc tính" className="grid grid-cols-4 gap-1 rounded-full bg-surface-sunken p-1 text-label-sm">
                  {INSPECTOR_TABS.map((tab) => {
                    const on = activeInspectorTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveInspectorTab(tab.id)}
                        role="tab"
                        aria-selected={on}
                        className={`relative flex min-h-9 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 ${
                          on ? "bg-surface-raised font-semibold text-fg shadow-xs" : "text-fg-muted hover:text-fg"
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                        {tab.label}
                        {tab.id === "fitcheck" && displayReport.violations.length > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-danger-solid font-mono text-cad-spec-micro text-white">
                            {Math.min(9, displayReport.violations.length)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                {/* TAB 1: STYLE (fonts, palette, AI pattern, seamless patterns) */}
                {activeInspectorTab === "style" && (
                  <div className="space-y-5 animate-fadeIn">
                    <FontSelectorCards
                      selectedFontId={selectedFont.id}
                      onSelectFont={(f) => {
                        setSelectedFont(f);
                        setElements((prev) =>
                          prev.map((el) => (el.type === "text" ? { ...el, style: { ...el.style, fontFamily: f.fontFamilyHeading } } : el))
                        );
                      }}
                    />

                    <ColorPaletteSelector
                      selectedPaletteId={selectedPalette.id}
                      onSelectPalette={(palette) => {
                        setSelectedPalette(palette);
                        if (palette.id === "olive") setActiveMaterial("ivory");
                        if (palette.id === "forest") setActiveMaterial("forest");
                        if (palette.id === "kraft") setActiveMaterial("kraft");
                      }}
                    />

                    <div className="border-t border-line pt-4">
                      <AiPatternPanel
                        projectId={project?.id ?? null}
                        panel={placementPanel}
                        geometry={dieline}
                        colors={selectedPalette.colors}
                        onInsert={handleInsertPattern}
                      />
                    </div>

                    <div className="space-y-2 border-t border-line pt-4">
                      <span className="block font-landing-heading text-title font-bold text-fg">Hoa văn lặp</span>
                      <div className="grid grid-cols-2 gap-2">
                        {SEAMLESS_PATTERNS.map((pat) => {
                          const on = backgroundPatternSvg === pat.id;
                          return (
                            <button
                              key={pat.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setBackgroundPatternSvg(on ? null : pat.id)}
                              className={`flex min-h-11 items-center gap-2 rounded-control px-3 text-left text-label-sm transition-colors ${
                                on ? "bg-fg font-semibold text-fg-inverse shadow-xs" : "bg-surface-sunken text-fg hover:bg-line/60"
                              }`}
                            >
                              <span className={`size-2.5 shrink-0 rounded-full ${pat.dot}`} aria-hidden />
                              <span className="truncate" title={pat.label}>
                                {pat.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: STICKERS & ASSET BANK */}
                {activeInspectorTab === "stickers" && placementPanel && (
                  <div className="animate-fadeIn">
                    <StickerAssetBank activePanelId={placementPanel.id} onAddElement={handleAddElement} />
                  </div>
                )}

                {/* TAB 3: DIMENSIONS CAD */}
                {activeInspectorTab === "dimensions" && (
                  <div className="space-y-4 animate-fadeIn">
                    <DimensionControls dimensions={dimensions} onChange={setDimensions} limits={limits} />
                  </div>
                )}

                {/* TAB 4: FITCHECK AUDIT */}
                {activeInspectorTab === "fitcheck" && (
                  <div className="space-y-3 animate-fadeIn">
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
                    <FitCheckDrawer report={blockingReport ?? displayReport} onAutoFix={handleAutoFix} />
                  </div>
                )}
              </div>
            </aside>
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
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
            onOpenQrModal={() => openDialog("unboxing")}
          />
        )}

        {/* STEP 6: FITCHECK & XUẤT FILE */}
        {currentStep === 6 && (
          <Step6ReviewExport
            structureName={structures?.find((s) => s.id === boxType)?.name ?? BOX_STRUCTURES.find((s) => s.id === boxType)?.vietnameseName ?? "Hộp"}
            boxType={boxType}
            dimensions={dimensions}
            activeMaterial={activeMaterial}
            elements={elements}
            backgroundPatternSvg={backgroundPatternSvg}
            formulaVersion={project?.formulaVersion}
            pieces={pieces}
            report={blockingReport ?? displayReport}
            blocked={!!blockingReport}
            onBack={() => setCurrentStep(5)}
            onAutoFix={handleAutoFix}
            onExport={() => openDialog("export")}
            onOpenQr={() => openDialog("unboxing")}
          />
        )}
      </main>

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
        />
      )}
      {project && dialog === "snapshots" && (
        <SnapshotsDialog
          projectId={project.id}
          flush={sync.flush}
          replace={sync.replace}
          renderPreview={renderPreview}
          onRestored={(restored, backup, snapshotName) => onReplaced?.(restored, { snapshotName, backupId: backup.id })}
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
      {project && dialog === "unboxing" && <UnboxingDialog projectId={project.id} onClose={() => setDialog(null)} />}
    </div>
  );
}
