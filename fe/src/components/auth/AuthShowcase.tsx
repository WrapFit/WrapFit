"use client";
/* ds-artwork: illustrated mock-ups of the studio and printed boxes beside the login form. Raw colours and sizes here are allowed (docs/15_DESIGN_SYSTEM.md §2). */

import { ChevronLeft, ChevronRight, Hand, PackageCheck, Pause, Play, Sparkles, Star } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { cn } from "@/utils/helpers";
import styles from "./AuthShowcase.module.css";

type CameraView = "angle" | "front" | "side" | "top";

interface Slide {
  title: string;
  /** Size and paper, in the monospaced line under the title. */
  spec: string;
  boxType: BoxStructureType;
  theme: BoxMaterialTheme;
  dimensions: { length: number; width: number; height: number; paperThickness: number };
  view: CameraView;
  open: boolean;
}

// The four structures of WrapFit, each on its own paper and from its own side: the slider walks through the views of
// the 3D studio. The box is the real model of the editor (folded from its dieline), not a picture.
const SLIDES: Slide[] = [
  {
    title: "Hộp nắp gài đáy khoá",
    spec: "120 × 80 × 60 mm · Kraft 300 GSM",
    boxType: "tuck-top",
    theme: "kraft",
    dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.42 },
    view: "angle",
    open: false,
  },
  {
    title: "Mở nắp, nhìn vào lòng hộp",
    spec: "90 × 90 × 70 mm · Ivory 300 GSM",
    boxType: "tuck-top",
    theme: "ivory",
    dimensions: { length: 90, width: 90, height: 70, paperThickness: 0.42 },
    view: "angle",
    open: true,
  },
  {
    title: "Hộp âm dương nắp rời",
    spec: "150 × 110 × 60 mm · Duplex xanh rừng",
    boxType: "lid-base",
    theme: "forest",
    dimensions: { length: 150, width: 110, height: 60, paperThickness: 0.49 },
    view: "front",
    open: false,
  },
  {
    title: "Hộp bao diêm, khay rút",
    spec: "140 × 90 × 45 mm · Ép kim vàng",
    boxType: "sleeve-drawer",
    theme: "gold_foil",
    dimensions: { length: 140, width: 90, height: 45, paperThickness: 0.56 },
    view: "angle",
    open: false,
  },
  {
    title: "Hộp gối cánh cung",
    spec: "110 × 70 × 30 mm · Ivory 250 GSM",
    boxType: "pillow",
    theme: "ivory",
    dimensions: { length: 110, width: 70, height: 30, paperThickness: 0.35 },
    view: "top",
    open: false,
  },
];

const VIEWS: { id: CameraView; label: string }[] = [
  { id: "angle", label: "3/4" },
  { id: "front", label: "Trước" },
  { id: "side", label: "Bên" },
  { id: "top", label: "Trên" },
];

const SLIDE_MS = 6500;

interface AuthShowcaseProps {
  mode: "login" | "register";
  className?: string;
}

/**
 * Left panel of the sign-in and sign-up pages: a dark stage with the 3D box of the studio, sliding through the four
 * structures and their camera views (auto-play, arrows, progress segments, view pills, drag to turn), one floating
 * card with what is new (sign in) or the free plan (sign up), and one review card.
 */
