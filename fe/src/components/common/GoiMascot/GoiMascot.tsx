"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { animate } from "animejs";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";
import styles from "./GoiMascot.module.css";

export type MascotPose =
  | "waving"
  | "thumbs_up"
  | "measuring"
  | "folding"
  | "presenting"
  | "delivery"
  | "celebration"
  | "unboxing_pop"
  | "chilling";

export interface GoiMascotProps {
  pose?: MascotPose;
  size?: number; // size in px
  className?: string;
  showPhotoBadge?: boolean;
  showMaterialBadge?: boolean;
  interactive?: boolean;
  enableTracking?: boolean;
  bubbleText?: string;
  showBubbleOnBoop?: boolean;
  bubblePlacement?: "top" | "top-right" | "top-left";
  soundEnabled?: boolean;
  /** @deprecated Gói no longer uses sprite sheets; ignored. */
  directionsSheet?: string;
  /** @deprecated Gói no longer uses sprite sheets; ignored. */
  reactionsSheet?: string;
  label?: string;
  onBoop?: (reaction: string, count: number) => void;
}

/** Expression of a click, reported through `onBoop`. */
type Reaction = "blink" | "heart" | "sparkle" | "surprised" | "wink" | "bashful" | "sleepy" | "dizzy" | "delighted";

/** The three drawings of Gói, cut from one artwork onto the same canvas (feet on one baseline). */
const ART = {
  ruler: "/mascots/goi-ruler.webp",
  magnifier: "/mascots/goi-magnifier.webp",
  cheer: "/mascots/goi-cheer.webp",
} as const;
type Art = keyof typeof ART;
const ARTS = Object.keys(ART) as Art[];

type Extra = "zzz" | "sparkle" | "lines" | null;

/** What Gói holds and does for each task of the app (motions in GoiMascot.module.css). */
const POSE_ACTION: Record<MascotPose, { art: Art; motion: string; extra: Extra }> = {
  waving: { art: "ruler", motion: styles.wave, extra: null },
  thumbs_up: { art: "cheer", motion: styles.hop, extra: null },
  measuring: { art: "ruler", motion: styles.measure, extra: null },
  folding: { art: "magnifier", motion: styles.fold, extra: null },
  presenting: { art: "magnifier", motion: styles.scan, extra: "sparkle" },
  delivery: { art: "magnifier", motion: styles.walk, extra: "lines" },
  celebration: { art: "cheer", motion: styles.jump, extra: "sparkle" },
  unboxing_pop: { art: "cheer", motion: styles.pop, extra: "sparkle" },
  chilling: { art: "ruler", motion: styles.breathe, extra: "zzz" },
};

const PAYOFFS: Reaction[] = ["heart", "sparkle", "delighted", "wink", "bashful"];
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const REACT_MS = 700;
const DIZZY_MS = 1200;

/* One-shot reactions, played with Web Animations on their own layer: the looping action underneath never stops. */
const JUMP_KEYFRAMES: Keyframe[] = [
  { transform: "translateY(0) rotate(0deg)" },
  { transform: "translateY(-22%) rotate(-8deg)", offset: 0.4 },
  { transform: "translateY(0) rotate(4deg)", offset: 0.7 },
  { transform: "translateY(0) rotate(0deg)" },
];
const DIZZY_KEYFRAMES: Keyframe[] = [
  { transform: "rotate(0deg)" },
  { transform: "rotate(-14deg) translateX(-4%)", offset: 0.15 },
  { transform: "rotate(12deg) translateX(4%)", offset: 0.35 },
  { transform: "rotate(-9deg)", offset: 0.55 },
  { transform: "rotate(6deg)", offset: 0.75 },
  { transform: "rotate(0deg)" },
];

