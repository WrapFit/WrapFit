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
   * "none": stays strictly inside the container with balanced symmetrical margins (default);
   * "right": starts at the content column and runs to the right edge of the window;
   * "full": the whole window (photo reel, reviews).
   */
  bleed?: "none" | "right" | "full";
}

const FADE = 48;

/**
 * Horizontal list scrolled by touch, wheel or the two arrow buttons, snapping to the slides. The edge where more
 * slides wait fades out, and its arrow appears only then.
 */
export function Carousel({ label, children, slideClassName, bleed = "none" }: CarouselProps) {
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
      className="relative w-full"
      style={bleed === "right" ? { marginRight: "calc(50% - 50vw)" } : undefined}
    >
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-4 sm:py-5 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:ring-2 focus-visible:ring-landing-ink/20",
          bleed === "right" ? "-ml-4 pr-6" : bleed === "full" ? "pr-4" : "-mx-2 px-2"
        )}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className={cn(
              "shrink-0 snap-start",
              bleed === "none" ? "px-2" : "pl-4",
              slideClassName
            )}
          >
            {child}
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Xem mục trước"
        onClick={() => scrollByPage(-1)}
        disabled={!edges.start}
        className={cn(
          roundButton,
          "absolute top-1/2 z-20 -translate-y-1/2 shadow-soft-16 backdrop-blur-md transition-all duration-200 hidden sm:inline-flex",
          bleed === "none" ? "-left-3 sm:-left-5 lg:-left-6" : "left-2 sm:left-4",
          edges.start ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Xem mục tiếp theo"
        onClick={() => scrollByPage(1)}
        disabled={!edges.end}
        className={cn(
          roundButton,
          "absolute top-1/2 z-20 -translate-y-1/2 shadow-soft-16 backdrop-blur-md transition-all duration-200 hidden sm:inline-flex",
          bleed === "none" ? "-right-3 sm:-right-5 lg:-right-6" : "right-2 sm:right-4",
          edges.end ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
