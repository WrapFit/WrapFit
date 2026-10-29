/** USD per 1 million tokens (input, output) on the Claude API, for prompts up to 100K tokens. */
interface ModelPrice {
  input: number;
  output: number;
}

/**
 * Prices of the models the pattern generator may be answered by: the fast and premium defaults and the models a
 * server-side fallback can switch to (`ai_generations.model` records the model that answered). Source: Anthropic
 * pricing, 2026-10 (docs/16 §4.1). Haiku 5.5 costs $0.50 / $2.50 above 100K prompt tokens; a pattern prompt is ~1K.
 */
export const AI_MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-fable-5-1': { input: 10, output: 50 },
};

/** An unknown model is priced like the most expensive known one, so the cost fuse never under-counts. */
const UNKNOWN_MODEL_PRICE: ModelPrice = Object.values(AI_MODEL_PRICES).reduce((max, price) =>
  price.input + price.output > max.input + max.output ? price : max,
);

/** Estimated cost in USD of one call, from the token counts the API reported. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = AI_MODEL_PRICES[model] ?? UNKNOWN_MODEL_PRICE;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
