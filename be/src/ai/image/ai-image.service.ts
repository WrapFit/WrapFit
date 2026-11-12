import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AiImageJobKind, Prisma } from '@prisma/client';
import {
  AI_IMAGE_MODEL_BY_KEY,
  AI_IMAGE_MODELS,
  XU_TOOL_COST,
  type AiImageModel,
  type AiImageModelKey,
  type AiImageTool,
} from '@wrapfit/shared';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { XuWalletService, type XuDebitReason } from '../../billing';
import { ConfigService, currentRequestId, QUEUE_ADD_TIMEOUT_MS, withTimeout } from '../../common';
import { PrismaService } from '../../shared/prisma';
import { assetUrl, StorageService } from '../../storage';
import { AiCostGuard } from '../ai-cost.guard';
import { AiImageRefunds } from './ai-image-refunds';
import {
  AI_IMAGE_JOB_OPTIONS,
  AI_IMAGE_QUEUE,
  AiImageJobData,
  BLOCKED_PREFIX,
  MAX_ACTIVE_AI_IMAGE_JOBS,
  RUN_JOB,
  UNFINISHED_AI_IMAGE,
} from './ai-image.constants';
import type { AiGalleryQueryDto, AiImageToolDto } from './dto/ai-image-tool.dto';
import type { CreateAiImageDto } from './dto/create-ai-image.dto';
import { TOOL_COST_USD, UPSCALE_MIN_FACTOR, upscaleFactor } from './fal-models';
import type { PromptRewriter } from './prompt-rewriter';

/** The PromptRewriter of the API: Claude when ANTHROPIC_API_KEY is set, the plain one otherwise. */
export const PROMPT_REWRITER = Symbol('PROMPT_REWRITER');

const TOOL_KIND: Record<AiImageTool, AiImageJobKind> = {
  upscale: 'UPSCALE',
  'remove-bg': 'REMOVE_BG',
  vectorize: 'VECTORIZE',
};

const OUTPUT_SELECT = {
  id: true,
  width: true,
  height: true,
  keepUntil: true,
  createdAt: true,
  storedFile: { select: { key: true, contentType: true } },
} satisfies Prisma.AiImageOutputSelect;

