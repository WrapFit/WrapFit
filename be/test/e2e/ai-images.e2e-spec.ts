import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { FAKE_BLOCKED, FAKE_OUTAGE } from '../../src/ai/image/fake-image.provider';
import { PrismaService } from '../../src/shared/prisma';
import { StorageService } from '../../src/storage';
import { WorkerModule } from '../../src/worker';
import { signUp } from './helpers/accounts';

/**
 * AI images paid with xu (docs/19 S2): the API debits and queues, a real worker context runs the fake provider
 * (AI_IMAGE_PROVIDER=fake, test/e2e-env.ts) and stores the images in SeaweedFS.
 * Needs `docker compose up -d postgres redis seaweedfs storage-init`.
 */
describe('AI images (e2e)', () => {
  let app: INestApplication;
  let worker: INestApplicationContext;
  let prisma: PrismaService;
  let maker: { id: string; cookie: string };

  const run = Date.now();
  const api = () => request(app.getHttpServer());
  const balance = async () =>
    (await api().get('/api/billing/me').set('Cookie', maker.cookie).expect(200)).body.xu.balance as number;
  const create = (body: Record<string, unknown>) => api().post('/api/ai/images').set('Cookie', maker.cookie).send(body);

  /** Polls like the studio does (every 2 s; faster here). A failed first attempt is retried 5 s later. */
  const waitFor = async (jobId: string) => {
    for (let i = 0; i < 200; i++) {
      const res = await api().get(`/api/ai/images/jobs/${jobId}`).set('Cookie', maker.cookie).expect(200);
      if (res.body.status === 'COMPLETED' || res.body.status === 'FAILED') return res.body;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`AI image job ${jobId} did not finish`);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    const workerRef = await Test.createTestingModule({ imports: [WorkerModule] }).compile();
    worker = await workerRef.createNestApplication().init();
    maker = await signUp(app, `ai-images-${run}@e2e.test`);
  });

  beforeEach(() => {
    // POST /ai/images allows 5 requests a minute: each test starts with a fresh count. The in-memory store keeps the
    // hits in a second map next to `storage`: reset both.
    const store = app.get(ThrottlerStorage) as unknown as { storage: Map<string, unknown>; hitExpirations: Map<string, unknown> };
    store.storage.clear();
    store.hitExpirations.clear();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await worker.close();
    await app.close();
  }, 30_000);

  it('lists the models on offer with their price', async () => {
    const res = await api().get('/api/ai/models').set('Cookie', maker.cookie).expect(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.models).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'flux2-klein', xu: 10 })]));
    expect(res.body.models.map((model: { key: string }) => model.key)).not.toContain('gpt-image-2-high');
  });

  it('spends xu per image, draws in the worker and keeps the images in the gallery', async () => {
    expect(await balance()).toBe(50); // Free allowance

    const res = await create({ prompt: 'Hoa đào, màu nước', modelKey: 'flux2-klein', aspectRatio: '1:1', numImages: 2 }).expect(202);
    expect(res.body).toMatchObject({ balance: 30, job: { status: 'PENDING', xuCost: 20 } });

    const job = await waitFor(res.body.job.id);
    expect(job).toMatchObject({ status: 'COMPLETED', error: null });
    expect(job.outputs).toHaveLength(2);
    expect(job.outputs[0]).toMatchObject({ contentType: 'image/png', width: expect.any(Number) });
    const image = await fetch(job.outputs[0].url);
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/png');

    const gallery = await api().get('/api/ai/images').set('Cookie', maker.cookie).expect(200);
    expect(gallery.body.items).toHaveLength(2);

    // A canvas may show the image: it is an IMAGE upload of the user.
    const keys = job.outputs.map((output: { url: string }) => app.get(StorageService).uploadedKeyOf(output.url));
    await expect(prisma.storedFile.count({ where: { key: { in: keys }, userId: maker.id, purpose: 'IMAGE' } })).resolves.toBe(2);
  });

  it('answers 402 when the xu are short, without creating a job', async () => {
    const before = await prisma.aiImageJob.count({ where: { userId: maker.id } });
    const res = await create({ prompt: 'Hộp quà sang trọng', modelKey: 'nano-banana-pro', aspectRatio: '1:1' }).expect(402);
    expect(res.body).toMatchObject({ code: 'INSUFFICIENT_CREDITS', kind: 'XU', balance: 30, cost: 120 });
    await expect(prisma.aiImageJob.count({ where: { userId: maker.id } })).resolves.toBe(before);
  });

  it('gives the xu back when the provider fails on both attempts', async () => {
    const res = await create({ prompt: `Mèo con ${FAKE_OUTAGE}`, modelKey: 'flux2-klein', aspectRatio: '1:1' }).expect(202);
    expect(res.body.balance).toBe(20);
    const job = await waitFor(res.body.job.id);
    expect(job).toMatchObject({ status: 'FAILED', error: 'Tạo ảnh không thành công. Xu đã được hoàn lại.' });
    expect(await balance()).toBe(30);
  }, 30_000);

  it('gives the xu back at once when the provider refuses the content', async () => {
    const res = await create({ prompt: `Thứ gì đó ${FAKE_BLOCKED}`, modelKey: 'flux2-klein', aspectRatio: '1:1' }).expect(202);
    const job = await waitFor(res.body.job.id);
    expect(job.error).toMatch(/từ chối/);
    expect(await balance()).toBe(30);
  });

  it('charges a click sent twice only once', async () => {
    const body = { prompt: 'Lá dừa', modelKey: 'flux2-klein', aspectRatio: '3:2', clientRequestId: '0192f3a0-0000-7000-8000-00000000c11c' };
    const [first, second] = await Promise.all([create(body).expect(202), create(body).expect(202)]);
    expect(second.body.job.id).toBe(first.body.job.id);
    await waitFor(first.body.job.id);
    expect(await balance()).toBe(20);
  });

  it('upscales one AI image for xu', async () => {
    const [output] = (await api().get('/api/ai/images').set('Cookie', maker.cookie).expect(200)).body.items;
    const res = await api().post(`/api/ai/images/${output.id}/upscale`).set('Cookie', maker.cookie).send({}).expect(202);
    expect(res.body).toMatchObject({ balance: 0, job: { kind: 'UPSCALE', xuCost: 20 } });
    const job = await waitFor(res.body.job.id);
    expect(job.status).toBe('COMPLETED');
    expect(job.outputs[0].width).toBeGreaterThan(output.width * 2);
  }, 30_000);
});
