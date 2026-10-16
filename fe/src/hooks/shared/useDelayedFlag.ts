"use client";

import { useEffect, useState } from "react";
import { LOADING_DELAY_MS } from "@/assets/styles/tokens";

/**
 * True once `active` has stayed true for `delayMs`. Loading indicators use it so an answer that comes back quickly
 * never flashes a spinner (design-system rule: show loading after 300 ms).
 */
export function useDelayedFlag(active: boolean, delayMs: number = LOADING_DELAY_MS): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    if (delayMs <= 0) {
      setShown(true);
      return;
    }
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return shown;
}
