import { ApiError, createFalClient, type FalClient, ValidationError } from '@fal-ai/client';
import { FAL_MODELS, FAL_TOOLS, type FalCall } from './fal-models';
import {
  ImageContentBlockedError,
  type ImageGenerationRequest,
  type ImageProvider,
  ImageRequestRejectedError,
  type ImageToolRequest,
  type ProviderImage,
  type ProviderResult,
} from './image-provider';

interface FalImage {
  url: string;
}

/** The output shapes of the endpoints in fal-models.ts: a list of images, or one image (tools). */
interface FalOutput {
  images?: FalImage[];
  image?: FalImage;
  /** FLUX: one flag per image; a flagged image comes back black. */
  has_nsfw_concepts?: boolean[];
}

/** Calls fal.ai through its queue (subscribe waits for the result), bounded by AI_IMAGE_TIMEOUT_MS. */
export class FalImageProvider implements ImageProvider {
  private readonly fal: FalClient;

  constructor(
    apiKey: string,
    private readonly timeoutMs: number,
  ) {
    this.fal = createFalClient({ credentials: apiKey });
  }

  generate(request: ImageGenerationRequest): Promise<ProviderResult> {
    return this.call(FAL_MODELS[request.model](request));
  }

  async runTool({ tool, image }: ImageToolRequest): Promise<ProviderResult> {
    // The bucket of a laptop is not reachable from fal: the source goes through fal storage instead.
    const imageUrl = await this.fal.storage.upload(new Blob([new Uint8Array(image.body)], { type: image.contentType }));
    return this.call(FAL_TOOLS[tool](imageUrl, image));
  }

  private async call({ endpoint, input }: FalCall): Promise<ProviderResult> {
    try {
      const { data, requestId } = await this.fal.subscribe(endpoint, {
        input,
        abortSignal: AbortSignal.timeout(this.timeoutMs),
      });
      const output = data as FalOutput;
      const flagged = output.has_nsfw_concepts ?? [];
      const images: ProviderImage[] = (output.images ?? (output.image ? [output.image] : []))
        .filter((image, index) => !flagged[index])
        .map((image) => ({ url: image.url }));
      if (!images.length) {
        throw flagged.some(Boolean)
          ? new ImageContentBlockedError('The provider safety filter blanked every image')
          : new Error(`${endpoint} returned no image`);
      }
      return { requestId, images };
    } catch (error) {
      throw toProviderError(endpoint, error);
    }
  }
}

/** Refusals and invalid inputs are final (no retry); anything else (5xx, timeout, network) may pass on a second try. */
function toProviderError(endpoint: string, error: unknown): Error {
  if (error instanceof ImageContentBlockedError) return error;
  if (error instanceof ValidationError || (error instanceof ApiError && error.status === 422)) {
    const body = JSON.stringify(error.body ?? '').slice(0, 500);
    return /safety|nsfw|content.?policy|moderation/i.test(body)
      ? new ImageContentBlockedError(`${endpoint} refused the content: ${body}`)
      : new ImageRequestRejectedError(`${endpoint} rejected the input: ${body}`);
  }
  if (error instanceof ApiError) return new Error(`${endpoint} answered ${error.status}: ${error.message}`);
  return error instanceof Error ? error : new Error(String(error));
}
