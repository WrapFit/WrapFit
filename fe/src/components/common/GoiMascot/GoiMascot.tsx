"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { animate } from "animejs";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { cn } from "@/utils/helpers";

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
  directionsSheet?: string;
  reactionsSheet?: string;
  label?: string;
  onBoop?: (reaction: string, count: number) => void;
}

const DIRECTIONS = [
  "up-left",
  "up",
  "up-right",
  "left",
  "center",
  "right",
  "down-left",
  "down",
  "down-right",
] as const;

type Direction = (typeof DIRECTIONS)[number];

const REACTIONS = [
  "blink",      // 0: (0% 0%) - wink / blink
  "heart",      // 1: (50% 0%) - heart eyes
  "sparkle",    // 2: (100% 0%) - sparkle stars
  "surprised",  // 3: (0% 50%) - surprised O mouth
  "wink",       // 4: (50% 50%) - cheeky wink
  "bashful",    // 5: (100% 50%) - blushing rosy cheeks
  "sleepy",     // 6: (0% 100%) - sleepy zzz
  "dizzy",      // 7: (50% 100%) - squashed dented box with dizzy eyes
  "delighted",  // 8: (100% 100%) - celebration unboxing pop with confetti
] as const;

type Reaction = (typeof REACTIONS)[number];