export function AuthShowcase({ mode, className }: AuthShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<CameraView>(SLIDES[0].view);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const slide = SLIDES[index];
  const running = playing && !hovered && !reduced;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const go = useCallback((next: number) => {
    const target = (next + SLIDES.length) % SLIDES.length;
    setIndex(target);
    setView(SLIDES[target].view);
  }, []);

  // Auto-play. A pause (pointer on the stage, pause button) keeps the time left, like the progress bar does.
  const remaining = useRef(SLIDE_MS);
  useEffect(() => {
    remaining.current = SLIDE_MS;
  }, [index]);
  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now();
    const timer = setTimeout(() => go(index + 1), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt));
    };
  }, [running, index, go]);

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") go(index + 1);
    if (event.key === "ArrowLeft") go(index - 1);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Xem trước hộp quà 3D của WrapFit"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onKeyDown={onKey}
      className={cn("relative isolate flex min-h-0 flex-col overflow-hidden rounded-card p-px", className)}
      style={{ background: "linear-gradient(140deg, rgba(152,230,101,0.55), rgba(255,255,255,0.06) 35%, rgba(242,101,34,0.35) 75%, rgba(59,130,246,0.35))" }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[31px] bg-[#0C1A08]">
        {/* Backdrop: brand glows, a faint grid and a pool of light under the box */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className={cn("absolute -left-24 -top-24 size-[420px] rounded-full bg-action/20 blur-3xl", styles.glow)} />
          <div className={cn("absolute -bottom-32 -right-20 size-[460px] rounded-full bg-fpt-orange/15 blur-3xl", styles.glow)} />
          <div className="absolute right-1/4 top-1/3 size-[260px] rounded-full bg-vibrant-cobalt-light/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />
          <div className="absolute bottom-[30%] left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-[100%] bg-action/15 blur-2xl" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/10 backdrop-blur-md">
            <span className="relative flex size-2">
              <span className={cn("absolute inline-flex size-full rounded-full bg-action", styles.ping)} />
              <span className="relative inline-flex size-2 rounded-full bg-action" />
            </span>
            Studio 3D · xem trực tiếp
          </span>
          <span className="font-mono text-xs tabular-nums text-white/50" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
        </div>

        {/* Stage */}
        <div className="relative z-0 min-h-0 flex-1">
          <div className="absolute inset-x-6 bottom-6 top-10 xl:inset-x-10">
            <Box3DView
              dimensions={slide.dimensions}
              foldProgress={1}
              boxType={slide.boxType}
              theme={slide.theme}
              environment="transparent"
              interactiveOpenState={slide.open}
              cameraView={view}
              showHud={false}
              showStatusBar={false}
              enableMacroZoom={false}
              viewControls={false}
              frameless
              minHeight={false}
              className="h-full w-full"
            />
          </div>

          {/* Floating card: what is new / the free plan */}
          <div className={cn("pointer-events-none absolute right-5 top-4 w-56 xl:right-7", styles.float)}>
            <div className="rounded-2xl bg-[#13240E]/90 p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/15 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-action to-[#5FBF2E] text-[#0C1A08]">
                  {mode === "login" ? <PackageCheck className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                </span>
                <span className="rounded-full bg-fpt-orange-ink px-2 py-0.5 text-label-sm uppercase tracking-wider text-white">
                  {mode === "login" ? "Mới" : "Gói Free"}
                </span>
              </div>
              <p className="mt-2.5 text-sm font-semibold text-white">{mode === "login" ? "Giỏ in mẫu" : "Không cần thẻ thanh toán"}</p>
              <p className="mt-0.5 text-xs leading-5 text-white/60">
                {mode === "login" ? "Đặt 1–10 hộp thử từ dự án trước khi in số lượng." : "Studio, FitCheck™ và hộp 3D, dùng ngay sau khi xác nhận email."}
              </p>
            </div>
          </div>

          {/* Floating review */}
          <figure className={cn("pointer-events-none absolute bottom-3 left-5 w-72 xl:left-7", styles.floatSlow)}>
            <div className="rounded-2xl bg-white p-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29B6F6] to-[#1E56A0] font-landing-heading text-sm font-bold text-white">
                  A
                </span>
                <figcaption className="min-w-0">
                  <p className="truncate text-sm font-semibold text-landing-ink">Ngọc Anh</p>
                  <p className="truncate text-caption text-landing-muted">Tiệm nến thơm thủ công</p>
                </figcaption>
                <span role="img" className="ml-auto flex shrink-0 text-[#FFB900]" aria-label="5 sao">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="size-3 fill-current" aria-hidden />
                  ))}
                </span>
              </div>
              <blockquote className="mt-2 text-body-sm leading-5 text-landing-ink/80">&ldquo;Chỉ cần nhập kích thước, khuôn hiện ra ngay và hộp in ra vừa khít.&rdquo;</blockquote>
            </div>
          </figure>

          <span className="pointer-events-none absolute bottom-4 right-6 hidden items-center gap-1.5 text-caption text-white/40 xl:inline-flex">
            <Hand className="size-3.5" aria-hidden /> Kéo để xoay
          </span>
        </div>

        {/* Footer: caption, view pills, controls, progress */}
        <div className="relative z-10 border-t border-white/[0.08] bg-black/20 px-6 pb-5 pt-4 backdrop-blur-md">
          <div className="flex items-end justify-between gap-4">
            <div key={index} className={cn("min-w-0", styles.rise)}>
              <p className="truncate font-landing-heading text-xl font-semibold tracking-tight text-white">{slide.title}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-white/50">{slide.spec}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <ControlButton label="Hộp trước" onClick={() => go(index - 1)}>
                <ChevronLeft className="size-4" aria-hidden />
              </ControlButton>
              <ControlButton label={playing ? "Tạm dừng tự chuyển" : "Tự chuyển"} onClick={() => setPlaying((value) => !value)} pressed={!playing}>
                {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              </ControlButton>
              <ControlButton label="Hộp tiếp theo" onClick={() => go(index + 1)}>
                <ChevronRight className="size-4" aria-hidden />
              </ControlButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Góc nhìn" className="flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
              {VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view === item.id}
                  onClick={() => {
                    setView(item.id);
                    setPlaying(false);
                  }}
                  className={cn(
                    "h-7 rounded-full px-3 text-xs font-semibold transition-all duration-200 active:scale-95",
                    view === item.id ? "bg-action text-[#0C1A08] shadow-[0_0_20px_-4px_rgba(152,230,101,0.8)]" : "text-white/60 hover:text-white"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-1 items-center gap-1.5" style={{ ["--slide-ms" as string]: `${SLIDE_MS}ms` }}>
              {SLIDES.map((item, i) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Xem ${item.title}`}
                  aria-current={i === index}
                  className="group relative h-6 min-w-6 flex-1"
                >
                  <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition-colors group-hover:bg-white/25">
                    {i < index && <span className="absolute inset-0 rounded-full bg-white/60" />}
                    {i === index && <span key={index} className={cn("absolute inset-0 rounded-full bg-action", styles.progress, !running && styles.paused)} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/15 transition-all duration-200 hover:scale-105 hover:bg-white/15 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      {children}
    </button>
  );
}
