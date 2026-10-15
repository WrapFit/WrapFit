import React from "react";
import type { BlogPost } from "@/features/site/blog";
import { cn } from "@/utils/helpers";

/** Cover of an article: its photo, filling the frame. */
export function BlogCover({ post, className }: { post: BlogPost; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-landing-tile", className)}>
      <img src={post.cover.src} alt={post.cover.alt} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
    </div>
  );
}
