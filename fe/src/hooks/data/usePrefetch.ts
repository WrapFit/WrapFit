"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { getTemplate, listBoxStructures } from "@/api/templates";
import { ROUTES } from "@/constants";
import { loadStudioWorkspace } from "@/views/editor/studio/lazy";
import { queryKeys } from "./queryKeys";

/**
 * Prefetching on intent: when a card is hovered, focused or touched, the code and data of the page it opens start
 * loading, so the click lands on a ready page. Each target is fetched once per mount, and React Query skips
 * anything still fresh in the cache.
 */

/** Handlers to spread on a link: `<Link {...intent(id)} />`. */
export interface IntentHandlers {
  onPointerEnter(): void;
  onFocus(): void;
  onTouchStart(): void;
}

function useOnce(run: (id: string) => void) {
  const done = useRef(new Set<string>());
  const runRef = useRef(run);
  runRef.current = run;
  return useCallback((id: string): IntentHandlers => {
    const fire = () => {
      if (done.current.has(id)) return;
      done.current.add(id);
      runRef.current(id);
    };
    return { onPointerEnter: fire, onFocus: fire, onTouchStart: fire };
  }, []);
}

/** Library card → `/editor/new?template=<id>`: the template detail and the structures it is drawn with. */
export function usePrefetchTemplate() {
  const queryClient = useQueryClient();
  return useOnce((id) => {
    void queryClient.prefetchQuery({ queryKey: queryKeys.templates.detail(id), queryFn: () => getTemplate(id), retry: false });
    void queryClient.prefetchQuery({ queryKey: queryKeys.templates.structures, queryFn: listBoxStructures, staleTime: 5 * 60_000 });
  });
}

/**
 * Project card → `/editor/<id>`: the whole studio route (its 2D and 3D code) and the structures. The project itself is
 * not prefetched: the studio always reads it fresh from the server when it opens (a copy may be older than a save).
 */
export function usePrefetchStudio() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useOnce((id) => {
    router.prefetch(ROUTES.editor(id));
    // The editor chunk itself (dynamic import): the route prefetch above does not reach it.
    void loadStudioWorkspace().catch(() => undefined);
    void queryClient.prefetchQuery({ queryKey: queryKeys.templates.structures, queryFn: listBoxStructures, staleTime: 5 * 60_000 });
  });
}
