"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorState } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";

/** A page crashed while rendering: say so instead of a blank screen, and let the user retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center px-4 py-16">
      <ErrorState
        error={error}
        title="Trang gặp sự cố"
        onRetry={reset}
        action={
          <Link href={ROUTES.home} className="text-sm font-semibold text-brand-forest underline-offset-4 hover:underline">
            Về trang chủ
          </Link>
        }
      />
    </main>
  );
}
