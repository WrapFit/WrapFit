"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { SearchBar } from "@/components/ui";
import { ROUTES } from "@/constants";
import { useSiteSearch } from "@/features/site/search";
import { cn } from "@/utils/helpers";

const PLACEHOLDER = "Tìm mẫu hộp, cấu trúc, câu hỏi…";

/**
 * Search of the site header. From lg a field sits in the bar; below, a magnifier opens a full-width field under it.
 * Picking a suggestion opens it; Enter opens the template library filtered by the words. "/" focuses the field.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { suggestions } = useSiteSearch(query);
  const desktopRef = useRef<HTMLInputElement>(null);

  // A new page starts with an empty, closed search.
  useEffect(() => {
    setQuery("");
    setMobileOpen(false);
  }, [pathname]);

  // "/" jumps to the search, as on most sites, unless the user is typing somewhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      if (window.matchMedia("(min-width: 1024px)").matches) desktopRef.current?.focus();
      else setMobileOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = (value: string) => {
    if (!value) return;
    router.push(`${ROUTES.templates}?q=${encodeURIComponent(value)}`);
  };
  const field = (autoFocus: boolean, ref?: React.Ref<HTMLInputElement>) => (
    <SearchBar
      ref={ref}
      size="md"
      submitButton={false}
      label="Tìm trong WrapFit"
      placeholder={PLACEHOLDER}
      value={query}
      onChange={setQuery}
      onSubmit={submit}
      suggestions={suggestions}
      onPickSuggestion={(suggestion) => (suggestion.href ? router.push(suggestion.href) : submit(suggestion.label))}
      historyKey="site"
      autoFocus={autoFocus}
    />
  );

  return (
    <>
      <div className={cn("hidden w-52 lg:block xl:w-56 2xl:w-80", className)}>{field(false, desktopRef)}</div>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
        aria-controls="header-search-mobile"
        aria-label={mobileOpen ? "Đóng tìm kiếm" : "Tìm kiếm"}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-landing-tile text-landing-ink outline-none transition-colors hover:bg-landing-accent focus-visible:ring-[3px] focus-visible:ring-focus/40 lg:hidden"
      >
        {mobileOpen ? <X className="size-[18px]" aria-hidden /> : <Search className="size-[18px]" strokeWidth={1.75} aria-hidden />}
      </button>
      {mobileOpen && (
        <div id="header-search-mobile" className="absolute inset-x-0 top-full border-b border-landing-line/60 bg-white px-4 py-3 shadow-soft-8 lg:hidden">
          {field(true)}
        </div>
      )}
    </>
  );
}
