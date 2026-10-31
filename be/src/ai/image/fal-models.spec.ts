import {
  AI_IMAGE_MODELS,
  MIN_XU_MARGIN,
  USD_VND_REFERENCE,
  XU_TOOL_COST,
  XU_VALUE_VND,
  type AiImageAspectRatio,
} from '@wrapfit/shared';
import {
  FAL_MODELS,
  FAL_TOOLS,
  sizeFor,
  TOOL_COST_USD,
  upscaleFactor,
  UPSCALE_MAX_EDGE,
  UPSCALE_MAX_MEGAPIXELS,
} from './fal-models';
import type { ImageGenerationRequest } from './image-provider';

const request = (aspectRatio: AiImageAspectRatio): ImageGenerationRequest => ({
  model: 'flux2-klein', // the builders take the model from FAL_MODELS, not from here
  prompt: 'p',
  aspectRatio,
  numImages: 2,
});

describe('sizeFor', () => {
  it('keeps the ratio and the area, in multiples of 16', () => {
    const { width, height } = sizeFor('3:2', 2);
    expect(width % 16).toBe(0);
    expect(height % 16).toBe(0);
    expect(width / height).toBeCloseTo(1.5, 1);
    expect((width * height) / 1e6).toBeCloseTo(2, 0);
  });
});

describe('FAL_MODELS', () => {
  it.each(AI_IMAGE_MODELS.flatMap((model) => model.aspectRatios.map((ratio) => [model.key, ratio] as const)))(
    '%s %s builds an input with the prompt',
    (key, ratio) => {
      const call = FAL_MODELS[key](request(ratio));
      expect(call.endpoint).toMatch(/^[a-z0-9-]+\/[a-z0-9./-]+$/);
      expect(call.input.prompt).toBe('p');
    },
  );

  it('asks Seedream for at least the 2560x1440 pixels it needs, at every ratio', () => {
    for (const ratio of AI_IMAGE_MODELS.find((model) => model.key === 'seedream-4.5')!.aspectRatios) {
      const { width, height } = FAL_MODELS['seedream-4.5'](request(ratio)).input.image_size as { width: number; height: number };
      expect(width * height).toBeGreaterThanOrEqual(2560 * 1440);
      expect(Math.max(width, height)).toBeLessThanOrEqual(4096);
    }
  });

  it('keeps GPT Image 2 within its size rules', () => {
    for (const ratio of ['1:1', '16:9', '9:16'] as const) {
      const { width, height } = FAL_MODELS['gpt-image-2-medium'](request(ratio)).input.image_size as { width: number; height: number };
      expect(width * height).toBeGreaterThanOrEqual(655_360);
      expect(width * height).toBeLessThanOrEqual(8_294_400);
    }
  });

  it('asks Recraft for an SVG style', () => {
    expect(FAL_MODELS['recraft-v3-vector'](request('16:9')).input).toMatchObject({
      style: 'vector_illustration',
      image_size: 'landscape_16_9',
    });
  });
});

describe('image tools', () => {
  it('upscales within the print bounds', () => {
    expect(upscaleFactor(1024, 1024)).toBeCloseTo(Math.sqrt(UPSCALE_MAX_MEGAPIXELS * 1e6) / 1024); // 16 MP first
    expect(upscaleFactor(1000, 500)).toBe(4);
    expect(upscaleFactor(4096, 2048)).toBe(UPSCALE_MAX_EDGE / 4096);
    const input = FAL_TOOLS.upscale('https://fal.media/x.png', { body: Buffer.alloc(0), contentType: 'image/png', width: 1500, height: 1000 }).input;
    expect(input).toMatchObject({ upscale_mode: 'factor', image_url: 'https://fal.media/x.png' });
  });

  it.each(Object.keys(XU_TOOL_COST) as (keyof typeof XU_TOOL_COST)[])('%s earns the minimum margin', (tool) => {
    expect((XU_TOOL_COST[tool] * XU_VALUE_VND) / (TOOL_COST_USD[tool] * USD_VND_REFERENCE)).toBeGreaterThanOrEqual(MIN_XU_MARGIN);
  });
});
