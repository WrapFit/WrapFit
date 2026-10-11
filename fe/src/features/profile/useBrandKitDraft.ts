"use client";

import type { BrandKit } from "@wrapfit/shared";
import { useEffect, useMemo, useState } from "react";
import { draftFrom, sameDraft, type BrandKitDraft } from "./brandKit";

/**
 * Unsaved edits of the brand kit. A newer copy from the server (saved in another tab) replaces the draft only while
 * the user has not changed anything; leaving the page with unsaved edits asks first.
 */
export function useBrandKitDraft(kit: BrandKit | null) {
  const saved = useMemo(() => draftFrom(kit), [kit]);
  const [baseline, setBaseline] = useState(saved);
  const [draft, setDraft] = useState(saved);

  if (!sameDraft(saved, baseline)) {
    if (sameDraft(draft, baseline)) setDraft(saved);
    setBaseline(saved);
  }
  const dirty = !sameDraft(draft, baseline);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return {
    draft,
    /** Edits stay local until saved. */
    update: (change: Partial<BrandKitDraft>) => setDraft((current) => ({ ...current, ...change })),
    dirty,
    /** Back to the saved kit. */
    reset: () => setDraft(baseline),
    /** The server answered with this kit: it becomes the saved state. */
    markSaved: (next: BrandKit | null) => {
      const value = draftFrom(next);
      setBaseline(value);
      setDraft(value);
    },
  };
}
