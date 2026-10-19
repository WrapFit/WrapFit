"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealthDetails } from "@/api/admin";
import { queryKeys } from "@/hooks/data";

/** `GET /health/details` (admin): database, Redis, export worker, export queue sizes and uptime, every 30 s. */
export function useHealthDetails() {
  return useQuery({
    queryKey: queryKeys.admin.health,
    queryFn: getHealthDetails,
    staleTime: 60_000,
    refetchInterval: 30_000,
  });
}

/** "3 ngày 4 giờ", "12 phút". */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}
