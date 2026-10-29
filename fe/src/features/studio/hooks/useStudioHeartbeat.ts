"use client";

import { useEffect } from "react";
import {
  activeGapMs,
  autoFixElements,
  checkBox,
  MAX_STUDIO_HEARTBEAT_SECONDS,
  STUDIO_HEARTBEAT_MS,
  type CanvasElement,
  type DielinePiece,
} from "@wrapfit/shared";
import { recordProjectEvent } from "@/api/analytics";

/** Inputs that count as working on the design. Pointer moves cover dragging on the canvas. */
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel"] as const;

/**
 * Sends the active studio time of a saved project every minute (docs/17 S7, decision M8): the "box creation time" of
 * the dashboard. Time between two actions counts only when they are at most 2 minutes apart, and only while the tab
 * is visible, so a studio left open over lunch adds nothing. Demo projects (no id) send nothing. Analytics never
 * interrupts the user: a failed heartbeat is dropped.
 */
export function useStudioHeartbeat(projectId: string | null): void {
  useEffect(() => {
    if (!projectId) return;
    let lastActionAt: number | null = null;
    let activeMs = 0;

    const onActivity = () => {
      const now = Date.now();
      activeMs += activeGapMs(lastActionAt, now);
      lastActionAt = now;
    };
    // Coming back to a hidden tab starts a new stretch of work.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lastActionAt = null;
    };
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      const seconds = Math.min(MAX_STUDIO_HEARTBEAT_SECONDS, Math.floor(activeMs / 1000));
      if (seconds < 1) return;
      activeMs = Math.min(activeMs - seconds * 1000, MAX_STUDIO_HEARTBEAT_SECONDS * 1000);
      recordProjectEvent(projectId, { type: "STUDIO_ACTIVE", seconds }).catch(() => undefined);
    };

    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(beat, STUDIO_HEARTBEAT_MS);
    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [projectId]);
}

/**
 * Tells the dashboard how many FitCheck errors an Auto-Fix is about to repair (decision M9: errors only, never
 * warnings). Call it with the elements before the fix.
 */
export function recordAutoFix(projectId: string | null, pieces: DielinePiece[], elements: CanvasElement[]): void {
  if (!projectId) return;
  const errors = (list: CanvasElement[]) => checkBox(pieces, list).violations.filter((v) => v.severity === "error").length;
  const fixed = errors(elements) - errors(autoFixElements(pieces, elements));
  if (fixed > 0) recordProjectEvent(projectId, { type: "AUTO_FIX_APPLIED", fixed }).catch(() => undefined);
}
