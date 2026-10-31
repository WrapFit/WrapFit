import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import type { AiImageAspectRatio } from '@wrapfit/shared';
import { estimateCostUsd } from '../ai-pricing';

export interface PromptRequest {
  /** What the user typed, usually Vietnamese. */
  prompt: string;
  aspectRatio: AiImageAspectRatio;
  /** The user allows lettering in the image (models with `supportsText` only). */
  allowText: boolean;
  /** The model returns SVG (Recraft vector). */
  vector: boolean;
}

export type PromptVerdict =
  | { allowed: true; prompt: string; costUsd: number }
  /** `reason`: one Vietnamese sentence for the user. */
  | { allowed: false; reason: string; costUsd: number };

/**
 * Turns what a user typed into a prompt for an image model, before any xu is spent (docs/19 D3): translated to
 * English, framed as flat print artwork for one box panel, and refused when it asks for content WrapFit will not print.
 */
export interface PromptRewriter {
  rewrite(request: PromptRequest): Promise<PromptVerdict>;
}

/** What every prompt gets, so the models draw artwork for a panel instead of a photo of a box. */
export function packagingFrame({ aspectRatio, allowText, vector }: Omit<PromptRequest, 'prompt'>): string {
  const style = vector ? 'clean vector illustration with flat shapes' : 'flat full-bleed artwork';
  const text = allowText
    ? 'Render any requested words exactly as given, with correct Vietnamese diacritics.'
    : 'No text, no letters, no words, no logos, no watermark.';
  return `${style} filling the whole ${aspectRatio} canvas edge to edge, printed on a gift box panel; not a box, not a mockup, not a product photo. Print-friendly colors. ${text}`;
}

/** Without ANTHROPIC_API_KEY: the prompt as typed plus the frame; the provider's own safety filter still applies. */
export class PlainPromptRewriter implements PromptRewriter {
  async rewrite(request: PromptRequest): Promise<PromptVerdict> {
    return { allowed: true, prompt: `${request.prompt.trim()}. ${packagingFrame(request)}`, costUsd: 0 };
  }
}

const SCHEMA = {
  type: 'object',
  properties: {
    allowed: { type: 'boolean' },
    reason: { type: 'string', description: 'When refused: one short, polite Vietnamese sentence. Otherwise empty.' },
    prompt: { type: 'string', description: 'When allowed: the English prompt. Otherwise empty.' },
  },
  required: ['allowed', 'reason', 'prompt'],
  additionalProperties: false,
};

// Stable system prompt (no per-request data) so it can be cached.
const SYSTEM_PROMPT = `You prepare prompts for text-to-image models at WrapFit, a Vietnamese studio that prints custom gift boxes.
The user describes the artwork for one panel of their box, usually in Vietnamese.

Refuse (allowed=false) when the request asks for: sexual or suggestive content, anything involving minors in a sexual or violent way, gore or graphic violence, hate symbols or harassment, a real person's likeness, or the logo, mascot or character of a brand or franchise (e.g. Disney, Pokémon, Hello Kitty, Marvel, football clubs, luxury fashion houses), or packaging that imitates a real brand. Generic styles ("cute cartoon cat", "Art Deco") are fine. Seasonal and cultural themes (Tết, Trung Thu, Noel, weddings) are welcome.

When allowed, write one English prompt of at most 120 words: keep the subject, style, colors and mood the user asked for, add helpful visual detail, and do not add new subjects. Never mention boxes, packaging or mockups as the subject. If the user wants words in the image, keep those words exactly as written (Vietnamese diacritics included) inside double quotes.`;

/** Claude (AI_MODEL_FAST) with structured output; a failed call falls back to the plain rewriter. */
export class ClaudePromptRewriter implements PromptRewriter {
  private readonly logger = new Logger(ClaudePromptRewriter.name);
  private readonly client: Anthropic;
  private readonly fallback = new PlainPromptRewriter();

  constructor(
    apiKey: string,
    private readonly model: string,
    timeoutMs: number,
  ) {
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 });
  }

  async rewrite(request: PromptRequest): Promise<PromptVerdict> {
    const response = await this.client.beta.messages
      .create({
        model: this.model,
        max_tokens: 1024,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: `Words allowed in the image: ${request.allowText ? 'yes' : 'no'}\nRequest: ${request.prompt}`,
          },
        ],
      })
      .catch((error: Error) => {
        // Never block a paid feature on the helper: the provider's safety filter still applies.
        this.logger.warn(`Prompt rewrite failed, sending the prompt as typed: ${error.message}`);
        return null;
      });
    if (!response) return this.fallback.rewrite(request);

    const costUsd = estimateCostUsd(response.model, response.usage.input_tokens, response.usage.output_tokens);
    if (response.stop_reason === 'refusal') {
      return { allowed: false, reason: 'Mô tả này có nội dung WrapFit không thể in. Hãy thử mô tả khác.', costUsd };
    }
    const text = response.content.find((block) => block.type === 'text');
    try {
      const answer = JSON.parse(text && text.type === 'text' ? text.text : '') as { allowed: boolean; reason: string; prompt: string };
      if (!answer.allowed) {
        return { allowed: false, reason: answer.reason || 'Mô tả này có nội dung WrapFit không thể in.', costUsd };
      }
      if (!answer.prompt.trim()) throw new Error('empty prompt');
      return { allowed: true, prompt: `${answer.prompt.trim()} ${packagingFrame(request)}`, costUsd };
    } catch (error) {
      this.logger.warn(`Prompt rewrite returned no usable prompt, sending it as typed: ${(error as Error).message}`);
      return { ...(await this.fallback.rewrite(request)), costUsd };
    }
  }
}
