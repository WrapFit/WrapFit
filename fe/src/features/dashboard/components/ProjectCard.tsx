"use client";

import { ArchiveRestore, Box, Trash2 } from "lucide-react";
import Link from "next/link";
import React from "react";
import { ROUTES } from "@/constants";
import { DielineSketch } from "@/features/templates/components/DielineSketch";
import type { ProjectStatus, ProjectSummary } from "@/types/api";
import { cn } from "@/utils/helpers";
import {
  dimensionsLabel,
  fitCheckLabel,
  fitCheckTone,
  formatRelative,
  materialLabel,
  purgeLabel,
  type FitCheckTone,
} from "../format";
import { ProjectActionsMenu, type MenuAction } from "./ProjectActionsMenu";
import { ProjectThumb } from "./ProjectThumb";

export interface ProjectCardActions {
  onChangeStatus(project: ProjectSummary, status: ProjectStatus): void;
  onDuplicate(project: ProjectSummary): void;
  onMove(project: ProjectSummary): void;
  onDeletePermanently(project: ProjectSummary): void;
}

interface ProjectCardProps extends ProjectCardActions {
  project: ProjectSummary;
  /** An action on this project is running: its controls wait. */
  busy: boolean;
}

/** FitCheck tag colours. */
export const FITCHECK_TAG: Record<FitCheckTone, string> = {
  pass: "bg-fpt-orange-light text-fpt-orange-ink",
  warn: "bg-warning-bg text-warning-fg",
  fail: "bg-danger-bg text-danger-fg",
  unchecked: "bg-white text-library-muted",
};

const BUTTON =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-library-ink bg-white px-3 text-sm font-medium text-library-ink transition-colors hover:bg-library-panel outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 disabled:cursor-wait disabled:opacity-50";

/**
 * Grey tile of a project (its flat dieline and its box, as in the template library), tags, title and the actions
 * of its status.
 */
export function ProjectTile({ project, children }: { project: ProjectSummary; children?: React.ReactNode }) {
  const inTrash = project.status === "DELETED";
  return (
    <div className="relative aspect-[321/201] overflow-hidden rounded-2xl border border-library-ink bg-library-tile">
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="flex items-center justify-center p-4 pr-2">
          <DielineSketch
            structure={project.template.id}
            dimensions={project.dimensions}
            paper={project.materialSpec?.type === "kraft" ? "#EFE7DC" : project.materialSpec?.type === "duplex" ? "#F5F3EF" : "#FFFFFF"}
            className="max-h-full w-full"
          />
        </div>
        <div className="flex items-center justify-center p-3 pl-1 pt-9">
          <ProjectThumb project={project} className="h-full w-full object-contain" />
        </div>
      </div>
      <ul className="absolute top-3 right-3 flex flex-wrap justify-end gap-1.5">
        <li className={cn("rounded-md px-1.5 py-1.5 text-xs leading-3", inTrash ? "bg-danger-bg text-danger-fg" : FITCHECK_TAG[fitCheckTone(project.fitcheckScore)])}>
          {inTrash ? purgeLabel(project.deletedAt) : fitCheckLabel(project.fitcheckScore)}
        </li>
        {project.status === "ARCHIVED" && <li className="rounded-md bg-white px-1.5 py-1.5 text-xs leading-3 text-library-muted">Lưu trữ</li>}
      </ul>
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-white/95 px-2 py-1 font-mono text-cad-spec-micro text-library-sub border border-stone-200/80 shadow-xs backdrop-blur-sm">
        {project.color && (
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full border border-black/20"
            style={{ backgroundColor: project.color }}
          />
        )}
        <span>{dimensionsLabel(project)}</span>
      </div>
      {children}
    </div>
  );
}

/** One project of the grid. */
export function ProjectCard({ project, busy, onChangeStatus, onDuplicate, onMove, onDeletePermanently }: ProjectCardProps) {
  const inTrash = project.status === "DELETED";
  const menu: MenuAction[] = [
    { id: "duplicate", label: "Nhân bản", icon: "content_copy", onSelect: () => onDuplicate(project) },
    { id: "move", label: "Chuyển thư mục…", icon: "drive_file_move", onSelect: () => onMove(project) },
    project.status === "ARCHIVED"
      ? { id: "unarchive", label: "Bỏ lưu trữ", icon: "unarchive", onSelect: () => onChangeStatus(project, "ACTIVE") }
      : { id: "archive", label: "Lưu trữ", icon: "inventory_2", onSelect: () => onChangeStatus(project, "ARCHIVED") },
    { id: "trash", label: "Chuyển vào thùng rác", icon: "delete", tone: "danger", onSelect: () => onChangeStatus(project, "DELETED") },
  ];

  return (
    <article aria-busy={busy} className={cn("flex h-full flex-col gap-3", busy && "opacity-60")}>
      {inTrash ? (
        <ProjectTile project={project} />
      ) : (
        <Link href={ROUTES.editor(project.id)} aria-label={`Mở “${project.title}” trong studio`} className="group block rounded-2xl outline-none focus-visible:shadow-hard-sm">
          <div className="transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-hard-sm rounded-2xl motion-reduce:transition-none">
            <ProjectTile project={project} />
          </div>
        </Link>
      )}

      <div className="min-w-0">
        <h3 title={project.title} className="truncate text-base font-medium text-library-ink">
          {project.title}
        </h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-library-muted">
          <span>{project.template.name}</span>
          <span aria-hidden>·</span>
          <span>{materialLabel(project)}</span>
          {project.collection && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.collection.colorTag ?? "#98E665" }} />
                <span className="truncate">{project.collection.title}</span>
              </span>
            </>
          )}
        </p>
        <p className="text-xs text-library-muted">
          {inTrash && project.deletedAt ? `Xoá ${formatRelative(project.deletedAt)}` : `Sửa ${formatRelative(project.updatedAt)}`}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-2">
        {inTrash ? (
          <>
            <button type="button" disabled={busy} onClick={() => onChangeStatus(project, "ACTIVE")} className={cn(BUTTON, "flex-1")}>
              <ArchiveRestore className="size-4" aria-hidden />
              Khôi phục
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDeletePermanently(project)}
              aria-label={`Xoá vĩnh viễn “${project.title}”`}
              className={cn(BUTTON, "border-danger/30 text-danger-fg hover:bg-danger-bg")}
            >
              <Trash2 className="size-4" aria-hidden />
              Xoá
            </button>
          </>
        ) : (
          <>
            <Link
              href={ROUTES.editor(project.id)}
              aria-disabled={busy}
              tabIndex={busy ? -1 : undefined}
              className={cn(BUTTON, "flex-1 border-transparent bg-fpt-orange text-white hover:bg-action-hover", busy && "pointer-events-none")}
            >
              <Box className="size-4" aria-hidden />
              Mở studio
            </Link>
            <ProjectActionsMenu projectTitle={project.title} actions={menu} disabled={busy} className={cn(BUTTON, "w-10 px-0")} />
          </>
        )}
      </div>
    </article>
  );
}
