"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Eye,
  Layers,
  Wand2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  Palette,
  Camera,
  Upload,
  Clock,
  Save,
  Check,
  X,
  FileCheck2,
  RotateCw,
  Box as BoxIcon,
  Maximize2,
  History,
  Gift,
  Type,
  ArrowRight,
  QrCode,
} from "lucide-react";
import {
  BoxDimensions,
  generateTuckTopDieline,
  generateSleeveDrawerDieline,
  generateLidBaseDieline,
  generatePillowBoxDieline,
  runFitCheck,
  CanvasElement,
  exportDielineToSVG,
  DielineGeometry,
} from "@wrapfit/shared";
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
import { apiClient, ApiError, ExportJob, SnapshotSummary } from "@/api";
import { materialSpecFor, materialThemeOf } from "@/features/studio/utils/projectMaterial";

export default function PackagingStudioPage() {
  // Next.js 15 passes route params to pages as a Promise; a client component reads them with useParams().
  const params = useParams<{ id: string }>();
  // Stepper State: Step 1 (Template) -> Step 2 (Dimensions) -> Step 3 (2D Studio) -> Step 4 (3D Environments)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    params.id === "new" ? 1 : 3
  );

  // Project Core State
  const [projectTitle, setProjectTitle] = useState<string>("Bao Bì Quà Tặng Sang Trọng");
  const [boxType, setBoxType] = useState<BoxStructureType>("tuck-top");
  const [activeMaterial, setActiveMaterial] = useState<BoxMaterialTheme>("ivory");
  const [customLogo, setCustomLogo] = useState<string>("Luxe Present");
  const [backgroundPatternSvg, setBackgroundPatternSvg] = useState<string | null>("tet");

  // Image 2 Inspired Palette & Typography states
  const [selectedPalette, setSelectedPalette] = useState<ColorPaletteFrame>(CURATED_COLOR_FRAMES[0]);
  const [selectedFont, setSelectedFont] = useState<FontPresetCard>(CURATED_FONT_PRESETS[0]);
  const [aiPrompt, setAiPrompt] = useState<string>("Hộp đựng quà tặng sang trọng phong cách tối giản");

  // Box Dimensions in mm
  const [dimensions, setDimensions] = useState<BoxDimensions>({
    length: 120,
    width: 80,
    height: 60,
    paperThickness: 0.38, // 300 GSM
  });

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
  const [elements, setElements] = useState<CanvasElement[]>([
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
  ]);

  // Backend Persistence State
  const [saveStatus, setSaveStatus] = useState<string>("Đã lưu trên Cloud");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Version of the project as last loaded / saved (optimistic concurrency, 409 PROJECT_VERSION_CONFLICT).
  const versionRef = useRef<number | undefined>(undefined);
  // Saves run one after another, so each one sends the version returned by the previous one.
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Last payload sent (or loaded): an unchanged design is not saved again.
  const lastSavedRef = useRef<string | null>(null);
  const justLoadedRef = useRef<boolean>(false);
  const [saveConflict, setSaveConflict] = useState<boolean>(false);
  // Box structure of the project on the server; null until the real project is loaded (no autosave before that).
  const [savedStructure, setSavedStructure] = useState<BoxStructureType | null>(null);

  // 1. Initial Load from Backend NestJS API (GET /projects/:id)
  useEffect(() => {
    async function loadProjectData() {
      if (params.id === "demo" || params.id === "new") return;
      try {
        const proj = await apiClient.getProject(params.id);
        const structure = proj.template.id as BoxStructureType;
        versionRef.current = proj.version;
        justLoadedRef.current = true;
        setSavedStructure(structure);
        if (proj.title) setProjectTitle(proj.title);
        setBoxType(structure);
        if (proj.dimensions) setDimensions(proj.dimensions);
        setActiveMaterial(materialThemeOf(proj.canvasState?.materialTheme, proj.materialSpec));
        if (proj.canvasState?.elements) setElements(proj.canvasState.elements);
        setBackgroundPatternSvg(proj.canvasState?.backgroundPattern ?? null);
        const palette = CURATED_COLOR_FRAMES.find((frame) => frame.id === proj.canvasState?.backgroundTheme);
        if (palette) setSelectedPalette(palette);
      } catch {
        // Fallback to local default state
      }
    }
    loadProjectData();
  }, [params.id]);

  // 2. Real-time Debounced Auto-Save to Backend NestJS API (PATCH /projects/:id)
  useEffect(() => {
    // Only a project loaded from the server is saved; after a 409, never save over the newer version.
    if (!savedStructure || saveConflict) return;
    if (boxType !== savedStructure) {
      // The API keeps the structure of a project (its dieline): another box type is another project.
      setSaveStatus("Không lưu: dự án đã lưu không đổi được kiểu hộp, hãy tạo dự án mới");
      return;
    }

    // Only fields UpdateProjectDto accepts (the API rejects unknown fields with 400).
    const payload = {
      title: projectTitle,
      dimensions,
      materialSpec: materialSpecFor(activeMaterial, dimensions.paperThickness),
      canvasState: {
        elements,
        backgroundPattern: backgroundPatternSvg,
        backgroundTheme: selectedPalette.id,
        materialTheme: activeMaterial,
      },
    };
    const key = JSON.stringify(payload);
    if (justLoadedRef.current) {
      // First render with the loaded design: it is already saved.
      justLoadedRef.current = false;
      lastSavedRef.current = key;
      return;
    }
    if (key === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current.then(saveNow);
    }, 900);

    async function saveNow() {
      setSaveStatus("Đang lưu...");
      try {
        const saved = await apiClient.updateProject(params.id, { ...payload, version: versionRef.current });
        versionRef.current = saved.version;
        lastSavedRef.current = key;
        setSaveStatus("Đã lưu trên Cloud");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.body?.code === "PROJECT_VERSION_CONFLICT") {
          setSaveConflict(true);
          setSaveStatus("Đã có bản lưu mới hơn ở tab khác — tải lại trang để tiếp tục");
          return;
        }
        if (err instanceof ApiError && err.status === 400) {
          setSaveStatus("Không lưu được: dữ liệu không hợp lệ");
          return;
        }
        setSaveStatus("Lưu cục bộ (Offline)");
      }
    }

    return () => clearTimeout(timer);
  }, [
    savedStructure,
    saveConflict,
    projectTitle,
    boxType,
    dimensions,
    activeMaterial,
    elements,
    backgroundPatternSvg,
    selectedPalette,
    params.id,
  ]);

  // 3. Mathematical CAD Dieline Generation
  const dieline: DielineGeometry = useMemo(() => {
    switch (boxType) {
      case "sleeve-drawer": {
        const res = generateSleeveDrawerDieline(dimensions);
        return res.sleeve;
      }
      case "lid-base": {
        const res = generateLidBaseDieline(dimensions);
        return res.base;
      }
      case "pillow":
        return generatePillowBoxDieline(dimensions);
      case "tuck-top":
      default:
        return generateTuckTopDieline(dimensions);
    }
  }, [dimensions, boxType]);

  // 4. Physical FitCheck™ Rule Verification
  const fitcheckReport = useMemo(() => {
    return runFitCheck(elements, dieline);
  }, [elements, dieline]);

  // 1-Click Auto-Fix Safe Margin & Bleed Breaches
  const handleAutoFix = useCallback(() => {
        const updated = elements.map((el) => {
      let nx = el.x;
      let ny = el.y;
      if (nx < 3.5) nx = 4.0;
      if (ny < 3.5) ny = 4.0;
      return { ...el, x: nx, y: ny };
    });
    setElements(updated);
  }, [elements]);

  // Add Element from Sticker Bank or Logo Upload
  const handleAddElement = useCallback(
    (newEl: CanvasElement) => {
      
      setElements((prev) => [...prev, newEl]);
      setSelectedElementId(newEl.id);
    },
    []
  );

  // Logo File Upload Handler
  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newEl: CanvasElement = {
          id: `img_${Date.now()}`,
          type: "image",
          panelId: activePanelId,
          x: 20,
          y: 20,
          width: 45,
          height: 35,
          rotation: 0,
          content: dataUrl,
          dpi: 300,
        };
        handleAddElement(newEl);
      };
      reader.readAsDataURL(file);
    },
    [activePanelId, handleAddElement]
  );

  // Handle Snapshot Creation
  const handleCreateSnapshot = async () => {
    
    try {
      const snap = await apiClient.createSnapshot(params.id, {
        name: `Bản lưu ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
      });
      setSnapshots((prev) => [snap, ...prev]);
    } catch {
      // Ignored
    }
  };

  // Start Vector Print Export
  const handleStartExport = async (format: "pdf" | "svg" | "png") => {
        setIsExporting(true);
    try {
      const exportType = format === "svg" ? "SVG" : "PDF_CMYK";
      const res = await apiClient.requestExport(params.id, exportType);

      // Poll BullMQ job
      const pollTimer = setInterval(async () => {
        try {
          const status = await apiClient.getExportJob(res.jobId);
          setExportJob(status);
          if (status.status === "COMPLETED" || status.status === "FAILED") {
            clearInterval(pollTimer);
            setIsExporting(false);
            if (status.status === "COMPLETED") {
              
            }
          }
        } catch {
          clearInterval(pollTimer);
          setIsExporting(false);
        }
      }, 1500);
    } catch {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-grain flex flex-col font-sans select-none overflow-x-hidden">
      {/* ================= 1. GLOBAL TOP STEPPER NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Back & Project Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep((prev) => (prev - 1) as any);
                } else {
                  window.location.href = "/dashboard";
                }
              }}
              className="w-8 h-8 rounded-full border border-stone-200 hover:bg-stone-50 flex items-center justify-center text-stone-600 transition cursor-pointer"
              title={currentStep > 1 ? `Quay lại Bước ${currentStep - 1}` : "Quay lại Dashboard"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="hidden sm:block">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="font-serif font-bold text-stone-900 text-sm sm:text-base bg-transparent border-b border-transparent hover:border-stone-300 focus:border-vibrant-cobalt focus:outline-none transition max-w-[200px] truncate"
              />
              <span className="text-[10px] text-stone-400 font-mono block">
                {dimensions.length}×{dimensions.width}×{dimensions.height} mm
              </span>
            </div>
          </div>

          {/* Center: 4-Step Segmented Breadcrumb Stepper */}
          <nav className="flex items-center gap-1 sm:gap-2 bg-stone-100/90 p-1 rounded-full border border-stone-200">
            {[
              { step: 1, label: "1. Mẫu Hộp", short: "1" },
              { step: 2, label: "2. Kích Thước", short: "2" },
              { step: 3, label: "3. Bản Vẽ 2D", short: "3" },
              { step: 4, label: "4. Phối Cảnh 3D", short: "4" },
            ].map((s) => {
              const isActive = currentStep === s.step;
              const isPast = currentStep > s.step;

              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    
                    setCurrentStep(s.step as any);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive
                      ? "bg-brand-forest text-white shadow-tactile font-bold"
                      : isPast
                      ? "text-stone-700 hover:bg-stone-200/60"
                      : "text-stone-400 hover:text-stone-600 hover:bg-stone-200/40"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono ${
                        isActive ? "bg-white/20 text-white" : "bg-stone-300 text-stone-700"
                      }`}
                    >
                      {s.short}
                    </span>
                  )}
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Cloud Save Status, FitCheck & Export */}
          <div className="flex items-center gap-2">
            {/* Auto-Save Cloud Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  saveStatus.includes("Đã lưu") ? "bg-emerald-500" : "bg-amber-400 animate-ping"
                }`}
              />
              <span className="text-[11px] font-medium">{saveStatus}</span>
            </div>

            {/* FitCheck Badge */}
            <button
              type="button"
              onClick={() => {
                
                if (currentStep !== 3) setCurrentStep(3);
                setActiveInspectorTab("fitcheck");
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold transition hover:bg-emerald-100"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>FitCheck: {fitcheckReport.score}/100</span>
            </button>

            {/* Export CTA Button */}
            <button
              type="button"
              onClick={() => {
                
                setShowExportModal(true);
              }}
              className="px-4 py-2 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-xs font-semibold shadow-tactile transition flex items-center gap-1.5 hover:scale-105 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất File In</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= 2. DYNAMIC STEP VIEW CONTENT ================= */}
      <main className="flex-1 w-full flex flex-col">
        {/* STEP 1: CHỌN MẪU HỘP */}
        {currentStep === 1 && (
          <Step1BoxTemplatePicker
            selectedStructure={boxType}
            onSelectStructure={(t) => setBoxType(t)}
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
            fitCheckReport={fitcheckReport}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {/* STEP 3: XƯỞNG BẢN VẼ BẾ 2D TOÀN MÀN HÌNH VỚI DOCK CÔNG CỤ & KÉO THẢ TỰ DO */}
        {currentStep === 3 && (
          <div className="flex-1 w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 py-5 flex flex-col gap-4 animate-fadeIn">
            {/* Step 3 Subheader: Panel Navigator + Quick Navigation to Step 4 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-squircle-lg border border-stone-200 shadow-tactile">
              <PanelNavigator
                dieline={dieline}
                activePanelId={activePanelId}
                onSelectPanel={(pid) => setActivePanelId(pid)}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    
                    setCurrentStep(2);
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold transition"
                >
                  ← Kích thước
                </button>
                <button
                  type="button"
                  onClick={() => {
                                        setCurrentStep(4);
                  }}
                  className="px-4 py-1.5 rounded-full bg-vibrant-cobalt hover:bg-blue-700 text-white text-xs font-semibold shadow-tactile flex items-center gap-1.5 transition hover:scale-105 active:scale-95"
                >
                  <span>Xem Phối Cảnh 3D (Bước 4)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main 2D Workspace: Left Dock (1 col) + Central Canvas (8 cols) + Right Inspector (3 cols) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
              {/* LEFT STUDIO TOOL DOCK (1 col) */}
              <div className="lg:col-span-1 flex lg:flex-col items-center justify-start py-1">
                <StudioToolDock
                  activeTool={activeTool}
                  onSelectTool={(tool) => {
                    setActiveTool(tool);
                    if (tool === "stickers") setActiveInspectorTab("stickers");
                    if (tool === "palette" || tool === "text" || tool === "patterns") {
                      setActiveInspectorTab("style");
                    }
                    if (tool === "image") {
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
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
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
                  onSelectPanel={setActivePanelId}
                  showRulers={showRulers}
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
                      onClick={() => {
                        
                        setActiveInspectorTab(tab.id as any);
                      }}
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

                    {/* AI Pattern Presets */}
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
                            <span className="block truncate">{pat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: STICKERS & ASSET BANK */}
                {activeInspectorTab === "stickers" && (
                  <div className="animate-fadeIn">
                    <StickerAssetBank
                      activePanelId={activePanelId}
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
                    />
                  </div>
                )}

                {/* TAB 4: FITCHECK AUDIT */}
                {activeInspectorTab === "fitcheck" && (
                  <div className="space-y-4 animate-fadeIn">
                    <FitCheckDrawer report={fitcheckReport} onAutoFix={handleAutoFix} />
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
            onBack={() => setCurrentStep(3)}
            onOpenExportModal={() => setShowExportModal(true)}
            onOpenQrModal={() => setShowQrModal(true)}
          />
        )}
      </main>

      {/* ================= 3. EXPORT MODAL ================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-stone-200 shadow-tactile-lg">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-blue-50 text-vibrant-cobalt">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Xuất Bản Vẽ Kỹ Thuật Chuẩn In
                  </h3>
                  <span className="text-[11px] text-stone-500 font-mono">
                    CMYK 300 DPI • Vector Layers
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* PDF Vector */}
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleStartExport("pdf")}
                className="w-full p-3.5 rounded-squircle-lg border border-stone-200 hover:border-vibrant-cobalt hover:bg-blue-50/40 text-left transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-xs text-stone-900 group-hover:text-vibrant-cobalt block">
                    Layered Vector PDF (Khuyến Nghị Cho Xưởng In)
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    Phân tách 4 lớp: CutContour (#E53E3E), Crease (#3182CE), Artwork, Dimensions.
                  </span>
                </div>
                <Download className="w-4 h-4 text-stone-400 group-hover:text-vibrant-cobalt" />
              </button>

              {/* SVG Vector */}
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleStartExport("svg")}
                className="w-full p-3.5 rounded-squircle-lg border border-stone-200 hover:border-vibrant-cobalt hover:bg-blue-50/40 text-left transition flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-xs text-stone-900 group-hover:text-vibrant-cobalt block">
                    Bản Vẽ Vector SVG
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    Mở được trên Adobe Illustrator, CorelDraw, Figma.
                  </span>
                </div>
                <Download className="w-4 h-4 text-stone-400 group-hover:text-vibrant-cobalt" />
              </button>
            </div>

            {/* Export Polling Status */}
            {isExporting && (
              <div className="p-3.5 rounded-squircle bg-blue-50 border border-blue-200 flex items-center gap-3 animate-fadeIn">
                <RotateCw className="w-4 h-4 text-vibrant-cobalt animate-spin" />
                <div className="text-xs text-blue-900">
                  <span className="font-bold block">BullMQ Worker đang xử lý file vector...</span>
                  <span className="text-[11px] text-blue-700">
                    Vui lòng đợi giây lát, hệ thống đang tính toán bù trừ nếp gập 2t.
                  </span>
                </div>
              </div>
            )}

            {exportJob && exportJob.status === "COMPLETED" && (
              <div className="p-3.5 rounded-squircle bg-emerald-50 border border-emerald-200 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">Xuất file thành công!</span>
                </div>
                {exportJob.downloadUrl && (
                  <a
                    href={exportJob.downloadUrl}
                    download
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold transition"
                  >
                    Tải Về Ngay
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 4. QR UNBOXING MODAL ================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-stone-200 shadow-tactile-lg text-center">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 text-vibrant-cobalt flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-stone-900 text-lg">
              Mã QR Mở Hộp Ảo 3D
            </h3>
            <p className="text-xs text-stone-600">
              Quét mã này để xem trải nghiệm bóc hộp 3D thực tế trên điện thoại thông minh:
            </p>
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `https://wrapfit.vn/unbox/${params.id}`
                )}`}
                alt="QR Code Unboxing"
                className="w-40 h-40 object-contain mx-auto"
              />
            </div>
            <span className="font-mono text-[10px] text-stone-400 block">
              URL: wrapfit.vn/unbox/{params.id}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
