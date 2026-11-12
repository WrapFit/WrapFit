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
 * - Hands-on: the highlighted element is live. Clicks go through the cut-out on every step, so the user can try the
 *   feature (pick a box, type a size…); the tour stays on the step and "Tiếp" goes on. The cut-out grows to cover
 *   popups opened inside the target (`[role="listbox"|"menu"|"dialog"]`, or `[data-tour-popup]` on a custom one).
 *   An app modal opened from the target (`[role="dialog"][aria-modal="true"]`) hides the tour until it closes.
 *   `tryIt` is the hint line saying what a click does; `**bold**` in `body` / `tryIt` renders bold orange for the
 *   action phrases (`renderTourText`).
 * - Leaving mid-way: unmounting the tour while it is open (another page, another Studio step) marks it skipped, so
 *   coming back does not start it again; the replay button does. A reload does not mark anything: the tour starts
 *   over.
 * - Keyboard: → next, ← back, Esc closes, Tab stays inside the tooltip; focus returns to where it was. While the
 *   focus is in the target or in a field, ← / → / Enter belong to it; Esc first closes an open popup, then the tour.
 * - Motion: the cut-out moves with the SVG path (no layout), the tooltip fades in with transform and opacity, and
 *   nothing animates for reduced motion. Scrolling to a target is instant then.
 */

export interface TourStep {
  /** CSS selector of the highlighted element. None: a centred card (welcome, last words). */
  target?: string;
  title: string;
  /** A string may mark action phrases with `**…**` (bold orange, see `renderTourText`). */
  body: React.ReactNode;
  /**
   * Hint line under the body, in the orange strip: what the user can do with the highlighted element and what
   * happens ("**Thử bấm một kiểu hộp**: bản vẽ đổi theo."). `**…**` as in `body`. Only shown on steps with a target;
   * a `clickTarget` step without it shows a default sentence.
   */
  tryIt?: string;
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

function isShown(element: HTMLElement) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
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
  return elements.find(isShown) ?? null;
}

/** Popups a target can open inside itself (select list, menu, calendar); the cut-out grows to cover them. */
const POPUP_SELECTOR = '[role="listbox"], [role="menu"], [role="dialog"], [data-tour-popup]';
/** Fields that own ← / → / Enter while they have the focus. */
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
/** A modal of the app (not the tour's own tooltip, which has the same role). */
const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]';

function openPopupsIn(target: HTMLElement): HTMLElement[] {
  return Array.from(target.querySelectorAll<HTMLElement>(POPUP_SELECTOR)).filter(isShown);
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The target plus the popups open inside it, with room around. */
function spotlightOf(element: HTMLElement): Rect {
  const box = element.getBoundingClientRect();
  let left = box.left;
  let top = box.top;
  let right = box.right;
  let bottom = box.bottom;
  for (const popup of openPopupsIn(element)) {
    const popupBox = popup.getBoundingClientRect();
    left = Math.min(left, popupBox.left);
    top = Math.min(top, popupBox.top);
    right = Math.max(right, popupBox.right);
    bottom = Math.max(bottom, popupBox.bottom);
  }
  return {
    x: left - SPOT_PADDING,
    y: top - SPOT_PADDING,
    width: right - left + SPOT_PADDING * 2,
    height: bottom - top + SPOT_PADDING * 2,
  };
}

function sameRect(a: Rect | null, b: Rect | null) {
  return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);
}

/**
 * Splits `text` on `**…**`: the marked parts (the actions to do) become bold orange. Text without marks comes back
 * as is.
 */
