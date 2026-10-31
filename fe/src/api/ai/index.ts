/** AI paid with xu (`be/src/ai`, docs/19). Without an API key the backend answers with a free procedural pattern. */

import { request } from "@/services/api";
import type { AiPatternResult, AiUsage, GeneratePatternRequest } from "@/types/api";

/**
 * Errors reach the caller: 402 `INSUFFICIENT_CREDITS` (kind XU, with balance and cost) when the wallet is short, 429
 * past 5 requests per minute. An AI failure is not an error: the xu come back and the pattern is procedural.
 */
export function generateAiPattern(data: GeneratePatternRequest): Promise<AiPatternResult> {
  return request("/ai/pattern", { method: "POST", json: data });
}

/** Whether AI patterns run, their price in xu and my xu wallet. */
export function getAiUsage(): Promise<AiUsage> {
  return request("/ai/usage");
}
