"use client";

/**
 * The user's own shelves of the studio library (docs/23 S15): favourites and recently used items, kept in this
 * browser (localStorage, per device). An item is stored whole, so imported assets and stock photos stay listed even
 * when the library or the search that showed them changes.
 */
import { useCallback, useEffect, useState } from "react";
import type { LibraryItem } from "@wrapfit/shared";

export type ShelfItem = LibraryItem & { attribution?: string | null };

const FAVORITES_KEY = "wf-library-favorites";
const RECENT_KEY = "wf-library-recent";
const MAX_FAVORITES = 60;
const MAX_RECENT = 24;
const CHANGED = "wf-library-shelves";

function read(key: string): ShelfItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string" && typeof item.content === "string") : [];
  } catch {
    return [];
  }
}

/** Files that die with the tab (blob:) or would fill the storage (data:) are not kept. */
const keepable = (item: ShelfItem) => !/^(blob:|data:)/.test(item.content);

function write(key: string, items: ShelfItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items.filter(keepable)));
  } catch {
    // private mode or full storage: the shelf lives until the page closes
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Favourites and recent items, shared by every library panel of the page. */
export function useLibraryShelves() {
  const [favorites, setFavorites] = useState<ShelfItem[]>([]);
  const [recent, setRecent] = useState<ShelfItem[]>([]);
  useEffect(() => {
    const load = () => {
      setFavorites(read(FAVORITES_KEY));
      setRecent(read(RECENT_KEY));
    };
    load();
    window.addEventListener(CHANGED, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CHANGED, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const toggleFavorite = useCallback((item: ShelfItem) => {
    const current = read(FAVORITES_KEY);
    const next = current.some((saved) => saved.id === item.id) ? current.filter((saved) => saved.id !== item.id) : [item, ...current].slice(0, MAX_FAVORITES);
    write(FAVORITES_KEY, next);
  }, []);

  const markUsed = useCallback((item: ShelfItem) => {
    write(RECENT_KEY, [item, ...read(RECENT_KEY).filter((saved) => saved.id !== item.id)].slice(0, MAX_RECENT));
  }, []);

  const clearRecent = useCallback(() => write(RECENT_KEY, []), []);

  return { favorites, recent, isFavorite: (id: string) => favorites.some((item) => item.id === id), toggleFavorite, markUsed, clearRecent };
}
