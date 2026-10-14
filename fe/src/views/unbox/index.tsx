"use client";

import { useQuery } from "@tanstack/react-query";
import { animate } from "animejs";
import { Gift, Music2, QrCode, RotateCcw, VolumeX } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getPublicUnboxing } from "@/api/public";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { WorkspaceError } from "@/components/workspace";
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
      <WorkspaceError
        error={unboxing.error}
        title="Chưa mở được hộp quà"
        onRetry={() => void unboxing.refetch()}
        retrying={unboxing.isFetching}
        className="w-full max-w-md bg-white"
      />
    );
  } else if (!unboxing.data) {
    content = (
      <div role="status" className="flex flex-col items-center gap-4 py-24">
        <span className="size-9 animate-spin rounded-full border-2 border-landing-line border-t-landing-green motion-reduce:animate-none" />
        <span className="text-sm text-landing-muted">Đang chuẩn bị hộp quà…</span>
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
          <p className="inline-flex items-center gap-2 rounded-full bg-landing-lime px-3.5 py-1 text-sm font-semibold text-landing-green-night">
            <Gift className="h-3.5 w-3.5" aria-hidden />
            Món quà dành riêng cho bạn
          </p>
          <h1 className="font-landing-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Gửi {gift.recipientName}
          </h1>
          <p className="mx-auto max-w-md text-base text-landing-muted">
            {opened ? `Hộp đã mở. Lời chúc của ${sender} ở ngay bên dưới.` : `${sender} đã gói một món quà cho bạn. Chạm vào hộp để mở.`}
          </p>
        </div>

        <div className="relative h-[460px] w-full max-w-3xl overflow-hidden rounded-[28px] bg-white sm:h-[540px]">
          <BoxStage3D
            structure={box.template.id}
            dimensions={box.dimensions}
            materialSpec={box.materialSpec}
            canvasState={box.canvasState}
            title={box.title}
            open={opened}
            environment="studio"
            frameless
            className="h-full"
          />
          {!opened && (
            <button
              type="button"
              onClick={openBox}
              aria-label="Mở hộp quà"
              className="group absolute inset-0 z-30 flex flex-col items-center justify-end gap-3 pb-8 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-landing-green"
            >
              <span className="transition-transform group-hover:scale-105 motion-reduce:transition-none">
                <GoiMascot pose={pose} size={92} interactive={false} enableTracking={false} showPhotoBadge={false} />
              </span>
              <span className="rounded-full bg-landing-lime px-6 py-3 font-landing-heading text-base font-semibold text-landing-green-night transition-colors group-hover:bg-[#AFEC88]">
                Chạm để mở hộp quà
              </span>
            </button>
          )}
        </div>

        <p className="font-mono text-xs text-landing-muted">
          {box.template.name} · {formatDimensions(box.dimensions)}
        </p>

        {opened && (
          <article
            ref={noteRef}
            tabIndex={-1}
            aria-labelledby="gift-note-title"
            style={{ opacity: reducedMotion ? 1 : 0 }}
            className="w-full max-w-md rounded-[28px] border-t-4 border-landing-lime bg-white p-6 text-landing-ink focus:outline-none"
          >
            <div className="flex items-center gap-3 border-b border-landing-line pb-3">
              <GoiMascot pose={pose} size={44} showPhotoBadge={false} />
              <div>
                <h2 id="gift-note-title" className="font-landing-heading text-lg font-bold text-landing-green-deep">
                  Lời chúc từ {sender}
                </h2>
                <p className="text-xs text-landing-muted">Hộp quà WrapFit</p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line break-words rounded-2xl bg-[#F5F6F4] p-4 text-base leading-7 text-landing-ink">
              {gift.giftNote}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2 text-sm text-landing-muted">
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-landing-ink ring-1 ring-landing-line transition-colors hover:bg-landing-tile/50"
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-landing-ink ring-1 ring-landing-line transition-colors hover:bg-landing-tile/50"
            >
              {musicOn ? <Music2 className="h-4 w-4 text-landing-lime" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
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
    <div className="w-full max-w-[480px] rounded-[28px] border border-landing-line bg-white px-6 py-10 text-center sm:px-10">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
        <QrCode className="size-6" aria-hidden />
      </span>
      <p className="mt-5 text-sm font-semibold text-landing-green">Mở hộp qua mã QR</p>
      <h1 className="mt-1 font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl">Mã QR không còn hiệu lực</h1>
      <p className="mt-3 text-base leading-7 text-landing-muted">Hộp quà gắn với mã này đã bị gỡ hoặc chưa từng tồn tại. Hãy hỏi người gửi một liên kết mới.</p>
      <Link
        href={ROUTES.unboxCode}
        className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-landing-lime px-6 text-base font-semibold text-landing-green-night transition-colors hover:bg-[#AFEC88]"
      >
        Nhập mã khác
      </Link>
    </div>
  );
}
