/* ds-artwork: vector illustration of a folded box. Raw colours and sizes here are allowed (docs/15_DESIGN_SYSTEM.md §2). */
import React from "react";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { cn } from "@/utils/helpers";
import styles from "./AuthIllustration.module.css";

interface AuthIllustrationProps {
  className?: string;
  /** Page shown beside the panel: Gói answers the pointer differently on each (see the CSS module). */
  mode?: "login" | "register";
}

/**
 * Left half of the sign-in and sign-up pages: a solid panel in the blue of the logo with the light mark at the top,
 * Gói standing on a kraft-to-orange disc ringed by halos and an orbit in the middle, and the brand line at the bottom
 * (second line in the light orange accent). CSS motion only, none for visitors who asked for reduced motion.
 */
export function AuthIllustration({ className, mode = "login" }: AuthIllustrationProps) {
  return (
    <div
      data-mode={mode}
      className={cn(
        "relative isolate flex flex-col overflow-hidden bg-[#0057A3] text-white",
        styles.panel,
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_15%_0%,#1C7BD0_0%,#0057A3_45%,#00386E_100%)]" />
        <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_50%_42%,black_10%,transparent_65%)]" />
        <div className="absolute -bottom-24 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-[100%] bg-[#002B57]/60 blur-3xl" />
      </div>

      <div className="px-12 pt-10 xl:px-14">
        <LandingLogo tone="light" size="lg" />
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-6">
        <Hero mode={mode} />
      </div>

      <div className="px-12 pb-12 xl:px-14">
        <p className="font-landing-heading text-[44px] font-bold leading-[1.08] tracking-tight xl:text-[52px]">
          Gói trọn tâm ý,
          <br />
          <span className="text-[#FFB27D]">vừa khít từng mi li</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Gói on its disc, as a small 3D scene: halos and disc at the back, the orbit tilted behind, Gói raised towards the
 * viewer, the orange block in front. The square follows the height left between the mark and the brand line.
 */
function Hero({ mode }: { mode: "login" | "register" }) {
  return (
    <div aria-hidden className={cn("relative aspect-square w-[min(440px,100%,calc(100svh-380px))]", styles.scene)}>
      {/* Halos */}
      <div className="absolute -inset-[16%] rounded-full bg-white/[0.04]" />
      <div className="absolute -inset-[4%] rounded-full bg-white/[0.06]" />

      {/* Disc: orange, light only at the top left, so the kraft of Gói stands out */}
      <div
        className={cn(
          "absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_30%_20%,#FFE3CC_0%,#FFA36B_30%,#F47A3A_62%,#DE5016_100%)] shadow-[inset_-18px_-24px_50px_rgba(180,70,10,0.35),0_40px_80px_-30px_rgba(0,20,50,0.8)]",
          styles.disc,
        )}
      />

      {/* Orbit */}
      <div className={cn("absolute inset-0", styles.orbit)}>
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
          <ellipse cx="50" cy="56" rx="54" ry="15" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="0.35" transform="rotate(-10 50 56)" />
          <circle cx="5" cy="62" r="1.3" fill="#FFFFFF" />
          <circle cx="96" cy="44" r="1" fill="#6DB33F" />
        </svg>
      </div>

      {/* Gói; a new key on each page replays its entrance when the form switches in place */}
      <div key={mode} className={cn("absolute left-1/2 top-[48%] w-[74%]", styles.goi)}>
        <img src="/mascots/goi.webp" alt="" className="w-full select-none" draggable={false} />
      </div>

      {/* Floating bits, in front of the disc */}
      <span className={cn("absolute right-[4%] top-[6%] size-[9%]", styles.spark)}>
        <span className={cn("block size-full rounded-[30%] bg-fpt-orange shadow-[0_10px_24px_-8px_rgba(242,101,34,0.8)]", styles.drift)} />
      </span>
      <span className={cn("absolute left-[2%] top-[22%] size-[4.5%]", styles.dot)}>
        <span className={cn("block size-full rounded-full bg-fpt-green", styles.driftSlow)} />
      </span>
    </div>
  );
}
