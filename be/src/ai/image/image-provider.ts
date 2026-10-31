import type { AiImageAspectRatio, AiImageModelKey, AiImageTool } from '@wrapfit/shared';

/** The ImageProvider of the worker (fal.ai, or the fake one). */
export const IMAGE_PROVIDER = Symbol('IMAGE_PROVIDER');

export interface ImageGenerationRequest {
  model: AiImageModelKey;
  /** English prompt, after PromptRewriter. */
  prompt: string;
  aspectRatio: AiImageAspectRatio;
  numImages: number;
}

/** An image to work on: the bytes of the stored file. */
export interface SourceImage {
  body: Buffer;
  contentType: string;
  width: number;
  height: number;
}

export interface ImageToolRequest {
  tool: AiImageTool;
  image: SourceImage;
}

/** One image of a result: a URL on the provider's CDN to download, or the bytes themselves. */
export type ProviderImage = { url: string; body?: undefined } | { url?: undefined; body: Buffer };

export interface ProviderResult {
  requestId: string | null;
  images: ProviderImage[];
}

export interface ImageProvider {
  generate(request: ImageGenerationRequest): Promise<ProviderResult>;
  runTool(request: ImageToolRequest): Promise<ProviderResult>;
}

/** The provider's safety filter refused the request or blanked the images: retrying would cost again for nothing. */
export class ImageContentBlockedError extends Error {}

/** The provider rejected the input itself (validation): retrying cannot help either. */
export class ImageRequestRejectedError extends Error {}
