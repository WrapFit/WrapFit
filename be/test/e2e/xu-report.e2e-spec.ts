import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/**
 * Admin xu report (docs/19 S5) against a real PostgreSQL. The rows are dated in February 2001 (Vietnam time), a month
 * no other test or dev data uses, so the totals of that month are exactly the rows written here.
 */
describe('Xu report (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now();
  let maker: { id: string; cookie: string };
  let admin: { id: string; cookie: string };

  const api = () => request(app.getHttpServer());
  const at = (day: number) => new Date(Date.UTC(2001, 1, day, 5));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    maker = await signUp(app, `xu-report-maker-${run}@e2e.test`);
    admin = await signUp(app, `xu-report-admin-${run}@e2e.test`);
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });

    const userId = maker.id;
    // A pack of 500 xu bought for 50.000đ (100 spent, 10 spent then refunded), and an allowance of 50 xu that
    // expired within the month with 30 left.
    const pack = await prisma.creditLot.create({
      data: {
        userId,
        kind: 'XU',
        source: 'PURCHASE',
        quantity: 500,
        remaining: 400,
        valueVnd: 50_000,
        expiresAt: new Date('2099-01-01'),
        createdAt: at(10),
      },
    });
    const allowance = await prisma.creditLot.create({
      data: {
        userId,
        kind: 'XU',
        source: 'PLAN_ALLOWANCE',
        quantity: 50,
        remaining: 30,
        periodKey: `FREE:2001-02:${run}`,
        expiresAt: at(20),
        createdAt: at(1),
      },
    });
    await prisma.creditDebit.createMany({
      data: [
        {
          operationId: randomUUID(),
          lotId: pack.id,
          userId,
          quantity: 100,
          reason: 'AI_IMAGE',
          createdAt: at(11),
        },
        {
          operationId: randomUUID(),
          lotId: allowance.id,
          userId,
          quantity: 20,
          reason: 'AI_PATTERN',
          createdAt: at(12),
        },
        {
          operationId: randomUUID(),
          lotId: pack.id,
          userId,
          quantity: 10,
          reason: 'AI_IMAGE',
          createdAt: at(13),
          refundedAt: at(13),
        },
      ],
    });
    const job = (status: 'COMPLETED' | 'FAILED') => ({
      userId,
      kind: 'GENERATE' as const,
      modelKey: 'seedream-4.5',
      prompt: 'Hoa đào',
      xuCost: 30,
      estCostUsd: 0.04,
      status,
      debitOperationId: randomUUID(),
      createdAt: at(11),
      completedAt: status === 'COMPLETED' ? at(11) : null,
    });
    await prisma.aiImageJob.createMany({
      data: [job('COMPLETED'), job('FAILED')],
    });
    await prisma.aiGeneration.create({
      data: {
        userId,
        theme: 'Tết',
        model: 'claude-haiku-5-5',
        inputTokens: 1_000,
        outputTokens: 400,
        credits: 1,
        createdAt: at(12),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${run}@e2e.test` } },
    });
    await app.close();
  });

  it('is for admins only and checks the month', async () => {
    await api().get('/api/admin/analytics/xu').set('Cookie', maker.cookie).expect(403);
    await api().get('/api/admin/analytics/xu?month=2001-13').set('Cookie', admin.cookie).expect(400);
    const now = await api().get('/api/admin/analytics/xu').set('Cookie', admin.cookie).expect(200);
    expect(now.body.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('values spent xu at the money paid for their lot and nets the provider cost', async () => {
    const res = await api().get('/api/admin/analytics/xu?month=2001-02').set('Cookie', admin.cookie).expect(200);
    const rate: number = res.body.usdVndRate;
    const imageVnd = Math.round(0.04 * rate);
    const patternVnd = Math.round(((1_000 * 0.1 + 400 * 0.5) / 1_000_000) * rate);

    expect(res.body).toMatchObject({
      month: '2001-02',
      from: '2001-01-31T17:00:00.000Z',
      to: '2001-02-28T17:00:00.000Z',
      issued: [
        { source: 'PURCHASE', xu: 500, lots: 1, valueVnd: 50_000 },
        { source: 'PLAN_ALLOWANCE', xu: 50, lots: 1, valueVnd: 0 },
      ],
      spent: [
        { reason: 'AI_IMAGE', xu: 100, operations: 1, revenueVnd: 10_000 },
        { reason: 'AI_PATTERN', xu: 20, operations: 1, revenueVnd: 0 },
      ],
      refundedXu: 10,
      recognizedRevenueVnd: 10_000,
      expired: { xu: 30, valueVnd: 0 },
      providerCost: [
        {
          kind: 'IMAGE',
          model: 'seedream-4.5',
          jobs: 1,
          xu: 30,
          costUsd: 0.04,
          costVnd: imageVnd,
        },
        {
          kind: 'PATTERN',
          model: 'claude-haiku-5-5',
          jobs: 1,
          xu: 1,
          costVnd: patternVnd,
        },
      ],
      providerCostVnd: imageVnd + patternVnd,
      grossMarginVnd: 10_000 - imageVnd - patternVnd,
      spentListValueVnd: 12_000,
    });
    expect(res.body.grossMarginRate).toBeCloseTo((10_000 - imageVnd - patternVnd) / 10_000, 3);
    // Purchased xu still spendable now, ours included: 400 xu worth 40.000đ.
    expect(res.body.outstanding.xu).toBeGreaterThanOrEqual(400);
    expect(res.body.outstanding.valueVnd).toBeGreaterThanOrEqual(40_000);
  });
});
