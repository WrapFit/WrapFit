/** AI pattern generator (`be/src/ai`). Without an API key the backend answers with a procedural pattern. */

import { request } from "@/services/api";
import type { AiPatternResult, AiUsage, GeneratePatternRequest } from "@/types/api";

/** 429 when the daily quota of the plan is used up; at most 5 requests per minute. */
export function generateAiPattern(data: GeneratePatternRequest): Promise<AiPatternResult> {
  return request("/ai/pattern", { method: "POST", json: data });
}

/** AI generations in the last 24 hours. */
export function getAiUsage(): Promise<AiUsage> {
  return request("/ai/usage");
}
