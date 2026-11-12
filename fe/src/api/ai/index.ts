/**
 * AI paid with xu (`be/src/ai`, docs/19): patterns and images for box faces. Without an API key the backend answers
 * with a free procedural pattern.
 */

import { request } from "@/services/api";
import type {
  AiImageCatalog,
  AiImageGalleryPage,
  AiImageJob,
  AiImageJobStarted,
  AiImageTool,
  AiPatternResult,
  AiUsage,
  CreateAiImageRequest,
  GeneratePatternRequest,
} from "@/types/api";

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

/** AI image models on offer, their price in xu per image, and the price of the image tools. */
export function getAiImageCatalog(): Promise<AiImageCatalog> {
  return request("/ai/models");
}

/**
 * Spends xu and queues the images (202); poll `getAiImageJob` every 2 s. 402 not enough xu, 422 PROMPT_REJECTED (no xu
 * spent), 429 AI_IMAGE_BUSY (3 jobs running), 503 AI_IMAGE_UNAVAILABLE, 403 STORAGE_QUOTA_EXCEEDED.
 */
export function createAiImages(data: CreateAiImageRequest): Promise<AiImageJobStarted> {
  return request("/ai/images", { method: "POST", json: data });
}

export function getAiImageJob(jobId: string): Promise<AiImageJob> {
  return request(`/ai/images/jobs/${encodeURIComponent(jobId)}`);
}

/** "Ảnh AI của tôi": images kept 30 days unless placed on a saved design. */
export function listAiImages(params: { before?: string; limit?: number } = {}): Promise<AiImageGalleryPage> {
  const query = new URLSearchParams();
  if (params.before) query.set("before", params.before);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request(`/ai/images${qs ? `?${qs}` : ""}`);
}

/** Upscale, remove the background of, or vectorize one AI image: a new job, priced in xu. */
export function runAiImageTool(outputId: string, tool: AiImageTool, clientRequestId?: string): Promise<AiImageJobStarted> {
  return request(`/ai/images/${encodeURIComponent(outputId)}/${tool}`, { method: "POST", json: { clientRequestId } });
}
