"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/auth";
import { isApiError } from "@/services/api";
import type { SafeUser } from "@/types/api";
import { queryKeys } from "./queryKeys";

/**
 * The signed-in user: `null` when nobody is signed in (401), an error only when the API cannot answer.
 * Read it through `useAuth()` in components; this hook is the cache entry behind it.
 */
export function useMe() {
  return useQuery<SafeUser | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await getCurrentUser();
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}
