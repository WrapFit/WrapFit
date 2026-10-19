"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void;
  /** Drops the pending call. */
  cancel(): void;
  /** Runs the pending call now. */
  flush(): void;
}

/**
 * `callback`, called once the calls have stopped for `delayMs` (e.g. a search request 300 ms after the last key).
 * The returned function keeps its identity; it always runs the latest `callback`, and the pending call is dropped
 * on unmount.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs = 300,
): DebouncedFunction<Args> {
  const latest = useRef(callback);
  latest.current = callback;
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<Args | null>(null);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    pending.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => {
    const flush = () => {
      window.clearTimeout(timer.current);
      const args = pending.current;
      pending.current = null;
      if (args) latest.current(...args);
    };
    const debounced = ((...args: Args) => {
      pending.current = args;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delayMs);
    }) as DebouncedFunction<Args>;
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }, [delayMs, cancel]);
}
