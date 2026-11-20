"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Layers, PackageOpen, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/utils/helpers";
import type { IndustryBox, IndustryTile } from "./content";
import styles from "./HeroFoldBox.module.css";

/** Print colour of the box for each industry, in the order of INDUSTRY_TILES. */
const TONES = ["bg-brand-sage", "bg-brand-terracotta", "bg-brand-espresso", "bg-fpt-blue", "bg-brand-forest"];
const CYCLE_MS = 4500;
const MARK = "/branding/wrapfit-mark.svg";
/** Box when a tile has none. */
const DEFAULT_BOX: IndustryBox = {
  mm: [120, 80, 60],
  holds: "món quà",
  structure: "Hộp nắp gài",
  paper: "Ivory 300 GSM",
  finish: "Cán màng mờ",
  pattern: "stripes",
};
/** em per mm on the stage, capped so the longest side stays within 17 em. */
const EM_PER_MM = 0.15;
const LONGEST_EM = 17;

/** Stage size of a box in em: true to its proportions, large ones scaled down to fit. */
function boxStyle([l, w, h]: [number, number, number]): React.CSSProperties {
  const k = Math.min(EM_PER_MM, LONGEST_EM / Math.max(l, w, h));
  const em = (mm: number) => `${(mm * k).toFixed(2)}em`;
  return { "--box-l": em(l), "--box-w": em(w), "--box-h": em(h) } as React.CSSProperties;
}

/**
 * Hero stage: a box net on a cutting mat folds itself into a tuck-end box made for one industry, then every few
 * seconds lifts its lid and changes to the next industry: the box takes the size of that industry's gift (tile.box)
 * and its print. The industries below it pick the print on hover and open
 * their templates on click. The box follows the pointer a little; "Trải phẳng khuôn" lays the net flat again.
 */
