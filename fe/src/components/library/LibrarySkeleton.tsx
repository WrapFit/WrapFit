import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import { MainHeader } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { LibraryCardSkeleton } from "./ui";

/** The library's content while it loads: filters, search card, a grid of cards (no header). */
export function LibraryBodySkeleton() {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Đang tải thư viện mẫu…
      </span>
      <div className="mx-auto flex w-full max-w-[1440px] gap-8 px-4 sm:px-6 lg:px-10" aria-hidden>
        <aside className="hidden w-[302px] shrink-0 flex-col gap-3 pt-2 lg:flex">
          {[0, 1, 2, 3].map((group) => (
            <div key={group} className="flex flex-col gap-2 rounded-2xl border border-library-line p-4">
              <Skeleton shape="text" className="h-4 w-32" />
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} shape="text" className="h-3.5 w-4/5" />
              ))}
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1 pt-2">
          <Skeleton className="h-72 rounded-squircle-md bg-library-tile md:h-64" />
          <div className="mt-6 flex items-center justify-between gap-3">
            <Skeleton shape="text" className="h-4 w-24" />
            <Skeleton className="h-10 w-64 rounded-full" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <LibraryCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The whole library page while its route loads (`app/templates/loading.tsx`). */
export function LibrarySkeleton() {
  return (
    <>
      <MainHeader />
      <main className={`${landingFontVariables} min-h-screen bg-white pb-28 pt-24 font-landing-heading md:pb-0`}>
        <LibraryBodySkeleton />
      </main>
    </>
  );
}
