"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Box, CheckCircle2, Download, Film, Gift, Image as ImageIcon, Images, QrCode, Sparkles } from "lucide-react";
import { LIBRARY_OCCASIONS, type BoxDimensions, type CanvasElement } from "@wrapfit/shared";
import { useToast } from "@/components/common/Toast";
import { Switch } from "@/components/ui";
import { PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, stageBarButton } from "@/features/studio/components/studioUi";
import { continueTo, studioStep } from "@/features/studio/components/StudioStepper";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { BACKDROPS, SCENE_IDS, sceneForOccasion, surfaceCss, type SceneId } from "@/features/studio/components/three/backdrops";
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

/** Numbered part of the photo flow. */
function FlowStep({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-caption font-semibold text-white">
          {n}
        </span>
        <div className="min-w-0">
          <h3 className="text-body-sm font-semibold text-fg">{title}</h3>
          {hint && <p className="text-caption leading-5 text-fg-muted">{hint}</p>}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

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
  onBack,
  onNext,
  onOpenQrModal,
  hasUnboxingQr = false,
}) => {
  const toast = useToast();
  const suggested = sceneForOccasion(occasion);
  const [scene, setScene] = useState<SceneId>(suggested);
  const [props, setProps] = useState(true);
  const [isLidOpen, setIsLidOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<MockupFormat["id"] | "all" | null>(null);
  const capture = useRef<CaptureFn | null>(null);
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
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6">
      <StepHeader
        title={studioStep(5).title}
        subtitle={`${structureName} · ${dimensions.length} × ${dimensions.width} × ${dimensions.height} mm · ${paper.name}`}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* The set: what the photo will be. Sticky, so it stays in view while the panel scrolls. */}
        <div className="flex flex-col overflow-hidden rounded-sheet bg-surface-raised lg:sticky lg:top-[88px] lg:self-start">
          <div className="relative h-[480px] w-full overflow-hidden bg-landing-canvas lg:h-[calc(100dvh-160px)] lg:min-h-[480px]">
            <Box3DView
              dimensions={dimensions}
              foldProgress={1}
              faceLabels="toggle"
              boxType={boxType as never}
              theme={activeMaterial}
              elements={elements}
              formulaVersion={formulaVersion}
              backgroundPatternSvg={backgroundPatternSvg}
              environment={scene}
              sceneSet
              sceneProps={props}
              interactiveOpenState={isLidOpen}
              captureRef={capture}
              filmRef={film}
              showHud={false}
              showStatusBar={false}
              frameless
              minHeight={false}
              chrome="bar"
              barStart={
                <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-fg">
                  <Box className="size-4 shrink-0 text-fg-muted" aria-hidden />
                  <span className="truncate">{look.name}</span>
                </span>
              }
              barEnd={
                <>
                  <button type="button" onClick={() => setIsLidOpen((v) => !v)} aria-pressed={isLidOpen} className={stageBarButton(isLidOpen)}>
                    <Gift className="size-3.5" aria-hidden />
                    {lidLabel}
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
                </>
              }
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* The gift: what makes this step more than a photo booth. */}
          <section aria-labelledby="step5-gift" className="rounded-sheet border border-orange-200 bg-orange-50 p-5">
            <h2 id="step5-gift" className="flex items-center gap-2 font-landing-heading text-base font-bold text-fg">
              <QrCode className="size-4 text-fpt-orange" aria-hidden />
              Lời chúc &amp; mã QR mở hộp
            </h2>
            <p className="mt-1 text-body-sm text-fg-muted">Người nhận quét mã để xem hộp mở ra cùng lời chúc.</p>
            {hasUnboxingQr && (
              <p role="status" className="mt-3 flex items-center gap-2 rounded-control bg-surface-raised px-3 py-2 text-body-sm font-semibold text-fg">
                <CheckCircle2 className="size-4 text-fpt-orange" aria-hidden />
                Mã QR đã có trên hộp
              </p>
            )}
            <button type="button" onClick={() => onOpenQrModal?.()} className={`${PRIMARY_PILL} mt-3 w-full`}>
              <Gift className="size-4" aria-hidden />
              {hasUnboxingQr ? "Sửa lời chúc" : "Viết lời chúc & tạo mã QR"}
            </button>
          </section>

          <section aria-labelledby="step5-scenes" className="flex flex-col gap-4 rounded-sheet bg-surface-raised p-5">
            <h2 id="step5-scenes" className="flex items-center gap-2 font-landing-heading text-base font-bold text-fg">
              <ImageIcon className="size-4 text-fpt-orange" aria-hidden />
              Ảnh sản phẩm
            </h2>

            <FlowStep n={1} title="Chọn bối cảnh">
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
                        "flex flex-col overflow-hidden rounded-control border-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 motion-reduce:transition-none",
                        selected ? "border-fpt-orange-ink" : "border-transparent hover:border-line-strong"
                      )}
                    >
                      {/* The backdrop above, the tabletop below, this very box standing where they meet. */}
                      <span aria-hidden className="relative block aspect-square" style={{ background: item.css }}>
                        <span className="absolute inset-x-0 bottom-0 h-[38%]" style={{ background: surfaceCss(item.surface) }} />
                        <span className="absolute bottom-[22%] left-1/2 h-[50%] w-[44%] -translate-x-1/2 drop-shadow-[0_4px_5px_rgba(0,0,0,0.25)]">
                          <FacePreview structure={boxType} dimensions={dimensions} formulaVersion={formulaVersion} elements={elements} paper={paper.swatch.outside} className="h-full w-full" />
                        </span>
                        {id === suggested && occasionLabel && (
                          <span className="absolute left-0.5 top-0.5 rounded-full bg-white/90 px-1 text-label-sm font-semibold text-fg">Hợp {occasionLabel}</span>
                        )}
                      </span>
                      <span className="line-clamp-2 min-h-[2lh] bg-surface-raised px-1 py-0.5 text-label-sm font-semibold leading-tight text-fg">{item.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 truncate text-caption text-fg-muted" title={look.props ?? undefined}>
                {look.surface.name}
                {look.props ? ` · ${look.props}` : ""}
              </p>
            </FlowStep>

            <FlowStep n={2} title="Căn góc" hint="Kéo hộp để xoay; ảnh giữ đúng góc này.">
              <div className="flex flex-col gap-2">
                <Switch
                  checked={hasProps && props}
                  onChange={setProps}
                  disabled={!hasProps}
                  label="Đạo cụ trang trí"
                  className="rounded-control border border-line px-3 py-2"
                />
                <button type="button" onClick={() => setIsLidOpen((v) => !v)} aria-pressed={isLidOpen} className={cn(tile, "flex-row gap-2", isLidOpen && "border-fpt-orange-ink bg-fpt-orange-light")}>
                  <Gift className="size-4" aria-hidden />
                  <span className="text-body-sm font-semibold text-fg">{lidLabel}</span>
                </button>
              </div>
            </FlowStep>

            <FlowStep n={3} title="Tải ảnh">
              <div className="grid grid-cols-3 gap-2">
                {MOCKUP_FORMATS.map((format) => (
                  <button key={format.id} type="button" onClick={() => downloadMockup(format)} disabled={busy} title={format.hint} className={tile}>
                    <span className="inline-flex items-center gap-1 text-caption font-semibold text-fg">
                      <Download className="size-3.5" aria-hidden />
                      {format.label}
                    </span>
                    <span className="text-label-sm tabular-nums text-fg-muted">{saving === format.id ? "Đang tạo…" : format.hint}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => void downloadAll()} disabled={busy} className={`${SECONDARY_PILL} mt-2 w-full`}>
                <Images className="size-4" aria-hidden />
                {saving === "all" ? "Đang tạo bộ ảnh…" : `Tải cả bộ ${MOCKUP_FORMATS.length} ảnh`}
              </button>
            </FlowStep>

            <FlowStep n={4} title={`Video hộp gập · ${CLIP_SECONDS} giây`}>
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
                      className={tile}
                    >
                      <span className="inline-flex items-center gap-1 text-caption font-semibold text-fg">
                        {kind === "video" ? <Film className="size-3.5" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
                        {kind === "video" ? "Video" : "GIF động"}
                      </span>
                      <span className="text-label-sm tabular-nums text-fg-muted" aria-live="polite">
                        {running
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
                <div className="mt-3 flex items-center gap-3">
                  {/* Reduced motion: nothing plays by itself; the clip starts on request. */}
                  <div className="size-20 shrink-0 overflow-hidden rounded-control bg-surface-sunken">
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
            </FlowStep>
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
