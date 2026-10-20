import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { AdminHeader, MainHeader } from "@/components/layout";
import { Skeleton } from "@/components/ui";

import { cn } from "@/utils/helpers";

/**
 * Placeholder of a workspace page (`app/dashboard/loading.tsx`, `app/admin/loading.tsx`) in the shape of
 * ShellLayout: side menu, title row, stat tiles and a grid of cards, so the real page replaces it without a jump.
 */
export function WorkspaceSkeleton({
  label = "Đang tải không gian làm việc…",
  isAdmin = false,
}: {
  label?: string;
  isAdmin?: boolean;
}) {
  return (
    <>
      {isAdmin ? <AdminHeader /> : <MainHeader />}
      <div className={`${landingFontVariables} min-h-screen bg-white pt-16 font-landing-heading`} aria-busy="true">
        <span role="status" className="sr-only">
          {label}
        </span>
        <div
          className={cn(
            "flex w-full gap-6 pb-28 pt-6 sm:px-6 md:pb-16 lg:px-8",
            isAdmin ? "px-4" : "mx-auto max-w-[1440px] gap-8 px-4 lg:px-10"
          )}
          aria-hidden
        >
          <aside
            className={cn(
              "hidden shrink-0 flex-col gap-5 lg:flex",
              isAdmin ? "w-[240px]" : "w-[248px]"
            )}
          >
            <Skeleton className="h-10 rounded-control" />
            {[4, 5, 3].map((count, group) => (
              <div key={group} className="flex flex-col gap-2">
                <Skeleton shape="text" className="ml-3 h-3 w-24" />
                {Array.from({ length: count }, (_, item) => (
                  <Skeleton key={item} className="h-10 rounded-lg bg-library-panel" />
                ))}
              </div>
            ))}
          </aside>

          <main className="min-w-0 flex-1">
            <div className="-mx-4 mb-5 flex gap-2 overflow-hidden px-4 lg:hidden">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-10 w-28 shrink-0 rounded-lg" />
              ))}
            </div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <Skeleton shape="text" className="h-3.5 w-48" />
                <Skeleton shape="text" className="h-8 w-56 rounded-lg" />
                <Skeleton shape="text" className="h-4 w-80 max-w-full" />
              </div>
              <Skeleton className="h-10 w-36 rounded-control" />
            </div>
            <Skeleton className="h-44 rounded-2xl bg-library-tile" />
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 rounded-2xl bg-library-tile" />
              ))}
            </div>
            <Skeleton shape="text" className="mt-8 h-5 w-40" />
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item}>
                  <Skeleton className="aspect-[321/201] rounded-2xl bg-library-tile" />
                  <Skeleton shape="text" className="mt-3 h-4 w-2/3 bg-library-tile" />
                  <Skeleton shape="text" className="mt-2 h-3 w-1/2 bg-library-tile" />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
