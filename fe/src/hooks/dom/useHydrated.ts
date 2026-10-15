"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while React hydrates the server HTML, true afterwards. Parts that depend on client data (the session, a query
 * that may already be answered) wait for it, so their first client render matches the server's.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
