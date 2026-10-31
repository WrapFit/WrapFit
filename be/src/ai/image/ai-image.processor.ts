import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AI_IMAGE_KEEP_DAYS, type AiImageAspectRatio, type AiImageModelKey, type AiImageTool } from '@wrapfit/shared';
import { Job, UnrecoverableError } from 'bullmq';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { ConfigService, runWithRequestId } from '../../common';
import { PrismaService } from '../../shared/prisma';
import { StorageService } from '../../storage';
import { AiImageRefunds } from './ai-image-refunds';
import {
  AI_IMAGE_QUEUE,
  AiImageJobData,
  BLOCKED_PREFIX,
  MAX_PROVIDER_IMAGE_BYTES,
  UNFINISHED_AI_IMAGE,
} from './ai-image.constants';
import {
  IMAGE_PROVIDER,
  ImageContentBlockedError,
  type ImageProvider,
  ImageRequestRejectedError,
  type ProviderImage,
  type ProviderResult,
  type SourceImage,
} from './image-provider';
import { InvalidSvgError, sanitizeSvg } from './svg-sanitizer';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Hosts fal.ai serves results from: any other URL in a provider answer is refused (no fetching of arbitrary URLs). */
const PROVIDER_HOSTS = /(^|\.)fal\.(media|ai|run)$/;

/** A larger raster is stored as WebP: the IMAGE upload limit of the studio, and the storage quota. */
const MAX_STORED_RASTER_BYTES = 15 * 1024 * 1024;

/** Recraft vectorize takes at most 4096 px and 5 MB: larger sources are scaled down to this edge first. */
const VECTORIZE_MAX_EDGE = 2048;

const TOOL_OF: Partial<Record<string, AiImageTool>> = { UPSCALE: 'upscale', REMOVE_BG: 'remove-bg', VECTORIZE: 'vectorize' };

interface StoredImage {
  storedFileId: string;
  width: number | null;
  height: number | null;
}

/**
 * Runs AI image jobs in the worker process (src/worker.ts). BullMQ tries a job twice; a refusal by the provider
 * (safety filter, invalid input) is final at once. The job is marked FAILED and its xu come back (AiImageRefunds)
 * only after the last attempt. Concurrency is set by AI_IMAGE_CONCURRENCY.
 */
