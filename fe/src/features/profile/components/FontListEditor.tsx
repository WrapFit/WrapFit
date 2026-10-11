"use client";

import React, { useId, useState } from "react";
import { FONT_ROLES, FONT_SUGGESTIONS, MAX_FONTS, fontProblem } from "../brandKit";

interface FontListEditorProps {
  fonts: string[];
  onChange(fonts: string[]): void;
}

const ROW_BUTTON =
  "min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors focus-visible:ring-2 focus-visible:ring-primary";

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
    <div className="bg-white/80 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between font-cad-spec-micro text-[9px] text-on-surface-variant">
        <label htmlFor={inputId} className="tracking-wider uppercase font-semibold">
          Font chữ thương hiệu
        </label>
        <span className="font-cad-dimension text-[9px] text-primary font-medium">
          {fonts.length}/{MAX_FONTS} font
        </span>
      </div>

      {fonts.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {fonts.map((font, index) => (
            <li key={font} className="flex items-center justify-between gap-1 bg-white/90 pl-2.5 rounded-lg">
              <span className="min-w-0 flex items-baseline gap-2">
                <span className="shrink-0 font-cad-spec-micro text-[8px] uppercase tracking-wider text-on-surface-variant/70">
                  {FONT_ROLES[index]}
                </span>
                <span className="text-sm text-on-surface truncate" style={{ fontFamily: `"${font}", serif` }}>
                  {font}
                </span>
              </span>
              <span className="flex items-center shrink-0">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([font, ...fonts.filter((item) => item !== font)])}
                    aria-label={`Dùng “${font}” làm font tiêu đề`}
                    title="Dùng làm font tiêu đề"
                    className={`${ROW_BUTTON} hover:text-on-surface`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                      vertical_align_top
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(fonts.filter((item) => item !== font))}
                  aria-label={`Bỏ font “${font}”`}
                  className={`${ROW_BUTTON} hover:text-error`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="font-body-md text-xs text-on-surface-variant/80">
          Chưa chọn font nào: hộp dùng font mặc định của WrapFit.
        </p>
      )}

      {fonts.length < MAX_FONTS && (
        <div className="flex gap-1.5">
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
            className="flex-1 min-w-0 min-h-[44px] px-3 rounded-lg bg-surface-container-low/70 text-sm text-on-surface placeholder:text-on-surface-variant/60 select-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-error"
          />
          <datalist id={listId}>
            {FONT_SUGGESTIONS.filter((font) => !fonts.includes(font)).map((font) => (
              <option key={font} value={font} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={add}
            className="min-h-[44px] px-3.5 rounded-lg bg-on-surface text-surface-bright font-label-ui text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              add
            </span>
            Thêm
          </button>
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="font-body-md text-[11px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
