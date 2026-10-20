"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/helpers";

/**
 * List virtualization (windowing): of a long list only the rows near the screen are in the DOM, so 2 000
 * notifications cost as much as 20. Rows may have any height: each one is measured once rendered (ResizeObserver)
 * and the estimate is used until then.
 *
 * - Scrolls with the page by default, or inside `scrollRef` (a dialog body, a side panel).
 * - Below `threshold` items it renders a plain list: short lists keep Ctrl+F, printing and no extra work.
 * - Rows are placed with `transform`, so scrolling never re-lays out the list; the container keeps the full height,
 *   so the scrollbar is right. Screen readers get the real position through aria-setsize / aria-posinset.
 */

export interface VirtualListProps<T> {
  items: readonly T[];
  getKey(item: T, index: number): string | number;
  renderItem(item: T, index: number): React.ReactNode;
  /** Height of a row before it is measured, in px. */
  estimateHeight: number;
  /** Space between rows, in px. */
  gap?: number;
  /** Extra height drawn above and below the screen, in px, so fast scrolls do not show blanks. */
  overscan?: number;
  /** Lists shorter than this render every row. */
  threshold?: number;
  /** The scrolling element; none = the page. */
  scrollRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  itemClassName?: string;
  "aria-label"?: string;
}

const isBrowser = typeof window !== "undefined";
const useIsoLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

export function VirtualList<T>({
  items,
  getKey,
  renderItem,
  estimateHeight,
  gap = 0,
  overscan = 600,
  threshold = 60,
  scrollRef,
  className,
  itemClassName,
  "aria-label": ariaLabel,
}: VirtualListProps<T>) {
  if (items.length < threshold) {
    return (
      <ul className={cn("flex flex-col", className)} style={{ gap }} aria-label={ariaLabel}>
        {items.map((item, index) => (
          <li key={getKey(item, index)} className={itemClassName}>
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <WindowedList
      items={items}
      getKey={getKey}
      renderItem={renderItem}
      estimateHeight={estimateHeight}
      gap={gap}
      overscan={overscan}
      scrollRef={scrollRef}
      className={className}
      itemClassName={itemClassName}
      aria-label={ariaLabel}
    />
  );
}

type WindowedListProps<T> = Omit<VirtualListProps<T>, "threshold"> & Required<Pick<VirtualListProps<T>, "gap" | "overscan">>;

function WindowedList<T>({ items, getKey, renderItem, estimateHeight, gap, overscan, scrollRef, className, itemClassName, "aria-label": ariaLabel }: WindowedListProps<T>) {
  const listRef = useRef<HTMLUListElement>(null);
  /** Measured heights by key; survives re-orders and filters. */
  const heights = useRef(new Map<string | number, number>());
  const [measureVersion, setMeasureVersion] = useState(0);
  const [range, setRange] = useState({ start: 0, end: Math.min(items.length, 20) });

  const keys = useMemo(() => items.map((item, index) => getKey(item, index)), [items, getKey]);

  // Top of each row, and the full height (recomputed when a row's measured height changes).
  const { offsets, total } = useMemo(() => {
    const tops = new Array<number>(keys.length);
    let y = 0;
    for (let index = 0; index < keys.length; index++) {
      tops[index] = y;
      y += (heights.current.get(keys[index]) ?? estimateHeight) + gap;
    }
    return { offsets: tops, total: Math.max(0, y - gap) };
    // measureVersion: heights.current changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, estimateHeight, gap, measureVersion]);

  const updateRange = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const listTop = list.getBoundingClientRect().top;
    let viewTop: number;
    let viewHeight: number;
    const scroller = scrollRef?.current;
    if (scroller) {
      const box = scroller.getBoundingClientRect();
      viewTop = box.top - listTop;
      viewHeight = box.height;
    } else {
      viewTop = -listTop;
      viewHeight = window.innerHeight;
    }
    const from = viewTop - overscan;
    const to = viewTop + viewHeight + overscan;
    // Binary search for the first row ending below `from`.
    let low = 0;
    let high = offsets.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      const bottom = offsets[mid] + (heights.current.get(keys[mid]) ?? estimateHeight);
      if (bottom < from) low = mid + 1;
      else high = mid;
    }
    let end = low;
    while (end < offsets.length && offsets[end] < to) end++;
    setRange((current) => (current.start === low && current.end === end ? current : { start: low, end }));
  }, [offsets, keys, estimateHeight, overscan, scrollRef]);

  // Follow scrolls and resizes, once per frame.
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          updateRange();
        });
      }
    };
    const target: HTMLElement | Window = scrollRef?.current ?? window;
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [updateRange, scrollRef]);

  // Before paint when the page scrolls; again after commit, because a parent's `scrollRef` is attached only after
  // this child's layout effects have run.
  useIsoLayoutEffect(updateRange, [updateRange]);
  useEffect(updateRange, [updateRange]);

  /** data-* values are strings: map them back to numeric keys. */
  const keyLookup = useRef(new Map<string, string | number>());

  // One observer for every rendered row: a new height moves the rows below it. Created on first use, because row
  // refs attach before effects run.
  const observer = useRef<ResizeObserver | null>(null);
  const getObserver = useCallback(() => {
    if (!observer.current && typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver((entries) => {
        let changed = false;
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const key = element.dataset.virtualKey;
          if (key === undefined) continue;
          const realKey = keyLookup.current.get(key) ?? key;
          const height = element.offsetHeight;
          if (height > 0 && heights.current.get(realKey) !== height) {
            heights.current.set(realKey, height);
            changed = true;
          }
        }
        if (changed) setMeasureVersion((version) => version + 1);
      });
    }
    return observer.current;
  }, []);

  useEffect(() => {
    // Re-attach after a Strict Mode remount, which ran the cleanup below.
    listRef.current?.querySelectorAll<HTMLElement>(":scope > li").forEach((row) => getObserver()?.observe(row));
    return () => {
      observer.current?.disconnect();
      observer.current = null;
    };
  }, [getObserver]);

  const measureRef = useCallback(
    (element: HTMLLIElement | null) => {
      if (!element) return;
      const key = element.dataset.virtualKey!;
      getObserver()?.observe(element);
      return () => {
        observer.current?.unobserve(element);
        keyLookup.current.delete(key);
      };
    },
    [getObserver],
  );

  const rows: React.ReactNode[] = [];
  for (let index = range.start; index < Math.min(range.end, items.length); index++) {
    const key = keys[index];
    keyLookup.current.set(String(key), key);
    rows.push(
      <li
        key={key}
        ref={measureRef}
        data-virtual-key={String(key)}
        aria-setsize={items.length}
        aria-posinset={index + 1}
        className={cn("absolute inset-x-0 top-0", itemClassName)}
        style={{ transform: `translateY(${offsets[index]}px)` }}
      >
        {renderItem(items[index], index)}
      </li>,
    );
  }

  return (
    <ul ref={listRef} aria-label={ariaLabel} className={cn("relative", className)} style={{ height: total }}>
      {rows}
    </ul>
  );
}
