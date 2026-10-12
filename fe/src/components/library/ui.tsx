"use client";

import type { BoxDimensions, BoxStructureType, MaterialSpecification } from "@wrapfit/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { DesignThumb, DielineSketch } from "@/features/templates";
import { cn } from "@/utils/helpers";

// Building blocks of the template library and the shared design page, after pacdora.com (grey tiles with a black
// hairline, the flat dieline next to the box, small white tags, numbered pages) in the green of pack.ly.

/** Main call to action: Pacdora's button shape in the lime of pack.ly. */
export const primaryButton =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-library-lime px-4 text-base font-medium text-library-lime-ink transition-colors hover:bg-[#AFEC88] outline-none focus-visible:ring-[3px] focus-visible:ring-library-accent/40 disabled:cursor-wait disabled:opacity-60";

/** White button with a black hairline (Pacdora's secondary button). */
export const outlineButton =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-library-ink bg-white px-4 text-base font-medium text-library-ink transition-colors hover:bg-library-panel outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 disabled:cursor-wait disabled:opacity-60";

export interface LibraryCardProps {
  href: string;
  title: string;
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification | null;
  thumbnailUrl: string | null;
  tags: string[];
  /** Read by screen readers instead of the title alone. */
  label?: string;
}

/** A design of the library: its flat dieline on the left, the box on the right, tags in the corner, title below. */
export function LibraryCard({ href, title, structure, dimensions, materialSpec, thumbnailUrl, tags, label }: LibraryCardProps) {
  return (
    <Link href={href} aria-label={label ?? title} className="group block outline-none">
      <div className="relative aspect-[321/201] overflow-hidden rounded-2xl border border-library-ink bg-library-tile transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-hard-sm group-focus-visible:shadow-hard-sm motion-reduce:transition-none">
        <div className="absolute inset-0 grid grid-cols-2">
          <div className="flex items-center justify-center p-4 pr-2">
            <DielineSketch structure={structure} dimensions={dimensions} className="max-h-full w-full" />
          </div>
          <div className="flex items-center justify-center p-4 pl-2 pt-10">
            <DesignThumb
              thumbnailUrl={thumbnailUrl}
              structure={structure}
              dimensions={dimensions}
              materialSpec={materialSpec}
              alt=""
              className="drop-shadow-[0_8px_10px_rgba(0,0,0,0.12)]"
            />
          </div>
        </div>
        {tags.length > 0 && (
          <ul className="absolute top-3 right-3 flex gap-1.5">
            {tags.map((tag) => (
              <li key={tag} className="rounded-md bg-white px-1.5 py-1.5 text-xs leading-3 text-library-muted">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 line-clamp-2 text-base leading-5 text-library-muted transition-colors group-hover:text-library-ink">{title}</p>
    </Link>
  );
}

export function LibraryCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="aspect-[321/201] animate-pulse rounded-2xl bg-library-tile motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-library-tile motion-reduce:animate-none" />
    </div>
  );
}

/** Pages to show: first, last, and two around the current one, with gaps as null. */
function pageList(page: number, total: number): (number | null)[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  if (page <= 3) [2, 3, 4].forEach((p) => p <= total && pages.add(p));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

/** Numbered pages in small bordered squares, the current one in black. */
export function Pagination({
  page,
  totalPages,
  busy,
  onPage,
}: {
  page: number;
  totalPages: number;
  busy: boolean;
  onPage(page: number): void;
}) {
  if (totalPages <= 1) return null;
  const box =
    "inline-flex size-9 items-center justify-center rounded-md border border-library-ink text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Phân trang" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={cn(box, "bg-white hover:bg-library-panel")} disabled={page <= 1 || busy} onClick={() => onPage(page - 1)} aria-label="Trang trước">
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pageList(page, totalPages).map((p, index) =>
        p === null ? (
          <span key={`gap-${index}`} className={cn(box, "border-library-line text-library-muted")} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            disabled={busy && p !== page}
            onClick={() => p !== page && onPage(p)}
            className={cn(box, p === page ? "border-library-lime-ink bg-library-lime-ink font-medium text-white" : "bg-white text-library-ink hover:bg-library-panel")}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className={cn(box, "bg-white hover:bg-library-panel")} disabled={page >= totalPages || busy} onClick={() => onPage(page + 1)} aria-label="Trang sau">
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
