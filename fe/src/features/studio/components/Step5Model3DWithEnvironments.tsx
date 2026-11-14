"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Box, CheckCircle2, Download, Film, Gift, Image as ImageIcon, QrCode, Sliders } from "lucide-react";
import { LIBRARY_OCCASIONS, type BoxDimensions, type CanvasElement } from "@wrapfit/shared";
import { useToast } from "@/components/common/Toast";
import { PRIMARY_PILL, SECONDARY_PILL, StepActionBar, stageBarButton } from "@/features/studio/components/studioUi";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { BACKDROPS, SCENE_IDS, sceneForOccasion, type SceneId } from "@/features/studio/components/three/backdrops";
import { fileSlug, MOCKUP_FORMATS, renderMockup, saveBlob, type MockupFormat } from "@/features/studio/utils/mockup";
import { CLIP_SECONDS, MAX_CLIP_BYTES, recordGif, recordVideo, videoFormat, type FilmApi } from "@/features/studio/utils/film";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { useBoxFonts } from "./canvas/boxText";
import { FacePreview } from "./library/FacePreview";
import type { BoxMaterialTheme } from "./three/InteractiveFoldingBox3D";

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
  onBack: () => void;
  onNext: () => void;
  onOpenQrModal?: () => void;
  /** The box already carries the QR code of its unboxing page. */
  hasUnboxingQr?: boolean;
}