const JOB_SELECT = {
  id: true,
  kind: true,
  modelKey: true,
  status: true,
  prompt: true,
  aspectRatio: true,
  numImages: true,
  xuCost: true,
  errorLog: true,
  createdAt: true,
  completedAt: true,
  outputs: { select: OUTPUT_SELECT, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.AiImageJobSelect;

type OutputRow = Prisma.AiImageOutputGetPayload<{ select: typeof OUTPUT_SELECT }>;
type JobRow = Prisma.AiImageJobGetPayload<{ select: typeof JOB_SELECT }>;

export interface AiImageOutputView {
  id: string;
  url: string | null;
  contentType: string;
  /** null for an SVG. */
  width: number | null;
  height: number | null;
  /** Deleted after this date unless it is on a saved design. */
  keepUntil: Date;
  createdAt: Date;
}

export interface AiImageJobView {
  id: string;
  kind: AiImageJobKind;
  modelKey: string;
  status: JobRow['status'];
  prompt: string | null;
  aspectRatio: string | null;
  numImages: number;
  xuCost: number;
  /** Vietnamese message of a FAILED job (its xu came back). */
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
  outputs: AiImageOutputView[];
}

type NewJob = Omit<Prisma.AiImageJobUncheckedCreateInput, 'userId' | 'debitOperationId'> & {
  xuCost: number;
  estCostUsd: number;
};

const unavailable = (message: string) =>
  new ServiceUnavailableException({ code: 'AI_IMAGE_UNAVAILABLE', message });

/**
 * AI images paid with xu (docs/19 S2), API side. A request is checked (model, storage, cost fuse, prompt) before any xu
 * is spent; the debit and the job row are written in one transaction, then the job goes to the `ai-image` queue that
 * AiImageProcessor runs in the worker. A job that fails on our side gives its xu back (AiImageRefunds).
 */
@Injectable()
export class AiImageService {
  private readonly logger = new Logger(AiImageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xuWallet: XuWalletService,
    private readonly storage: StorageService,
    private readonly costGuard: AiCostGuard,
    private readonly refunds: AiImageRefunds,
    private readonly config: ConfigService,
    @Inject(PROMPT_REWRITER) private readonly rewriter: PromptRewriter,
    @InjectQueue(AI_IMAGE_QUEUE) private readonly queue: Queue<AiImageJobData>,
  ) {}

  /** Models on offer with their price, and the price of each tool. `enabled` false: the studio hides AI images. */
  catalog() {
    const offered = new Set<AiImageModelKey>(this.config.get('ai.image.models'));
    return {
      enabled: this.config.get('ai.image.enabled') && this.storage.enabled,
      models: AI_IMAGE_MODELS.filter((model) => offered.has(model.key)).map(
        ({ key, label, tier, xu, output, supportsText, aspectRatios, maxImages, summary }) => ({
          key,
          label,
          tier,
          xu,
          output,
          supportsText,
          aspectRatios,
          maxImages,
          summary,
        }),
      ),
      tools: XU_TOOL_COST,
    };
  }

  async create(userId: string, dto: CreateAiImageDto): Promise<{ job: AiImageJobView; balance: number }> {
    const model = this.offeredModel(dto.modelKey);
    const numImages = dto.numImages ?? 1;
    const allowText = dto.allowText ?? false;
    if (!model.aspectRatios.includes(dto.aspectRatio)) {
      throw new BadRequestException(`${model.label} does not draw ${dto.aspectRatio} images`);
    }
    if (numImages > model.maxImages) throw new BadRequestException(`${model.label} draws at most ${model.maxImages} images at once`);
    if (allowText && !model.supportsText) throw new BadRequestException(`${model.label} cannot draw lettering`);

    const replay = await this.replay(userId, dto.clientRequestId);
    if (replay) return replay;
    await this.assertCanRun(userId);

    const verdict = await this.rewriter.rewrite({
      prompt: dto.prompt,
      aspectRatio: dto.aspectRatio,
      allowText,
      vector: model.output === 'vector',
    });
    if (!verdict.allowed) {
      throw new UnprocessableEntityException({ code: 'PROMPT_REJECTED', message: verdict.reason });
    }

    return this.charge(
      userId,
      {
        kind: 'GENERATE',
        modelKey: model.key,
        prompt: dto.prompt,
        promptEn: verdict.prompt,
        aspectRatio: dto.aspectRatio,
        allowText,
        numImages,
        xuCost: model.xu * numImages,
        estCostUsd: model.estCostUsd * numImages + verdict.costUsd,
        clientRequestId: dto.clientRequestId,
      },
      'AI_IMAGE',
    );
  }

  /** Upscale, background removal or vectorizing of one AI image of the user. */
  async runTool(
    userId: string,
    outputId: string,
    tool: AiImageTool,
    dto: AiImageToolDto,
  ): Promise<{ job: AiImageJobView; balance: number }> {
    const output = await this.prisma.aiImageOutput.findFirst({
      where: { id: outputId, job: { userId } },
      select: { width: true, height: true },
    });
    if (!output) throw new NotFoundException('AI image not found');
    if (output.width === null || output.height === null) {
      throw new BadRequestException('A vector image is sharp at any size already');
    }
    if (tool === 'upscale' && upscaleFactor(output.width, output.height) < UPSCALE_MIN_FACTOR) {
      throw new BadRequestException('This image is as large as an upscale makes it');
    }

    const replay = await this.replay(userId, dto.clientRequestId);
    if (replay) return replay;
    await this.assertCanRun(userId);

    return this.charge(
      userId,
      {
        kind: TOOL_KIND[tool],
        modelKey: tool,
        sourceOutputId: outputId,
        numImages: 1,
        xuCost: XU_TOOL_COST[tool],
        estCostUsd: TOOL_COST_USD[tool],
        clientRequestId: dto.clientRequestId,
      },
      'AI_TOOL',
    );
  }

  async job(userId: string, jobId: string): Promise<AiImageJobView> {
    const job = await this.prisma.aiImageJob.findFirst({ where: { id: jobId, userId }, select: JOB_SELECT });
    if (!job) throw new NotFoundException('AI image job not found');
    return toJobView(job);
  }

  /** "Ảnh AI của tôi": the images still kept, newest first. `nextBefore` continues the list. */
  async gallery(userId: string, { before = new Date(), limit = 30 }: AiGalleryQueryDto) {
    const rows = await this.prisma.aiImageOutput.findMany({
      where: { job: { userId }, createdAt: { lt: before } },
      select: { ...OUTPUT_SELECT, job: { select: { id: true, kind: true, modelKey: true, prompt: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      items: rows.map(({ job, ...output }) => ({ ...toOutputView(output), job })),
      nextBefore: rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null,
    };
  }

  private offeredModel(key: AiImageModelKey): AiImageModel {
    const offered = this.config.get('ai.image.models') as AiImageModelKey[];
    if (!offered.includes(key)) throw new BadRequestException(`Model ${key} is not on offer`);
    return AI_IMAGE_MODEL_BY_KEY[key];
  }

  /** The job a retried click already created, with the current balance; null for a new request. */
  private async replay(userId: string, clientRequestId?: string) {
    if (!clientRequestId) return null;
    const job = await this.prisma.aiImageJob.findUnique({
      where: { userId_clientRequestId: { userId, clientRequestId } },
      select: JOB_SELECT,
    });
    if (!job) return null;
    return { job: toJobView(job), balance: (await this.xuWallet.wallet(userId)).balance };
  }

  /** Everything that would make the job fail for sure, checked before any xu is spent. */
  private async assertCanRun(userId: string): Promise<void> {
    if (!this.config.get('ai.image.enabled') || !this.storage.enabled) throw unavailable('Ảnh AI đang tạm tắt');
    if (await this.costGuard.budgetReached()) throw unavailable('Ảnh AI đang tạm dừng, hãy thử lại sau');

    const [active, usage] = await Promise.all([
      this.prisma.aiImageJob.count({ where: { userId, status: UNFINISHED_AI_IMAGE } }),
      this.storage.usage(userId),
    ]);
    if (active >= MAX_ACTIVE_AI_IMAGE_JOBS) {
      throw new HttpException(
        { code: 'AI_IMAGE_BUSY', message: `Chờ ${active} ảnh đang tạo xong rồi tạo tiếp` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (usage.usedBytes >= usage.quotaBytes) {
      throw new ForbiddenException({ code: 'STORAGE_QUOTA_EXCEEDED', message: 'Bộ nhớ của gói đã đầy, hãy xóa bớt ảnh' });
    }
  }

  private async charge(
    userId: string,
    data: NewJob,
    reason: XuDebitReason,
  ): Promise<{ job: AiImageJobView; balance: number }> {
    const operationId = randomUUID();
    let created: { job: JobRow; balance: number };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const job = await tx.aiImageJob.create({
          data: { ...data, userId, debitOperationId: operationId },
          select: JOB_SELECT,
        });
        const { balance } = await this.xuWallet.spend(
          userId,
          { quantity: data.xuCost, reason, refId: job.id, operationId },
          tx,
        );
        return { job, balance };
      });
    } catch (error) {
      // The same click arrived twice at once: the second one returns the job of the first.
      const replay = isClientRequestTaken(error) ? await this.replay(userId, data.clientRequestId ?? undefined) : null;
      if (replay) return replay;
      throw error;
    }
    await this.costGuard.addUsd(data.estCostUsd);
    this.logger.log(`ai-image.created job=${created.job.id} user=${userId} model=${data.modelKey} xu=${data.xuCost}`);

    try {
      await withTimeout(
        this.queue.add(
          RUN_JOB,
          { aiImageJobId: created.job.id, requestId: currentRequestId() },
          { ...AI_IMAGE_JOB_OPTIONS, jobId: created.job.id },
        ),
        QUEUE_ADD_TIMEOUT_MS,
        'ai-image queue',
      );
    } catch (error) {
      this.logger.error('Could not queue the AI image job', error instanceof Error ? error.stack : String(error));
      await this.refunds.fail(created.job.id, 'The AI image queue is unavailable');
      throw unavailable('Hàng đợi ảnh AI đang bận, xu đã được hoàn. Hãy thử lại sau ít phút');
    }
    return { job: toJobView(created.job), balance: created.balance };
  }
}

function toOutputView(output: OutputRow): AiImageOutputView {
  return {
    id: output.id,
    url: assetUrl(output.storedFile.key),
    contentType: output.storedFile.contentType,
    width: output.width,
    height: output.height,
    keepUntil: output.keepUntil,
    createdAt: output.createdAt,
  };
}

function toJobView({ errorLog, outputs, ...job }: JobRow): AiImageJobView {
  let error: string | null = null;
  if (job.status === 'FAILED') {
    error = errorLog?.startsWith(BLOCKED_PREFIX)
      ? 'Nhà cung cấp AI từ chối vẽ nội dung này. Xu đã được hoàn lại.'
      : 'Tạo ảnh không thành công. Xu đã được hoàn lại.';
  }
  return { ...job, error, outputs: outputs.map(toOutputView) };
}

function isClientRequestTaken(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  // Column names, field names or the index name, depending on the Prisma version.
  return /client_?request_?id/i.test(JSON.stringify(error.meta?.target ?? ''));
}
