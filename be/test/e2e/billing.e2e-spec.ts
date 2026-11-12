import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { CreditsService, PlanService, XuWalletService } from '../../src/billing';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/**
 * Billing core (docs/17 S1): the export credit ledger against a real PostgreSQL (row locks), `GET /billing/me` and the
 * admin grant. Needs `docker compose up -d postgres redis`.
 */
describe('Billing core (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let credits: CreditsService;
  let plans: PlanService;

  const run = Date.now();
  let maker: { id: string; cookie: string };
  let admin: { id: string; cookie: string };

  const api = () => request(app.getHttpServer());
  const register = (name: string) => signUp(app, `${name}-${run}@e2e.test`);
  const lotOf = (userId: string, quantity: number, source: 'PURCHASE' | 'ADMIN' = 'ADMIN', expiresAt: Date | null = null) =>
    credits.grant(userId, { quantity, source, expiresAt: source === 'PURCHASE' ? expiresAt ?? inDays(365) : expiresAt });
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    credits = app.get(CreditsService);
    plans = app.get(PlanService);

    maker = await register('billing-maker');
    admin = await register('billing-admin');
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await app.close();
  });

  describe('CreditsService', () => {
    it('lets exactly one of two concurrent debits spend the last credit', async () => {
      const { id } = await register('billing-race');
      await lotOf(id, 1);

      const results = await Promise.allSettled([
        credits.debit(id, { reason: 'EXPORT_UNLOCK' }),
        credits.debit(id, { reason: 'EXPORT_UNLOCK' }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ status: 402, response: { code: 'INSUFFICIENT_CREDITS', balance: 0 } });
      await expect(credits.balance(id)).resolves.toBe(0);
      await expect(prisma.creditDebit.count({ where: { userId: id } })).resolves.toBe(1);
    });

    it('fails a debit when the credits ran out, and skips expired lots', async () => {
      const { id } = await register('billing-empty');
      await expect(credits.debit(id, { reason: 'EXPORT_UNLOCK' })).rejects.toMatchObject({ status: 402 });

      await lotOf(id, 3, 'ADMIN', new Date(Date.now() - 1000));
      await expect(credits.balance(id)).resolves.toBe(0);
      await expect(credits.debit(id, { reason: 'EXPORT_UNLOCK' })).rejects.toMatchObject({ status: 402 });
    });

    it('spends the lot that expires first, across lots, and refunds an operation only once', async () => {
      const { id } = await register('billing-refund');
      const soon = await lotOf(id, 1, 'ADMIN', inDays(3));
      const never = await lotOf(id, 5);

      const { operationId, balance } = await credits.debit(id, { quantity: 2, reason: 'EXPORT_UNLOCK' });
      expect(balance).toBe(4);
      const remaining = async () =>
        Object.fromEntries(
          (await prisma.creditLot.findMany({ where: { userId: id } })).map((lot) => [lot.id, lot.remaining]),
        );
      expect(await remaining()).toEqual({ [soon.id]: 0, [never.id]: 4 });

      const refunds = await Promise.all([credits.refund(operationId), credits.refund(operationId)]);
      expect(refunds.sort()).toEqual([0, 2]);
      await expect(credits.refund(operationId)).resolves.toBe(0);
      expect(await remaining()).toEqual({ [soon.id]: 1, [never.id]: 5 });
    });
  });

  describe('XuWalletService', () => {
    it('grants the allowance of a period once, even to concurrent requests, and keeps xu apart from export credits', async () => {
      const { id } = await register('billing-xu');
      const xu = app.get(XuWalletService);
      await lotOf(id, 3, 'ADMIN');

      const [first, second] = await Promise.all([xu.wallet(id), xu.wallet(id)]);
      expect(first.balance).toBe(50);
      expect(second.balance).toBe(50);
      await expect(prisma.creditLot.count({ where: { userId: id, kind: 'XU' } })).resolves.toBe(1);
      await expect(credits.balance(id)).resolves.toBe(3);

      const { balance } = await prisma.$transaction((tx) => xu.spend(id, { quantity: 10, reason: 'AI_IMAGE' }, tx));
      expect(balance).toBe(40);
      await expect(credits.balance(id)).resolves.toBe(3);
      await expect(
        prisma.$transaction((tx) => xu.spend(id, { quantity: 41, reason: 'AI_IMAGE' }, tx)),
      ).rejects.toMatchObject({ status: 402, response: { kind: 'XU', balance: 40, cost: 41 } });
    });

    it('lets the database refuse money on a lot that was not bought', async () => {
      const { id } = await register('billing-xu-value');
      await expect(
        credits.grant(id, { kind: 'XU', quantity: 10, source: 'ADMIN', expiresAt: null, valueVnd: 1_000 }),
      ).rejects.toThrow(/chk_credit_lots_value_source/);
    });
  });

  describe('PlanService', () => {
    it('follows purchased packs and Pro periods', async () => {
      const { id } = await register('billing-plan');
      await lotOf(id, 2, 'ADMIN');
      await expect(plans.sync(id)).resolves.toBe('FREE'); // credits granted by hand do not change the plan

      await lotOf(id, 1, 'PURCHASE');
      await expect(plans.sync(id)).resolves.toBe('PAY_PER_EXPORT');

      const start = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await prisma.subscription.create({
        data: { userId: id, plan: 'STARTER', currentPeriodStart: start, currentPeriodEnd: inDays(-1) },
      });
      await expect(plans.sync(id)).resolves.toBe('PAY_PER_EXPORT'); // the period has ended
      await expect(prisma.subscription.findFirstOrThrow({ where: { userId: id } })).resolves.toMatchObject({
        status: 'EXPIRED',
      });

      await prisma.subscription.create({
        data: { userId: id, plan: 'STARTER', currentPeriodStart: new Date(), currentPeriodEnd: inDays(30) },
      });
      await expect(plans.sync(id)).resolves.toBe('STARTER');
      await expect(prisma.user.findUniqueOrThrow({ where: { id } })).resolves.toMatchObject({ subscriptionTier: 'STARTER' });
    });
  });

  describe('HTTP', () => {
    it('GET /billing/me returns the plan, its limits and the credit lots', async () => {
      const empty = await api().get('/api/billing/me').set('Cookie', maker.cookie).expect(200);
      expect(empty.body).toMatchObject({
        tier: 'FREE',
        entitlements: { export: { mode: 'FREE_A4' } },
        exportCredits: { balance: 0, lots: [] },
        xu: { balance: 50, lots: [{ source: 'PLAN_ALLOWANCE', remaining: 50 }], allowance: { perPeriod: 50 } },
        subscription: null,
      });

      const history = await api().get('/api/billing/xu/history?limit=5').set('Cookie', maker.cookie).expect(200);
      expect(history.body).toMatchObject({ entries: [{ type: 'GRANT', quantity: 50 }], nextBefore: null });

      await api().get('/api/billing/me').expect(401);
    });

    it('lets only admins grant credits by hand', async () => {
      const grant = (cookie: string, userId = maker.id) =>
        api().post(`/api/admin/users/${userId}/credits`).set('Cookie', cookie);

      await grant(maker.cookie).send({ quantity: 5 }).expect(403);
      await grant(admin.cookie).send({ quantity: 0 }).expect(400);
      await grant(admin.cookie, '0192f3a0-0000-7000-8000-000000000000').send({ quantity: 5 }).expect(404);

      const res = await grant(admin.cookie).send({ quantity: 5, note: 'Tài khoản demo CP4' }).expect(201);
      expect(res.body).toMatchObject({ lot: { source: 'ADMIN', quantity: 5, remaining: 5, expiresAt: null }, balance: 5 });

      const me = await api().get('/api/billing/me').set('Cookie', maker.cookie).expect(200);
      expect(me.body).toMatchObject({ tier: 'FREE', exportCredits: { balance: 5, lots: [{ quantity: 5 }] } });
    });
  });
});
