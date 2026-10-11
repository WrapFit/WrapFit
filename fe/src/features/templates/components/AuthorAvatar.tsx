"use client";

import React, { useState } from "react";
import type { PublicAuthor } from "@/types/api";
import { authorName } from "../labels";

const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" } as const;

/** Avatar of a design's author: the uploaded / Google picture, otherwise the first letter of the name. */
export function AuthorAvatar({ author, size = "sm" }: { author: PublicAuthor; size?: keyof typeof SIZES }) {
  const [broken, setBroken] = useState(false);
  const name = authorName(author);
  const box = `${SIZES[size]} shrink-0 rounded-full border border-white/80 shadow-tactile`;

  if (author.avatarUrl && !broken) {
    return (
      // Plain <img>: avatars live on storage or Google, outside next/image.
      <img
        src={author.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${box} object-cover`}
      />
    );
  }
  return (
    <span aria-hidden className={`${box} flex items-center justify-center bg-brand-forest font-serif font-semibold text-paper-ivory`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
