"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/helpers";
import { roundButton } from "./ui";

interface CarouselProps {
  /** Name read by screen readers for the list. */
  label: string;
  /** One element per slide. */
  children: React.ReactNode[];
  /** Width and spacing of a slide (each slide is padded on its left). */
  slideClassName?: string;
  /**
   * "right": starts at the content column and runs to the right edge of the window (the box carousels of pack.ly);
   * "full": the whole window (photo reel, reviews).
   */
  bleed?: "right" | "full";
}

const FADE = 48;

/**
 * Horizontal list scrolled by touch, wheel or the two arrow buttons, snapping to the slides. The edge where more
 * slides wait fades out, and its arrow appears only then.
 */
export function Carousel({ label, children, slideClassName, bleed = "right" }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdges({ start: track.scrollLeft > 4, end: track.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    track.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(track);
    return () => {
      track.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [measure]);

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  const mask = `linear-gradient(to right, transparent, black ${edges.start ? FADE : 0}px, black calc(100% - ${
    edges.end ? FADE : 0
  }px), transparent)`;

  return (
    <div
      className="relative"
      // "right": from the left edge of the content column to the right edge of the window.
      style={bleed === "right" ? { marginRight: "calc(50% - 50vw)" } : undefined}
    >
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-4 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "-my-4 focus-visible:ring-2 focus-visible:ring-landing-ink/20",
          bleed === "right" ? "-ml-4 pr-4" : "pr-4"
        )}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {children.map((child, index) => (
          <div key={index} className={cn("shrink-0 snap-start pl-4", slideClassName)}>
            {child}
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Xem mục trước"
        onClick={() => scrollByPage(-1)}
        disabled={!edges.start}
        className={cn(roundButton, "absolute top-1/2 left-2 -translate-y-1/2 sm:left-6", edges.start ? "opacity-100" : "opacity-0")}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Xem mục tiếp theo"
        onClick={() => scrollByPage(1)}
        disabled={!edges.end}
        className={cn(roundButton, "absolute top-1/2 right-2 -translate-y-1/2 sm:right-6", edges.end ? "opacity-100" : "opacity-0")}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
