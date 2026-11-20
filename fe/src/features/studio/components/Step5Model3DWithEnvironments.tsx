"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Box, Camera, Check, CheckCircle2, Coffee, Download, Film, Gift, Image as ImageIcon, Images, Palette, QrCode, Tag, Video, X } from "lucide-react";
import { LIBRARY_OCCASIONS, type BoxDimensions, type CanvasElement } from "@wrapfit/shared";
import { useToast } from "@/components/common/Toast";
import { Switch } from "@/components/ui";
import { PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, stageBarButton } from "@/features/studio/components/studioUi";
import { continueTo, studioStep } from "@/features/studio/components/StudioStepper";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { BACKDROPS, SCENE_IDS, sceneForOccasion, surfaceCss, type SceneId } from "@/features/studio/components/three/backdrops";
import { STUDIO_PALETTES, STUDIO_PALETTE_IDS, type StudioPaletteId } from "@/features/studio/components/three/studioPalettes";
import { fileSlug, MOCKUP_FORMATS, renderMockup, saveBlob, type MockupFormat } from "@/features/studio/utils/mockup";
import { CLIP_SECONDS, MAX_CLIP_BYTES, recordGif, recordVideo, videoFormat, type FilmApi } from "@/features/studio/utils/film";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { useBoxFonts } from "./canvas/boxText";
import { FacePreview } from "./library/FacePreview";
import type { BoxMaterialTheme, CaptureFn } from "./three/InteractiveFoldingBox3D";

interface Step5Model3DWithEnvironmentsProps {
  dimensions: BoxDimensions;
  boxType?: string;
  activeMaterial?: BoxMaterialTheme;
  backgroundPatternSvg?: string | null;
  elements?: CanvasElement[];
  /** Dieline formulas of the project: the 3D box is folded from the same dieline. */
  formulaVersion?: number;
  /** Occasion of the design (library occasions): the scene that suits it is suggested. */
  occasion?: string | null;
  /** Name of the mockup files. */
  title: string;
  onDimensionsChange?: (dims: BoxDimensions) => void;
  onBack: () => void;
  onNext: () => void;
  onOpenQrModal?: () => void;
  /** The box already carries the QR code of its unboxing page. */
  hasUnboxingQr?: boolean;
}

const STRUCTURE_NAMES: Record<string, string> = {
  "sleeve-drawer": "Hộp bao diêm",
  "lid-base": "Hộp âm dương",
  pillow: "Hộp gối",
  mailer: "Hộp nắp cài",
  gable: "Hộp quai xách",
  "cup-carrier": "Khay xách ly",
  insert: "Khay chia ngăn",
  "hang-tag": "Thẻ treo",
  "folded-card": "Thiệp gấp đôi",
  "belly-band": "Đai giấy",
};

/**
 * Step 5: the gift (wishes and the QR code of the unboxing page), then product photos of the box on a real set: a
 * tabletop that takes its shadow and the props of the occasion around it, shot at the angle chosen on the stage and
 * downloaded at the sizes of the shops and social networks, or filmed folding.
 */