export function renderTourText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  // split() with one capture group: the marked parts sit at the odd indexes.
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-accent">
        {part}
      </strong>
    ) : (
      part
    ),
  );
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
  /** Whether a tour is open right now, readable from cleanups (state would be stale there). */
  const activeRef = useRef<TourStep[] | null>(null);
  activeRef.current = active;
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

  const close = useCallback(
    (completed: boolean) => {
      // Cleared at once: if `onClose` navigates away, the unmount below must not turn "done" into "skipped".
      activeRef.current = null;
      markTourSeen(id, completed);
      setActive(null);
      onCloseRef.current?.(completed);
    },
    [id],
  );

  // The user left the page (or the step) with the tour open: it counts as skipped, so coming back does not restart
  // it. A reload runs no cleanup, so it marks nothing. Strict Mode's first fake unmount finds no open tour.
  useEffect(() => () => window.clearTimeout(pollTimer.current), []);
  useEffect(
    () => () => {
      if (activeRef.current) markTourSeen(id, false);
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

  // An app modal (dialog opened from the target, portalled below the tour) hides the tour until it closes.
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const check = () => {
      const tooltip = tooltipRef.current;
      setBlocked(Array.from(document.querySelectorAll<HTMLElement>(MODAL_SELECTOR)).some((modal) => modal !== tooltip && isShown(modal)));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "role", "hidden"] });
    return () => observer.disconnect();
  }, []);

  // Each step: bring the target into view, then follow it (scroll, resize, its own size, popups opening inside it)
  // once per frame. The target is looked up again at every measure: the user may make it appear or go away.
  useEffect(() => {
    const first = findTarget(step.target);
    if (first) {
      const box = first.getBoundingClientRect();
      const offScreen = box.top < 80 || box.bottom > window.innerHeight - 40;
      if (offScreen) first.scrollIntoView({ block: "center", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    }
    let frame = 0;
    let watched: HTMLElement | null = null;
    let watchingPage = false;
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    const targetObserver = new MutationObserver(schedule);
    const pageObserver = new MutationObserver(schedule);
    function measure() {
      frame = 0;
      const target = findTarget(step.target);
      if (target !== watched) {
        resizeObserver?.disconnect();
        targetObserver.disconnect();
        watched = target;
        if (target) {
          resizeObserver?.observe(target);
          targetObserver.observe(target, { subtree: true, childList: true, attributes: true });
        }
      }
      // Target missing: wait for it to come back by watching the page.
      const waiting = !target && !!step.target;
      if (waiting && !watchingPage) pageObserver.observe(document.body, { childList: true, subtree: true });
      else if (!waiting && watchingPage) pageObserver.disconnect();
      watchingPage = waiting;
      const nextViewport = { width: window.innerWidth, height: window.innerHeight };
      setViewport((current) => (current.width === nextViewport.width && current.height === nextViewport.height ? current : nextViewport));
      const nextSpot = target ? spotlightOf(target) : null;
      setSpot((current) => (sameRect(current, nextSpot) ? current : nextSpot));
    }
    measure();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      resizeObserver?.disconnect();
      targetObserver.disconnect();
      pageObserver.disconnect();
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
  // Whether an Escape starts with a popup open (focus in it, or a list open in the target). Read before the popup's
  // own handler runs and closes it, so the same Escape does not also close the tour.
  const escapeBelongsToPopup = useRef(false);
  const stepTargetRef = useRef(step.target);
  stepTargetRef.current = step.target;
  keyHandler.current = (event: KeyboardEvent) => {
    // An app modal is open: it owns the keyboard.
    if (blocked) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const inTooltip = tooltipRef.current?.contains(active) ?? false;
    // The user works in the target or in a field: ← / → belong to it (a size field, a slider, a list). A click step's
    // target is a plain button or link, so there ← still goes back.
    const target = findTarget(step.target);
    const usingTarget = !inTooltip && !step.clickTarget && !!active && !!target?.contains(active);
    const typing = !!active?.closest(EDITABLE_SELECTOR);
    const keepArrows = usingTarget || typing;
    if (event.key === "Escape") {
      // The popup took this Escape (it closed, or kept the event): the tour stays.
      if (event.defaultPrevented || escapeBelongsToPopup.current) return;
      event.preventDefault();
      onSkip();
    } else if (event.key === "ArrowRight" && !step.clickTarget && !keepArrows) {
      event.preventDefault();
      onNext();
    } else if (event.key === "ArrowLeft" && index > 0 && !keepArrows) {
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
    // Capture phase runs before the popup's own handler: note there whether this Escape belongs to an open popup.
    const onKeyCapture = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const popup = active?.closest<HTMLElement>(POPUP_SELECTOR);
      const target = findTarget(stepTargetRef.current);
      escapeBelongsToPopup.current =
        (!!popup && popup !== tooltipRef.current) || (!!active && !!target?.contains(active) && openPopupsIn(target).length > 0);
    };
    window.addEventListener("keydown", onKeyCapture, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKeyCapture, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    // The layer lets clicks through; the dim catches them, but not over the cut-out, which stays usable on every step.
    <div aria-hidden={blocked || undefined} className={cn("pointer-events-none fixed inset-0 z-[90]", blocked && "invisible")} data-app-tokens="">
      <svg className="absolute inset-0 size-full animate-fade-in" aria-hidden>
        <path d={dimPath(viewport, spot)} fillRule="evenodd" className="pointer-events-auto fill-fg/60" />
      </svg>
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
            {typeof step.body === "string" ? renderTourText(step.body) : step.body}
          </div>
          {step.target && (step.tryIt || step.clickTarget) && (
            <p
              className={cn(
                // accent-bg flips with the theme (a fixed light orange would hide the light text of the dark theme).
                "mt-3 flex items-start gap-2 rounded-control bg-accent-bg px-3 py-2 text-body-sm",
                step.tryIt ? "text-fg" : "font-semibold text-accent-fg",
              )}
            >
              <MousePointerClick className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden />
              <span className="min-w-0">{step.tryIt ? renderTourText(step.tryIt) : "Bấm vào phần đang được tô sáng để tiếp tục"}</span>
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
