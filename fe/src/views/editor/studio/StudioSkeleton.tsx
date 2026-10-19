import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { Skeleton } from "@/components/ui";

/**
 * Placeholder of the studio while its code (Three.js, Fabric) and the project load: the stepper bar, then the 2D
 * dieline on the left and the 3D box on the right, at the sizes of StudioWorkspace.
 */
export function StudioSkeleton({ label = "Đang mở Studio 3D…" }: { label?: string }) {
  return (
    <div className={`${landingFontVariables} flex min-h-screen flex-col bg-landing-canvas font-landing-body`} aria-busy="true">
      <span role="status" className="sr-only">
        {label}
      </span>
      <header className="sticky top-0 z-40 bg-white/95" aria-hidden>
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <Skeleton className="h-8 w-28 rounded-full" />
          <div className="hidden items-center gap-2 md:flex">
            {[0, 1, 2, 3].map((step) => (
              <Skeleton key={step} className="h-9 w-28 rounded-full" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-10 w-32 rounded-full sm:block" />
            <Skeleton className="h-10 w-28 rounded-full bg-fpt-orange-light" />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-4 sm:px-6 lg:grid-cols-2" aria-hidden>
        <div className="relative min-h-[320px] overflow-hidden rounded-sheet bg-white p-6">
          {/* A faint dieline outline: the 2D panel keeps its shape while loading. */}
          <svg viewBox="0 0 400 300" className="mx-auto h-full max-h-[460px] w-full animate-pulse text-line motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M140 40h120v50h-120zM60 90h280v120H60zM140 210h120v50H140zM60 90v120M140 90v120M260 90v120" strokeDasharray="6 6" />
          </svg>
        </div>
        <div className="min-h-[320px] rounded-sheet bg-surface-sunken" />
      </div>
    </div>
  );
}