export const Step5Model3DWithEnvironments: React.FC<Step5Model3DWithEnvironmentsProps> = ({
  dimensions,
  boxType = "tuck-top",
  activeMaterial = "ivory",
  backgroundPatternSvg,
  elements = [],
  formulaVersion,
  occasion,
  title,
  onDimensionsChange,
  onBack,
  onNext,
  onOpenQrModal,
  hasUnboxingQr = false,
}) => {
  const toast = useToast();
  const suggested = sceneForOccasion(occasion);
  const [scene, setScene] = useState<SceneId>(suggested);
  const [studioPalette, setStudioPalette] = useState<StudioPaletteId>("monochrome");
  const [isPalettePickerOpen, setIsPalettePickerOpen] = useState(false);
  const [props, setProps] = useState(true);
  const [isLidOpen, setIsLidOpen] = useState<boolean>(false);
  const [showCups, setShowCups] = useState<boolean>(dimensions.showCups !== false);
  const [cameraView, setCameraView] = useState<"angle" | "front" | "side" | "top">("angle");
  const [showFaceLabels, setShowFaceLabels] = useState<boolean>(false);
  const [saving, setSaving] = useState<MockupFormat["id"] | "all" | null>(null);
  const capture = useRef<CaptureFn | null>(null);
  const film = useRef<FilmApi | null>(null);
  /** Clip being made (docs-old/23 S19): its kind and how far it is. */
  const [filming, setFilming] = useState<{ kind: "video" | "gif"; done: number } | null>(null);
  const [clip, setClip] = useState<{ url: string; kind: "video" | "gif"; name: string; bytes: number } | null>(null);
  const [playClip, setPlayClip] = useState(false);
  const [canRecordVideo, setCanRecordVideo] = useState(true);
  const [mediaTab, setMediaTab] = useState<"photos" | "video">("photos");
  useEffect(() => setCanRecordVideo(videoFormat() !== null), []);
  useEffect(() => {
    setShowCups(dimensions.showCups !== false);
  }, [dimensions.showCups]);
  useEffect(() => () => {
    if (clip) URL.revokeObjectURL(clip.url);
  }, [clip]);
  const paper = paperStockOf(activeMaterial);
  const occasionLabel = LIBRARY_OCCASIONS.find((o) => o.id === occasion)?.label;
  const look = BACKDROPS[scene];
  const hasProps = look.props !== null;
  useBoxFonts(elements);

  const structureName = STRUCTURE_NAMES[boxType] ?? "Hộp nắp gài";
  const lidLabel =
    boxType === "sleeve-drawer"
      ? isLidOpen
        ? "Đóng khay"
        : "Rút khay ra"
      : boxType === "lid-base"
        ? isLidOpen
          ? "Đậy nắp"
          : "Nhấc nắp lên"
        : isLidOpen
          ? "Đóng nắp"
          : "Mở nắp";

  /** One photo: the stage re-rendered at the format's size, so the set fills the frame at that aspect. */
  const shoot = async (format: MockupFormat) => {
    const frame = capture.current?.({ width: format.width, height: format.height });
    if (!frame) throw new Error("stage not ready");
    const blob = await renderMockup(frame, look, format);
    saveBlob(blob, `${fileSlug(title)}-${scene}-${format.width}x${format.height}.png`);
  };

  const downloadMockup = async (format: MockupFormat) => {
    if (!capture.current) {
      toast.show({ tone: "error", title: "Chưa chụp được ảnh", description: "Hộp 3D chưa hiện xong, thử lại sau một giây." });
      return;
    }
    setSaving(format.id);
    try {
      await shoot(format);
      toast.show({ tone: "success", title: "Đã tải ảnh sản phẩm", description: `${format.label}, ${format.width} × ${format.height} px, ${look.name}.` });
    } catch {
      toast.show({ tone: "error", title: "Chưa tạo được ảnh", description: "Trình duyệt không xuất được ảnh PNG." });
    } finally {
      setSaving(null);
    }
  };

  const downloadAll = async () => {
    if (!capture.current) {
      toast.show({ tone: "error", title: "Chưa chụp được ảnh", description: "Hộp 3D chưa hiện xong, thử lại sau một giây." });
      return;
    }
    setSaving("all");
    try {
      for (const format of MOCKUP_FORMATS) await shoot(format);
      toast.show({ tone: "success", title: `Đã tải ${MOCKUP_FORMATS.length} ảnh`, description: `${MOCKUP_FORMATS.map((f) => f.label).join(", ")} · ${look.name}.` });
    } catch {
      toast.show({ tone: "error", title: "Chưa tạo được ảnh", description: "Trình duyệt không xuất được ảnh PNG." });
    } finally {
      setSaving(null);
    }
  };

  const makeClip = async (kind: "video" | "gif") => {
    if (!film.current) {
      toast.show({ tone: "error", title: "Chưa quay được", description: "Hộp 3D chưa hiện xong, thử lại sau một giây." });
      return;
    }
    setFilming({ kind, done: 0 });
    const onProgress = (done: number) => setFilming({ kind, done });
    try {
      const { blob, extension } =
        kind === "video"
          ? await recordVideo(film.current, look, { onProgress })
          : { blob: await recordGif(film.current, look, { onProgress }), extension: "gif" };
      const name = `${fileSlug(title)}-${scene}-gap-hop.${extension}`;
      saveBlob(blob, name);
      setClip({ url: URL.createObjectURL(blob), kind, name, bytes: blob.size });
      setPlayClip(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      const mb = (blob.size / 1024 / 1024).toFixed(1).replace(".", ",");
      toast.show(
        blob.size > MAX_CLIP_BYTES
          ? { tone: "error", title: "File hơi nặng", description: `${mb} MB, quá 10 MB: một số nơi không nhận. Thử GIF hoặc bối cảnh trơn hơn.` }
          : { tone: "success", title: kind === "video" ? "Đã tải video" : "Đã tải ảnh GIF", description: `${CLIP_SECONDS} giây, ${mb} MB, ${look.name}.` }
      );
    } catch {
      toast.show({ tone: "error", title: "Chưa quay được", description: kind === "video" ? "Trình duyệt không ghi được video; thử tải GIF." : "Trình duyệt không tạo được GIF." });
    } finally {
      setFilming(null);
    }
  };

  const busy = saving !== null || filming !== null;
  const tile = "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-control border border-line-strong bg-surface-raised px-1 py-1.5 text-center transition-colors hover:border-fg disabled:opacity-60";

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-4 sm:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* The set: what the photo will be. Sticky, so it stays in view while the panel scrolls. */}
        <div className="flex flex-col overflow-hidden rounded-sheet bg-surface-raised lg:sticky lg:top-[88px] lg:self-start">
          <div className="relative h-[480px] w-full overflow-hidden bg-landing-canvas lg:h-[calc(100dvh-160px)] lg:min-h-[480px]">
            <Box3DView
              dimensions={dimensions}
              foldProgress={1}
              cameraView={cameraView}
              faceLabels={showFaceLabels}
              boxType={boxType as never}
              theme={activeMaterial}
              elements={elements}
              formulaVersion={formulaVersion}
              backgroundPatternSvg={backgroundPatternSvg}
              environment={scene}
              sceneSet
              sceneProps={props}
              studioPalette={studioPalette}
              rotationY={scene === "christmas" ? -0.38 : undefined}
              interactiveOpenState={isLidOpen}
              showCups={showCups}
              captureRef={capture}
              filmRef={film}
              showHud={false}
              showStatusBar={false}
              viewControls={false}
              enableMacroZoom={false}
              frameless
              minHeight={false}
              className="h-full w-full"
            />

            {/* Bottom HUD bar with backdrop name + interactive 3D Controls dock */}
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white/95 via-white/85 to-transparent px-4 pb-3 pt-6 backdrop-blur-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 font-semibold text-xs text-fg">
                  <Box className="size-4 shrink-0 text-fpt-orange" aria-hidden />
                  <span className="truncate">{look.name}</span>
                </div>

                <div role="toolbar" aria-label="Góc nhìn hộp 3D" className="inline-flex items-center gap-0.5 rounded-full bg-white/90 p-1 shadow-sm ring-1 ring-black/5 backdrop-blur-md">
                  {boxType === "cup-carrier" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !showCups;
                          setShowCups(next);
                          onDimensionsChange?.({ ...dimensions, showCups: next });
                        }}
                        aria-pressed={showCups}
                        title={showCups ? "Bỏ ly 350ml ra khỏi khay" : "Bỏ ly 350ml vào khay"}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors",
                          showCups
                            ? "bg-fpt-orange text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <Coffee className="size-3.5" aria-hidden />
                        <span>{showCups ? "Bỏ ly ra" : "Đặt ly"}</span>
                      </button>
                      <span className="mx-0.5 h-3.5 w-px bg-slate-200" aria-hidden />
                    </>
                  )}
                  {boxType !== "pillow" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsLidOpen((prev) => !prev)}
                        aria-pressed={isLidOpen}
                        title={isLidOpen ? "Đóng nắp hộp" : "Mở nắp hộp"}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors",
                          isLidOpen
                            ? "bg-fpt-orange text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <Gift className="size-3.5" aria-hidden />
                        <span>{isLidOpen ? "Đóng nắp" : "Mở nắp"}</span>
                      </button>
                      <span className="mx-0.5 h-3.5 w-px bg-slate-200" aria-hidden />
                    </>
                  )}
                  {(
                    [
                      { view: "angle", label: "3/4" },
                      { view: "front", label: "Trước" },
                      { view: "side", label: "Bên" },
                      { view: "top", label: "Trên" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => setCameraView(item.view)}
                      aria-pressed={cameraView === item.view}
                      title={`Góc nhìn ${item.label.toLowerCase()}`}
                      className={cn(
                        "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors",
                        cameraView === item.view
                          ? "bg-fpt-orange text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      {item.view === "angle" && <Box className="size-3" aria-hidden />}
                      <span>{item.label}</span>
                    </button>
                  ))}
                  <span className="mx-0.5 h-3.5 w-px bg-slate-200" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setShowFaceLabels((prev) => !prev)}
                    aria-pressed={showFaceLabels}
                    title={showFaceLabels ? "Ẩn nhãn tên các mặt hộp" : "Hiện nhãn tên các mặt hộp"}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors",
                      showFaceLabels
                        ? "bg-fpt-orange text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Tag className="size-3" aria-hidden />
                    <span>Nhãn mặt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Studio Palette & Watermark Free Dock (Pacdora & pack.ly style) */}
            {scene === "modern_studio" ? (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                {/* Expanded Palette Popover */}
                {isPalettePickerOpen && (
                  <div
                    role="dialog"
                    aria-label="Chọn bảng màu bối cảnh"
                    className="flex flex-col gap-1.5 rounded-2xl border border-white/15 bg-stone-900/95 p-3 shadow-2xl backdrop-blur-md min-w-[260px] origin-top animate-pop-in motion-reduce:animate-none"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Palette className="size-3.5 text-fpt-orange" />
                        <span>Bảng màu bối cảnh</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPalettePickerOpen(false)}
                        className="rounded-full p-1 text-stone-400 hover:bg-white/10 hover:text-white"
                        aria-label="Đóng"
                      >
                        <X className="size-3" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 pt-1">
                      {STUDIO_PALETTE_IDS.map((pId) => {
                        const pal = STUDIO_PALETTES[pId];
                        const isSelected = studioPalette === pId;
                        return (
                          <button
                            key={pId}
                            type="button"
                            onClick={() => {
                              setStudioPalette(pId);
                              setIsPalettePickerOpen(false);
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors",
                              isSelected ? "bg-white/15 ring-1 ring-fpt-orange" : "hover:bg-white/10"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Swatch bars: 3 color stripes [curtain, wall, table] */}
                              <div className="flex h-5 w-11 overflow-hidden rounded-md border border-white/20 shadow-sm shrink-0">
                                <span className="h-full w-1/3" style={{ backgroundColor: pal.swatch[0] }} />
                                <span className="h-full w-1/3" style={{ backgroundColor: pal.swatch[1] }} />
                                <span className="h-full w-1/3" style={{ backgroundColor: pal.swatch[2] }} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-white truncate">{pal.name}</span>
                                <span className="text-caption text-stone-400 line-clamp-1">{pal.desc}</span>
                              </div>
                            </div>
                            {isSelected && <Check className="size-3.5 text-fpt-orange shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Dock Pills */}
                <div className="flex items-center gap-2">
                  {/* Active Palette Button */}
                  <button
                    type="button"
                    onClick={() => setIsPalettePickerOpen((v) => !v)}
                    aria-label={`Bảng màu hiện tại: ${STUDIO_PALETTES[studioPalette].name}. Bấm để đổi màu.`}
                    title={`Đổi bảng màu bối cảnh (Đang chọn: ${STUDIO_PALETTES[studioPalette].name})`}
                    className={cn(
                      "flex items-center gap-2 rounded-full border border-white/15 bg-stone-900/90 py-1.5 px-3 text-xs font-medium text-white shadow-lg backdrop-blur-md transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange",
                      isPalettePickerOpen && "ring-2 ring-fpt-orange"
                    )}
                  >
                    <div className="flex h-4 w-9 overflow-hidden rounded-sm border border-white/20 shadow-sm shrink-0">
                      <span className="h-full w-1/3" style={{ backgroundColor: STUDIO_PALETTES[studioPalette].swatch[0] }} />
                      <span className="h-full w-1/3" style={{ backgroundColor: STUDIO_PALETTES[studioPalette].swatch[1] }} />
                      <span className="h-full w-1/3" style={{ backgroundColor: STUDIO_PALETTES[studioPalette].swatch[2] }} />
                    </div>
                    <span className="hidden sm:inline text-stone-200">{STUDIO_PALETTES[studioPalette].name.split(" ")[0]}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column: 2 balanced, elegant cards following WrapFit 20 rules */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Trải nghiệm mở hộp & Mã QR */}
          <section aria-labelledby="step5-gift" className="rounded-2xl border border-orange-200/80 bg-orange-50/70 p-4 transition-all shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="flex size-7 items-center justify-center rounded-lg bg-fpt-orange text-white shadow-2xs shrink-0 mt-0.5">
                  <QrCode className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 id="step5-gift" className="font-landing-heading text-sm font-bold text-fg">
                      Trải nghiệm mở hộp & Mã QR
                    </h2>
                    {hasUnboxingQr && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 text-emerald-800 text-caption font-semibold px-2 py-0.5 shrink-0 whitespace-nowrap">
                        <Check className="size-3" />
                        Đã gắn mã
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-orange-200/60 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-600 truncate">
                {hasUnboxingQr ? "✓ Đã in mã QR trên mặt đáy hộp" : "Chưa tạo thiệp chúc online"}
              </span>
              <button
                type="button"
                onClick={() => onOpenQrModal?.()}
                className="inline-flex items-center gap-1.5 rounded-full bg-fpt-orange hover:bg-fpt-orange-dark text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Gift className="size-3.5" aria-hidden />
                <span>{hasUnboxingQr ? "Sửa lời chúc & mã QR" : "Tạo lời chúc & mã QR"}</span>
              </button>
            </div>
          </section>

          {/* Card 2: Studio Bối Cảnh & Xuất Media */}
          <section aria-labelledby="step5-scenes" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface-raised p-4 shadow-xs">
            {/* Header: Studio Bối Cảnh + Props Switch */}
            <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-7 items-center justify-center rounded-lg bg-fpt-orange-light text-fpt-orange shrink-0">
                  <ImageIcon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 id="step5-scenes" className="font-landing-heading text-sm font-bold text-fg">
                    Studio Bối Cảnh
                  </h3>
                  <p className="text-caption text-fg-muted truncate">
                    {look.surface.name}{look.props ? ` · ${look.props}` : ""}
                  </p>
                </div>
              </div>

              {hasProps && (
                <div className="shrink-0 flex items-center gap-2 pl-2">
                  <Switch
                    checked={props}
                    onChange={setProps}
                    label="Đạo cụ"
                    className="text-xs font-semibold text-fg"
                  />
                </div>
              )}
            </div>

            {/* Backdrops 4-grid */}
            <div role="radiogroup" aria-label="Bối cảnh" className="grid grid-cols-4 gap-2">
              {SCENE_IDS.map((id) => {
                const item = BACKDROPS[id];
                const selected = scene === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${item.name}: ${item.surface.name}${item.props ? `, ${item.props.toLowerCase()}` : ""}`}
                    title={`${item.name} · ${item.surface.name}`}
                    onClick={() => setScene(id)}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange cursor-pointer",
                      selected ? "border-fpt-orange ring-1 ring-fpt-orange/30 shadow-xs" : "border-line/70 hover:border-line-strong"
                    )}
                  >
                    <span aria-hidden className="relative block aspect-square" style={{ background: item.css }}>
                      <span className="absolute inset-x-0 bottom-0 h-[38%]" style={{ background: surfaceCss(item.surface) }} />
                      <span className="absolute bottom-[22%] left-1/2 h-[50%] w-[44%] -translate-x-1/2 drop-shadow-[0_4px_5px_rgba(0,0,0,0.25)]">
                        <FacePreview structure={boxType} dimensions={dimensions} formulaVersion={formulaVersion} elements={elements} paper={paper.swatch.outside} className="h-full w-full" />
                      </span>
                      {id === suggested && occasionLabel && (
                        <span className="absolute left-1 top-1 rounded-full bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.2 text-caption font-semibold">Gợi ý</span>
                      )}
                    </span>
                    <span className="line-clamp-1 bg-surface-raised px-1.5 py-1 text-caption font-semibold text-fg text-center">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Modern Studio 5-color palette strip */}
            {scene === "modern_studio" && (
              <div className="rounded-xl border border-line/80 bg-surface-sunken/40 p-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-fg mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Palette className="size-3 text-fpt-orange" />
                    Bảng màu nền
                  </span>
                  <span className="text-fg-muted font-normal text-caption truncate max-w-[140px]">{STUDIO_PALETTES[studioPalette].name.split(" ")[0]}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {STUDIO_PALETTE_IDS.map((pId) => {
                    const pal = STUDIO_PALETTES[pId];
                    const isSel = studioPalette === pId;
                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => setStudioPalette(pId)}
                        title={`${pal.name} · ${pal.desc}`}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-1 transition cursor-pointer",
                          isSel ? "border-fpt-orange bg-fpt-orange-light/40 ring-1 ring-fpt-orange" : "border-line bg-surface-raised hover:border-line-strong"
                        )}
                      >
                        <div className="flex h-3 w-full overflow-hidden rounded-xs border border-line/50">
                          <span className="h-full w-1/3" style={{ backgroundColor: pal.swatch[0] }} />
                          <span className="h-full w-1/3" style={{ backgroundColor: pal.swatch[1] }} />
                          <span className="h-full w-1/3" style={{ backgroundColor: pal.swatch[2] }} />
                        </div>
                        <span className="text-caption font-medium text-fg truncate w-full text-center">
                          {pal.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Xuất Media (Segmented Tab: Ảnh chụp 3 khổ vs Video gập hộp) */}
            <div className="pt-2 border-t border-line/60 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-fg uppercase tracking-wider">Xuất Media Thực Tế</span>
                <span className="text-caption text-fg-muted">Mockup & Video 3D</span>
              </div>

              {/* Segmented Switch 2-column full width - icon Lucide chuẩn và text không bị vỡ */}
              <div className="grid grid-cols-2 rounded-xl bg-surface-sunken p-1 border border-line/60 text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setMediaTab("photos")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap",
                    mediaTab === "photos" ? "bg-white text-fg shadow-2xs" : "text-fg-muted hover:text-fg"
                  )}
                >
                  <Camera className="size-3.5 text-fpt-orange" aria-hidden />
                  <span>Ảnh chụp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab("video")}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap",
                    mediaTab === "video" ? "bg-white text-fg shadow-2xs" : "text-fg-muted hover:text-fg"
                  )}
                >
                  <Video className="size-3.5 text-fpt-orange" aria-hidden />
                  <span>Video gập hộp</span>
                </button>
              </div>

              {mediaTab === "photos" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {MOCKUP_FORMATS.map((format) => (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => downloadMockup(format)}
                        disabled={busy}
                        title={format.hint}
                        className={cn(tile, "p-2.5")}
                      >
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-fg">
                          <Download className="size-3 text-fpt-orange" aria-hidden />
                          {format.label}
                        </span>
                        <span className="text-caption tabular-nums text-fg-muted">{saving === format.id ? "Đang tạo…" : format.hint}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadAll()}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-sunken/40 hover:bg-surface-sunken py-2 text-xs font-semibold text-fg transition-colors cursor-pointer"
                  >
                    <Images className="size-3.5 text-fpt-orange" aria-hidden />
                    {saving === "all" ? "Đang tạo bộ ảnh…" : `Tải trọn bộ cả ${MOCKUP_FORMATS.length} ảnh`}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {(["video", "gif"] as const).map((kind) => {
                      const running = filming?.kind === kind;
                      const disabled = busy || (kind === "video" && !canRecordVideo);
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => makeClip(kind)}
                          disabled={disabled}
                          title={kind === "video" && !canRecordVideo ? "Trình duyệt này không ghi được video" : undefined}
                          className={cn(tile, "p-2.5")}
                        >
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-fg">
                            {kind === "video" ? <Video className="size-3.5 text-fpt-orange" aria-hidden /> : <Film className="size-3.5 text-fpt-orange" aria-hidden />}
                            {kind === "video" ? "Video gập hộp" : "Ảnh động GIF"}
                          </span>
                          <span className="text-caption tabular-nums text-fg-muted" aria-live="polite">
                            {running
                              ? `${kind === "video" ? "Đang quay" : "Đang tạo"} ${Math.round((filming?.done ?? 0) * 100)}%`
                              : kind === "video"
                                ? canRecordVideo ? `MP4 · ${CLIP_SECONDS}s` : "Không hỗ trợ"
                                : "GIF · 400×400"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {clip && (
                    <div className="flex items-center gap-3 rounded-xl border border-line/80 bg-surface-sunken/40 p-2">
                      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface-raised border border-line/60">
                        {clip.kind === "video" ? (
                          <video src={clip.url} controls={!playClip} loop muted playsInline autoPlay={playClip} className="size-full object-cover" />
                        ) : playClip ? (
                          <img src={clip.url} alt="Hộp gập (ảnh GIF)" className="size-full object-cover" />
                        ) : (
                          <button type="button" onClick={() => setPlayClip(true)} className="size-full text-caption font-semibold text-fg">
                            Xem GIF
                          </button>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5 text-xs text-fg-muted">
                        <p className="truncate font-bold text-fg">{clip.name}</p>
                        <p className="text-caption">
                          {CLIP_SECONDS} giây · {(clip.bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB
                        </p>
                        <a href={clip.url} download={clip.name} className="inline-block text-xs font-semibold text-fpt-orange hover:underline cursor-pointer">
                          Tải lại clip ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <StepActionBar
        back={
          <button type="button" onClick={onBack} className={SECONDARY_PILL}>
            <ArrowLeft className="size-4" aria-hidden />
            Sửa thiết kế
          </button>
        }
        next={
          <button type="button" data-tour="studio-next" onClick={onNext} className={PRIMARY_PILL}>
            {continueTo(6)}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
};
