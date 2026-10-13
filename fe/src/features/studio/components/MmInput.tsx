"use client";

import React, { useEffect, useState } from "react";

/** Exact value in mm: typed freely, applied (and kept in range) on blur or Enter. */
export function MmInput({
  value,
  min,
  max,
  step,
  label,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    onCommit(parsed);
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        aria-label={`${label} (mm)`}
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="w-20 min-h-[36px] px-2 py-1 text-right font-mono font-bold text-brand-forest text-sm bg-stone-100 border border-transparent rounded-lg focus:outline-none focus:border-library-accent focus:bg-white"
      />
      <span className="font-mono text-[11px] text-stone-500">mm</span>
    </span>
  );
}