export function HeroFoldBox({ tiles }: { tiles: IndustryTile[] }) {
  const [folded, setFolded] = useState(false);
  const [active, setActive] = useState(0);
  const [ajar, setAjar] = useState(false);
  const [paused, setPaused] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const activeRef = useRef(0);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** Lifts the lid, resizes and reprints the box, closes the lid once the walls have settled. */
  const show = useCallback((index: number) => {
    if (index === activeRef.current) return;
    activeRef.current = index;
    setAjar(true);
    later(() => {
      setActive(index);
      later(() => setAjar(false), 700);
    }, 360);
  }, []);

  // Fold once the page has painted (at once for visitors who asked for less motion).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setFolded(true), reduce ? 0 : 650);
    const pending = timers.current;
    return () => {
      window.clearTimeout(id);
      pending.forEach(window.clearTimeout);
    };
  }, []);

  // Next industry every few seconds while the box stands and nobody is pointing at an industry.
  useEffect(() => {
    if (!folded || paused) return;
    const id = window.setInterval(() => show((activeRef.current + 1) % tiles.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [folded, paused, show, tiles.length]);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltRef.current?.style.setProperty("--py", `${(x * 14).toFixed(2)}deg`);
    tiltRef.current?.style.setProperty("--px", `${(-y * 10).toFixed(2)}deg`);
  };

  const onPointerLeave = () => {
    tiltRef.current?.style.setProperty("--py", "0deg");
    tiltRef.current?.style.setProperty("--px", "0deg");
  };

  /** One layer per industry, cross-faded on the active one. */
  const layers = (render: (tile: IndustryTile, index: number) => React.ReactNode) =>
    tiles.map((tile, index) => (
      <div
        key={tile.title}
        className={cn(styles.print, TONES[index % TONES.length])}
        data-on={index === active}
        data-pattern={(tile.box ?? DEFAULT_BOX).pattern}
      >
        {render(tile, index)}
      </div>
    ));

  const current = tiles[active];
  const box = current.box ?? DEFAULT_BOX;
  const [l, w, h] = box.mm;

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        className={cn(styles.stage, folded && styles.folded, ajar && styles.ajar)}
        style={boxStyle(box.mm)}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <p className="sr-only">
          Khuôn bế hộp nắp gài trên thảm cắt tự gập thành hộp in cho ngành {current.title}, đựng {box.holds}, lọt lòng {l} × {w} × {h} mm.
        </p>

        <div ref={tiltRef} className={styles.tilt} aria-hidden>
          <div className={styles.scene}>
            <div className={styles.mat} />
            <div className={styles.turntable}>
              <div className={styles.box}>
                <div className={styles.shadow} />
                <div className={cn(styles.dim, styles.dimL)}>
                  <span>{l} mm</span>
                </div>
                <div className={cn(styles.dim, styles.dimW)}>
                  <span>{w} mm</span>
                </div>

                <div className={cn(styles.face, styles.base)}>
                  <div className={styles.in} />
                  <div className={styles.out} />
                </div>

                <div className={cn(styles.face, styles.front)}>
                  <div className={styles.in} />
                  <div className={cn(styles.out, styles.fit)}>
                    {layers((tile) => (
                      <div className={styles.tplLabel}>
                        <div>
                          <img src={MARK} alt="" />
                          <p>
                            <strong>{tile.title}</strong>
                            <span>Logo · thương hiệu</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn(styles.face, styles.left)}>
                  <div className={styles.in} />
                  <div className={styles.out}>
                    {layers(() => (
                      <div className={styles.sideMark}>
                        <span>WRAPFIT</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn(styles.face, styles.right)}>
                  <div className={styles.in} />
                  <div className={styles.out}>
                    {layers(() => (
                      <div className={styles.sideMark}>
                        <span>WRAPFIT</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn(styles.face, styles.back)}>
                  <div className={styles.in} />
                  <div className={styles.out}>{layers(() => null)}</div>

                  <div className={cn(styles.face, styles.lid)}>
                    <div className={styles.in} />
                    <div className={cn(styles.out, styles.fit)}>
                      {layers(() => (
                        <div className={styles.lidMark}>
                          <img src={MARK} alt="" />
                          <span>Mỗi món quà, trọn vẹn tâm ý</span>
                        </div>
                      ))}
                    </div>

                    <div className={cn(styles.face, styles.tuck)}>
                      <div className={styles.in} />
                      <div className={styles.out}>{layers(() => null)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What this box is: structure, size, paper, finish. Below the stage on phones. */}
        <div className={cn(styles.chip, "absolute left-0 top-[2%] hidden w-64 sm:block")} style={{ transitionDelay: folded ? "2.1s" : "0s" }}>
          <BoxSpec key={active} box={box} />
        </div>
        <SpecChip className="right-0 top-[4%]" delay={folded ? 2.4 : 0} index={1} icon={ShieldCheck} tone="text-fpt-green-dark" title="FitCheck™ 100/100" note="Tràn lề · Vùng an toàn · Nếp gấp" />

        <button
          type="button"
          onClick={() => {
            setPaused(folded);
            setAjar(false);
            setFolded(!folded);
          }}
          className="absolute bottom-[3%] left-0 inline-flex min-h-10 items-center gap-2 rounded-full border border-line/80 bg-white/90 px-4 text-sm font-semibold text-landing-ink shadow-soft-8 backdrop-blur-md transition-colors hover:border-fpt-orange/60 hover:text-fpt-orange-ink"
        >
          {folded ? <PackageOpen className="size-4" aria-hidden /> : <Box className="size-4" aria-hidden />}
          {folded ? "Trải phẳng khuôn" : "Gập thành hộp"}
        </button>
      </div>

      <BoxSpec key={`m-${active}`} box={box} className="sm:hidden" />

      {/* Industries: hover makes the box for it, click opens its templates. */}
      <ul
        aria-label="Ngành hàng nổi bật"
        data-tour="home-industries"
        className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0"
        onPointerLeave={() => setPaused(false)}
      >
        {tiles.map((tile, index) => {
          const on = index === active;
          return (
            <li key={tile.title} className="shrink-0 snap-start sm:shrink">
              <Link
                href={tile.href}
                onPointerEnter={() => {
                  setPaused(true);
                  if (folded) show(index);
                }}
                onFocus={() => {
                  setPaused(true);
                  if (folded) show(index);
                }}
                onBlur={() => setPaused(false)}
                className={cn(
                  "group relative flex h-full w-32 flex-col gap-2 overflow-hidden rounded-2xl border bg-white/90 p-1.5 pb-2.5 backdrop-blur-md transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 sm:w-auto",
                  on ? "border-fpt-orange/70 shadow-soft-16" : "border-line/70 hover:border-fpt-orange/40"
                )}
              >
                <span className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                  <Image
                    src={tile.image}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 120px, 128px"
                    className={cn("object-cover transition-[filter] duration-300", !on && "grayscale-[35%]")}
                  />
                </span>
                <span className="line-clamp-2 min-h-8 px-1 text-center text-xs font-semibold leading-4 text-landing-ink">{tile.title}</span>
                {on && folded && (
                  <span
                    key={`${active}-${paused}`}
                    aria-hidden
                    className={cn(styles.progress, "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-fpt-orange")}
                    data-paused={paused}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Spec card of the box on the stage: structure, inner size and what it holds, paper, finish. */
function BoxSpec({ box, className }: { box: IndustryBox; className?: string }) {
  const [l, w, h] = box.mm;
  const rows = [
    { icon: Ruler, label: "Lọt lòng", value: `${l} × ${w} × ${h} mm`, note: `vừa ${box.holds}` },
    { icon: Layers, label: "Giấy", value: box.paper },
    { icon: Sparkles, label: "Hoàn thiện", value: box.finish },
  ];
  return (
    <div className={cn(styles.swap, "rounded-2xl border border-white/70 bg-white/90 p-3 shadow-popover backdrop-blur-md", className)}>
      <p className="flex items-center gap-2 border-b border-line/70 pb-2 text-sm font-bold text-landing-ink">
        <span className="flex size-7 items-center justify-center rounded-lg bg-fpt-orange-light text-fpt-orange-ink">
          <Box className="size-4" aria-hidden />
        </span>
        {box.structure}
      </p>
      <dl className="mt-2 flex flex-col gap-1.5">
        {rows.map(({ icon: Icon, label, value, note }) => (
          <div key={label} className="flex items-start gap-2">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-fpt-blue" aria-hidden />
            <dt className="w-[4.5rem] shrink-0 text-xs leading-5 text-landing-muted">{label}</dt>
            <dd className="text-xs font-semibold leading-5 text-landing-ink">
              {value}
              {note && <span className="block font-normal text-landing-muted">{note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SpecChip({
  className,
  delay,
  index,
  icon: Icon,
  tone,
  title,
  note,
}: {
  className: string;
  /** Seconds before it shows: after the box has folded, none when it unfolds. */
  delay: number;
  /** Order around the stage, to offset the bobbing. */
  index: number;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: string;
  title: string;
  note: string;
}) {
  return (
    <div className={cn(styles.chip, "hidden sm:block", className)} style={{ transitionDelay: `${delay}s` }} aria-hidden>
      <div
        className="flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/85 py-2 pl-2 pr-3.5 shadow-popover backdrop-blur-md"
        style={{ animationDelay: `${(index * 0.9).toFixed(1)}s` }}
      >
        <span className={cn("flex size-9 items-center justify-center rounded-xl bg-surface-sunken", tone)}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-bold leading-5 text-landing-ink">{title}</span>
          <span className="text-xs leading-4 text-landing-muted">{note}</span>
        </span>
      </div>
    </div>
  );
}
