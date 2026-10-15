"use client";

import React from "react";
import { Avatar } from "@/components/ui";
import type { PublicAuthor } from "@/types/api";
import { authorName } from "../labels";

const SIZES = { sm: "xs", md: "md", lg: "lg" } as const;

/** Avatar of a design's author: the shared Avatar (uploaded / Google picture, otherwise the initials). */
export function AuthorAvatar({ author, size = "sm" }: { author: PublicAuthor; size?: keyof typeof SIZES }) {
  return (
    <Avatar
      src={author.avatarUrl}
      name={authorName(author)}
      size={SIZES[size]}
      decorative
      fallbackClassName="bg-landing-green-night text-paper-ivory"
      className="shadow-tactile"
    />
  );
}
