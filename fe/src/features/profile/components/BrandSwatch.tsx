"use client";

import { Pipette, X } from "lucide-react";
import React, { useId, useState } from "react";
import { HEX_COLOR, readableInk } from "@/features/dashboard";
import { cn } from "@/utils/helpers";
import { rgbLabel } from "../brandKit";

interface BrandSwatchProps {
  /** Position in the kit: 0 primary, 1 accent, 2 background, then extras. */
  index: number;
  role: string;
  color: string;
  onChange(color: string): void;
  /** Absent when the kit is at its minimum of colours. */
  onRemove?(): void;
}

/** One colour of the brand kit: the chip opens the system colour picker, the HEX field takes a typed code. */
export function BrandSwatch({ index, role, color, onChange, onRemove }: BrandSwatchProps) {
  const pickerId = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const valid = HEX_COLOR.test(color);
  const ink = readableInk(color);
  const text = typed ?? color;

  const commit = (value: string) => {
    const normalized = (value.startsWith("#") ? value : `#${value}`).toUpperCase();
    setTyped(value);
    if (HEX_COLOR.test(normalized)) onChange(normalized);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-library-line bg-white p-2.5">
      <label
        htmlFor={pickerId}
        className="relative flex h-20 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border border-black/10 p-2 focus-within:ring-[3px] focus-within:ring-library-accent/40"
        style={{ backgroundColor: valid ? color : "#FFFFFF", color: ink }}
      >
        <span className="flex items-center justify-between text-caption font-medium">
          {String(index + 1).padStart(2, "0")}
          <Pipette className="size-3.5 opacity-80" aria-hidden />
        </span>
        <span className="font-mono text-cad-spec-micro opacity-90">{rgbLabel(color)}</span>
        <input
          id={pickerId}
          type="color"
          value={valid ? color.toLowerCase() : "#ffffff"}
          onChange={(event) => {
            setTyped(null);
            onChange(event.target.value.toUpperCase());
          }}
          aria-label={`Chọn ${role.toLowerCase()}`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-library-ink">{role}</span>
          <span className="block text-xs text-library-muted">{index < 3 ? "Bắt buộc" : "Tuỳ chọn"}</span>
        </span>
        <input
          aria-label={`Mã HEX của ${role.toLowerCase()}`}
          value={text}
          onChange={(event) => commit(event.target.value.trim())}
          onBlur={() => setTyped(null)}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={typed !== null && !HEX_COLOR.test(typed.startsWith("#") ? typed : `#${typed}`)}
          className="h-9 w-full min-[440px]:w-[84px] rounded-md border border-library-line bg-library-panel px-2 text-right font-mono text-xs uppercase text-library-ink outline-none focus:border-library-accent focus:ring-[3px] focus:ring-library-accent/20 aria-[invalid=true]:border-danger aria-[invalid=true]:text-danger-fg"
        />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Bỏ ${role.toLowerCase()}`}
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1 rounded-md text-xs text-library-sub transition-colors hover:bg-danger-bg hover:text-danger-fg",
            "outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20",
          )}
        >
          <X className="size-3.5" aria-hidden />
          Bỏ màu này
        </button>
      )}
    </div>
  );
}
