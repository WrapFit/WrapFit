"use client";

import React, { useState } from "react";
import { BoxPreview } from "@/features/templates/components/BoxPreview";
import type { ProjectSummary } from "@/types/api";

/**
 * Preview image of a project (rendered by the editor, `thumbnailUrl`), or a sketch of its box at its own L × W × H
 * until the editor has saved one. Never a stock photo: the card must not suggest a design the user did not make.
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
    <BoxPreview
      structure={project.template.id}
      dimensions={project.dimensions}
      material={project.materialSpec?.type}
      label={`${project.title}: chưa có ảnh xem trước, phác thảo hộp`}
      className={className}
    />
  );
}
