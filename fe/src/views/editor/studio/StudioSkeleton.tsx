import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { Skeleton } from "@/components/ui";
import { SlowLoadNotice } from "./SlowLoadNotice";

export function StudioSkeleton({ label = "Đang mở Studio 3D…" }: { label?: string }) {
  return (
    <div className={`${landingFontVariables} flex h-dvh flex-col bg-landing-canvas font-landing-body`} aria-busy="true">
      <span role="status" className="sr-only">
        {label}
      </span>
      <SlowLoadNotice />
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface-raised px-4 sm:h-16" aria-hidden>
        <Skeleton className="h-8 w-48 rounded-control" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </header>
      <div className="flex flex-1 flex-col-reverse lg:flex-row" aria-hidden>
        <div className="h-14 bg-fg lg:h-auto lg:w-24" />
        <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
          <div className="flex-1 bg-canvas" />
          <div className="flex flex-1 flex-col gap-4 bg-surface-raised p-5 lg:w-[360px] lg:flex-none xl:w-[392px]">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full rounded-panel" />
            <Skeleton className="h-10 w-48 rounded-full" />
            <Skeleton className="h-32 w-full rounded-panel" />
          </div>
        </div>
      </div>
    </div>
  );
}
