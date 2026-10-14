"use client";

import React from "react";
import { cn } from "@/utils/helpers";

export interface WaitlistSkeletonProps {
  className?: string;
  /** Number of rows inside the list card, defaults to 5 matching the reference design */
  rowCount?: number;
}

/**
 * WaitlistSkeleton: High-fidelity skeleton loader matching the user's reference design.
 * Structure:
 * 1. Top Header Area:
 *    - Squircle Icon placeholder (48px)
 *    - Title bar placeholder (wide rounded bar)
 *    - Subtitle / divider bar placeholder (long thin bar)
 *    - Pill button placeholder (rounded-full)
 * 2. Bottom Card:
 *    - Rounded rectangular card with subtle border & shadow
 *    - 5 rows divided by light borders, each row with a squircle icon and 2 text lines
 * 3. Gradient Shimmer Animation: Smooth light-sweep effect.
 */
export function WaitlistSkeleton({ className, rowCount = 5 }: WaitlistSkeletonProps) {
  return (
    <div
      className={cn("w-full max-w-xl flex flex-col gap-6", className)}
      aria-label="Đang tải danh sách chờ..."
      role="status"
    >
      {/* Top Header Placeholder */}
      <div className="flex flex-col gap-3">
        {/* Row with Icon + Title Bar */}
        <div className="flex items-center gap-3">
          {/* Squircle Icon placeholder */}
          <div className="size-11 sm:size-12 shrink-0 rounded-2xl bg-stone-200/90 animate-shimmer" />
          {/* Title Bar placeholder */}
          <div className="h-7 w-44 sm:w-56 rounded-xl bg-stone-200/90 animate-shimmer" />
        </div>

        {/* Subtitle / Divider Line placeholder */}
        <div className="h-3.5 sm:h-4 w-60 sm:w-80 rounded-md bg-stone-200/70 animate-shimmer" />

        {/* Action Pill Button placeholder */}
        <div className="mt-1 h-9 sm:h-10 w-32 sm:w-36 rounded-full bg-stone-200/90 animate-shimmer" />
      </div>

      {/* Main Card with 5 Rows */}
      <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white shadow-soft-8 divide-y divide-stone-100">
        {Array.from({ length: rowCount }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3.5 p-3.5 sm:p-4">
            {/* Left squircle avatar/checkbox placeholder */}
            <div className="size-8 shrink-0 rounded-lg bg-stone-200/90 animate-shimmer" />

            {/* Right text lines placeholder */}
            <div className="flex flex-1 flex-col gap-2">
              <div
                className={cn(
                  "h-3.5 rounded bg-stone-200/90 animate-shimmer",
                  idx % 2 === 0 ? "w-3/5" : "w-4/6"
                )}
              />
              <div
                className={cn(
                  "h-2.5 rounded bg-stone-200/60 animate-shimmer",
                  idx % 2 === 0 ? "w-2/5" : "w-1/3"
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
