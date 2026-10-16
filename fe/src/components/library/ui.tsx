"use client";

import type { BoxDimensions, BoxStructureType, MaterialSpecification } from "@wrapfit/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { DesignThumb, DielineSketch } from "@/features/templates";
import { buttonClass, Skeleton } from "@/components/ui";
import { cn } from "@/utils/helpers";

// Building blocks of the template library and the shared design page, after pacdora.com (grey tiles with a black
// hairline, the flat dieline next to the box, small white tags, numbered pages) in the green of pack.ly.

/** Main call to action: Pacdora's button shape in the lime of pack.ly (shared Button, rounded shape). */
export const primaryButton = buttonClass({ variant: "dark", shape: "rounded", className: "px-4 text-body font-medium" });
/** "Tạo hộp mới" of the workspace pages: black, bold. */
export const createBoxButton = buttonClass({ variant: "dark", shape: "rounded", className: "px-4 text-body font-bold" });

/** White button with a black hairline (Pacdora's secondary button; shared Button, outline variant). */
export const outlineButton = buttonClass({ variant: "outline", shape: "rounded", className: "px-4 text-body font-medium" });

export interface LibraryCardProps {
  href: string;
  title: string;
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification | null;
  thumbnailUrl: string | null;
  tags: string[];
  color?: string;
  /** Read by screen readers instead of the title alone. */
  label?: string;
}

/** A design of the library: its flat dieline on the left, the box on the right, tags in the corner, title below. */
export function LibraryCard({
  href,
  title,
  structure,
  dimensions,
  materialSpec,
  thumbnailUrl,
  tags,
  color,
  label,
}: LibraryCardProps) {
  return (
    <Link href={href} aria-label={label ?? title} className="group block outline-none">
      <div className="relative aspect-[321/201] overflow-hidden rounded-2xl border border-library-ink bg-library-tile transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-hard-sm group-focus-visible:shadow-hard-sm group-focus-visible:ring-[3px] group-focus-visible:ring-focus/50 motion-reduce:transition-none">
        <div className="absolute inset-0 grid grid-cols-2">
          <div className="flex items-center justify-center p-3 pr-1.5">
            <DielineSketch
              structure={structure}
              dimensions={dimensions}
              paper={materialSpec?.type === "kraft" ? "#EFE7DC" : materialSpec?.type === "duplex" ? "#F5F3EF" : "#FFFFFF"}
              className="max-h-full w-full"
            />
          </div>
          <div className="flex items-center justify-center p-3 pl-1.5 pt-6">
            <DesignThumb
              thumbnailUrl={thumbnailUrl}
              structure={structure}
              dimensions={dimensions}
              materialSpec={materialSpec}
              color={color}
              alt=""
              className="drop-shadow-[0_8px_12px_rgba(0,0,0,0.16)]"
            />
          </div>
        </div>
        {tags.length > 0 && (
          <ul className="absolute top-2.5 right-2.5 flex gap-1">
            {tags.map((tag) => (
              <li key={tag} className="rounded-md bg-white/95 backdrop-blur-sm px-2 py-0.5 text-caption font-medium leading-4 text-library-ink border border-black/10 shadow-sm">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2.5 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-1.5">
          <p className="line-clamp-1 text-sm font-medium text-library-ink transition-colors group-hover:text-fpt-orange">
            {title}
          </p>
          {color && (
            <span
              aria-hidden
              className="size-3.5 shrink-0 rounded-full border border-black/20 shadow-sm mt-0.5"
              style={{ backgroundColor: color }}
              title="Màu sắc chủ đạo"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-caption text-library-muted">
          <span className="font-mono text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/80">
            {dimensions.length} × {dimensions.width} × {dimensions.height} mm
          </span>
          {materialSpec && (
            <span className="capitalize text-stone-500 font-medium">
              · {materialSpec.type} {materialSpec.gsm} GSM
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function LibraryCardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[321/201] rounded-2xl" />
      <Skeleton shape="text" className="mt-3 h-4 w-2/3" />
    </div>
  );
}

/** Pages to show: first, last, and two around the current one, with gaps as null. */
function pageList(page: number, total: number): (number | null)[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null);
    result.push(sorted[i]);
  }
  return result;
}

export function Pagination({ page, totalPages, busy, onPage }: { page: number; totalPages: number; busy?: boolean; onPage(next: number): void }) {
  if (totalPages <= 1) return null;
  const list = pageList(page, totalPages);
  return (
    <nav aria-label="Phân trang" className="flex items-center gap-1">
      <button
        type="button"
        disabled={page <= 1 || busy}
        onClick={() => onPage(page - 1)}
        aria-label="Trang trước"
        className={cn(outlineButton, "h-9 w-9 p-0 disabled:opacity-40")}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {list.map((item, index) =>
        item === null ? (
          <span key={`gap-${index}`} className="px-2 text-library-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            disabled={busy}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPage(item)}
            className={cn(
              "h-9 min-w-[36px] rounded-full border px-3 text-sm font-medium transition-colors",
              item === page ? "border-library-ink bg-library-ink text-white" : "border-library-line bg-white text-library-ink hover:border-library-ink"
            )}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= totalPages || busy}
        onClick={() => onPage(page + 1)}
        aria-label="Trang sau"
        className={cn(outlineButton, "h-9 w-9 p-0 disabled:opacity-40")}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
