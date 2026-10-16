"use client";

import Link from "next/link";
import React from "react";
import { ROUTES } from "@/constants";
import type { ProjectSummary } from "@/types/api";
import { formatRelative, materialLabel } from "../format";
import { ProjectTile } from "./ProjectCard";

/** A recently edited project on the dashboard home: its tile opens the studio. */
export function RecentProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link href={ROUTES.editor(project.id)} className="group block outline-none" aria-label={`Mở “${project.title}” trong studio`}>
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
      <div className="aspect-[321/201] animate-pulse rounded-2xl bg-library-tile motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-library-tile motion-reduce:animate-none" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-library-tile motion-reduce:animate-none" />
    </div>
  );
}
