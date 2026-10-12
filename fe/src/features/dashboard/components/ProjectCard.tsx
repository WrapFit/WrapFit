"use client";

import Link from "next/link";
import React from "react";
import { ROUTES } from "@/constants";
import type { ProjectStatus, ProjectSummary } from "@/types/api";
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

/** Badge colours of the `dashboard-projects` screen tokens. */
const BADGE: Record<FitCheckTone | "trash", { badge: string; dot: string }> = {
  pass: { badge: "bg-secondary-container text-on-secondary-container", dot: "bg-secondary" },
  warn: { badge: "bg-tertiary-fixed text-on-tertiary-fixed-variant", dot: "bg-tertiary" },
  fail: { badge: "bg-error-container text-on-error-container", dot: "bg-error" },
  unchecked: { badge: "bg-surface-container-high text-on-surface-variant", dot: "bg-outline" },
  trash: { badge: "bg-error-container text-on-error-container", dot: "bg-error" },
};

const SECONDARY_BUTTON =
  "min-h-[44px] py-2 px-space-sm rounded-lg bg-surface-container-low text-on-surface font-label-ui text-label-ui enabled:hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-wait";
const ICON_BUTTON =
  "min-h-[44px] min-w-[44px] py-2 px-3 rounded-lg bg-surface-container-low font-cad-dimension text-cad-dimension enabled:hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-wait";

/** One project of the grid: card markup of the Stitch screen `dashboard-projects`, actions by status. */
export function ProjectCard({
  project,
  busy,
  onChangeStatus,
  onDuplicate,
  onMove,
  onDeletePermanently,
}: ProjectCardProps) {
  const inTrash = project.status === "DELETED";
  const tone = inTrash ? BADGE.trash : BADGE[fitCheckTone(project.fitcheckScore)];

  const menu: MenuAction[] = [
    { id: "duplicate", label: "Nhân bản", icon: "content_copy", onSelect: () => onDuplicate(project) },
    { id: "move", label: "Chuyển thư mục…", icon: "drive_file_move", onSelect: () => onMove(project) },
    project.status === "ARCHIVED"
      ? { id: "unarchive", label: "Bỏ lưu trữ", icon: "unarchive", onSelect: () => onChangeStatus(project, "ACTIVE") }
      : { id: "archive", label: "Lưu trữ", icon: "inventory_2", onSelect: () => onChangeStatus(project, "ARCHIVED") },
    {
      id: "trash",
      label: "Chuyển vào thùng rác",
      icon: "delete",
      tone: "danger",
      onSelect: () => onChangeStatus(project, "DELETED"),
    },
  ];

  return (
    <article
      aria-busy={busy}
      className={`group flex flex-col rounded-2xl bg-surface-container-lowest p-space-md shadow-sm hover:shadow-xl transition-all duration-300 ${
        busy ? "opacity-70" : ""
      }`}
    >
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-low mb-space-md">
        <ProjectThumb
          project={project}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className={`absolute top-3 left-3 flex items-center gap-1.5 px-space-sm py-1 rounded-full ${tone.badge} font-cad-spec-micro text-cad-spec-micro shadow-sm backdrop-blur-md`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
          {inTrash ? purgeLabel(project.deletedAt) : fitCheckLabel(project.fitcheckScore)}
        </div>
        {project.status === "ARCHIVED" && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-lowest/90 text-on-surface-variant font-cad-spec-micro text-cad-spec-micro shadow-sm backdrop-blur-md">
            <span aria-hidden="true" className="material-symbols-outlined text-sm leading-none">
              inventory_2
            </span>
            Lưu trữ
          </div>
        )}
        <div className="absolute bottom-3 right-3 font-cad-dimension text-cad-dimension bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface px-space-sm py-0.5 rounded-md shadow-sm">
          {dimensionsLabel(project)}
        </div>
      </div>
      <div className="flex flex-col flex-1 justify-between gap-space-md">
        <div className="min-w-0">
          <h3
            title={project.title}
            className="font-headline-sm text-headline-sm text-on-surface tracking-tight group-hover:text-primary transition-colors truncate"
          >
            {project.title}
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{project.template.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-cad-spec-micro text-cad-spec-micro text-on-surface-variant">
            <span>{materialLabel(project)}</span>
            {project.collection && (
              <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.collection.colorTag ?? "#D4A373" }}
                />
                <span className="truncate">{project.collection.title}</span>
              </span>
            )}
            <span>
              {inTrash && project.deletedAt
                ? `Xoá ${formatRelative(project.deletedAt)}`
                : `Sửa ${formatRelative(project.updatedAt)}`}
            </span>
          </div>
        </div>
        <div className="pt-space-sm flex items-center justify-between gap-space-sm">
          {inTrash ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onChangeStatus(project, "ACTIVE")}
                className={`flex-1 ${SECONDARY_BUTTON}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  restore_from_trash
                </span>
                <span>Khôi phục</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDeletePermanently(project)}
                aria-label={`Xoá vĩnh viễn “${project.title}”`}
                className={`${ICON_BUTTON} text-error`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  delete_forever
                </span>
                <span>Xoá</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href={ROUTES.editor(project.id)}
                aria-disabled={busy}
                tabIndex={busy ? -1 : undefined}
                className={`flex-1 ${SECONDARY_BUTTON} hover:bg-surface-container-high ${busy ? "pointer-events-none opacity-50" : ""}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  view_in_ar
                </span>
                <span>Mở 3D Studio</span>
              </Link>
              <ProjectActionsMenu projectTitle={project.title} actions={menu} disabled={busy} className={`${ICON_BUTTON} text-on-surface`} />
            </>
          )}
        </div>
      </div>
    </article>
  );
}
