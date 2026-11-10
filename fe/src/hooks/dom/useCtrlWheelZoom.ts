"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Zoom factor per wheel pixel: one mouse notch with Ctrl (deltaY 100) is about x1.16, a trackpad pinch is a smooth stream of small steps. */
const ZOOM_SENSITIVITY = 0.0015;
/** Largest wheel delta (pixels) counted per event, so a fast flick never jumps. */
const MAX_DELTA_PX = 300;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 100;

/** `deltaY` of a wheel event in pixels, whatever its `deltaMode`. */
function wheelDeltaYPx(e: WheelEvent): number {
  const px = e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT_PX : e.deltaMode === 2 ? e.deltaY * PAGE_HEIGHT_PX : e.deltaY;
  return Math.max(-MAX_DELTA_PX, Math.min(MAX_DELTA_PX, px));
}

/**
 * Ctrl/⌘ + wheel (or a trackpad pinch, which the browser sends as wheel + ctrlKey) over the element zooms its content
 * instead of the whole page. The native listener is non-passive: React's `onWheel` is passive, so it cannot stop the
 * browser zooming the page. A plain wheel is never touched, the page still scrolls.
 *
 * `onZoom` gets a multiplicative factor (>1 zoom in, <1 zoom out). The handler is read through a ref, so the listener
 * is not re-bound on every render. With `enabled` false nothing is attached.
 */
export function useCtrlWheelZoom<T extends HTMLElement>(ref: RefObject<T | null>, onZoom: (factor: number) => void, enabled = true) {
  const onZoomRef = useRef(onZoom);
  useEffect(() => {
    onZoomRef.current = onZoom;
  });

  // The element can mount after the first render (a stage shown on one step only), so every commit checks whether the
  // element the listener sits on is still the one the ref holds; the listener moves only when it is not.
  const bound = useRef<{ element: T; handler: (e: WheelEvent) => void } | null>(null);
  useEffect(() => {
    const element = enabled ? ref.current : null;
    if (bound.current?.element === element) return;
    if (bound.current) {
      bound.current.element.removeEventListener("wheel", bound.current.handler);
      bound.current = null;
    }
    if (!element) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      onZoomRef.current(Math.exp(-wheelDeltaYPx(e) * ZOOM_SENSITIVITY));
    };
    element.addEventListener("wheel", handler, { passive: false });
    bound.current = { element, handler };
  });

  useEffect(
    () => () => {
      if (bound.current) bound.current.element.removeEventListener("wheel", bound.current.handler);
      bound.current = null;
    },
    []
  );
}
