"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { landingFontVariables } from "@/assets/fonts/landing";
import { LandingLogo } from "@/components/layout/LandingLogo";
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
import { checkDesign, dielinePiecesOf, dimensionErrors, pieceIndexOfPanel } from "@/features/studio/utils/dieline";
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
  const router = useRouter();
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
          {/* Left: logo, back & project title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* ds-allow: compact logo size in the studio bar. */}
            <LandingLogo className="hidden lg:inline-flex [&_span]:text-[22px] [&_svg]:size-7" />
            <span aria-hidden className="hidden lg:block h-7 w-px bg-landing-line" />
            <button
              type="button"
              onClick={goBack}
              className="w-10 h-10 flex-shrink-0 rounded-full bg-landing-canvas hover:bg-landing-tile flex items-center justify-center text-landing-ink transition-colors cursor-pointer"
              aria-label={currentStep > firstStep ? `Quay lại bước ${currentStep - 1}` : isDemo ? "Về trang chủ" : "Về trang dự án"}
              title={currentStep > firstStep ? `Quay lại bước ${currentStep - 1}` : isDemo ? "Về trang chủ" : "Về trang dự án"}
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
                className="font-landing-heading font-bold text-landing-ink text-base bg-transparent border-b border-transparent hover:border-landing-ink/30 focus:border-landing-green focus:outline-none transition max-w-[220px] truncate disabled:hover:border-transparent"
              />
              <span className="text-xs text-landing-muted block">
                {dimensions.length} × {dimensions.width} × {dimensions.height} mm
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
              className="flex items-center gap-1.5 2xl:px-3 py-1 rounded-full 2xl:bg-landing-canvas text-landing-muted text-xs max-w-[220px]"
            >
              <span className={`w-2 h-2 flex-shrink-0 rounded-full ${DOT_CLASS[syncTone]}`} aria-hidden />
              <span title={syncLabel} className="sr-only 2xl:not-sr-only text-caption font-medium truncate whitespace-nowrap">
                {syncLabel}
              </span>
            </div>

            {/* FitCheck Badge */}
            <button
              type="button"
              onClick={() => {
                setCurrentStep(6);
              }}
              title={sync.dirty || !sync.serverReport ? "Điểm tạm tính, chưa lưu" : "Điểm máy chủ kiểm khi lưu"}
              className="hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-full whitespace-nowrap bg-landing-lime-mist text-landing-green-deep text-sm font-semibold transition-colors hover:bg-landing-lime-soft/60"
            >
              <ShieldCheck className="w-4 h-4" />
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
              className="min-h-[40px] px-4 py-2 rounded-full whitespace-nowrap bg-landing-lime hover:bg-action-hover text-landing-green-night text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-3xl bg-white border border-landing-green/30 shadow-none"
          >
            <div className="flex items-center gap-3 text-sm text-landing-ink min-w-0">
              <span className="w-9 h-9 flex-shrink-0 rounded-full bg-landing-lime-mist text-landing-green flex items-center justify-center">
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
                className="min-h-[40px] px-4 rounded-full bg-landing-green hover:bg-landing-green-deep text-white text-xs font-semibold transition disabled:opacity-60 disabled:cursor-wait"
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

        {/* STEP 3: XƯỞNG BẢN VẼ BẾ 2D TOÀN MÀN HÌNH VỚI DOCK CÔNG CỤ & KÉO THẢ TỰ DO */}
        {currentStep === 4 && (
          <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-landing-green">Bước 4 / 6 · Thiết kế</p>
                <h1 className="font-landing-heading text-2xl font-bold tracking-tight text-landing-ink sm:text-3xl">Hình in trên khuôn bế</h1>
              </div>
              <p className="text-sm text-landing-muted">Chọn một mặt hộp, thêm chữ, logo, sticker hoặc hoa văn; FitCheck™ kiểm tra ngay khi bạn sửa.</p>
            </div>
            {/* Step 3 Subheader: Piece + Panel Navigator + Quick Navigation to Step 4 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 rounded-full">
              <div className="flex flex-col md:flex-row md:items-center gap-2 min-w-0 w-full sm:w-auto">
                {/* Two-piece boxes (base + lid, sleeve + drawer) print as two dielines */}
                {pieces.length > 1 && (
                  <div className="flex items-center gap-1 bg-landing-canvas p-1 rounded-full flex-shrink-0" role="group" aria-label="Mảnh phôi">
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
                          index === pieceIndex ? "bg-white text-landing-ink shadow-xs" : "text-landing-muted hover:text-landing-ink"
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
                  <span role="status" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-landing-lime-mist text-landing-green text-xs font-semibold">
                    <ImageUp className="w-3.5 h-3.5 animate-pulse motion-reduce:animate-none" aria-hidden />
                    Đang tải ảnh lên…
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="min-h-[40px] px-4 rounded-full bg-landing-canvas hover:bg-landing-tile text-landing-ink text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden />
                  Chất liệu
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="min-h-[40px] px-4 rounded-full bg-landing-lime hover:bg-action-hover text-landing-green-night text-sm font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors"
                >
                  Xem 3D
                  <ArrowRight className="w-4 h-4" aria-hidden />
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
              <div className="lg:col-span-7 flex flex-col">
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
              <div className="lg:col-span-4 bg-white rounded-sheet p-5 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-170px)] min-h-[580px]">
                {/* Inspector Tabs */}
                <div role="tablist" aria-label="Bảng thuộc tính" className="grid grid-cols-4 gap-1 bg-landing-tile p-1 rounded-full text-body-sm">
                  {[
                    { id: "style", label: "Kiểu" },
                    { id: "stickers", label: "Sticker" },
                    { id: "dimensions", label: "Kích thước" },
                    { id: "fitcheck", label: "FitCheck" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveInspectorTab(tab.id as typeof activeInspectorTab)}
                      role="tab"
                      aria-selected={activeInspectorTab === tab.id}
                      className={`min-h-[34px] px-1 rounded-full text-center whitespace-nowrap transition-colors ${
                        activeInspectorTab === tab.id
                          ? "bg-white text-landing-ink shadow-sm font-semibold"
                          : "text-landing-muted hover:text-landing-ink"
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

                    <div className="pt-2 border-t border-landing-line">
                      <AiPatternPanel
                        projectId={project?.id ?? null}
                        panel={placementPanel}
                        geometry={dieline}
                        colors={selectedPalette.colors}
                        onInsert={handleInsertPattern}
                      />
                    </div>

                    {/* Pattern Presets */}
                    <div className="space-y-2 pt-2 border-t border-landing-line">
                      <span className="font-landing-heading text-base font-bold text-landing-ink block">
                        Hoa Văn Lặp (Seamless Patterns)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "tet", label: "Hoa mai Tết 2026", color: "bg-warning-bg text-warning-fg" },
                          { id: "xmas", label: "Giáng Sinh & thông", color: "bg-success-bg text-success-fg" },
                          { id: "botanical", label: "Lá khuynh diệp", color: "bg-success-bg text-success-fg" },
                          { id: "gold", label: "Lưới vàng Art Deco", color: "bg-warning-bg text-warning-fg" },
                        ].map((pat) => (
                          <button
                            key={pat.id}
                            type="button"
                            onClick={() => {
                              setBackgroundPatternSvg(
                                backgroundPatternSvg === pat.id ? null : pat.id
                              );
                            }}
                            className={`p-2.5 rounded-xl text-xs font-medium border text-left transition ${
                              backgroundPatternSvg === pat.id
                                ? "border-landing-green bg-landing-lime-mist/80 text-landing-green font-bold shadow-xs"
                                : "border-landing-line hover:border-landing-ink/30 bg-landing-canvas"
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
                      <p className="text-caption text-landing-muted leading-relaxed">
                        {sync.dirty || !sync.serverReport
                          ? "Điểm tạm tính trên trình duyệt; máy chủ kiểm lại khi lưu."
                          : "Điểm do máy chủ kiểm ở lần lưu gần nhất, cũng là điểm dùng khi xuất file in."}
                      </p>
                    )}
                    {blockingReport && (
                      <p
                        role="alert"
                        className="flex gap-2 p-3 rounded-3xl bg-vibrant-coral/10 border border-vibrant-coral/30 text-xs text-landing-ink"
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
