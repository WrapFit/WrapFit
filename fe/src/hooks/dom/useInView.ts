"use client";

import { useEffect, useRef, useState } from "react";

interface InViewOptions {
  /** Margin around the viewport, as in IntersectionObserver (`"0px 0px -10% 0px"`: a little before the bottom). */
  rootMargin?: string;
  /** Stays true once the element has been seen (default), instead of following it in and out. */
  once?: boolean;
}

/**
 * Whether the element given the returned ref is in the viewport. Without IntersectionObserver it counts as seen,
 * so content revealed with it never stays hidden.
 */
export function useInView<T extends Element>({ rootMargin = "0px", once = true }: InViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, once]);

  return { ref, inView };
}
