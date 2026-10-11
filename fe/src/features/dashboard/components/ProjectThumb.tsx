"use client";

import React, { useState } from "react";
import { BoxPreview } from "@/features/templates";
import type { ProjectSummary } from "@/types/api";

/**
 * Preview image of a project (rendered by the editor, `thumbnailUrl`), or a sketch of its box until the editor has
 * saved one. Never a stock photo: the card must not suggest a design the user did not make.
 */
export function ProjectThumb({ project, className }: { project: ProjectSummary; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (project.thumbnailUrl && project.thumbnailUrl !== failedUrl) {
    return (
      <img
        src={project.thumbnailUrl}
        alt={`Ảnh xem trước của ${project.title}`}
        loading="lazy"
        onError={() => setFailedUrl(project.thumbnailUrl)}
        className={className}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${project.title}: chưa có ảnh xem trước`}
      className={`${className} flex flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#FAF6EE_0%,#E8D8C8_100%)]`}
    >
      {/* Sketch of this structure at its own L × W × H, on its paper (the same drawing as the template library). */}
      <BoxPreview
        structure={project.template.id}
        dimensions={project.dimensions}
        material={project.materialSpec?.type}
        className="w-3/5 max-w-[200px] h-auto"
      />
      <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider text-[#6b5238]">
        Chưa có ảnh xem trước
      </span>
    </div>
  );
}
