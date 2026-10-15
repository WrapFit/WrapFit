"use client";

import { ArrowRight, Clock, Search, X } from "lucide-react";
import React, { useId, useRef, useState } from "react";
import { useLocalStorageList } from "@/hooks/shared";
import { cn } from "@/utils/helpers";

export interface SearchSuggestion {
  id: string;
  label: string;
  /** Small text on the right: "Mẫu hộp", "Bài viết". */
  hint?: string;
  /** Going there directly instead of searching the label. */
  href?: string;
}

export interface SearchBarProps {
  value: string;
  onChange(value: string): void;
  /** Run the search (Enter, the button, a recent search). */
  onSubmit(value: string): void;
  /** What is searched, read and shown: "Tìm mẫu hộp, bài viết, câu hỏi…". */
  placeholder: string;
  /** Names the field for screen readers: "Tìm kiếm toàn trang". */
  label: string;
  /** Matches for what is typed (autocomplete). */
  suggestions?: SearchSuggestion[];
  /** Pick a suggestion: navigate or fill. Defaults to searching its label. */
  onPickSuggestion?: (suggestion: SearchSuggestion) => void;
  /** Remember recent searches on this device under this key. */
  historyKey?: string;
  /** `lg` 56 px pill of search pages, `md` 44 px in toolbars. */
  size?: "md" | "lg";
  /** Show the "Tìm" button (search pages); the icon still submits otherwise. */
  submitButton?: boolean;
  autoFocus?: boolean;
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Search field (combobox): clear button, submit button, suggestions while typing and recent searches when the
 * field is empty. ↓/↑ move through the list, Enter picks, Escape closes the list then clears the field.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  suggestions = [],
  onPickSuggestion,
  historyKey,
  size = "lg",
  submitButton = true,
  autoFocus,
  className,
  ref,
}: SearchBarProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const history = useLocalStorageList(`wrapfit:search:${historyKey ?? "none"}`, 5);
  const blurTimer = useRef<number | undefined>(undefined);

  const showingHistory = Boolean(historyKey) && value.trim() === "" && history.items.length > 0;
  const options: SearchSuggestion[] = showingHistory
    ? history.items.map((item) => ({ id: `h-${item}`, label: item }))
    : value.trim()
      ? suggestions.slice(0, 8)
      : [];
  const listOpen = open && options.length > 0;

  const submit = (query: string) => {
    const trimmed = query.trim();
    if (historyKey && trimmed) history.add(trimmed);
    setOpen(false);
    setActive(-1);
    onSubmit(trimmed);
  };

  const pick = (option: SearchSuggestion) => {
    if (showingHistory) {
      onChange(option.label);
      submit(option.label);
      return;
    }
    if (historyKey) history.add(option.label);
    setOpen(false);
    if (onPickSuggestion) onPickSuggestion(option);
    else {
      onChange(option.label);
      submit(option.label);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === "Enter" && listOpen && active >= 0) {
      event.preventDefault();
      pick(options[active]);
    } else if (event.key === "Escape") {
      if (listOpen) setOpen(false);
      else if (value) onChange("");
    }
  };

  return (
    <form
      role="search"
      className={cn("relative w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-full bg-surface-raised pl-4 pr-1.5 ring-1 ring-line-strong/60 transition-shadow focus-within:ring-[3px] focus-within:ring-focus/30",
          size === "lg" ? "h-14" : "h-control-lg",
        )}
      >
        <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
        <input
          ref={ref}
          type="search"
          role="combobox"
          aria-label={label}
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={listOpen && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Xoá nội dung tìm"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted outline-none hover:bg-surface-sunken hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus/40"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        {submitButton && (
          <button
            type="submit"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-action px-4 text-label font-semibold text-action-fg outline-none transition-colors hover:bg-action-hover focus-visible:ring-[3px] focus-visible:ring-focus/40",
              size === "lg" ? "h-11" : "h-control-sm",
            )}
          >
            <span className="hidden sm:inline">Tìm</span>
            <ArrowRight className="size-4 sm:hidden" aria-hidden />
            <span className="sr-only sm:hidden">Tìm</span>
          </button>
        )}
      </div>

      {listOpen && (
        <div
          className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-panel border border-line bg-surface-raised p-1.5 shadow-popover animate-pop-in"
          onMouseDown={() => window.clearTimeout(blurTimer.current)}
        >
          {showingHistory && (
            <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5">
              <span className="text-overline uppercase text-fg-muted">Tìm gần đây</span>
              <button type="button" onClick={history.clear} className="rounded-md px-1.5 text-caption font-semibold text-fg-muted hover:text-fg">
                Xoá lịch sử
              </button>
            </div>
          )}
          <ul id={listId} role="listbox" aria-label={showingHistory ? "Tìm gần đây" : "Gợi ý"}>
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(option)}
                className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-fg", index === active && "bg-surface-sunken")}
              >
                {showingHistory ? <Clock className="size-4 shrink-0 text-fg-muted" aria-hidden /> : <Search className="size-4 shrink-0 text-fg-muted" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint && <span className="shrink-0 text-caption text-fg-muted">{option.hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
