/** Box structures and the template hub (`be/src/templates`), public. Answers are cached for 60 seconds. */

import { request } from "@/services/api";
import type { BoxStructure, CommunityCard, CuratedCard, HubQuery, Paginated, TemplateDetail } from "@/types/api";

/** The 4 box structures with the allowed size of each dimension (validate forms before sending). */
export function listBoxStructures(): Promise<BoxStructure[]> {
  return request("/templates/structures");
}

/** WrapFit designs, opened by `id`. */
export function listCuratedTemplates(query: Omit<HubQuery, "section"> = {}): Promise<Paginated<CuratedCard>> {
  return request("/templates/hub", { query: { ...query, section: "curated" } });
}

/** PUBLIC community projects with FitCheck ≥ 90, most liked first; opened by `slug`. */
export function listCommunityTemplates(query: Omit<HubQuery, "section"> = {}): Promise<Paginated<CommunityCard>> {
  return request("/templates/hub", { query: { ...query, section: "community" } });
}

/** A curated design with its canvas, to start a project from it (`createProject({ designTemplateId })`). */
export function getTemplate(id: string): Promise<TemplateDetail> {
  return request(`/templates/${id}`);
}