/** Step 5: the gift (wishes and the QR code of the unboxing page) and product photos of the box in a scene. */
export const Step5Model3DWithEnvironments: React.FC<Step5Model3DWithEnvironmentsProps> = ({
  dimensions,
  boxType = "tuck-top",
  activeMaterial = "ivory",
  backgroundPatternSvg,
  elements = [],
  formulaVersion,
  occasion,
  title,
  onBack,
  onNext,
  onOpenQrModal,
  hasUnboxingQr = false,
}) => {
  const toast = useToast();
  const suggested = sceneForOccasion(occasion);
  const [foldProgress, setFoldProgress] = useState<number>(1);
  const [scene, setScene] = useState<SceneId>(suggested);
  const [isLidOpen, setIsLidOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<MockupFormat["id"] | null>(null);
  const capture = useRef<(() => HTMLCanvasElement) | null>(null);
  const film = useRef<FilmApi | null>(null);
  /** Clip being made (docs/23 S19): its kind and how far it is. */
  const [filming, setFilming] = useState<{ kind: "video" | "gif"; done: number } | null>(null);
  const [clip, setClip] = useState<{ url: string; kind: "video" | "gif"; name: string; bytes: number } | null>(null);
  const [playClip, setPlayClip] = useState(false);
  const [canRecordVideo, setCanRecordVideo] = useState(true);
  useEffect(() => setCanRecordVideo(videoFormat() !== null), []);
  useEffect(() => () => {
    if (clip) URL.revokeObjectURL(clip.url);
  }, [clip]);
  const paper = paperStockOf(activeMaterial);
  const occasionLabel = LIBRARY_OCCASIONS.find((o) => o.id === occasion)?.label;
  useBoxFonts(elements);

  const handleFoldChange = (val: number) => {
    setFoldProgress(val);
    if (val < 0.9) setIsLidOpen(false);
  };
  const handleToggleLid = () => {
    const next = !isLidOpen;
    setIsLidOpen(next);
    if (next) setFoldProgress(1);
  };

  const downloadMockup = async (format: MockupFormat) => {
    const frame = capture.current?.();
    if (!frame) {
      toast.show({ tone: "error", title: "Chưa chụp được ảnh", description: "Hộp 3D chưa hiện xong, thử lại sau một giây." });
      return;
    }
    setSaving(format.id);
    try {
      const blob = await renderMockup(frame, BACKDROPS[scene], format);
      saveBlob(blob, `${fileSlug(title)}-${scene}-${format.width}x${format.height}.png`);
      toast.show({ tone: "success", title: "Đã tải ảnh mockup", description: `${format.label}, ${format.width} × ${format.height} px, ${BACKDROPS[scene].name}.` });
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
          ? await recordVideo(film.current, BACKDROPS[scene], { onProgress })
          : { blob: await recordGif(film.current, BACKDROPS[scene], { onProgress }), extension: "gif" };
      const name = `${fileSlug(title)}-${scene}-gap-hop.${extension}`;
      saveBlob(blob, name);
      setClip({ url: URL.createObjectURL(blob), kind, name, bytes: blob.size });
      setPlayClip(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      const mb = (blob.size / 1024 / 1024).toFixed(1).replace(".", ",");
      toast.show(
        blob.size > MAX_CLIP_BYTES
          ? { tone: "error", title: "File hơi nặng", description: `${mb} MB, quá 10 MB: một số nơi không nhận. Thử GIF hoặc bối cảnh trơn hơn.` }
          : { tone: "success", title: kind === "video" ? "Đã tải video" : "Đã tải ảnh GIF", description: `${CLIP_SECONDS} giây, ${mb} MB, ${BACKDROPS[scene].name}.` }
      );
    } catch {
      toast.show({ tone: "error", title: "Chưa quay được", description: kind === "video" ? "Trình duyệt không ghi được video; thử tải GIF." : "Trình duyệt không tạo được GIF." });
    } finally {
      setFilming(null);
    }
  };

  const structureName =
    boxType === "sleeve-drawer" ? "Hộp bao diêm" : boxType === "lid-base" ? "Hộp âm dương" : boxType === "pillow" ? "Hộp gối" : boxType === "mailer" ? "Hộp nắp cài" : boxType === "gable" ? "Hộp quai xách" : boxType === "insert" ? "Khay chia ngăn" : boxType === "hang-tag" ? "Thẻ treo" : boxType === "folded-card" ? "Thiệp gấp đôi" : boxType === "belly-band" ? "Đai giấy" : "Hộp nắp gài";
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
  const foldPercent = Math.round(foldProgress * 100);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-landing-heading text-3xl font-bold tracking-tight text-landing-ink sm:text-4xl">Quà &amp; mở hộp</h1>
          <p className="mt-1.5 text-sm text-landing-muted">
            Viết lời chúc, đặt mã QR lên hộp để người nhận mở hộp 3D trên điện thoại; chụp ảnh hộp trong bối cảnh để đăng bán.
            <span className="block">
              {structureName} · {dimensions.length} × {dimensions.width} × {dimensions.height} mm · {paper.name}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="relative flex flex-col overflow-hidden rounded-sheet bg-white lg:col-span-8">
          <div className="relative h-[520px] w-full flex-1 overflow-hidden bg-landing-canvas lg:h-auto lg:min-h-[520px]">
            <Box3DView
              dimensions={dimensions}
              foldProgress={foldProgress}
              faceLabels
              boxType={boxType as any}
              theme={activeMaterial}
              elements={elements}
              formulaVersion={formulaVersion}
              backgroundPatternSvg={backgroundPatternSvg}
              environment={scene}
              interactiveOpenState={isLidOpen}
              captureRef={capture}
              filmRef={film}
              showHud={false}
              showStatusBar={false}
              frameless
              minHeight={false}
              chrome="bar"
              barStart={
                <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                  <Box className="size-4 text-fg-muted" aria-hidden />
                  {structureName} · {BACKDROPS[scene].name}
                </span>
              }
              barEnd={
                <>
                  <button type="button" onClick={handleToggleLid} aria-pressed={isLidOpen} className={stageBarButton(isLidOpen)}>
                    <Gift className="size-3.5" aria-hidden />
                    {lidLabel}
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
                </>
              }
              className="h-full w-full"
            />
          </div>

          <label className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3 text-sm font-semibold text-landing-ink">
              <Sliders className="h-4 w-4 text-fpt-orange" aria-hidden />
              Gấp hộp
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-fpt-orange-ink">{foldPercent}%</span>
              <span className="hidden text-xs font-normal text-landing-muted sm:inline">
                {foldProgress === 0 ? "Khuôn bế trải phẳng" : foldProgress === 1 ? "Đã gấp xong" : "Đang gấp theo nếp"}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={foldProgress}
              onChange={(e) => handleFoldChange(Number(e.target.value))}
              aria-label="Mức gấp hộp"
              className="w-full cursor-pointer accent-fpt-orange sm:w-80"
            />
          </label>
        </div>

        <div className="space-y-5 lg:col-span-4">
          <section aria-labelledby="step5-gift" className="space-y-3 rounded-sheet bg-stone-900 p-5 text-white">
            <h2 id="step5-gift" className="flex items-center gap-2 font-landing-heading text-base font-bold">
              <QrCode className="h-4 w-4 text-fpt-orange" aria-hidden />
              Lời chúc &amp; mã QR mở hộp
            </h2>
            <p className="text-sm leading-6 text-white/80">Người nhận quét mã trên hộp bằng điện thoại để xem hộp mở ra 3D cùng lời chúc của bạn.</p>
            {hasUnboxingQr ? (
              <p role="status" className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-fpt-orange" aria-hidden />
                Mã QR đã có trên hộp
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenQrModal?.()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-fpt-orange text-sm font-semibold text-white shadow-xs transition-colors hover:bg-fpt-orange-dark"
            >
              <Gift className="h-4 w-4" aria-hidden />
              {hasUnboxingQr ? "Sửa lời chúc" : "Viết lời chúc & tạo mã QR"}
            </button>
          </section>

          <section aria-labelledby="step5-scenes" className="space-y-3 rounded-sheet bg-white p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="step5-scenes" className="flex items-center gap-2 font-landing-heading text-base font-bold text-landing-ink">
                <ImageIcon className="h-4 w-4 text-fpt-orange" aria-hidden />
                Bối cảnh chụp
              </h2>
              <span className="text-caption text-fg-muted">{SCENE_IDS.length} bối cảnh</span>
            </div>
            <div role="radiogroup" aria-label="Bối cảnh" className="grid grid-cols-3 gap-2">
              {SCENE_IDS.map((id) => {
                const look = BACKDROPS[id];
                const selected = scene === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${look.name}: ${look.hint}`}
                    onClick={() => setScene(id)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-control border-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 motion-reduce:transition-none",
                      selected ? "border-fpt-orange-ink" : "border-transparent hover:border-line-strong"
                    )}
                  >
                    {/* The front of this very box standing in the scene's light. */}
                    <span aria-hidden className="relative flex aspect-square items-end justify-center pb-[14%]" style={{ background: look.css }}>
                      <span className="absolute bottom-[10%] h-[8%] w-[56%] rounded-[50%] bg-black/20 blur-[3px]" />
                      <span className="relative block h-[62%] w-[52%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.18)]">
                        <FacePreview
                          structure={boxType}
                          dimensions={dimensions}
                          formulaVersion={formulaVersion}
                          elements={elements}
                          paper={paper.swatch.outside}
                          className="h-full w-full"
                        />
                      </span>
                      {id === suggested && occasionLabel && (
                        <span className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-label-sm font-semibold text-fg">Hợp {occasionLabel}</span>
                      )}
                    </span>
                    <span className="bg-surface-raised px-1.5 py-1 text-caption font-semibold leading-tight text-fg">{look.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-line pt-3">
              <p className="text-body-sm font-semibold text-fg">Tải ảnh mockup</p>
              <p className="text-caption text-fg-muted">Ảnh PNG của hộp đang xem, đúng góc xoay và bối cảnh, để đăng bán hoặc gửi khách duyệt.</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {MOCKUP_FORMATS.map((format) => (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => downloadMockup(format)}
                    disabled={saving !== null}
                    title={format.hint}
                    className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-control border border-line-strong bg-surface-raised px-1 py-1.5 text-center transition-colors hover:border-fg disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-fg">
                      <Download className="size-3.5" aria-hidden />
                      {format.label}
                    </span>
                    <span className="text-label-sm tabular-nums text-fg-muted">
                      {saving === format.id ? "Đang tạo…" : `${format.width}×${format.height}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <p className="flex items-center gap-1.5 text-body-sm font-semibold text-fg">
                <Film className="size-4 text-fpt-orange" aria-hidden />
                Video hộp gập
              </p>
              <p className="text-caption text-fg-muted">
                {CLIP_SECONDS} giây: khuôn phẳng tự gập thành hộp, xoay quanh rồi mở nắp, trong bối cảnh đang chọn. Video nét hơn; GIF xem được ở mọi nơi.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["video", "gif"] as const).map((kind) => {
                  const busy = filming?.kind === kind;
                  const disabled = filming !== null || saving !== null || (kind === "video" && !canRecordVideo);
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => makeClip(kind)}
                      disabled={disabled}
                      title={kind === "video" && !canRecordVideo ? "Trình duyệt này không ghi được video" : undefined}
                      className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-control border border-line-strong bg-surface-raised px-1 py-1.5 text-center transition-colors hover:border-fg disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-1 text-caption font-semibold text-fg">
                        <Download className="size-3.5" aria-hidden />
                        {kind === "video" ? "Video" : "GIF động"}
                      </span>
                      <span className="text-label-sm tabular-nums text-fg-muted" aria-live="polite">
                        {busy
                          ? `${kind === "video" ? "Đang quay" : "Đang tạo"} ${Math.round((filming?.done ?? 0) * 100)}%`
                          : kind === "video"
                            ? canRecordVideo ? "720×720" : "Không hỗ trợ"
                            : "400×400"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {clip && (
                // A small thumbnail: a tall preview would stretch the 3D stage beside this column.
                <div className="mt-3 flex items-center gap-3">
                  {/* Reduced motion: nothing plays by itself; the clip starts on request. */}
                  <div className="size-24 shrink-0 overflow-hidden rounded-control bg-surface-sunken">
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
                  <div className="min-w-0 space-y-1 text-caption text-fg-muted">
                    <p className="truncate font-semibold text-fg">{clip.name}</p>
                    <p>
                      {CLIP_SECONDS} giây · {(clip.bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB
                    </p>
                    <a href={clip.url} download={clip.name} className="font-semibold text-fpt-orange-ink hover:underline">
                      Tải lại
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <StepActionBar
        back={
          <button type="button" onClick={onBack} className={SECONDARY_PILL}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Sửa thiết kế
          </button>
        }
        next={
          <button type="button" data-tour="studio-next" onClick={onNext} className={PRIMARY_PILL}>
            Kiểm tra & đặt in
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
};
