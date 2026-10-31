import type { AiImageAspectRatio, AiImageModelKey, AiImageTool } from '@wrapfit/shared';
import type { ImageGenerationRequest, SourceImage } from './image-provider';

/**
 * fal.ai endpoints and inputs of every model of AI_IMAGE_MODELS (checked against fal's model pages, 2026-10-31).
 * Sizes follow the box face: the studio sends the aspect ratio of the face, each model gets it in the form it takes.
 */
export interface FalCall {
  endpoint: string;
  input: Record<string, unknown>;
}

const RATIO: Record<AiImageAspectRatio, [number, number]> = {
  '1:1': [1, 1],
  '4:3': [4, 3],
  '3:4': [3, 4],
  '3:2': [3, 2],
  '2:3': [2, 3],
  '16:9': [16, 9],
  '9:16': [9, 16],
};

/** Width and height of about `megapixels` at `ratio`, both multiples of 16 (what every model here accepts). */
export function sizeFor(ratio: AiImageAspectRatio, megapixels: number): { width: number; height: number } {
  const [w, h] = RATIO[ratio];
  const width = Math.sqrt((megapixels * 1_000_000 * w) / h);
  const round16 = (value: number) => Math.max(16, Math.round(value / 16) * 16);
  return { width: round16(width), height: round16((width * h) / w) };
}

/** Recraft takes named sizes only. */
const RECRAFT_SIZE: Partial<Record<AiImageAspectRatio, string>> = {
  '1:1': 'square_hd',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
};

const gptImage2 = (quality: 'low' | 'medium' | 'high') => ({ prompt, aspectRatio, numImages }: ImageGenerationRequest) => ({
  endpoint: 'openai/gpt-image-2',
  // About 1 MP: the price of `estCostUsd` (GPT Image 2 is billed by image tokens, which grow with the size).
  input: { prompt, image_size: sizeFor(aspectRatio, 1.05), quality, num_images: numImages, output_format: 'png' },
});

const nanoBanana = (endpoint: string, resolution: '1K' | '2K') => ({ prompt, aspectRatio, numImages }: ImageGenerationRequest) => ({
  endpoint,
  input: { prompt, aspect_ratio: aspectRatio, resolution, num_images: numImages, output_format: 'png' },
});

export const FAL_MODELS: Record<AiImageModelKey, (request: ImageGenerationRequest) => FalCall> = {
  // $0.005 per megapixel: 2 MP is ~$0.01.
  'flux2-klein': ({ prompt, aspectRatio, numImages }) => ({
    endpoint: 'fal-ai/flux-2/klein/4b',
    input: { prompt, image_size: sizeFor(aspectRatio, 2), num_images: numImages, output_format: 'png', enable_safety_checker: true },
  }),
  'gpt-image-2-low': gptImage2('low'),
  'gpt-image-2-medium': gptImage2('medium'),
  'gpt-image-2-high': gptImage2('high'),
  // Seedream wants at least 2560x1440 pixels in total: ~4.2 MP, flat $0.04 an image.
  'seedream-4.5': ({ prompt, aspectRatio, numImages }) => ({
    endpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    input: { prompt, image_size: sizeFor(aspectRatio, 4.2), num_images: numImages, enable_safety_checker: true },
  }),
  // 1K is the $0.08 price; 2K costs 1.5 times as much.
  'nano-banana-2': nanoBanana('fal-ai/nano-banana-2', '1K'),
  // Same $0.15 at 1K and 2K; 4K costs double.
  'nano-banana-pro': nanoBanana('fal-ai/nano-banana-pro', '2K'),
  'recraft-v3-vector': ({ prompt, aspectRatio }) => ({
    endpoint: 'fal-ai/recraft/v3/text-to-image',
    input: { prompt, image_size: RECRAFT_SIZE[aspectRatio] ?? 'square_hd', style: 'vector_illustration' },
  }),
};

/** Upscaled images stay within these bounds (print files, storage quota). */
export const UPSCALE_MAX_EDGE = 4096;
export const UPSCALE_MAX_MEGAPIXELS = 16;
/** Below this factor an upscale is not worth its price: the image is large enough already. */
export const UPSCALE_MIN_FACTOR = 1.25;

export function upscaleFactor(width: number, height: number): number {
  return Math.min(4, UPSCALE_MAX_EDGE / Math.max(width, height), Math.sqrt((UPSCALE_MAX_MEGAPIXELS * 1_000_000) / (width * height)));
}

/** `imageUrl`: the source, uploaded to fal storage first. */
export const FAL_TOOLS: Record<AiImageTool, (imageUrl: string, image: SourceImage) => FalCall> = {
  upscale: (imageUrl, image) => ({
    endpoint: 'fal-ai/seedvr/upscale/image',
    input: {
      image_url: imageUrl,
      upscale_mode: 'factor',
      upscale_factor: Math.round(upscaleFactor(image.width, image.height) * 100) / 100,
      output_format: 'png',
    },
  }),
  'remove-bg': (imageUrl) => ({
    endpoint: 'fal-ai/birefnet/v2',
    input: { image_url: imageUrl, output_format: 'png', refine_foreground: true },
  }),
  vectorize: (imageUrl) => ({ endpoint: 'fal-ai/recraft/vectorize', input: { image_url: imageUrl } }),
};

/** Estimated provider cost of a tool run, USD (fal pricing 2026-10: SeedVR $0.001/MP, Recraft vectorize $0.01). */
export const TOOL_COST_USD: Record<AiImageTool, number> = { upscale: 0.016, 'remove-bg': 0.005, vectorize: 0.01 };
