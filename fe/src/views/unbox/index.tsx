"use client";

import { useQuery } from "@tanstack/react-query";
import { animate } from "animejs";
import { Gift, Music2, QrCode, RotateCcw, VolumeX } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getPublicUnboxing } from "@/api/public";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { ErrorState } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import { BoxStage3D, isShareSlug, playParticles, usePrefersReducedMotion } from "@/features/showcase";
import { AuthorAvatar, authorName, formatDimensions } from "@/features/templates";
import { queryKeys } from "@/hooks/data";
import { isApiError } from "@/services/api";
import { tactileAudio } from "@/services/audio/tactileAudio";
import type { PublicUnboxing } from "@/types/api";
import { UnboxFrame } from "./UnboxFrame";

/** `/unbox/[slug]`: the page a gift's QR code opens. Works without an account, also when the design is private. */
export default function UnboxView({ slug }: { slug: string }) {
  const validSlug = isShareSlug(slug);
  const unboxing = useQuery({
    queryKey: queryKeys.public.unboxing(slug),
    queryFn: () => getPublicUnboxing(slug),
    enabled: validSlug,
    // Every read counts a view: read once per visit.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  let content: React.ReactNode;
  if (!validSlug || (isApiError(unboxing.error) && unboxing.error.status === 404)) {
    content = <ExpiredCode />;
  } else if (unboxing.isError) {
    content = (
      <ErrorState
        error={unboxing.error}
        title="Chưa mở được hộp quà"
        onRetry={() => void unboxing.refetch()}
        retrying={unboxing.isFetching}
      />
    );
  } else if (!unboxing.data) {
    content = (
      <div role="status" className="flex flex-col items-center gap-4 py-24">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-brand-gold motion-reduce:animate-none" />
        <span className="font-mono text-xs uppercase tracking-wider text-stone-300">Đang chuẩn bị hộp quà…</span>
      </div>
    );
  } else {
    content = <GiftExperience gift={unboxing.data} />;
  }

  return <UnboxFrame>{content}</UnboxFrame>;
}

function GiftExperience({ gift }: { gift: PublicUnboxing }) {
  const reducedMotion = usePrefersReducedMotion();
  const [opened, setOpened] = useState(false);
  const [pose, setPose] = useState<MascotPose>("unboxing_pop");
  const [musicOn, setMusicOn] = useState(false);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const stopParticles = useRef<() => void>(() => undefined);
  const audioRef = useRef<HTMLAudioElement>(null);
  const noteRef = useRef<HTMLElement>(null);
  const sender = authorName(gift.sender);
  const { box } = gift;

  useEffect(() => () => stopParticles.current(), []);

  // The note slides in once the lid is open, then comes into view (it sits under the 3D stage on phones).
  useEffect(() => {
    const note = noteRef.current;
    if (!opened || !note) return;
    note.focus({ preventScroll: true });
    if (!reducedMotion) animate(note, { opacity: [0, 1], translateY: [24, 0], duration: 560, delay: 250, ease: "outCubic" });
    const timer = window.setTimeout(
      () => note.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" }),
      reducedMotion ? 0 : 900,
    );
    return () => window.clearTimeout(timer);
  }, [opened, reducedMotion]);

  const playMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Autoplay rules: this runs inside the tap that opens the box.
    audio.play().then(
      () => setMusicOn(true),
      () => setMusicOn(false),
    );
  }, []);

  const openBox = () => {
    if (opened) return;
    setOpened(true);
    setPose("celebration");
    tactileAudio.playUnboxPop();
    if (!reducedMotion && particlesRef.current) {
      stopParticles.current();
      stopParticles.current = playParticles(particlesRef.current, gift.particleEffect);
    }
    if (gift.audioTrackUrl) playMusic();
  };

  const closeBox = () => {
    stopParticles.current();
    setOpened(false);
    setPose("unboxing_pop");
  };

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) {
      audio.pause();
      setMusicOn(false);
    } else {
      playMusic();
    }
  };

  return (
    <>
      <canvas ref={particlesRef} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-full w-full" />
      {gift.audioTrackUrl && <audio ref={audioRef} src={gift.audioTrackUrl} loop preload="none" onEnded={() => setMusicOn(false)} />}

      <div className="flex w-full flex-col items-center gap-6">
        <div className="space-y-3 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-3.5 py-1 text-xs font-semibold text-brand-gold">
            <Gift className="h-3.5 w-3.5" aria-hidden />
            Món quà dành riêng cho bạn
          </p>
          <h1 className="font-serif text-[32px] font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Gửi {gift.recipientName}
          </h1>
          <p className="mx-auto max-w-md text-sm text-stone-300">
            {opened ? `Hộp đã mở. Lời chúc của ${sender} ở ngay bên dưới.` : `${sender} đã gói một món quà cho bạn. Chạm vào hộp để mở.`}
          </p>
        </div>

        <div className="relative h-[460px] w-full max-w-2xl sm:h-[520px]">
          <BoxStage3D
            structure={box.template.id}
            dimensions={box.dimensions}
            materialSpec={box.materialSpec}
            canvasState={box.canvasState}
            title={box.title}
            open={opened}
            environment="forest_velvet"
            className="h-full"
          />
          {!opened && (
            <button
              type="button"
              onClick={openBox}
              aria-label="Mở hộp quà"
              className="group absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-squircle-lg bg-black/30 backdrop-blur-[2px] transition hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <span className="transition-transform group-hover:scale-105 motion-reduce:transition-none">
                <GoiMascot pose={pose} size={92} interactive={false} enableTracking={false} showPhotoBadge={false} />
              </span>
              <span className="rounded-full border border-white/20 bg-stone-900/90 px-5 py-2.5 font-serif text-base font-bold tracking-wide text-white shadow-tactile">
                Chạm để mở hộp quà
              </span>
            </button>
          )}
        </div>

        <p className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
          {box.template.name} · {formatDimensions(box.dimensions)}
        </p>

        {opened && (
          <article
            ref={noteRef}
            tabIndex={-1}
            aria-labelledby="gift-note-title"
            style={{ opacity: reducedMotion ? 1 : 0 }}
            className="w-full max-w-md rounded-squircle-xl border-2 border-brand-gold bg-paper-cotton p-6 text-stone-900 shadow-tactile-lg focus:outline-none"
          >
            <div className="flex items-center gap-3 border-b border-paper-kraft pb-3">
              <GoiMascot pose={pose} size={44} showPhotoBadge={false} />
              <div>
                <h2 id="gift-note-title" className="font-serif text-lg font-bold text-brand-forest">
                  Lời chúc từ {sender}
                </h2>
                <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">Hộp quà WrapFit</p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line break-words rounded-squircle border border-paper-kraft bg-white/70 p-4 font-serif text-[15px] italic leading-relaxed text-stone-800">
              {gift.giftNote}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2 text-sm text-stone-600">
              <span>— {sender}</span>
              <AuthorAvatar author={gift.sender} />
            </div>
          </article>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {opened && (
            <button
              type="button"
              onClick={closeBox}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-stone-100 transition hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Đóng hộp lại
            </button>
          )}
          {gift.audioTrackUrl && opened && (
            <button
              type="button"
              onClick={toggleMusic}
              aria-pressed={musicOn}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-stone-100 transition hover:bg-white/20"
            >
              {musicOn ? <Music2 className="h-4 w-4 text-brand-gold" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
              {musicOn ? "Tắt nhạc" : "Bật nhạc"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** The slug does not exist any more (experience removed, project in the trash) or never did. */
function ExpiredCode() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.06] p-8 text-center shadow-tactile-lg backdrop-blur-md">
      <div className="mb-4 flex justify-center">
        <GoiMascot pose="chilling" size={88} showPhotoBadge={false} enableTracking={false} />
      </div>
      <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-brand-gold">
        <QrCode className="h-3.5 w-3.5" aria-hidden />
        Mở hộp qua mã QR
      </p>
      <h1 className="mt-2 font-serif text-[28px] leading-tight tracking-tight text-white">Mã QR không còn hiệu lực</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-300">
        Hộp quà gắn với mã này đã bị gỡ hoặc chưa từng tồn tại. Hãy hỏi người gửi một liên kết mới.
      </p>
      <Link
        href={ROUTES.unboxCode}
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        Nhập mã khác
      </Link>
    </div>
  );
}
