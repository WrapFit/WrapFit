"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * `callback`, at most once per `intervalMs` while the calls keep coming (scroll, resize, pointer move, slider drag).
 * The first call runs at once and the last one is never lost. `intervalMs = "frame"` runs at most once per
 * animation frame, the right pace for anything that measures or paints.
 */
export function useThrottledCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  intervalMs: number | "frame" = "frame",
): (...args: Args) => void {
  const latest = useRef(callback);
  latest.current = callback;
  const handle = useRef<number | undefined>(undefined);
  const lastRun = useRef(0);
  const pending = useRef<Args | null>(null);

  useEffect(
    () => () => {
      if (intervalMs === "frame") window.cancelAnimationFrame(handle.current ?? 0);
      else window.clearTimeout(handle.current);
    },
    [intervalMs],
  );

  return useMemo(() => {
    if (intervalMs === "frame") {
      return (...args: Args) => {
        pending.current = args;
        if (handle.current !== undefined) return;
        handle.current = window.requestAnimationFrame(() => {
          handle.current = undefined;
          const next = pending.current;
          pending.current = null;
          if (next) latest.current(...next);
        });
      };
    }
    return (...args: Args) => {
      const wait = intervalMs - (Date.now() - lastRun.current);
      if (wait <= 0) {
        window.clearTimeout(handle.current);
        handle.current = undefined;
        lastRun.current = Date.now();
        latest.current(...args);
        return;
      }
      pending.current = args;
      if (handle.current !== undefined) return;
      handle.current = window.setTimeout(() => {
        handle.current = undefined;
        lastRun.current = Date.now();
        const next = pending.current;
        pending.current = null;
        if (next) latest.current(...next);
      }, wait);
    };
  }, [intervalMs]);
}
