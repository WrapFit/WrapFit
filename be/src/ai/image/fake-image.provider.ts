import { AI_IMAGE_MODEL_BY_KEY } from '@wrapfit/shared';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { sizeFor, upscaleFactor } from './fal-models';
import {
  ImageContentBlockedError,
  type ImageGenerationRequest,
  type ImageProvider,
  type ImageToolRequest,
  type ProviderResult,
} from './image-provider';

/** Words in a prompt that make the fake provider fail, to try the refund paths by hand and in e2e tests. */
export const FAKE_OUTAGE = '#fail';
export const FAKE_BLOCKED = '#blocked';

/**
 * AI_IMAGE_PROVIDER=fake (development and tests only, refused in production): draws a gradient whose colors depend on
 * the prompt, at the size the real model would use, in a fraction of a second and without any cost.
 */
export class FakeImageProvider implements ImageProvider {
  async generate({ model, prompt, aspectRatio, numImages }: ImageGenerationRequest): Promise<ProviderResult> {
    if (prompt.includes(FAKE_OUTAGE)) throw new Error('Fake provider outage');
    if (prompt.includes(FAKE_BLOCKED)) throw new ImageContentBlockedError('Fake provider safety filter');

    const { width, height } = sizeFor(aspectRatio, 1);
    const images = await Promise.all(
      Array.from({ length: numImages }, async (_, index) => {
        const [from, to] = colorsOf(`${prompt}#${index}`);
        const svg = gradientSvg(width, height, from, to);
        const body = AI_IMAGE_MODEL_BY_KEY[model].output === 'vector' ? Buffer.from(svg) : await sharp(Buffer.from(svg)).png().toBuffer();
        return { body };
      }),
    );
    return { requestId: `fake-${Date.now()}`, images };
  }

  async runTool({ tool, image }: ImageToolRequest): Promise<ProviderResult> {
    let body: Buffer;
    if (tool === 'upscale') {
      const factor = upscaleFactor(image.width, image.height);
      body = await sharp(image.body)
        .resize(Math.round(image.width * factor), Math.round(image.height * factor))
        .png()
        .toBuffer();
    } else if (tool === 'remove-bg') {
      body = await sharp(image.body).ensureAlpha(0.5).png().toBuffer();
    } else {
      const [from, to] = colorsOf(image.body.subarray(0, 64).toString('hex'));
      body = Buffer.from(gradientSvg(image.width, image.height, from, to));
    }
    return { requestId: `fake-${Date.now()}`, images: [{ body }] };
  }
}

function colorsOf(seed: string): [string, string] {
  const hex = createHash('sha256').update(seed).digest('hex');
  return [`#${hex.slice(0, 6)}`, `#${hex.slice(6, 12)}`];
}

function gradientSvg(width: number, height: number, from: string, to: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#g)"/>
<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#ffffff" fill-opacity="0.35"/>
</svg>`;
}