@Processor(AI_IMAGE_QUEUE)
export class AiImageProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiImageProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly refunds: AiImageRefunds,
    @Inject(IMAGE_PROVIDER) private readonly provider: ImageProvider | null,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    this.worker.concurrency = this.config.get('ai.image.concurrency');
  }

  process(job: Job<AiImageJobData>): Promise<{ images: number }> {
    const { aiImageJobId, requestId } = job.data;
    return runWithRequestId(requestId ?? `job:${aiImageJobId}`, async () => {
      try {
        return await this.run(aiImageJobId);
      } catch (error) {
        const final = toFinalError(error);
        const failure = final ?? error;
        const lastAttempt = final !== null || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        const message = failure instanceof Error ? failure.message : String(failure);
        this.logger.warn(`AI image job ${aiImageJobId} attempt ${job.attemptsMade + 1} failed: ${message}`);
        if (lastAttempt) {
          // docs/19 D3: nothing was delivered for these xu, they come back.
          await this.refunds
            .fail(aiImageJobId, message)
            .catch((refundError: Error) => this.logger.error(`Could not refund AI image job ${aiImageJobId}: ${refundError.message}`));
        }
        throw failure; // an UnrecoverableError stops BullMQ from retrying
      }
    });
  }

  private async run(jobId: string): Promise<{ images: number }> {
    const { count } = await this.prisma.aiImageJob.updateMany({
      where: { id: jobId, status: UNFINISHED_AI_IMAGE },
      data: { status: 'PROCESSING', errorLog: null },
    });
    if (!count) return { images: 0 }; // finished already (reconciled while it waited)
    if (!this.provider) throw new UnrecoverableError('AI images are not configured in the worker (FAL_KEY)');

    const job = await this.prisma.aiImageJob.findUniqueOrThrow({
      where: { id: jobId },
      select: {
        userId: true,
        kind: true,
        modelKey: true,
        promptEn: true,
        aspectRatio: true,
        numImages: true,
        source: { select: { width: true, height: true, storedFile: { select: { key: true, contentType: true } } } },
      },
    });

    let result: ProviderResult;
    const tool = TOOL_OF[job.kind];
    if (tool) {
      if (!job.source || job.source.width === null || job.source.height === null) {
        throw new UnrecoverableError('The image to work on was deleted');
      }
      const { body, contentType } = await this.storage.getObject(job.source.storedFile.key);
      const image = await prepareSource(tool, { body, contentType, width: job.source.width, height: job.source.height });
      result = await this.provider.runTool({ tool, image });
    } else {
      result = await this.provider.generate({
        model: job.modelKey as AiImageModelKey,
        prompt: job.promptEn ?? '',
        aspectRatio: job.aspectRatio as AiImageAspectRatio,
        numImages: job.numImages,
      });
    }

    const stored: StoredImage[] = [];
    for (const image of result.images) stored.push(await this.store(job.userId, image));

    const keepUntil = new Date(Date.now() + AI_IMAGE_KEEP_DAYS * DAY_MS);
    await this.prisma.$transaction(async (tx) => {
      const { count: finished } = await tx.aiImageJob.updateMany({
        where: { id: jobId, status: UNFINISHED_AI_IMAGE },
        data: { status: 'COMPLETED', completedAt: new Date(), providerRequestId: result.requestId },
      });
      // Reconciled as lost meanwhile (xu refunded): the files are left to the unused-upload cleanup.
      if (!finished) return;
      await tx.aiImageOutput.createMany({ data: stored.map((image) => ({ jobId, ...image, keepUntil })) });
    });
    this.logger.log(`ai-image.completed job=${jobId} images=${stored.length}`);
    return { images: stored.length };
  }

  /** Downloads one result, keeps only what is safe to serve, and records it as an IMAGE upload of the user. */
  private async store(userId: string, image: ProviderImage): Promise<StoredImage> {
    const bytes = image.body ?? (await download(image.url));
    let body: Buffer;
    let contentType: string;
    let extension: string;
    let width: number | null = null;
    let height: number | null = null;

    if (looksLikeSvg(bytes)) {
      try {
        body = Buffer.from(sanitizeSvg(bytes.toString('utf8')));
      } catch (error) {
        if (error instanceof InvalidSvgError) throw new Error(`The provider returned a broken SVG: ${error.message}`);
        throw error;
      }
      contentType = 'image/svg+xml';
      extension = 'svg';
    } else {
      const metadata = await sharp(bytes).metadata();
      const formats = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;
      const format = metadata.format as keyof typeof formats;
      if (!formats[format] || !metadata.width || !metadata.height) {
        throw new Error(`The provider returned an unsupported image (${metadata.format ?? 'unknown'})`);
      }
      ({ width, height } = metadata);
      if (bytes.length > MAX_STORED_RASTER_BYTES) {
        body = await sharp(bytes).webp({ quality: 92 }).toBuffer();
        contentType = 'image/webp';
        extension = 'webp';
      } else {
        body = bytes;
        contentType = formats[format];
        extension = format === 'jpeg' ? 'jpg' : format;
      }
    }

    const key = `users/${userId}/image/${randomUUID()}.${extension}`;
    const saved = await this.storage.putGeneratedFile({ userId, key, purpose: 'IMAGE', contentType, body });
    if (!saved) throw new UnrecoverableError('File storage is not configured in the worker');
    const { id } = await this.prisma.storedFile.findUniqueOrThrow({ where: { key }, select: { id: true } });
    return { storedFileId: id, width, height };
  }
}

/** Refusals by the provider become final errors (no retry), the blocked ones marked for the studio's message. */
function toFinalError(error: unknown): UnrecoverableError | null {
  if (error instanceof UnrecoverableError) return error;
  if (error instanceof ImageContentBlockedError) return new UnrecoverableError(`${BLOCKED_PREFIX}${error.message}`);
  if (error instanceof ImageRequestRejectedError) return new UnrecoverableError(error.message);
  return null;
}

function looksLikeSvg(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 1024).toString('utf8').trimStart();
  return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
}

async function download(url: string): Promise<Buffer> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !PROVIDER_HOSTS.test(parsed.hostname)) {
    throw new Error(`Refusing to download a result from ${parsed.host}`);
  }
  const response = await fetch(parsed, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Downloading the result failed: HTTP ${response.status}`);
  if (Number(response.headers.get('content-length') ?? 0) > MAX_PROVIDER_IMAGE_BYTES) {
    throw new Error('The result is larger than the files WrapFit stores');
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_PROVIDER_IMAGE_BYTES) throw new Error('The result is larger than the files WrapFit stores');
  return body;
}

/** Vectorize takes small sources only (Recraft: < 4096 px, < 5 MB): larger ones are scaled down as PNG first. */
async function prepareSource(tool: AiImageTool, image: SourceImage): Promise<SourceImage> {
  if (tool !== 'vectorize' || Math.max(image.width, image.height) <= VECTORIZE_MAX_EDGE) return image;
  const { data, info } = await sharp(image.body)
    .resize(VECTORIZE_MAX_EDGE, VECTORIZE_MAX_EDGE, { fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { body: data, contentType: 'image/png', width: info.width, height: info.height };
}
