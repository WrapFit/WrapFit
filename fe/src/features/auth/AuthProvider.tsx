"use client";

import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import * as authApi from "@/api/auth";
import { useToast } from "@/components/common/Toast";
import { queryKeys, useMe } from "@/hooks/data";
import { SESSION_EXPIRED_EVENT } from "@/services/api";
import type { SafeUser } from "@/types/api";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export interface AuthContextValue {
  user: SafeUser | null;
  /** "error" = the API could not tell who is signed in (offline, server down): offer a retry. */
  status: AuthStatus;
  error: unknown;
  /** True while the API is being asked who is signed in (e.g. a retry after an error). */
  isChecking: boolean;
  /** Call after a successful `login()`: stores the user without asking the API again. */
  signedIn(user: SafeUser): void;
  /** Signs out this browser. Never fails: the local session is cleared even when the API cannot be reached. */
  logout(): Promise<void>;
  /** Signs out every device; throws when the API refuses. */
  logoutAll(): Promise<void>;
  /** Reloads the user (after a profile change, for example). */
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Cached data anyone may see; everything else belongs to the signed-in user and is dropped when the user changes. */
const PUBLIC_QUERY_ROOTS = new Set(["templates"]);

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}

/** Who is signed in, from `GET /auth/me`. The session itself lives in HttpOnly cookies. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const me = useMe();
  // A refetch clears `me.error`: keep the last one to show while retrying.
  const lastError = useRef<unknown>(null);
  useEffect(() => {
    if (me.error) lastError.current = me.error;
  }, [me.error]);

  const setUser = useCallback(
    (user: SafeUser | null) => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== queryKeys.me[0] && !PUBLIC_QUERY_ROOTS.has(String(query.queryKey[0])),
      });
      queryClient.setQueryData(queryKeys.me, user);
    },
    [queryClient],
  );

  // The API client fires this when a 401 survives the refresh: the session is over (expired, signed out elsewhere).
  useEffect(() => {
    const onSessionExpired = () => {
      const wasSignedIn = queryClient.getQueryData(queryKeys.me) != null;
      if (!wasSignedIn) {
        // A guest stays a guest (every page load of a guest ends here): keep the cache. Removing a query also cancels
        // its fetch, and a page still waiting for it (a gift opened from a QR code) would show its loader forever.
        queryClient.setQueryData(queryKeys.me, null);
        return;
      }
      setUser(null);
      toast.show({ tone: "info", title: "Phiên đăng nhập đã hết hạn", description: "Hãy đăng nhập lại để tiếp tục." });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [queryClient, setUser, toast]);

  const value = useMemo<AuthContextValue>(() => {
    const user = me.data ?? null;
    let status: AuthStatus = user ? "authenticated" : "anonymous";
    // A refetch without data puts the query back to "pending" (React Query v5): once it has failed, keep showing the
    // error during retries (window focus, the retry button) instead of flashing the loader.
    if (me.data === undefined) status = me.isError || me.errorUpdateCount > 0 ? "error" : "loading";

    return {
      user,
      status,
      error: me.error ?? (status === "error" ? lastError.current : null),
      isChecking: me.isFetching,
      signedIn: (signedInUser) => setUser(signedInUser),
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // The cookies may survive on the server side; the next request will be anonymous anyway.
        }
        setUser(null);
      },
      logoutAll: async () => {
        await authApi.logoutAll();
        setUser(null);
      },
      refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
    };
  }, [me.data, me.error, me.errorUpdateCount, me.isError, me.isFetching, queryClient, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
