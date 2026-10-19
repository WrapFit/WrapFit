/** Box structures and the template hub (`be/src/templates`), public. Answers are cached for 60 seconds. */

import { request } from "@/services/api";
import type { BoxStructure, CommunityCard, CuratedCard, HubQuery, Paginated, TemplateDetail } from "@/types/api";
import {
  DEMO_BOX_STRUCTURES,
  filterCuratedTemplates,
  filterCommunityTemplates,
  paginateTemplates,
  getDemoTemplateDetail,
} from "@/features/templates/demoData";

/** The 4 box structures with the allowed size of each dimension (validate forms before sending). */
export function listBoxStructures(): Promise<BoxStructure[]> {
  return request<BoxStructure[]>("/templates/structures").catch(() => DEMO_BOX_STRUCTURES);
}

/** WrapFit designs, opened by `id`. */
export function listCuratedTemplates(query: Omit<HubQuery, "section"> = {}): Promise<Paginated<CuratedCard>> {
  return request<Paginated<CuratedCard>>("/templates/hub", { query: { ...query, section: "curated" } }).catch(() => {
    const items = filterCuratedTemplates(query);
    return paginateTemplates(items, query.page, query.limit);
  });
}

/** PUBLIC community projects with FitCheck ≥ 90, most liked first; opened by `slug`. */
export function listCommunityTemplates(query: Omit<HubQuery, "section"> = {}): Promise<Paginated<CommunityCard>> {
  return request<Paginated<CommunityCard>>("/templates/hub", { query: { ...query, section: "community" } }).catch(() => {
    const items = filterCommunityTemplates(query);
    return paginateTemplates(items, query.page, query.limit);
  });
}

/** A curated design with its canvas, to start a project from it (`createProject({ designTemplateId })`). */
export function getTemplate(id: string): Promise<TemplateDetail> {
  return request<TemplateDetail>(`/templates/${id}`).catch(() => {
    const demo = getDemoTemplateDetail(id);
    if (demo) return demo;
    throw new Error(`Template not found: ${id}`);
  });
}
