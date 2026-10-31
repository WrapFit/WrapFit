"use client";

import { useQuery } from "@tanstack/react-query";
import { getAiUsage } from "@/api/ai";
import { getStorageUsage } from "@/api/storage";
import { queryKeys } from "@/hooks/data";

/** Bytes used by my uploads and exports, against the quota of my plan. */
export function useStorageUsage() {
  return useQuery({ queryKey: queryKeys.storageUsage, queryFn: getStorageUsage });
}

/** Price of AI patterns in xu and my xu wallet (docs/19). */
export function useAiUsage() {
  return useQuery({ queryKey: queryKeys.aiUsage, queryFn: getAiUsage });
}

/** Share of the quota in use, 0–100. */
export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, (used / limit) * 100));
}
