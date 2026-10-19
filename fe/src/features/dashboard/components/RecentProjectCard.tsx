"use client";

import Link from "next/link";
import React from "react";
import { Skeleton } from "@/components/ui";
import { ROUTES } from "@/constants";
import { usePrefetchStudio } from "@/hooks/data";
import type { ProjectSummary } from "@/types/api";
import { formatRelative, materialLabel } from "../format";
import { ProjectTile } from "./ProjectCard";

/** A recently edited project on the dashboard home: its tile opens the studio. */
export function RecentProjectCard({ project }: { project: ProjectSummary }) {
  const prefetch = usePrefetchStudio();
  return (
    <Link href={ROUTES.editor(project.id)} {...prefetch(project.id)} className="group block outline-none" aria-label={`Mở “${project.title}” trong studio`}>
      <div className="rounded-2xl transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-hard-sm group-focus-visible:shadow-hard-sm group-focus-visible:ring-[3px] group-focus-visible:ring-focus/50 motion-reduce:transition-none">
        <ProjectTile project={project} />
      </div>
      <p title={project.title} className="mt-3 truncate text-base text-library-ink">
        {project.title}
      </p>
      <p className="truncate text-sm text-library-muted">
        {project.template.name} · {materialLabel(project)} · Sửa {formatRelative(project.updatedAt)}
      </p>
    </Link>
  );
}

/** Placeholder of a recent project card while the list loads. */
export function RecentProjectSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[321/201] rounded-2xl bg-library-tile" />
      <Skeleton shape="text" className="mt-3 h-4 w-2/3 bg-library-tile" />
      <Skeleton shape="text" className="mt-2 h-3 w-1/2 bg-library-tile" />
    </div>
  );
}
