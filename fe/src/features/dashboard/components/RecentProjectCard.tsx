"use client";

import Link from "next/link";
import React from "react";
import { ROUTES } from "@/constants";
import type { ProjectSummary } from "@/types/api";
import {
  dimensionsLabel,
  fitCheckLabel,
  fitCheckTone,
  formatRelative,
  materialLabel,
  type FitCheckTone,
} from "../format";
import { ProjectThumb } from "./ProjectThumb";

/** Hex colours: the `dashboard` screen leaves the app tokens unset. */
const TONES: Record<FitCheckTone, { text: string; dot: string; icon: string }> = {
  pass: { text: "text-emerald-800", dot: "bg-emerald-500", icon: "text-emerald-700" },
  warn: { text: "text-amber-800", dot: "bg-amber-500", icon: "text-amber-600" },
  fail: { text: "text-red-700", dot: "bg-red-500", icon: "text-red-600" },
  unchecked: { text: "text-stone-600", dot: "bg-stone-400", icon: "text-stone-500" },
};

/** A recently edited project on the dashboard home (card markup of the hand-edited `dashboard` screen). */
export function RecentProjectCard({ project }: { project: ProjectSummary }) {
  const tone = TONES[fitCheckTone(project.fitcheckScore)];
  const href = ROUTES.editor(project.id);

  return (
    <article className="group bg-white rounded-3xl p-4 border border-[#e8ded0]/80 shadow-soft hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
      <div>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 mb-3.5">
          <ProjectThumb
            project={project}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div
            className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold ${tone.text} font-['JetBrains_Mono'] flex items-center gap-1 shadow-2xs`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
            <span>{fitCheckLabel(project.fitcheckScore)}</span>
          </div>
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-mono">
            {dimensionsLabel(project)}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] font-['JetBrains_Mono'] text-stone-500">
            <span className="truncate">{project.template.name}</span>
            <span className="shrink-0">{materialLabel(project)}</span>
          </div>
          <h3
            title={project.title}
            className="font-['Playfair_Display'] text-base font-bold text-[#122e20] group-hover:text-blue-700 transition-colors truncate"
          >
            {project.title}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-1">
            {project.collection ? `${project.collection.title} · ` : ""}Sửa {formatRelative(project.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-2">
        <Link
          href={href}
          className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-stone-100 hover:bg-[#122e20] hover:text-white text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#122e20]/40"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
            view_in_ar
          </span>
          <span>Mở 3D</span>
        </Link>
        <Link
          href={href}
          aria-label={`Xem FitCheck™ của “${project.title}” trong 3D Studio`}
          title={fitCheckLabel(project.fitcheckScore)}
          className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#122e20]/40"
        >
          <span aria-hidden="true" className={`material-symbols-outlined text-[17px] ${tone.icon}`}>
            verified
          </span>
        </Link>
      </div>
    </article>
  );
}

/** Placeholder of a recent project card while the list loads. */
export function RecentProjectSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-3xl p-4 border border-[#e8ded0]/80 shadow-soft flex flex-col gap-3.5"
    >
      <div className="aspect-[4/3] rounded-2xl bg-stone-100 animate-pulse motion-reduce:animate-none" />
      <div className="h-3 w-2/3 rounded-full bg-stone-100 animate-pulse motion-reduce:animate-none" />
      <div className="h-4 w-4/5 rounded-full bg-stone-200/70 animate-pulse motion-reduce:animate-none" />
      <div className="mt-2 h-11 rounded-xl bg-stone-100 animate-pulse motion-reduce:animate-none" />
    </div>
  );
}
