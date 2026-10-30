"use client";

import { ArrowLeft, ArrowRight, Check, CircleHelp, MousePointerClick, X } from "lucide-react";
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { usePrefersReducedMotion } from "@/hooks/dom";
import { cn } from "@/utils/helpers";
import { isPresenting } from "@/features/demo/presentMode";
import { Button, buttonClass, type ButtonStyleProps } from "./button";

/**
 * Product tour (onboarding): on the first visit of a page the screen dims, one feature at a time is cut out of the
 * dim and a tooltip next to it explains it, with Bé Gói in the `thumbs_up` pose of onboarding.
 *
 * - Targets are CSS selectors, usually `[data-tour="…"]` on the page. A selector may list several elements
 *   (`a, b`): the first one on screen wins, so a step can point at the sidebar on desktop and the tabs on phones.
 *   A step whose target is missing or hidden is left out, so the tour never points at nothing.
 * - Seen once (finished or skipped), it does not start again on its own; `<TourReplayButton>` replays it.
 * - Keyboard: → / Enter next, ← back, Esc closes, Tab stays inside the tooltip; focus returns to where it was.
 * - Motion: the cut-out moves with the SVG path (no layout), the tooltip fades in with transform and opacity, and
 *   nothing animates for reduced motion. Scrolling to a target is instant then.
 */

export interface TourStep {
  /** CSS selector of the highlighted element. None: a centred card (welcome, last words). */
  target?: string;
  title: string;
  body: React.ReactNode;
  /** Side of the target the tooltip prefers; "auto" picks the side with room (below, above, right, left). */
  placement?: TourPlacement;
  /** Pose of Bé Gói next to the title (AGENTS §3). Default: `thumbs_up`. */
  mascot?: MascotPose;
  /**
   * The user goes on by using the highlighted element itself (a "Bắt đầu" link, a size field…) instead of a "Tiếp"
   * button: the cut-out lets clicks through, the target gets the focus, and a click on it moves to the next step
   * (or ends the tour on the last one; a link then navigates as usual).
   */
  clickTarget?: boolean;
}

export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right";

export interface ProductTourProps {
  /** Name of the tour; the "seen" flag is stored under it (localStorage). */
  id: string;
  steps: TourStep[];
  /** Starts on its own on the first visit (default). False: only `startTour(id)` / the replay button start it. */
  autoStart?: boolean;
  /** False while the page still loads what the steps point at; the first visit waits for true. */
  ready?: boolean;
  /** Pause before the automatic start, so the page settles first. */
  startDelayMs?: number;
  /** Starts even if this tour was seen (e.g. the user just came from the previous tour's last step). */
  force?: boolean;
  /** Called when the tour ends; `completed` is false when it was skipped. */
  onClose?(completed: boolean): void;
}

const STORAGE_PREFIX = "wrapfit.tour.";
const START_EVENT = "wrapfit:tour-start";
/** Room around the highlighted element, and the corner of the cut-out. */
const SPOT_PADDING = 8;
const SPOT_RADIUS = 16;
/** Gap between the target and the tooltip, and the gutter kept to the edges of the screen. */
const GAP = 14;
const GUTTER = 16;

function storageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`;
}

/** Whether this browser has already seen (finished or skipped) the tour. Storage blocked: counts as seen. */
export function hasSeenTour(id: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(id)) !== null;
  } catch {
    return true;
  }
}

const CONTINUE_KEY = "wrapfit.tour.continue";

/**
 * The tour on the next page should start at once: set by a tour whose last step sends the user to another page
 * (home → "Bắt đầu"), read once by that page with `consumeTourContinuation`.
 */
export function continueTourOnNextPage() {
  try {
    window.sessionStorage.setItem(CONTINUE_KEY, "1");
  } catch {
    // Storage blocked: the next tour then only starts on a first visit.
  }
}

export function consumeTourContinuation(): boolean {
  try {
    const value = window.sessionStorage.getItem(CONTINUE_KEY) === "1";
    window.sessionStorage.removeItem(CONTINUE_KEY);
    return value;
  } catch {
    return false;
  }
}

/** True once on the page the previous tour sent the user to: pass it as `force` to that page's tour. */
export function useTourContinuation(): boolean {
  const [continued, setContinued] = useState(false);
  useEffect(() => {
    // Only a `true` is applied: a Strict Mode re-run reads an already cleared flag.
    if (consumeTourContinuation()) setContinued(true);
  }, []);
  return continued;
}

export function markTourSeen(id: string, completed: boolean) {
  try {
    window.localStorage.setItem(storageKey(id), completed ? "done" : "skipped");
  } catch {
    // Private mode or blocked storage: the tour may show again next time, nothing else breaks.
  }
}

/** Starts the tour `id` mounted on this page (e.g. from a help menu). */
export function startTour(id: string) {
  window.dispatchEvent(new CustomEvent<string>(START_EVENT, { detail: id }));
}

/** First element of `selector` that is on screen (has a box). */
function findTarget(selector: string | undefined): HTMLElement | null {
  if (!selector) return null;
  let elements: HTMLElement[];
  try {
    elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  } catch {
    return null;
  }
  return elements.find((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden") ?? null;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function spotlightOf(element: HTMLElement): Rect {
  const box = element.getBoundingClientRect();
  return {
    x: box.left - SPOT_PADDING,
    y: box.top - SPOT_PADDING,
    width: box.width + SPOT_PADDING * 2,
    height: box.height + SPOT_PADDING * 2,
  };
}

/** Screen-sized path with the rounded spot cut out (even-odd fill). */
function dimPath(viewport: { width: number; height: number }, spot: Rect | null) {
  const outer = `M0 0H${viewport.width}V${viewport.height}H0Z`;
  if (!spot) return outer;
  const { x, y, width, height } = spot;
  const r = Math.min(SPOT_RADIUS, width / 2, height / 2);
  return (
    `${outer}M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}` +
    `A${r} ${r} 0 0 1 ${x + width - r} ${y + height}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}` +
    `A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

