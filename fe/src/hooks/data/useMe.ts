"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/auth";
import { isApiError } from "@/services/api";
import type { SafeUser } from "@/types/api";
import { DEMO_USER } from "@/features/dashboard/demoData";
import { queryKeys } from "./queryKeys";

/**
 * The signed-in user: `null` when nobody is signed in (401), an error only when the API cannot answer.
 * In Demo Mode, defaults to `DEMO_USER` unless the user explicitly chose to log out in this session.
 */
export function useMe() {
  return useQuery<SafeUser | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        const user = await getCurrentUser();
        if (user) return user;
      } catch {
        // Backend not reachable, network error or 401
      }
      if (typeof window !== "undefined" && window.sessionStorage?.getItem("wrapfit_demo_logged_out") === "1") {
        return null;
      }
      return DEMO_USER;
    },
    staleTime: 5 * 60_000,
  });
}
