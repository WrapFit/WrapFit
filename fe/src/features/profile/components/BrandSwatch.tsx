"use client";

import React, { useId, useState } from "react";
import { HEX_COLOR, readableInk } from "@/features/dashboard";
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

/**
 * One colour of the brand kit, in the swatch markup of the Stitch screen `dashboard-brand-kit`: the chip opens the
 * system colour picker, the HEX field takes a typed code. Focus is drawn with rings, the screen resets outlines.
 */
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
    <div className="bg-white/80 hover:bg-white rounded-xl p-2.5 flex flex-col justify-between transition-all duration-200 shadow-sm group">
      <label
        htmlFor={pickerId}
        className="relative h-20 rounded-lg p-2 flex flex-col justify-between shadow-inner overflow-hidden transition-transform group-hover:scale-[1.01] cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
        style={{ backgroundColor: valid ? color : "#FFFFFF", color: ink }}
      >
        <div className="flex items-center justify-between">
          <span
            className={`font-cad-spec-micro text-[8px] px-1.5 py-0.5 rounded-full backdrop-blur-md font-medium uppercase ${
              ink === "#FFFFFF" ? "bg-white/20" : "bg-black/5"
            }`}
          >
            {String(index + 1).padStart(2, "0")} · {role}
          </span>
          <span aria-hidden="true" className="material-symbols-outlined text-[14px] opacity-80">
            colorize
          </span>
        </div>
        <div className="font-cad-dimension text-[9px] font-medium opacity-90">{rgbLabel(color)}</div>
        <input
          id={pickerId}
          type="color"
          value={valid ? color.toLowerCase() : "#ffffff"}
          onChange={(event) => {
            setTyped(null);
            onChange(event.target.value.toUpperCase());
          }}
          aria-label={`Chọn ${role.toLowerCase()}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex items-center justify-between gap-1">
          <span className="font-headline-sm text-xs font-semibold text-on-surface truncate">{role}</span>
          <input
            aria-label={`Mã HEX của ${role.toLowerCase()}`}
            value={text}
            onChange={(event) => commit(event.target.value.trim())}
            onBlur={() => setTyped(null)}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={typed !== null && !HEX_COLOR.test(typed.startsWith("#") ? typed : `#${typed}`)}
            className="w-[78px] min-h-[32px] px-1.5 rounded-md bg-surface-container-low/70 font-cad-dimension text-[10px] text-primary font-bold uppercase text-right select-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:text-error aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-error"
          />
        </div>
        <div className="flex items-center justify-between font-cad-spec-micro text-[9px] text-on-surface-variant/80">
          <span>{index < 3 ? "Bắt buộc" : "Tuỳ chọn"}</span>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Bỏ ${role.toLowerCase()}`}
              className="-mr-1 min-h-[44px] min-w-[44px] px-2 rounded-lg flex items-center justify-center gap-0.5 text-on-surface-variant hover:text-error hover:bg-error-container/40 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                close
              </span>
              Bỏ
            </button>
          ) : (
            <span aria-hidden="true" className="min-h-[44px]" />
          )}
        </div>
      </div>
    </div>
  );
}
