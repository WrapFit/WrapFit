"use client";

import React, { useState } from "react";
import { cn } from "@/utils/helpers";

const SIZES = {
  xs: "size-6 text-caption",
  sm: "size-8 text-label-sm",
  md: "size-10 text-label",
  lg: "size-12 text-body",
  xl: "size-24 text-heading-md",
} as const;

const STATUS = { online: "bg-success", away: "bg-warning", offline: "bg-fg-muted" } as const;

/** First letters of the first and last words: "Nguyễn Văn An" → "NA". */
export function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  /** Picture URL; the initials show when it is missing or fails to load. */
  src?: string | null;
  /** Person or shop name: alt text and initials. */
  name: string;
  size?: keyof typeof SIZES;
  /** Presence dot at the bottom-right corner. */
  status?: keyof typeof STATUS;
  /** Colours of the initials tile (default: deep green on lime mist). */
  fallbackClassName?: string;
  /** Hide from screen readers when the name is written next to it. */
  decorative?: boolean;
  className?: string;
}

/** Round picture of a person, falling back to their initials. One component for header, admin, authors, comments. */
export function Avatar({ src, name, size = "md", status, fallbackClassName, decorative = false, className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = Boolean(src) && src !== failed;
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {showImage ? (
        // Plain <img>: avatars live on our storage or Google, outside next/image.
        <img
          src={src!}
          alt={decorative ? "" : `Ảnh đại diện của ${name}`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(src!)}
          className={cn(SIZES[size], "rounded-full object-cover ring-1 ring-fg/10")}
        />
      ) : (
        <span
          role={decorative ? undefined : "img"}
          aria-label={decorative ? undefined : name}
          aria-hidden={decorative || undefined}
          className={cn(
            SIZES[size],
            "flex items-center justify-center rounded-full font-landing-heading font-bold",
            fallbackClassName ?? "bg-accent-bg text-accent-fg",
          )}
        >
          {initialsFrom(name)}
        </span>
      )}
      {status && (
        <span role="img" className={cn("absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-surface-raised", STATUS[status])} aria-label={status === "online" ? "Đang hoạt động" : undefined} />
      )}
    </span>
  );
}
