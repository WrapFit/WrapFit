"use client";

/**
 * Presenter mode for demos: `?present=1` on any page turns it on for the browser tab (sessionStorage), `?present=0`
 * turns it off. While it is on, guided tours never start by themselves, Gói's floating assistant stays hidden and the
 * studio's code is loaded in the background from the first page, so it opens at once when the presenter gets there.
 */
import { usePathname, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";

const KEY = "wf-present";
const EVENT = "wf-present-change";

/** Whether presenter mode is on in this tab. */
export function isPresenting(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function setPresenting(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the mode lasts for this page only.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Presenter mode, kept up to date when it is switched on another page of the tab. */
export function usePresentMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => setOn(isPresenting());
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return on;
}

function PresentModeSync() {
  const params = useSearchParams();
  const pathname = usePathname();
  const asked = params.get("present");
  useEffect(() => {
    if (asked === "1" && !isPresenting()) setPresenting(true);
    if (asked === "0" && isPresenting()) setPresenting(false);
  }, [asked]);
  useEffect(() => {
    if (!isPresenting()) return;
    document.documentElement.dataset.present = "1";
    // Warm the studio chunk (2D canvas, Three.js) while the presenter is still on another page.
    const idle = window.setTimeout(() => void import("@/views/editor/studio/lazy").then((m) => m.loadStudioWorkspace()), 1500);
    return () => window.clearTimeout(idle);
  }, [pathname, asked]);
  return null;
}

/** Mounted once in AppProviders. */
export function PresentModeBoot() {
  return (
    <Suspense fallback={null}>
      <PresentModeSync />
    </Suspense>
  );
}
