"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A short most-recent-first list kept in localStorage (recent searches…). Private mode or blocked storage only means
 * the list is not remembered; nothing throws.
 */
export function useLocalStorageList(key: string, max = 5) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(stored)) setItems(stored.filter((item): item is string => typeof item === "string").slice(0, max));
    } catch {
      // Unreadable or blocked: start empty.
    }
  }, [key, max]);

  const write = useCallback(
    (next: string[]) => {
      setItems(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Not remembered; the list still works for this visit.
      }
    },
    [key],
  );

  const add = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setItems((current) => {
        const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, max);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // See above.
        }
        return next;
      });
    },
    [key, max],
  );

  const remove = useCallback((value: string) => write(items.filter((item) => item !== value)), [items, write]);
  const clear = useCallback(() => write([]), [write]);

  return { items, add, remove, clear };
}
