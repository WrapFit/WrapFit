"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
} from "lucide-react";
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
import { Step4Model3DWithEnvironments } from "@/features/studio/components/Step4Model3DWithEnvironments";
import { StudioStepper, type StudioStep } from "@/features/studio/components/StudioStepper";
import { VersionConflictDialog } from "@/features/studio/components/sync/VersionConflictDialog";
import { AiPatternPanel } from "@/features/studio/components/ai-pattern/AiPatternPanel";
import { ExportDialog } from "@/features/studio/components/export/ExportDialog";
import { ShareDialog } from "@/features/studio/components/share/ShareDialog";
import { SnapshotsDialog } from "@/features/studio/components/snapshots/SnapshotsDialog";
import { UnboxingDialog } from "@/features/studio/components/unboxing/UnboxingDialog";
import { UnsavedChangesError, useProjectSync, type SyncState } from "@/features/studio/hooks/useProjectSync";
import { checkDesign, dielinePiecesOf, dimensionErrors, pieceIndexOfPanel } from "@/features/studio/utils/dieline";
import { materialSpecFor, materialThemeOf } from "@/features/studio/utils/projectMaterial";
import { renderThumbnail } from "@/features/studio/utils/thumbnail";
import { errorMessage, restoreSnapshot, uploadFileToStorage } from "@/api";
import { useToast } from "@/components/common/Toast";
import { ROUTES } from "@/constants";
import type { BoxStructure, ProjectDetail } from "@/types/api";

