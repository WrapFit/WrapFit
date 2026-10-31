import { Job, UnrecoverableError } from 'bullmq';
import sharp from 'sharp';
import type { ConfigService } from '../../common';
import type { PrismaService } from '../../shared/prisma';
import type { StorageService } from '../../storage';
import type { AiImageRefunds } from './ai-image-refunds';
import { BLOCKED_PREFIX } from './ai-image.constants';
import { AiImageProcessor } from './ai-image.processor';
import { ImageContentBlockedError, type ImageProvider } from './image-provider';

describe('AiImageProcessor', () => {
  let prisma: {
    aiImageJob: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
    storedFile: { findUniqueOrThrow: jest.Mock };
    aiImageOutput: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let storage: { putGeneratedFile: jest.Mock; getObject: jest.Mock };
  let refunds: { fail: jest.Mock };
  let provider: { generate: jest.Mock; runTool: jest.Mock };
  let processor: AiImageProcessor;
  let png: Buffer;

  const job = (attemptsMade = 0) =>
    ({ data: { aiImageJobId: 'job-1' }, attemptsMade, opts: { attempts: 2 } }) as unknown as Job;

  beforeAll(async () => {
    png = await sharp({ create: { width: 64, height: 32, channels: 3, background: '#f26522' } }).png().toBuffer();
  });

  beforeEach(() => {
    prisma = {
      aiImageJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          userId: 'user-1',
          kind: 'GENERATE',
          modelKey: 'flux2-klein',
          promptEn: 'peach blossoms',
          aspectRatio: '1:1',
          numImages: 1,
          source: null,
        }),
      },
      storedFile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'file-1' }) },
      aiImageOutput: { createMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((run: (db: typeof prisma) => unknown) => run(prisma));
    storage = { putGeneratedFile: jest.fn().mockResolvedValue(true), getObject: jest.fn() };
    refunds = { fail: jest.fn().mockResolvedValue(10) };
    provider = { generate: jest.fn().mockResolvedValue({ requestId: 'req-1', images: [{ body: png }] }), runTool: jest.fn() };
    processor = new AiImageProcessor(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      { get: () => 1 } as unknown as ConfigService,
      refunds as unknown as AiImageRefunds,
      provider as unknown as ImageProvider,
    );
    jest.spyOn(processor['logger'], 'warn').mockImplementation(() => undefined);
    jest.spyOn(processor['logger'], 'log').mockImplementation(() => undefined);
  });

  it('stores the images as IMAGE uploads of the user and completes the job', async () => {
    await expect(processor.process(job())).resolves.toEqual({ images: 1 });

    const [file] = storage.putGeneratedFile.mock.calls[0];
    expect(file).toMatchObject({ userId: 'user-1', purpose: 'IMAGE', contentType: 'image/png' });
    expect(file.key).toMatch(/^users\/user-1\/image\/[0-9a-f-]+\.png$/);
    expect(prisma.aiImageOutput.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ jobId: 'job-1', storedFileId: 'file-1', width: 64, height: 32 })],
    });
    expect(refunds.fail).not.toHaveBeenCalled();
  });

  it('stores an SVG result sanitized, without a pixel size', async () => {
    provider.generate.mockResolvedValue({
      requestId: null,
      images: [{ body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>x</script><rect width="1" height="1"/></svg>') }],
    });
    await processor.process(job());
    const [file] = storage.putGeneratedFile.mock.calls[0];
    expect(file.contentType).toBe('image/svg+xml');
    expect(file.body.toString()).not.toContain('script');
    expect(prisma.aiImageOutput.createMany.mock.calls[0][0].data[0]).toMatchObject({ width: null, height: null });
  });

  it('lets BullMQ retry an outage, and refunds only after the last attempt', async () => {
    provider.generate.mockRejectedValue(new Error('fal 503'));
    await expect(processor.process(job(0))).rejects.toThrow('fal 503');
    expect(refunds.fail).not.toHaveBeenCalled();

    await expect(processor.process(job(1))).rejects.toThrow('fal 503');
    expect(refunds.fail).toHaveBeenCalledWith('job-1', 'fal 503');
  });

  it('refunds a refusal of the provider at once and does not retry it', async () => {
    provider.generate.mockRejectedValue(new ImageContentBlockedError('nsfw'));
    const error = await processor.process(job(0)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnrecoverableError);
    expect(refunds.fail).toHaveBeenCalledWith('job-1', `${BLOCKED_PREFIX}nsfw`);
  });

  it('does nothing for a job finished meanwhile', async () => {
    prisma.aiImageJob.updateMany.mockResolvedValue({ count: 0 });
    await expect(processor.process(job())).resolves.toEqual({ images: 0 });
    expect(provider.generate).not.toHaveBeenCalled();
  });
});
