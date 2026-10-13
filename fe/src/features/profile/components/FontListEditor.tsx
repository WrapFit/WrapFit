"use client";

import { ArrowUpToLine, Plus, X } from "lucide-react";
import React, { useId, useState } from "react";
import { WORKSPACE_INPUT } from "@/components/workspace";
import { cn } from "@/utils/helpers";
import { FONT_ROLES, FONT_SUGGESTIONS, MAX_FONTS, fontProblem } from "../brandKit";

interface FontListEditorProps {
  fonts: string[];
  onChange(fonts: string[]): void;
}

const ROW_BUTTON =
  "flex size-10 items-center justify-center rounded-lg text-library-sub transition-colors hover:bg-library-panel outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20";

/** Up to 3 font families, headings first: add from suggestions or by name, move one to the front, remove. */
export function FontListEditor({ fonts, onChange }: FontListEditorProps) {
  const inputId = useId();
  const listId = useId();
  const errorId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const problem = fontProblem(name, fonts);
    if (problem) {
      setError(problem);
      return;
    }
    onChange([...fonts, name.trim()]);
    setName("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {fonts.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {fonts.map((font, index) => (
            <li key={font} className="flex items-center justify-between gap-2 rounded-xl border border-library-line bg-white py-1 pl-3 pr-1">
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="w-16 shrink-0 text-xs text-library-muted">{FONT_ROLES[index]}</span>
                <span className="truncate text-lg text-library-ink" style={{ fontFamily: `"${font}", serif` }}>
                  {font}
                </span>
              </span>
              <span className="flex shrink-0 items-center">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([font, ...fonts.filter((item) => item !== font)])}
                    aria-label={`Dùng “${font}” làm font tiêu đề`}
                    title="Dùng làm font tiêu đề"
                    className={cn(ROW_BUTTON, "hover:text-library-ink")}
                  >
                    <ArrowUpToLine className="size-4" aria-hidden />
                  </button>
                )}
                <button type="button" onClick={() => onChange(fonts.filter((item) => item !== font))} aria-label={`Bỏ font “${font}”`} className={cn(ROW_BUTTON, "hover:text-red-700")}>
                  <X className="size-4" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-library-panel px-4 py-3 text-sm text-library-sub">Chưa chọn font nào: hộp dùng font mặc định của WrapFit.</p>
      )}

      {fonts.length < MAX_FONTS && (
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Thêm font
          </label>
          <input
            id={inputId}
            list={listId}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder="Ví dụ: Playfair Display"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={cn(WORKSPACE_INPUT, "min-w-0 flex-1")}
          />
          <datalist id={listId}>
            {FONT_SUGGESTIONS.filter((font) => !fonts.includes(font)).map((font) => (
              <option key={font} value={font} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={add}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-library-ink bg-white px-4 text-sm font-medium text-library-ink transition-colors hover:bg-library-panel outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20"
          >
            <Plus className="size-4" aria-hidden />
            Thêm
          </button>
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
