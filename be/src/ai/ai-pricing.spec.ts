import { AI_MODEL_PRICES, estimateCostUsd } from './ai-pricing';

describe('estimateCostUsd', () => {
  it('prices input and output tokens per million at the rate of the model', () => {
    // Haiku 5.5: $0.10 / $0.50 per 1M tokens.
    expect(estimateCostUsd('claude-haiku-5-5', 1_000_000, 0)).toBeCloseTo(0.1);
    expect(estimateCostUsd('claude-haiku-5-5', 0, 1_000_000)).toBeCloseTo(0.5);
    expect(estimateCostUsd('claude-haiku-5-5', 900, 400)).toBeCloseTo(0.00029);
    // Opus 5.5: $4 / $20 per 1M tokens.
    expect(estimateCostUsd('claude-opus-5-5', 900, 400)).toBeCloseTo(0.0116);
  });

  it('is zero without tokens', () => {
    expect(estimateCostUsd('claude-opus-5-5', 0, 0)).toBe(0);
  });

  it('prices an unknown model like the most expensive known one', () => {
    const highest = Math.max(...Object.values(AI_MODEL_PRICES).map((price) => price.output));
    expect(estimateCostUsd('claude-future-9', 0, 1_000_000)).toBeCloseTo(highest);
  });
});