// Clockwise from the right, matching atan2 with y pointing down
const CLOCKWISE: Direction[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 60;
const PAYOFFS: Reaction[] = ["heart", "sparkle", "delighted", "wink", "bashful"];
const BOOP_PAYOFF = 140;
const BOOP_END = 620;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1200;

const SQUASH_KEYFRAMES: Keyframe[] = [
  { transform: "scale(1, 1)", easing: "ease-in" },
  { transform: "scale(1.14, 0.82)", offset: 0.18, easing: "ease-out" },
  { transform: "scale(0.92, 1.10)", offset: 0.45, easing: "ease-in-out" },
  { transform: "scale(1.04, 0.96)", offset: 0.72, easing: "ease-in-out" },
  { transform: "scale(1, 1)" },
];

function cell(index: number): React.CSSProperties {
  return {
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
  };
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

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
  directionsSheet,
  reactionsSheet,
  label = "Gói - Mascot Packaging Copilot",
  onBoop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const squashRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);
  const boopsRef = useRef<{ count: number; at: number }>({ count: 0, at: 0 });

  // Official sprite sheets for Gói (Packaging Box Mascot Copilot)
  const activeDirections = directionsSheet || "/mascots/box-directions.webp";
  const activeReactions = reactionsSheet || "/mascots/box-reactions.webp";

  const [direction, setDirection] = useState<Direction>("center");
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [showBubble, setShowBubble] = useState<boolean>(false);
  const [bubbleMessage, setBubbleMessage] = useState<string>("");

  const poseInfo = POSE_METADATA[pose] || POSE_METADATA.waving;

  // React to pose changes by briefly demonstrating the pose's reaction
  useEffect(() => {
    if (!pose) return;
    const targetReaction = poseInfo.reaction;
    setReaction(targetReaction);
    const t = window.setTimeout(() => {
      setReaction(null);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [pose, poseInfo.reaction]);

  // Pointer tracking across window (page-mascot algorithm)
  useEffect(() => {
    if (!enableTracking) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let sector = -1;
    let pointer: { x: number; y: number } | null = null;

    const aim = () => {
      const container = containerRef.current;
      if (!container || !pointer) return;

      const box = container.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setDirection("center");
        return;
      }

      // Hold current sector until pointer crosses edge
      const angle = Math.atan2(dy, dx);
      if (
        sector !== -1 &&
        Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS
      ) {
        return;
      }

      sector =
        (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      aim();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", aim, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", aim);
    };
  }, [enableTracking]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Boop / Poke interaction (Sound + Reaction + Squash + Bubble)
  const boop = useCallback(() => {
    if (!interactive) return;

    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];

    const later = (ms: number, next: Reaction | null) => {
      timersRef.current.push(
        window.setTimeout(() => setReaction(next), ms) as unknown as number
      );
    };

    const now = Date.now();
    const boops = boopsRef.current;
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;

    // Tactile sound trigger
    if (soundEnabled) {
      if (boops.count >= DIZZY_AFTER) {
        tactileAudio.playCreaseSnap();
      } else if (boops.count === 3) {
        tactileAudio.playPaperSnap();
      } else {
        tactileAudio.playSquishyTap();
      }
    }

    // Reaction selection
    let currentReaction: Reaction;
    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      currentReaction = "dizzy";
      setReaction("dizzy");
      later(DIZZY_END, null);
      setBubbleMessage("Ui da! Hộp carton bị móp rồi nè... 🌀");
    } else {
      currentReaction = PAYOFFS[(boops.count - 1) % PAYOFFS.length];
      setReaction("blink");
      later(BOOP_PAYOFF, currentReaction);
      later(BOOP_END, null);

      const phrases = [
        bubbleText || poseInfo.label,
        poseInfo.tip,
        "Chất liệu: Thùng hộp carton Kraft tự nhiên 📦",
        "Có tem dễ vỡ 🍷 và băng dính niêm phong chuẩn!",
        "Gói luôn xoay theo con trỏ chuột của bạn! 👀",
        "Sẵn sàng biến quà tặng thành trải nghiệm mở hộp đỉnh cao!",
      ];
      setBubbleMessage(phrases[(boops.count - 1) % phrases.length]);
    }

    onBoop?.(currentReaction, boops.count);

    // Squash and stretch spring effect
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      squashRef.current?.animate(SQUASH_KEYFRAMES, {
        duration: SQUASH_MS,
        easing: "linear",
      });
    }

    // Display speech bubble if enabled
    if (showBubbleOnBoop) {
      setShowBubble(true);
      timersRef.current.push(
        window.setTimeout(() => {
          setShowBubble(false);
        }, 4500) as unknown as number
      );
    }
  }, [
    interactive,
    soundEnabled,
    bubbleText,
    showBubbleOnBoop,
    poseInfo.label,
    poseInfo.tip,
    onBoop,
  ]);

  const handlePointerEnter = () => {
    if (!interactive || !containerRef.current) return;
    if (soundEnabled) {
      tactileAudio.playSquishyTap();
    }
    animate(containerRef.current, {
      scale: 1.06,
      translateY: -3,
      duration: 300,
      ease: "outQuad",
    });
  };

  const handlePointerLeave = () => {
    if (!interactive || !containerRef.current) return;
    animate(containerRef.current, {
      scale: 1,
      translateY: 0,
      duration: 260,
      ease: "outCubic",
    });
  };

  const dirIndex = DIRECTIONS.indexOf(direction);
  const reactIndex = REACTIONS.indexOf(reaction ?? "blink");
  const MascotRoot = interactive ? "button" : "span";

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
              : "bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 max-w-[280px] sm:max-w-xs text-center"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 font-landing-body",
              bubblePlacement === "top-right"
                ? "justify-start"
                : bubblePlacement === "top-left"
                ? "justify-end"
                : "justify-center"
            )}
          >
            <span className="w-2 h-2 shrink-0 rounded-full bg-vibrant-cobalt animate-ping" />
            <span className="leading-snug">{bubbleMessage || poseInfo.label}</span>
          </div>
          <div
            className={cn(
              "absolute -bottom-1.5 w-3 h-3 bg-white/95 border-b border-r border-paper-kraft rotate-45",
              bubblePlacement === "top-right"
                ? "left-8"
                : bubblePlacement === "top-left"
                ? "right-8"
                : "left-1/2 -translate-x-1/2"
            )}
          />
        </div>
      )}

      {/* Mascot Paper Button / Container. A plain image when not interactive, so it can sit inside another button. */}
      <MascotRoot
        {...(interactive
          ? { type: "button" as const, onClick: boop, title: `Gói (Packaging Box Mascot) — Nhấn để tương tác!` }
          : { role: "img" })}
        aria-label={label}
        className={`relative block flex-shrink-0 p-0 border-0 bg-transparent focus:outline-none transition-transform ${
          interactive ? "cursor-pointer" : ""
        }`}
        style={{
          width: size,
          height: size,
        }}
      >
        <span
          ref={squashRef}
          className="relative block w-full h-full"
          style={{
            transformOrigin: "50% 78%",
            filter:
              "drop-shadow(0 4px 6px rgba(45, 30, 20, 0.10)) drop-shadow(0 1px 2px rgba(45, 30, 20, 0.08))",
          }}
        >
          {/* Head Directions Layer (Follows Mouse Cursor) */}
          <span
            className="absolute inset-0 bg-no-repeat transition-opacity duration-150"
            style={{
              backgroundImage: `url(${activeDirections})`,
              backgroundSize: "300% 300%",
              ...cell(dirIndex),
              opacity: reaction ? 0 : 1,
            }}
          />

          {/* Reaction Expressions Layer (Blinks / Hearts / Dizzy / Confetti Unbox Pop) */}
          <span
            className="absolute inset-0 bg-no-repeat transition-opacity duration-150"
            style={{
              backgroundImage: `url(${activeReactions})`,
              backgroundSize: "300% 300%",
              ...cell(reactIndex),
              opacity: reaction ? 1 : 0,
            }}
          />
        </span>

        {/* Status / Emoji Badge */}
        {showPhotoBadge && (
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
              Kraft Box 📦
            </span>
          </div>
        )}
      </MascotRoot>
    </div>
  );
};