/** Formats the image upload accepts: photos (purpose IMAGE) and vector logos (purpose LOGO). */
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VECTOR_TYPES = ["image/svg+xml"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Design of the offline demo (`/editor/demo`). */
const DEMO_ELEMENTS: CanvasElement[] = [
  {
    id: "logo-main",
    type: "logo",
    panelId: "panel_front",
    x: 35,
    y: 18,
    width: 50,
    height: 25,
    rotation: 0,
    content: "/branding/wrapfit-logo.png",
    dpi: 300,
  },
  {
    id: "txt-brand",
    type: "text",
    panelId: "panel_front",
    x: 35,
    y: 45,
    width: 50,
    height: 10,
    rotation: 0,
    content: "WRAPFIT SIGNATURE",
    style: {
      fontFamily: "Big Shoulders Display, sans-serif",
      fontSize: 14,
      color: "#1A362B",
    },
  },
];

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
  ok: "bg-emerald-500",
  busy: "bg-amber-400 animate-pulse motion-reduce:animate-none",
  warn: "bg-vibrant-coral",
  muted: "bg-stone-400",
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

/** A snapshot was just restored: the editor offers to undo it. */
export interface RestoreNotice {
  snapshotName: string;
  /** Snapshot of the design just before the restore. */
  backupId: string;
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
  const router = useRouter();
  const toast = useToast();
  const isDemo = project === null;
  // Stepper: 1 (structure) -> 2 (dimensions) -> 3 (2D studio) -> 4 (3D environments). The structure of a saved
  // project is fixed (it is its dieline), so step 1 only exists in the demo.
  const firstStep: StudioStep = isDemo ? 1 : 2;
  const [currentStep, setCurrentStep] = useState<StudioStep>(isDemo ? 1 : 3);

  // Project Core State: a saved project fills it once, on mount
  const [projectTitle, setProjectTitle] = useState<string>(project?.title ?? "Bao Bì Quà Tặng Sang Trọng");
  const [boxType, setBoxType] = useState<BoxStructureType>(project?.template.id ?? "tuck-top");
  const [activeMaterial, setActiveMaterial] = useState<BoxMaterialTheme>(
    project ? materialThemeOf(project.canvasState?.materialTheme, project.materialSpec) : "ivory"
  );
  const [backgroundPatternSvg, setBackgroundPatternSvg] = useState<string | null>(
    project ? (project.canvasState?.backgroundPattern ?? null) : "tet"
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

  // Inspector Tabs in Step 3: "style" | "dimensions" | "fitcheck" | "stickers"
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    "style" | "dimensions" | "fitcheck" | "stickers"
  >("style");

  // Artwork Canvas Elements
  const [elements, setElements] = useState<CanvasElement[]>(
    project ? (project.canvasState?.elements ?? []) : DEMO_ELEMENTS
  );
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
  const flaggedElementIds = useMemo(
    () => new Set(fitcheckReport.violations.flatMap((v) => (v.elementId ? [v.elementId] : []))),
    [fitcheckReport]
  );
  const syncLabel =
    sync.state === "error" ? `Chưa lưu được: ${errorMessage(sync.error)}` : sync.state === "invalid" && invalidReason ? `Chưa lưu: ${invalidReason}` : SYNC_LABELS[sync.state].label;
  const syncTone = SYNC_LABELS[sync.state].tone;

  const goBack = () => {
    if (currentStep > firstStep) setCurrentStep((currentStep - 1) as StudioStep);
    else router.push(isDemo ? "/" : ROUTES.projects);
  };

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
    setCurrentStep(3);
    setActiveInspectorTab("fitcheck");
  };

  const undoRestore = async () => {
    if (!project || !restoreNotice) return;
    setUndoing(true);
    try {
      const undone = await sync.replace(async () => (await restoreSnapshot(project.id, restoreNotice.backupId)).project);
      toast.show({ tone: "success", title: "Đã hoàn tác khôi phục", description: "Thiết kế quay về như trước khi khôi phục." });
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
        className="min-h-[40px] min-w-[40px] px-2.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
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
        className="min-h-[40px] min-w-[40px] px-2.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
      >
        <Share2 className="w-4 h-4" aria-hidden />
        <span className="hidden 2xl:inline">Chia sẻ</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-paper-grain flex flex-col font-sans select-none overflow-x-hidden">
      {/* ================= 1. GLOBAL TOP STEPPER NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Back & Project Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={goBack}
              className="w-10 h-10 flex-shrink-0 rounded-full border border-stone-200 hover:bg-stone-50 flex items-center justify-center text-stone-600 transition cursor-pointer"
              aria-label={currentStep > firstStep ? `Quay lại Bước ${currentStep - 1}` : isDemo ? "Về trang chủ" : "Về trang Dự án"}
              title={currentStep > firstStep ? `Quay lại Bước ${currentStep - 1}` : isDemo ? "Về trang chủ" : "Về trang Dự án"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="hidden sm:block min-w-0">
              <input
                type="text"
                aria-label="Tên dự án"
                value={projectTitle}
                maxLength={120}
                disabled={readOnly}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="font-serif font-bold text-stone-900 text-sm sm:text-base bg-transparent border-b border-transparent hover:border-stone-300 focus:border-vibrant-cobalt focus:outline-none transition max-w-[200px] truncate disabled:hover:border-transparent"
              />
              <span className="text-[10px] text-stone-500 font-mono block">
                {dimensions.length}×{dimensions.width}×{dimensions.height} mm
              </span>
            </div>
          </div>

          {/* Center: 4-Step Segmented Breadcrumb Stepper */}
          <StudioStepper
            current={currentStep}
            onSelect={setCurrentStep}
            locked={isDemo ? {} : { 1: "Cấu trúc hộp cố định sau khi tạo dự án. Tạo dự án mới để đổi kiểu hộp." }}
          />

          {/* Right: Cloud Save Status, FitCheck & Export */}
          <div className="flex items-center gap-2">
            {/* Save status: the label from 2xl, a dot below */}
            <div
              role="status"
              title={syncLabel}
              className="flex items-center gap-1.5 2xl:px-3 py-1 rounded-full 2xl:bg-stone-100 text-stone-600 text-xs max-w-[220px]"
            >
              <span className={`w-2 h-2 flex-shrink-0 rounded-full ${DOT_CLASS[syncTone]}`} aria-hidden />
              <span title={syncLabel} className="sr-only 2xl:not-sr-only text-[11px] font-medium truncate whitespace-nowrap">
                {syncLabel}
              </span>
            </div>

            {/* FitCheck Badge */}
            <button
              type="button"
              onClick={() => {
                if (currentStep !== 3) setCurrentStep(3);
                setActiveInspectorTab("fitcheck");
              }}
              title={sync.dirty || !sync.serverReport ? "Điểm tạm tính, chưa lưu" : "Điểm máy chủ kiểm khi lưu"}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full whitespace-nowrap bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold transition hover:bg-emerald-100"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>FitCheck: {displayReport.score}/100</span>
            </button>

            {/* Snapshots & sharing: icons, labels from 2xl; on phones they sit in the step 3 toolbar */}
            {!isDemo && <div className="hidden sm:flex items-center gap-2">{projectActions}</div>}

            {/* Export CTA Button */}
            <button
              type="button"
              onClick={() => openDialog("export")}
              disabled={readOnly}
              aria-label="Xuất File In"
              className="min-h-[40px] px-4 py-2 rounded-full whitespace-nowrap bg-brand-forest hover:bg-brand-forest-dark text-white text-xs font-semibold shadow-tactile transition flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất File In</span>
            </button>
          </div>
        </div>
      </header>

      {/* Trashed project: read-only until restored */}
      {readOnly && (
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 pt-4">
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-squircle-lg bg-white border border-stone-200 shadow-tactile"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 flex-shrink-0 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" aria-hidden />
              </span>
              <div className="text-sm text-stone-700">
                <span className="font-serif font-bold text-stone-900 block">Dự án đang ở thùng rác</span>
                Chỉ xem được. Khôi phục để tiếp tục chỉnh sửa và xuất file.
              </div>
            </div>
            <button
              type="button"
              onClick={() => void restoreProject()}
              disabled={sync.restoring}
              className="min-h-[44px] px-6 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-semibold shadow-tactile transition disabled:cursor-wait disabled:opacity-60"
            >
              {sync.restoring ? "Đang khôi phục…" : "Khôi phục dự án"}
            </button>
          </div>
        </div>
      )}

      {/* Snapshot just restored: undo it */}
      {restoreNotice && !readOnly && (
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 pt-4">
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-squircle-lg bg-white border border-blue-200 shadow-tactile"
          >
            <div className="flex items-center gap-3 text-sm text-stone-700 min-w-0">
              <span className="w-9 h-9 flex-shrink-0 rounded-full bg-blue-50 text-vibrant-cobalt flex items-center justify-center">
                <RotateCcw className="w-4 h-4" aria-hidden />
              </span>
              <span className="min-w-0">
                Đã khôi phục mốc <strong className="text-stone-900">“{restoreNotice.snapshotName}”</strong>. Bản trước đó được
                lưu thành mốc tự động.
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => void undoRestore()}
                disabled={undoing}
                className="min-h-[40px] px-4 rounded-full bg-vibrant-cobalt hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-60 disabled:cursor-wait"
              >
                {undoing ? "Đang hoàn tác…" : "Hoàn tác"}
              </button>
              <button
                type="button"
                onClick={() => setRestoreNotice(null)}
                disabled={undoing}
                aria-label="Ẩn thông báo"
                className="w-10 h-10 rounded-full hover:bg-stone-100 text-stone-500 flex items-center justify-center"
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
          />
        )}

        {/* STEP 3: XƯỞNG BẢN VẼ BẾ 2D TOÀN MÀN HÌNH VỚI DOCK CÔNG CỤ & KÉO THẢ TỰ DO */}
        {currentStep === 3 && (
          <div className="flex-1 w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 py-5 flex flex-col gap-4 animate-fadeIn">
            {/* Step 3 Subheader: Piece + Panel Navigator + Quick Navigation to Step 4 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-squircle-lg border border-stone-200 shadow-tactile">
              <div className="flex flex-col md:flex-row md:items-center gap-2 min-w-0 w-full sm:w-auto">
                {/* Two-piece boxes (base + lid, sleeve + drawer) print as two dielines */}
                {pieces.length > 1 && (
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-full flex-shrink-0" role="group" aria-label="Mảnh phôi">
                    {pieces.map((piece, index) => (
                      <button
                        key={piece.name}
                        type="button"
                        aria-pressed={index === pieceIndex}
                        onClick={() => {
                          setPieceIndex(index);
                          setActivePanelId("all");
                        }}
                        className={`min-h-[32px] px-3 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                          index === pieceIndex ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        {piece.name}
                      </button>
                    ))}
                  </div>
                )}
                <PanelNavigator
                  dieline={dieline}
                  activePanelId={activePanelId}
                  onSelectPanel={selectPanel}
                  className="min-w-0"
                />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!isDemo && <div className="flex sm:hidden items-center gap-2">{projectActions}</div>}
                {uploading && (
                  <span role="status" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-vibrant-cobalt text-xs font-semibold">
                    <ImageUp className="w-3.5 h-3.5 animate-pulse motion-reduce:animate-none" aria-hidden />
                    Đang tải ảnh lên…
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="min-h-[36px] px-3.5 py-1.5 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold whitespace-nowrap transition"
                >
                  ← Kích thước
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="min-h-[36px] px-4 py-1.5 rounded-full bg-vibrant-cobalt hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap shadow-tactile flex items-center gap-1.5 transition hover:scale-105 active:scale-95"
                >
                  <span className="sm:hidden">Phối Cảnh 3D</span>
                  <span className="hidden sm:inline">Xem Phối Cảnh 3D (Bước 4)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main 2D Workspace: Left Dock (1 col) + Central Canvas (8 cols) + Right Inspector (3 cols) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
              {/* LEFT STUDIO TOOL DOCK (1 col) */}
              <div className="lg:col-span-1 min-w-0 flex lg:flex-col items-center justify-start py-1">
                <StudioToolDock
                  activeTool={activeTool}
                  onSelectTool={(tool) => {
                    setActiveTool(tool);
                    if (tool === "stickers") setActiveInspectorTab("stickers");
                    if (tool === "palette" || tool === "text" || tool === "patterns") {
                      setActiveInspectorTab("style");
                    }
                    if (tool === "image" && !uploading) {
                      const input = document.getElementById("logo-upload-hidden") as HTMLInputElement;
                      if (input) input.click();
                    }
                    if (tool === "rulers") setShowRulers(!showRulers);
                  }}
                  showRulers={showRulers}
                  onToggleRulers={() => setShowRulers(!showRulers)}
                  onUndo={() => {}}
                  onRedo={() => {}}
                />
                <input
                  id="logo-upload-hidden"
                  type="file"
                  accept={[...PHOTO_TYPES, ...VECTOR_TYPES].join(",")}
                  onChange={(e) => void handleImageUpload(e)}
                  className="hidden"
                />
              </div>

              {/* CENTRAL 2D CAD CANVAS (8 cols) — Equipped with FREE Pointer Drag & Drop */}
              <div className="lg:col-span-8 flex flex-col">
                <DielineCanvas2D
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
                  className="h-full"
                />
              </div>

              {/* RIGHT INSPECTOR DRAWER (3 cols) */}
              <div className="lg:col-span-3 bg-white rounded-squircle-lg border border-stone-200 shadow-tactile p-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-170px)] min-h-[580px]">
                {/* Inspector Tabs */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-squircle text-xs font-semibold">
                  {[
                    { id: "style", label: "Màu & Font" },
                    { id: "stickers", label: "Sticker" },
                    { id: "dimensions", label: "Kích Thước" },
                    { id: "fitcheck", label: "FitCheck" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveInspectorTab(tab.id as typeof activeInspectorTab)}
                      className={`flex-1 py-1.5 rounded-squircle text-center transition ${
                        activeInspectorTab === tab.id
                          ? "bg-white text-stone-900 shadow-xs font-bold"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: STYLE (Image 2 Color Frames & Typography Cards) */}
                {activeInspectorTab === "style" && (
                  <div className="space-y-5 animate-fadeIn">
                    <FontSelectorCards
                      selectedFontId={selectedFont.id}
                      onSelectFont={(f) => {
                        setSelectedFont(f);
                        const updated = elements.map((el) =>
                          el.type === "text"
                            ? {
                                ...el,
                                style: {
                                  ...el.style,
                                  fontFamily: f.fontFamilyHeading,
                                },
                              }
                            : el
                        );
                        setElements(updated);
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

                    <div className="pt-2 border-t border-stone-100">
                      <AiPatternPanel
                        projectId={project?.id ?? null}
                        panel={placementPanel}
                        geometry={dieline}
                        colors={selectedPalette.colors}
                        onInsert={handleInsertPattern}
                      />
                    </div>

                    {/* Pattern Presets */}
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
                        Hoa Văn Lặp (Seamless Patterns)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "tet", label: "Hoa Mai Tết 2026", color: "bg-amber-100 text-amber-900" },
                          { id: "xmas", label: "Giáng Sinh & Thông", color: "bg-emerald-100 text-emerald-900" },
                          { id: "botanical", label: "Lá Khuynh Diệp", color: "bg-teal-100 text-teal-900" },
                          { id: "gold", label: "Lưới Vàng Art Deco", color: "bg-yellow-100 text-yellow-900" },
                        ].map((pat) => (
                          <button
                            key={pat.id}
                            type="button"
                            onClick={() => {
                              setBackgroundPatternSvg(
                                backgroundPatternSvg === pat.id ? null : pat.id
                              );
                            }}
                            className={`p-2.5 rounded-squircle text-xs font-medium border text-left transition ${
                              backgroundPatternSvg === pat.id
                                ? "border-vibrant-cobalt bg-blue-50/80 text-vibrant-cobalt font-bold shadow-xs"
                                : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
                            }`}
                          >
                            <span className="block truncate" title={pat.label}>{pat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: STICKERS & ASSET BANK */}
                {activeInspectorTab === "stickers" && placementPanel && (
                  <div className="animate-fadeIn">
                    <StickerAssetBank
                      activePanelId={placementPanel.id}
                      onAddElement={handleAddElement}
                    />
                  </div>
                )}

                {/* TAB 3: DIMENSIONS CAD */}
                {activeInspectorTab === "dimensions" && (
                  <div className="space-y-4 animate-fadeIn">
                    <DimensionControls
                      dimensions={dimensions}
                      onChange={setDimensions}
                      limits={limits}
                    />
                  </div>
                )}

                {/* TAB 4: FITCHECK AUDIT */}
                {activeInspectorTab === "fitcheck" && (
                  <div className="space-y-3 animate-fadeIn">
                    {!isDemo && (
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        {sync.dirty || !sync.serverReport
                          ? "Điểm tạm tính trên trình duyệt; máy chủ kiểm lại khi lưu."
                          : "Điểm do máy chủ kiểm ở lần lưu gần nhất, cũng là điểm dùng khi xuất file in."}
                      </p>
                    )}
                    {blockingReport && (
                      <p
                        role="alert"
                        className="flex gap-2 p-3 rounded-2xl bg-vibrant-coral/10 border border-vibrant-coral/30 text-xs text-stone-800"
                      >
                        <ShieldAlert className="w-4 h-4 flex-shrink-0 text-vibrant-coral-dark" aria-hidden />
                        Máy chủ chặn xuất file vì các lỗi dưới đây. Sửa xong thì xuất lại.
                      </p>
                    )}
                    <FitCheckDrawer report={blockingReport ?? displayReport} onAutoFix={handleAutoFix} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SÂN KHẤU 3D TOÀN DIỆN VỚI 5 PHỐI CẢNH BACKGROUND & UNBOXING */}
        {currentStep === 4 && (
          <Step4Model3DWithEnvironments
            dimensions={dimensions}
            boxType={boxType}
            activeMaterial={activeMaterial}
            backgroundPatternSvg={backgroundPatternSvg}
            elements={elements}
            formulaVersion={project?.formulaVersion}
            onBack={() => setCurrentStep(3)}
            onOpenExportModal={() => openDialog("export")}
            onOpenQrModal={() => openDialog("unboxing")}
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