function prefersMotion() {
  return typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/** Pointer distance (px) giving the full lean. */
const REACH = 420;

const SQUASH_KEYFRAMES: Keyframe[] = [
  { transform: "scale(1, 1)", easing: "ease-in" },
  { transform: "scale(1.14, 0.82)", offset: 0.18, easing: "ease-out" },
  { transform: "scale(0.92, 1.10)", offset: 0.45, easing: "ease-in-out" },
  { transform: "scale(1.04, 0.96)", offset: 0.72, easing: "ease-in-out" },
  { transform: "scale(1, 1)" },
];

const POSE_METADATA: Record<
  MascotPose,
  { label: string; badge: string; reaction: Reaction; tip: string }
> = {
  waving: {
    label: "Xin chào! Mình là Gói 📦",
    badge: "👋",
    reaction: "wink",
    tip: "Trợ lý AI thiết kế bao bì & hộp quà thông minh.",
  },
  thumbs_up: {
    label: "Bắt đầu thiết kế hộp nhé!",
    badge: "👍",
    reaction: "delighted",
    tip: "Nhập kích thước món quà để tự động dựng cấu trúc hộp.",
  },
  delivery: {
    label: "Sẵn sàng xuất xưởng hộp!",
    badge: "📦",
    reaction: "sparkle",
    tip: "File in vector PDF 300 DPI tách sẵn lớp cấn bế ECMA.",
  },
  celebration: {
    label: "Chuẩn xác 100/100!",
    badge: "🎉",
    reaction: "delighted",
    tip: "FitCheck™ xác nhận an toàn mép gấp & tràn lề bleed.",
  },
  presenting: {
    label: "Gợi ý mẫu hộp tối ưu",
    badge: "✨",
    reaction: "sparkle",
    tip: "Chọn cấu trúc Tuck-Top, Hộp bao diêm hoặc Âm dương.",
  },
  measuring: {
    label: "Đang kiểm tra thước đo mm",
    badge: "📐",
    reaction: "surprised",
    tip: "Khoảng cách an toàn tối thiểu 3.0mm từ nếp cấn gập.",
  },
  folding: {
    label: "Gập nếp phẳng theo dao cấn",
    badge: "✂️",
    reaction: "blink",
    tip: "Mô phỏng bản lề gập origami vật lý theo thời gian thực.",
  },
  unboxing_pop: {
    label: "Mở hộp quà unboxing 3D! 🎁",
    badge: "🎁",
    reaction: "delighted",
    tip: "Bật nắp hộp ảo tung pháo giấy qua mã QR AR.",
  },
  chilling: {
    label: "Hộp đã được lưu an toàn",
    badge: "☕",
    reaction: "sleepy",
    tip: "Bản vẽ dự án đã được tự động lưu lên máy chủ.",
  },
};

export const GoiMascot: React.FC<GoiMascotProps> = ({
  pose = "waving",
  size = 72,
  className = "",
  showPhotoBadge = true,
  showMaterialBadge = false,
  interactive = true,
  enableTracking = true,
  bubbleText,
  showBubbleOnBoop = true,
  bubblePlacement = "top",
  soundEnabled = true,
  label = "Bé Gói, trợ lý thiết kế bao bì",
  onBoop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<HTMLSpanElement>(null);
  const squashRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);
  const boopsRef = useRef<{ count: number; at: number }>({ count: 0, at: 0 });

  const poseInfo = POSE_METADATA[pose] || POSE_METADATA.waving;
  const action = POSE_ACTION[pose] || POSE_ACTION.waving;

  const reactRef = useRef<HTMLSpanElement>(null);
  const [showBubble, setShowBubble] = useState<boolean>(false);
  const [bubbleMessage, setBubbleMessage] = useState<string>("");

  /** Drawing picked by clicks; it stays until the next click (or a new task). */
  const [picked, setPicked] = useState<Art | null>(null);
  const art = picked ?? action.art;

  // A new task: a short hop announces the new action.
  useEffect(() => {
    setPicked(null);
    if (prefersMotion()) reactRef.current?.animate(JUMP_KEYFRAMES, { duration: REACT_MS, easing: "cubic-bezier(0.3, 0, 0.3, 1)" });
  }, [pose]);

  // Gói leans towards the pointer (fine pointers only). Written as CSS variables: no re-render per move.
  useEffect(() => {
    if (!enableTracking) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const aim = () => {
      frame = 0;
      const look = lookRef.current;
      const container = containerRef.current;
      if (!look || !container || !pointer) return;
      const box = container.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (pointer.x - (box.left + box.width / 2)) / REACH));
      const dy = Math.max(-1, Math.min(1, (pointer.y - (box.top + box.height / 2)) / REACH));
      look.style.setProperty("--goi-tilt", `${(dx * 8).toFixed(2)}deg`);
      look.style.setProperty("--goi-x", `${(dx * 4).toFixed(2)}%`);
      look.style.setProperty("--goi-y", `${(Math.min(0, dy) * 3).toFixed(2)}%`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(aim);
    };
    const onPointerMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      schedule();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", schedule);
    };
  }, [enableTracking]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Click: sound, squash, a jump (a wobble after a burst of clicks), a bubble.
  const boop = useCallback(() => {
    if (!interactive) return;

    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    const later = (ms: number, fn: () => void) => {
      timersRef.current.push(window.setTimeout(fn, ms) as unknown as number);
    };

    const now = Date.now();
    const boops = boopsRef.current;
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;

    if (soundEnabled) {
      if (boops.count >= DIZZY_AFTER) tactileAudio.playCreaseSnap();
      else if (boops.count === 3) tactileAudio.playPaperSnap();
      else tactileAudio.playSquishyTap();
    }

    let currentReaction: Reaction;
    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      currentReaction = "dizzy";
      if (prefersMotion()) reactRef.current?.animate(DIZZY_KEYFRAMES, { duration: DIZZY_MS, easing: "ease-in-out" });
      setBubbleMessage("Ui da! Hộp carton bị móp rồi nè... 🌀");
    } else {
      currentReaction = PAYOFFS[(boops.count - 1) % PAYOFFS.length];
      // Next drawing, kept until the next click.
      setPicked(ARTS[(ARTS.indexOf(art) + 1) % ARTS.length]);
      if (prefersMotion()) reactRef.current?.animate(JUMP_KEYFRAMES, { duration: REACT_MS, easing: "cubic-bezier(0.3, 0, 0.3, 1)" });

      const phrases = [
        bubbleText || poseInfo.label,
        poseInfo.tip,
        "Chất liệu: Thùng hộp carton Kraft tự nhiên 📦",
        "Có tem dễ vỡ 🍷 và băng dính niêm phong chuẩn!",
        "Gói luôn nghiêng theo con trỏ chuột của bạn! 👀",
        "Sẵn sàng biến quà tặng thành trải nghiệm mở hộp đỉnh cao!",
      ];
      setBubbleMessage(phrases[(boops.count - 1) % phrases.length]);
    }

    onBoop?.(currentReaction, boops.count);

    if (prefersMotion()) {
      squashRef.current?.animate(SQUASH_KEYFRAMES, { duration: SQUASH_MS, easing: "linear" });
    }

    if (showBubbleOnBoop) {
      setShowBubble(true);
      later(4500, () => setShowBubble(false));
    }
  }, [interactive, soundEnabled, bubbleText, showBubbleOnBoop, poseInfo.label, poseInfo.tip, art, onBoop]);

  const handlePointerEnter = () => {
    if (!interactive || !containerRef.current) return;
    if (soundEnabled) tactileAudio.playSquishyTap();
    animate(containerRef.current, { scale: 1.06, translateY: -3, duration: 300, ease: "outQuad" });
  };

  const handlePointerLeave = () => {
    if (!interactive || !containerRef.current) return;
    animate(containerRef.current, { scale: 1, translateY: 0, duration: 260, ease: "outCubic" });
  };

  const MascotRoot = interactive ? "button" : "span";
  const extraSize = Math.max(10, Math.round(size * 0.2));

  return (
    <div
      ref={containerRef}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      className={`relative inline-flex flex-col items-center select-none ${className}`}
    >
      {/* Interactive Speech Bubble */}
      {showBubble && showBubbleOnBoop && (
        <div
          className={cn(
            "absolute z-50 pointer-events-none bg-white/95 backdrop-blur-md text-brand-forest text-xs sm:text-sm font-medium px-4 py-2.5 rounded-2xl shadow-soft-16 border border-paper-kraft animate-pop-in",
            bubblePlacement === "top-right"
              ? "bottom-[calc(100%+14px)] left-0 min-w-[220px] max-w-[280px] sm:max-w-[340px] text-left"
              : bubblePlacement === "top-left"
              ? "bottom-[calc(100%+14px)] right-0 min-w-[220px] max-w-[280px] sm:max-w-[340px] text-right"
              : // w-max: an absolute box would otherwise shrink to the mascot's width and stack the words in a column
                "bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 w-max max-w-[260px] sm:max-w-[300px] text-center"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 font-landing-body",
              bubblePlacement === "top-right" ? "justify-start" : bubblePlacement === "top-left" ? "justify-end" : "justify-center"
            )}
          >
            <span className="w-2 h-2 shrink-0 rounded-full bg-vibrant-cobalt animate-ping" />
            <span className="leading-snug">{bubbleMessage || poseInfo.label}</span>
          </div>
          <div
            className={cn(
              "absolute -bottom-1.5 w-3 h-3 bg-white/95 border-b border-r border-paper-kraft rotate-45",
              bubblePlacement === "top-right" ? "left-8" : bubblePlacement === "top-left" ? "right-8" : "left-1/2 -translate-x-1/2"
            )}
          />
        </div>
      )}

      {/* Mascot Paper Button / Container. A plain image when not interactive, so it can sit inside another button. */}
      <MascotRoot
        {...(interactive
          ? { type: "button" as const, onClick: boop, title: `Bé Gói — nhấn để trò chuyện` }
          : { role: "img" })}
        aria-label={label}
        className={`relative block flex-shrink-0 p-0 border-0 bg-transparent rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${
          interactive ? "cursor-pointer" : ""
        }`}
        style={{ width: size, height: size }}
      >
        <span ref={lookRef} className={cn("absolute inset-0 block", styles.look)}>
          <span
            ref={squashRef}
            className="absolute inset-0 block"
            style={{
              transformOrigin: "50% 92%",
              filter: "drop-shadow(0 4px 6px rgba(45, 30, 20, 0.14)) drop-shadow(0 1px 2px rgba(45, 30, 20, 0.1))",
            }}
          >
            <span ref={reactRef} className={cn("absolute inset-0 block", styles.react)}>
              <span className={cn("absolute inset-0 block", styles.motion, action.motion)}>
                {ARTS.map((a) => (
                  // All three stay mounted (already decoded): a swap is a cross-fade, never a blank frame.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a} src={ART[a]} alt="" draggable={false} className={styles.art} style={{ opacity: a === art ? 1 : 0 }} />
                ))}
              </span>
            </span>
          </span>
        </span>

        {/* Extras of some tasks */}
        {action.extra === "zzz" && !picked && (
          <span aria-hidden style={{ fontSize: extraSize }}>
            <span className={cn(styles.extra, styles.zzz)}>z</span>
            <span className={cn(styles.extra, styles.zzz)}>z</span>
          </span>
        )}
        {action.extra === "sparkle" && (
          <span aria-hidden style={{ fontSize: extraSize }}>
            <span className={cn(styles.extra, styles.sparkle)} style={{ left: "2%", top: "10%" }}>✦</span>
            <span className={cn(styles.extra, styles.sparkle)} style={{ right: "0%", top: "28%", animationDelay: "0.5s" }}>✦</span>
          </span>
        )}
        {action.extra === "lines" && !picked && <span aria-hidden className={cn(styles.extra, styles.lines)} />}

        {/* Status / Emoji Badge; it would hide a small Gói, so only from 64 px */}
        {showPhotoBadge && size >= 64 && (
          <div
            className="absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full bg-white shadow-tactile border border-paper-kraft flex items-center justify-center text-xs transform scale-95 hover:scale-110 transition-transform pointer-events-none"
            title={poseInfo.label}
          >
            <span>{poseInfo.badge}</span>
          </div>
        )}

        {/* Paper Material Tag (Packaging Box) */}
        {showMaterialBadge && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-cad-spec-micro font-mono font-bold bg-paper-cotton text-brand-forest border border-paper-kraft shadow-xs">
              Hộp kraft 📦
            </span>
          </div>
        )}
      </MascotRoot>
    </div>
  );
};
