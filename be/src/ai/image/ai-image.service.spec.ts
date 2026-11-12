import { HttpStatus } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { XuWalletService } from '../../billing';
import type { ConfigService } from '../../common';
import type { PrismaService } from '../../shared/prisma';
import type { StorageService } from '../../storage';
import type { AiCostGuard } from '../ai-cost.guard';
import type { AiImageRefunds } from './ai-image-refunds';
import { AiImageService } from './ai-image.service';
import type { CreateAiImageDto } from './dto/create-ai-image.dto';
import type { PromptRewriter } from './prompt-rewriter';

describe('AiImageService', () => {
  const settings: Record<string, unknown> = {
    'ai.image.enabled': true,
    'ai.image.models': ['flux2-klein', 'seedream-4.5', 'nano-banana-pro'],
  };
  const jobRow = {
    id: 'job-1',
    kind: 'GENERATE',
    modelKey: 'seedream-4.5',
    status: 'PENDING',
    prompt: 'hoa đào',
    aspectRatio: '1:1',
    numImages: 2,
    xuCost: 60,
    errorLog: null,
    createdAt: new Date(),
    completedAt: null,
    outputs: [],
  };
  let tx: { aiImageJob: { create: jest.Mock } };
  let prisma: {
    $transaction: jest.Mock;
    aiImageJob: { count: jest.Mock; findUnique: jest.Mock };
    aiImageOutput: { findFirst: jest.Mock };
  };
  let xuWallet: { spend: jest.Mock; wallet: jest.Mock };
  let storage: { enabled: boolean; usage: jest.Mock };
  let costGuard: { budgetReached: jest.Mock; addUsd: jest.Mock };
  let refunds: { fail: jest.Mock };
  let rewriter: { rewrite: jest.Mock };
  let queue: { add: jest.Mock };
  let service: AiImageService;

  const dto = (overrides: Partial<CreateAiImageDto> = {}): CreateAiImageDto => ({
    prompt: 'hoa đào',
    modelKey: 'seedream-4.5',
    aspectRatio: '1:1',
    numImages: 2,
    ...overrides,
  });

  beforeEach(() => {
    tx = { aiImageJob: { create: jest.fn().mockResolvedValue(jobRow) } };
    prisma = {
      $transaction: jest.fn((run: (db: typeof tx) => unknown) => run(tx)),
      aiImageJob: { count: jest.fn().mockResolvedValue(0), findUnique: jest.fn().mockResolvedValue(null) },
      aiImageOutput: { findFirst: jest.fn() },
    };
    xuWallet = {
      spend: jest.fn().mockResolvedValue({ operationId: 'op', balance: 440 }),
      wallet: jest.fn().mockResolvedValue({ balance: 440 }),
    };
    storage = { enabled: true, usage: jest.fn().mockResolvedValue({ usedBytes: 0, quotaBytes: 100 }) };
    costGuard = { budgetReached: jest.fn().mockResolvedValue(false), addUsd: jest.fn() };
    refunds = { fail: jest.fn().mockResolvedValue(60) };
    rewriter = { rewrite: jest.fn().mockResolvedValue({ allowed: true, prompt: 'peach blossoms', costUsd: 0.001 }) };
    queue = { add: jest.fn().mockResolvedValue({}) };
    service = new AiImageService(
      prisma as unknown as PrismaService,
      xuWallet as unknown as XuWalletService,
      storage as unknown as StorageService,
      costGuard as unknown as AiCostGuard,
      refunds as unknown as AiImageRefunds,
      { get: (key: string) => settings[key] } as unknown as ConfigService,
      rewriter as unknown as PromptRewriter,
      queue as unknown as Queue,
    );
  });

  it('lists only the models on offer', () => {
    expect(service.catalog().models.map((model) => model.key)).toEqual(['flux2-klein', 'seedream-4.5', 'nano-banana-pro']);
  });

  it('charges the price per image with the job, then queues it', async () => {
    const result = await service.create('user-1', dto());

    expect(tx.aiImageJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', promptEn: 'peach blossoms', xuCost: 60, numImages: 2 }),
      }),
    );
    const [{ data }] = tx.aiImageJob.create.mock.calls[0];
    expect(data.estCostUsd).toBeCloseTo(0.081);
    expect(xuWallet.spend).toHaveBeenCalledWith(
      'user-1',
      { quantity: 60, reason: 'AI_IMAGE', refId: 'job-1', operationId: data.debitOperationId },
      tx,
    );
    expect(queue.add).toHaveBeenCalledWith('run', expect.objectContaining({ aiImageJobId: 'job-1' }), expect.objectContaining({ jobId: 'job-1' }));
    expect(result).toMatchObject({ balance: 440, job: { id: 'job-1', error: null } });
  });

  it('refuses a prompt before any xu is spent', async () => {
    rewriter.rewrite.mockResolvedValue({ allowed: false, reason: 'Không in được', costUsd: 0 });
    await expect(service.create('user-1', dto())).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { code: 'PROMPT_REJECTED', message: 'Không in được' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['a model not on offer', dto({ modelKey: 'gpt-image-2-medium' })],
    ['a ratio the model does not draw', dto({ modelKey: 'flux2-klein', aspectRatio: '1:1', numImages: 5 })],
    ['lettering on a model without it', dto({ allowText: true })],
  ])('answers 400 to %s', async (_label, request) => {
    await expect(service.create('user-1', request)).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(rewriter.rewrite).not.toHaveBeenCalled();
  });

  it('answers 503 without spending once the monthly AI budget is reached', async () => {
    costGuard.budgetReached.mockResolvedValue(true);
    await expect(service.create('user-1', dto())).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: { code: 'AI_IMAGE_UNAVAILABLE' },
    });
    expect(rewriter.rewrite).not.toHaveBeenCalled();
  });

  it('limits the jobs of one user running at once', async () => {
    prisma.aiImageJob.count.mockResolvedValue(3);
    await expect(service.create('user-1', dto())).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('gives the xu back when the queue is down', async () => {
    queue.add.mockRejectedValue(new Error('redis down'));
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
    await expect(service.create('user-1', dto())).rejects.toMatchObject({ status: HttpStatus.SERVICE_UNAVAILABLE });
    expect(refunds.fail).toHaveBeenCalledWith('job-1', expect.stringContaining('queue'));
  });

  it('returns the job of a click sent twice without charging again', async () => {
    prisma.aiImageJob.findUnique.mockResolvedValue(jobRow);
    const result = await service.create('user-1', dto({ clientRequestId: '0192f3a0-0000-7000-8000-000000000001' }));
    expect(result.job.id).toBe('job-1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses tools on a vector image and an upscale that would not grow the image', async () => {
    prisma.aiImageOutput.findFirst.mockResolvedValueOnce({ width: null, height: null });
    await expect(service.runTool('user-1', 'out-1', 'remove-bg', {})).rejects.toMatchObject({ status: 400 });
    prisma.aiImageOutput.findFirst.mockResolvedValueOnce({ width: 4096, height: 4096 });
    await expect(service.runTool('user-1', 'out-1', 'upscale', {})).rejects.toMatchObject({ status: 400 });
  });

  it('charges a tool on one image', async () => {
    prisma.aiImageOutput.findFirst.mockResolvedValue({ width: 1024, height: 1024 });
    await service.runTool('user-1', 'out-1', 'upscale', {});
    expect(tx.aiImageJob.create.mock.calls[0][0].data).toMatchObject({ kind: 'UPSCALE', sourceOutputId: 'out-1', xuCost: 20 });
    expect(xuWallet.spend.mock.calls[0][1]).toMatchObject({ quantity: 20, reason: 'AI_TOOL' });
  });
});
