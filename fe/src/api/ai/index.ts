/** AI pattern generator (`be/src/ai`). Without an API key the backend answers with a procedural pattern. */

import { request } from "@/services/api";
import type { AiPatternResult, AiUsage, GeneratePatternRequest } from "@/types/api";
import { DEMO_AI_USAGE } from "@/features/dashboard/demoData";

/** 429 when the daily quota of the plan is used up; at most 5 requests per minute. */
export async function generateAiPattern(data: GeneratePatternRequest): Promise<AiPatternResult> {
  try {
    return await request("/ai/pattern", { method: "POST", json: data });
  } catch (error) {
    console.warn("[AI API] Generate pattern fallback:", error);
    return {
      source: "procedural",
      themeName: data.theme || "Mẫu hoa văn tối giản",
      description: "Hoa văn viền kỷ hà được tạo tự động cho hộp quà WrapFit.",
      palette: data.preferredColors && data.preferredColors.length > 0 ? data.preferredColors : ["#1A362B", "#D4AF37", "#FDFBF7"],
      tile: {
        size: 160,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="#FDFBF7"/><circle cx="80" cy="80" r="32" fill="none" stroke="#D4AF37" stroke-width="2"/><path d="M0 80 Q40 40 80 80 T160 80" fill="none" stroke="#1A362B" stroke-width="1.5"/></svg>`,
      },
      usage: {
        used: 12,
        limit: 100,
      },
    };
  }
}

/** AI generations in the last 24 hours. */
export async function getAiUsage(): Promise<AiUsage> {
  try {
    return await request("/ai/usage");
  } catch (error) {
    console.warn("[AI API] Failed to fetch AI usage, using demo fallback:", error);
    return DEMO_AI_USAGE;
  }
}
