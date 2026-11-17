"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect } from "react";
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/api/notifications";
import { API_BASE_URL, OFFLINE_DEMO } from "@/config";
import { queryKeys } from "@/hooks/data";
import type { NotificationPage } from "@/types/api";

/** The badge is refreshed this often while the tab is visible, and when the tab gets the focus back. */
const UNREAD_POLL_MS = 60_000;
const PAGE_SIZE = 10;

/**
 * Unread count of the bell. Correct on its own: fetched on load, on focus and every minute. The live push
 * (useNotificationsLive) only makes it sooner.
 */
export function useUnreadNotificationCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: getUnreadNotificationCount,
    enabled,
    staleTime: 15_000,
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/** The list of the panel, newest first, 10 at a time ("Xem thêm"). Loaded only while the panel is open. */
export function useNotificationFeed(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: ({ pageParam }) => listNotifications({ before: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextBefore ?? undefined,
    enabled,
    staleTime: 0,
  });
}

type Feed = InfiniteData<NotificationPage, string | undefined>;

/** Marks one notification read, at once on screen (the server is idempotent). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: (id: string) => {
      const now = new Date().toISOString();
      let changed = false;
      queryClient.setQueryData<Feed>(queryKeys.notifications.list, (feed) =>
        feed && {
          ...feed,
          pages: feed.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== id || item.readAt) return item;
              changed = true;
              return { ...item, readAt: now };
            }),
          })),
        },
      );
      if (changed) {
        queryClient.setQueryData<{ count: number }>(queryKeys.notifications.unread, (old) => old && { count: Math.max(0, old.count - 1) });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<Feed>(queryKeys.notifications.list, (feed) =>
        feed && {
          ...feed,
          pages: feed.pages.map((page) => ({ ...page, items: page.items.map((item) => (item.readAt ? item : { ...item, readAt: now })) })),
        },
      );
      queryClient.setQueryData(queryKeys.notifications.unread, { count: 0 });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

/**
 * Live push: the API's WebSocket gateway sends `notifications.changed` to my sockets when my inbox gets a new row (a
 * remix, or an export finished in the worker, bridged through Redis). Best effort: no socket, no harm, the poll of
 * useUnreadNotificationCount catches up. socket.io-client is loaded only for signed-in users.
 */
export function useNotificationsLive(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || OFFLINE_DEMO || typeof window === "undefined") return;
    let closed = false;
    let socket: import("socket.io-client").Socket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    void import("socket.io-client")
      .then(({ io }) => {
        if (closed) return;
        // `/api` -> `<this origin>/events` on path `/api/socket.io` (the gateway's path, behind the same proxy).
        const base = new URL(API_BASE_URL, window.location.href);
        socket = io(`${base.origin}/events`, {
          path: `${base.pathname.replace(/\/+$/, "")}/socket.io`,
          // The Next.js `/api/*` rewrite drops a trailing slash before the query (the gateway accepts both).
          addTrailingSlash: false,
          withCredentials: true,
          reconnectionDelayMax: 30_000,
        });
        socket.on(NOTIFICATIONS_CHANGED, () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }));
        // The server closes a socket whose access cookie expired: come back once the client has refreshed it.
        socket.on("disconnect", (reason) => {
          if (reason === "io server disconnect") retry = setTimeout(() => socket?.connect(), 15_000);
        });
      })
      .catch(() => undefined);
    return () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [enabled, queryClient]);
}

/** Event of `be/src/notifications/notifications.constants.ts`. */
const NOTIFICATIONS_CHANGED = "notifications.changed";