type Side = Exclude<TourPlacement, "auto">;

interface TooltipPosition {
  left: number;
  top: number;
  side: Side | "center";
  /** Arrow offset along the tooltip edge facing the target. */
  arrow: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function placeTooltip(spot: Rect | null, size: { width: number; height: number }, preferred: TourPlacement, viewport: { width: number; height: number }): TooltipPosition {
  if (!spot) {
    return { left: (viewport.width - size.width) / 2, top: (viewport.height - size.height) / 2, side: "center", arrow: 0 };
  }
  const room: Record<Side, number> = {
    bottom: viewport.height - (spot.y + spot.height) - GAP - GUTTER,
    top: spot.y - GAP - GUTTER,
    right: viewport.width - (spot.x + spot.width) - GAP - GUTTER,
    left: spot.x - GAP - GUTTER,
  };
  const fits = (side: Side) => room[side] >= (side === "top" || side === "bottom" ? size.height : size.width);
  const order: Side[] = preferred === "auto" ? ["bottom", "top", "right", "left"] : [preferred, "bottom", "top", "right", "left"];
  // Nothing fits (a target taller than the screen): sit inside the bottom of the screen, over the target.
  const side = order.find(fits);
  const centerX = spot.x + spot.width / 2;
  const centerY = spot.y + spot.height / 2;
  const maxLeft = viewport.width - size.width - GUTTER;
  const maxTop = viewport.height - size.height - GUTTER;

  if (!side) {
    const left = clamp(centerX - size.width / 2, GUTTER, maxLeft);
    return { left, top: maxTop, side: "center", arrow: 0 };
  }
  if (side === "top" || side === "bottom") {
    const left = clamp(centerX - size.width / 2, GUTTER, maxLeft);
    const top = side === "bottom" ? spot.y + spot.height + GAP : spot.y - GAP - size.height;
    return { left, top, side, arrow: clamp(centerX - left, 24, size.width - 24) };
  }
  const top = clamp(centerY - size.height / 2, GUTTER, maxTop);
  const left = side === "right" ? spot.x + spot.width + GAP : spot.x - GAP - size.width;
  return { left, top, side, arrow: clamp(centerY - top, 24, size.height - 24) };
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** How long a starting tour waits for its targets (a page still loading its data or its code). */
const TARGET_WAIT_MS = 4000;
const TARGET_POLL_MS = 200;

export function ProductTour({ id, steps, autoStart = true, ready = true, startDelayMs = 500, force = false, onClose }: ProductTourProps) {
  /** Steps whose target is on screen, fixed when the tour starts so "2 / 5" stays true. */
  const [active, setActive] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Starts once every target is on screen, or after TARGET_WAIT_MS with the ones that are (the rest are left out).
  const pollTimer = useRef<number | undefined>(undefined);
  const start = useCallback(() => {
    window.clearTimeout(pollTimer.current);
    const startedAt = Date.now();
    const attempt = () => {
      const available = stepsRef.current.filter((step) => !step.target || findTarget(step.target));
      const complete = available.length === stepsRef.current.length;
      if (!complete && Date.now() - startedAt < TARGET_WAIT_MS) {
        pollTimer.current = window.setTimeout(attempt, TARGET_POLL_MS);
        return;
      }
      if (available.length === 0) return;
      setIndex(0);
      setActive(available);
    };
    attempt();
  }, []);
  useEffect(() => () => window.clearTimeout(pollTimer.current), []);

  const close = useCallback(
    (completed: boolean) => {
      markTourSeen(id, completed);
      setActive(null);
      onCloseRef.current?.(completed);
    },
    [id],
  );

  // First visit: start once the page is ready and has settled.
  useEffect(() => {
    // Presenter mode (?present=1): tours only start from their replay button.
    if (!ready || (!force && (!autoStart || hasSeenTour(id) || isPresenting()))) return;
    const timer = window.setTimeout(start, startDelayMs);
    return () => window.clearTimeout(timer);
  }, [autoStart, ready, force, id, start, startDelayMs]);

  // Replays asked from elsewhere on the page.
  useEffect(() => {
    const onStart = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) start();
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [id, start]);

  if (!active) return null;
  return createPortal(
    <TourOverlay
      steps={active}
      index={index}
      onBack={() => setIndex((current) => Math.max(0, current - 1))}
      onNext={() => (index + 1 < active.length ? setIndex(index + 1) : close(true))}
      onSkip={() => close(false)}
    />,
    document.body,
  );
}

interface TourOverlayProps {
  steps: TourStep[];
  index: number;
  onBack(): void;
  onNext(): void;
  onSkip(): void;
}

function TourOverlay({ steps, index, onBack, onNext, onSkip }: TourOverlayProps) {
  const step = steps[index];
  const last = index === steps.length - 1;
  const titleId = useId();
  const bodyId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [spot, setSpot] = useState<Rect | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  // Focus moves into the tour and back to where it was when the tour ends.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // Each step: bring the target into view, then follow it (scroll, resize, its own size) once per frame.
  useEffect(() => {
    const target = findTarget(step.target);
    if (step.target && target) {
      const box = target.getBoundingClientRect();
      const offScreen = box.top < 80 || box.bottom > window.innerHeight - 40;
      if (offScreen) target.scrollIntoView({ block: "center", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setSpot(target?.isConnected ? spotlightOf(target) : null);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    const observer = target && typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (target) observer?.observe(target);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [step, reducedMotion]);

  // The tooltip is placed from its own measured size, before paint.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip || viewport.width === 0) return;
    const next = placeTooltip(spot, { width: tooltip.offsetWidth, height: tooltip.offsetHeight }, step.placement ?? "auto", viewport);
    setPosition((current) =>
      current && current.left === next.left && current.top === next.top && current.side === next.side && current.arrow === next.arrow ? current : next,
    );
  }, [spot, viewport, step]);

  // Focus the main button of each step once it is placed (and again if the page took focus back meanwhile).
  const placed = position !== null;
  useEffect(() => {
    if (!placed || step.clickTarget) return;
    if (!tooltipRef.current?.contains(document.activeElement)) primaryRef.current?.focus({ preventScroll: true });
  }, [index, placed]);

  // Interactive step: the target takes the focus, and using it goes on.
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  useEffect(() => {
    if (!step.clickTarget) return;
    const target = findTarget(step.target);
    if (!target) return;
    target.focus({ preventScroll: true });
    // Capture phase, no preventDefault: a link still navigates, a button still runs its action.
    const onClick = () => onNextRef.current();
    target.addEventListener("click", onClick, { capture: true });
    return () => target.removeEventListener("click", onClick, { capture: true });
  }, [step]);

  // Keys on the whole page: on an interactive step the focus sits on the target, outside the tooltip.
  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => undefined);
  keyHandler.current = (event: KeyboardEvent) => {
    const inTooltip = tooltipRef.current?.contains(document.activeElement) ?? false;
    if (event.key === "Escape") {
      event.preventDefault();
      onSkip();
    } else if (event.key === "ArrowRight" && !step.clickTarget) {
      event.preventDefault();
      onNext();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      onBack();
    } else if (event.key === "Tab" && inTooltip) {
      const items = Array.from(tooltipRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (!items.length) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    // The layer itself lets clicks through; the dim catches them, and the cut-out does only on interactive steps.
    <div className="pointer-events-none fixed inset-0 z-[90]" data-app-tokens="">
      <svg className="absolute inset-0 size-full animate-fade-in" aria-hidden>
        <path d={dimPath(viewport, spot)} fillRule="evenodd" className="pointer-events-auto fill-fg/60" />
      </svg>
      {spot && !step.clickTarget && (
        // Not an interactive step: the highlighted element is shown, not usable yet.
        <span
          aria-hidden
          className="pointer-events-auto absolute left-0 top-0"
          style={{ width: spot.width, height: spot.height, transform: `translate(${spot.x}px, ${spot.y}px)` }}
        />
      )}
      {spot && (
        // Outer span: position (transform). Inner span: the ring, popping in per step (its own transform).
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: spot.width, height: spot.height, transform: `translate(${spot.x}px, ${spot.y}px)` }}
        >
          <span key={index} className="block size-full animate-pop-in rounded-panel ring-2 ring-fpt-orange" />
        </span>
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          "pointer-events-auto absolute left-0 top-0 w-[min(360px,calc(100vw-2rem))] text-fg outline-none",
          // Hidden until placed, so the first frame never shows it in the corner.
          position ? "opacity-100" : "opacity-0",
        )}
        style={position ? { transform: `translate(${Math.round(position.left)}px, ${Math.round(position.top)}px)` } : undefined}
      >
        {/* The card, keyed by step: each one pops in (transform + opacity) inside the positioned box above. */}
        <div key={index} className="relative animate-pop-in rounded-panel bg-surface-raised p-4 shadow-popover">
          {position && position.side !== "center" && <TooltipArrow side={position.side} offset={position.arrow} />}
          <div className="flex items-start gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-fpt-orange-light">
              <GoiMascot pose={step.mascot ?? "thumbs_up"} size={52} showPhotoBadge={false} interactive={false} enableTracking={false} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-overline uppercase text-accent tabular-nums">
                Bước {index + 1} / {steps.length}
              </p>
              <h2 id={titleId} className="mt-0.5 font-landing-heading text-title text-fg">
                {step.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Đóng hướng dẫn"
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted outline-none transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div id={bodyId} className="mt-3 text-body-sm text-fg-muted">
            {step.body}
          </div>
          {step.clickTarget && (
            <p className="mt-3 flex items-center gap-2 rounded-control bg-fpt-orange-light px-3 py-2 text-body-sm font-semibold text-accent">
              <MousePointerClick className="size-4 shrink-0" aria-hidden />
              Bấm vào phần đang được tô sáng để tiếp tục
            </p>
          )}

          {/* Wraps: with many steps the dots take a row of their own instead of pushing the buttons out of the card. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
            <ol className="flex min-w-0 flex-wrap items-center gap-1" aria-hidden>
              {steps.map((_, dot) => (
                <li
                  key={dot}
                  className={cn("h-1.5 w-4 rounded-full transition-[transform,background-color] duration-200", dot === index ? "bg-fpt-orange" : "scale-x-[0.375] bg-line-strong/60")}
                />
              ))}
            </ol>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {index > 0 ? (
                <Button variant="ghost" size="sm" onClick={onBack} leadingIcon={<ArrowLeft aria-hidden />}>
                  Quay lại
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onSkip}>
                  Bỏ qua
                </Button>
              )}
              {!step.clickTarget && (
                <Button
                  ref={primaryRef}
                  variant="brand"
                  size="sm"
                  onClick={onNext}
                  trailingIcon={last ? <Check aria-hidden /> : <ArrowRight aria-hidden />}
                  className="h-10"
                >
                  {last ? "Hoàn tất" : "Tiếp"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        Hướng dẫn, bước {index + 1} trên {steps.length}: {step.title}
      </span>
    </div>
  );
}

function TooltipArrow({ side, offset }: { side: Side; offset: number }) {
  const style: React.CSSProperties =
    side === "bottom"
      ? { top: -6, left: offset - 6 }
      : side === "top"
        ? { bottom: -6, left: offset - 6 }
        : side === "right"
          ? { left: -6, top: offset - 6 }
          : { right: -6, top: offset - 6 };
  return <span aria-hidden className="absolute size-3 rotate-45 rounded-sm bg-surface-raised" style={style} />;
}

export interface TourReplayButtonProps extends ButtonStyleProps {
  tourId: string;
  label?: React.ReactNode;
  /** Tooltip, for a label hidden on small screens. */
  title?: string;
}

/** "Xem hướng dẫn": replays the tour of the page. Give it `data-tour` to make it the last step. */
export function TourReplayButton({ tourId, label = "Xem hướng dẫn", variant = "outline", size = "md", shape = "rounded", className, ...rest }: TourReplayButtonProps & { "data-tour"?: string }) {
  return (
    <button type="button" onClick={() => startTour(tourId)} className={buttonClass({ variant, size, shape, className })} {...rest}>
      <CircleHelp aria-hidden />
      {label}
    </button>
  );
}
