"use client";

import React, { useState } from "react";
import type { ProjectSummary } from "@/types/api";

/**
 * Preview image of a project (rendered by the editor, `thumbnailUrl`), or a flat dieline sketch on kraft until the
 * editor has saved one. Never a stock photo: the card must not suggest a design the user did not make.
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
      <svg viewBox="0 0 120 90" className="w-3/5 max-w-[180px] h-auto" aria-hidden="true" fill="none">
        {/* Cut line (solid red) and crease lines (dashed blue) of a tuck box net, as on a real dieline. */}
        <path
          d="M6 30V14l4-2h22l4 2v16h78v30H90v16l-4 2H64l-4-2V60H6z"
          stroke="#E53E3E"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M36 30v30M60 30v30M90 30v30M6 30h30M60 60h30" stroke="#3182CE" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
      <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider text-[#6b5238]">
        Chưa có ảnh xem trước
      </span>
    </div>
  );
}
