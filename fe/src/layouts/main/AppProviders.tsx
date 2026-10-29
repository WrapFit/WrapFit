"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import { ToastProvider } from "@/components/common/Toast";
import { AuthProvider } from "@/features/auth";
import { PresentModeBoot } from "@/features/demo/presentMode";
import { ApiError } from "@/services/api";

/** Server down or unreachable: worth another try. A 4xx answer will not change by asking again. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}

/** Client-side context of every page: API cache, toasts, signed-in user. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <PresentModeBoot />
          {children}
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
