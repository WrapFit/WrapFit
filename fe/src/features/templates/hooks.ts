"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listBoxStructures, listCommunityTemplates, listCuratedTemplates } from "@/api/templates";
import { queryKeys } from "@/hooks/data";
import type { HubQuery } from "@/types/api";

/** Filters and page of one hub section. */
export type HubFilters = Omit<HubQuery, "section">;

// The API caches the hub for 60 seconds: asking sooner returns the same answer.
const HUB_STALE_MS = 60_000;

/** "WrapFit Curated" designs. The previous page stays on screen while the next one loads. */
export function useCuratedTemplates(filters: HubFilters) {
  return useQuery({
    queryKey: queryKeys.templates.hub({ ...filters, section: "curated" }),
    queryFn: () => listCuratedTemplates(filters),
    placeholderData: keepPreviousData,
    staleTime: HUB_STALE_MS,
  });
}

/** PUBLIC community projects (FitCheck ≥ 90), most liked first. */
export function useCommunityTemplates(filters: HubFilters) {
  return useQuery({
    queryKey: queryKeys.templates.hub({ ...filters, section: "community" }),
    queryFn: () => listCommunityTemplates(filters),
    placeholderData: keepPreviousData,
    staleTime: HUB_STALE_MS,
  });
}

/** The box structures, for the structure filter. */
export function useBoxStructures() {
  return useQuery({
    queryKey: queryKeys.templates.structures,
    queryFn: listBoxStructures,
    staleTime: 10 * 60_000,
  });
}
