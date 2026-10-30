import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { crc16 } from '../../src/payments';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * VietQR payments (docs/17 S5) against a real PostgreSQL: create, poll, expire, and the simulated confirmation that
 * grants an export pack, 30 days of Pro or pays a sample order, once. e2e-env.ts turns PAYMENT_SIMULATION on; the last
 * test boots a second app with it off. Needs `docker compose up -d postgres redis`.
 */
describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  type Account = { id: string; cookie: string };
  let buyer: Account;
  let stranger: Account;

  const api = () => request(app.getHttpServer());
  const as = (user: Account) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
  });
  const register = async (name: string): Promise<Account> => {
    const { id, cookie } = await signUp(app, `pay-${name}-${run}@e2e.test`);
    return { id, cookie };
  };
  const pay = async (user: Account, body: Record<string, unknown>) =>
    (await as(user).post('/api/payments').send(body).expect(201)).body;
  const confirm = (user: Account, id: string) => as(user).post(`/api/payments/${id}/simulate-confirm`);
  const newProject = async (user: Account) =>
    (
      await as(user)
        .post('/api/projects')
        .send({
          templateId: 'tuck-top',
          title: 'Hộp nến 80×80×95',
          dimensions: { length: 80, width: 80, height: 95 },
          canvasState: { elements: [] },
        })
        .expect(201)
    ).body.id as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    buyer = await register('buyer');
    stranger = await register('stranger');
  });

  // Every request comes from one IP: give each test a fresh rate-limit budget (POST /payments, POST /exports).
  beforeEach(() => {
    const store = app.get(ThrottlerStorage) as unknown as { storage: Map<string, unknown>; hitExpirations: Map<string, unknown> };
    store.storage.clear();
    store.hitExpirations.clear();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await app.close();
  });

  it('creates a 15-minute VietQR payment with a valid EMVCo payload', async () => {
    const before = Date.now();
    const payment = await pay(buyer, { purpose: 'EXPORT_1' });

    expect(payment).toMatchObject({ purpose: 'EXPORT_1', status: 'PENDING', amountVnd: 19_000, credits: 1, orderId: null });
    expect(payment.reference).toMatch(/^WF[A-HJ-NP-Z2-9]{6}$/);
    const ttl = new Date(payment.expiresAt).getTime() - before;
    expect(ttl).toBeGreaterThan(14.9 * 60_000);
    expect(ttl).toBeLessThanOrEqual(15 * 60_000 + 5_000);

    const { payload, qrSvg, sample, bankName, accountNo } = payment.vietqr;
    expect(sample).toBe(true);
    expect(bankName).toBe('Vietcombank');
    expect(accountNo).toBe('0000000000');
    expect(payload).toContain('0010A000000727');
    expect(payload).toContain('5405190005802VN');
    expect(payload).toContain(`0808${payment.reference}`);
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
    expect(qrSvg).toMatch(/^<svg/);

    const polled = (await as(buyer).get(`/api/payments/${payment.id}`).expect(200)).body;
    expect(polled).toMatchObject({ id: payment.id, status: 'PENDING', reference: payment.reference });
    await as(stranger).get(`/api/payments/${payment.id}`).expect(404);
    await api().get(`/api/payments/${payment.id}`).expect(401);
  });

  it('rejects an unknown purpose and a misplaced or missing orderId', async () => {
    await as(buyer).post('/api/payments').send({ purpose: 'EXPORT_100' }).expect(400);
    await as(buyer).post('/api/payments').send({ purpose: 'SAMPLE_ORDER' }).expect(400);
    await as(buyer)
      .post('/api/payments')
      .send({ purpose: 'EXPORT_5', orderId: '01970000-0000-7000-8000-000000000000' })
      .expect(400);
    await as(buyer)
      .post('/api/payments')
      .send({ purpose: 'SAMPLE_ORDER', orderId: '01970000-0000-7000-8000-000000000000' })
      .expect(404);
  });

  it('grants an export pack once, even when confirmed twice at the same time', async () => {
    const user = await register('pack');
    const payment = await pay(user, { purpose: 'EXPORT_5' });
    expect(payment.amountVnd).toBe(79_000);

    const [first, second] = await Promise.all([confirm(user, payment.id), confirm(user, payment.id)]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toMatchObject({ status: 'PAID', vietqr: null });
    expect((await confirm(user, payment.id).expect(200)).body.status).toBe('PAID');

    const lots = await prisma.creditLot.findMany({ where: { userId: user.id } });
    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ source: 'PURCHASE', quantity: 5, remaining: 5, paymentId: payment.id });
    expect(lots[0].expiresAt!.getTime() - Date.now()).toBeGreaterThan(360 * DAY_MS);

    const billing = (await as(user).get('/api/billing/me').expect(200)).body;
    expect(billing).toMatchObject({ tier: 'PAY_PER_EXPORT', exportCredits: { balance: 5 }, paymentSimulation: true });
    await confirm(stranger, payment.id).expect(404);
  });

  it('starts 30 days of Pro, and a second Pro payment extends the same period', async () => {
    const user = await register('pro');
    const first = await pay(user, { purpose: 'PRO_MONTH' });
    expect(first.amountVnd).toBe(99_000);
    await confirm(user, first.id).expect(200);

    const [sub] = await prisma.subscription.findMany({ where: { userId: user.id } });
    expect(sub).toMatchObject({ plan: 'STARTER', status: 'ACTIVE', paymentId: first.id });
    expect(sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()).toBe(30 * DAY_MS);
    expect((await as(user).get('/api/billing/me').expect(200)).body.tier).toBe('STARTER');

    const second = await pay(user, { purpose: 'PRO_MONTH' });
    await confirm(user, second.id).expect(200);
    const subs = await prisma.subscription.findMany({ where: { userId: user.id } });
    expect(subs).toHaveLength(1);
    expect(subs[0].currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()).toBe(60 * DAY_MS);
    expect(subs[0].paymentId).toBe(second.id);
  });

  it('pays a sample order: one QR per order, the order becomes PAID with the payment linked', async () => {
    const projectId = await newProject(buyer);
    const order = (
      await as(buyer)
        .post('/api/orders/sample')
        .send({ projectId, recipientName: 'Nguyễn Mai Anh', phone: '0901234567', shippingAddress: '12 Lý Tự Trọng, Q.1' })
        .expect(201)
    ).body;
    expect(order.orderStatus).toBe('PENDING_PAYMENT');

    await as(stranger).post('/api/payments').send({ purpose: 'SAMPLE_ORDER', orderId: order.id }).expect(404);
    const payment = await pay(buyer, { purpose: 'SAMPLE_ORDER', orderId: order.id });
    expect(payment).toMatchObject({ amountVnd: 49_000, orderId: order.id, credits: null });
    expect((await pay(buyer, { purpose: 'SAMPLE_ORDER', orderId: order.id })).id).toBe(payment.id);

    await confirm(buyer, payment.id).expect(200);
    await confirm(buyer, payment.id).expect(200);
    const paid = (await as(buyer).get(`/api/orders/${order.id}`).expect(200)).body;
    expect(paid).toMatchObject({ orderStatus: 'PAID', paymentId: payment.id });
    expect(paid.paidAt).not.toBeNull();
    const history = await prisma.orderStatusHistory.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } });
    expect(history.map((h) => h.toStatus)).toEqual(['PENDING_PAYMENT', 'PAID']);

    await as(buyer).post('/api/payments').send({ purpose: 'SAMPLE_ORDER', orderId: order.id }).expect(409);
  });

  it('expires a payment after 15 minutes: no QR, no confirmation', async () => {
    const payment = await pay(buyer, { purpose: 'EXPORT_1' });
    await prisma.payment.update({ where: { id: payment.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await confirm(buyer, payment.id).expect(409);
    expect(res.body).toMatchObject({ code: 'PAYMENT_EXPIRED' });
    const polled = (await as(buyer).get(`/api/payments/${payment.id}`).expect(200)).body;
    expect(polled).toMatchObject({ status: 'EXPIRED', vietqr: null });
    await confirm(buyer, payment.id).expect(409);
    await expect(prisma.creditLot.count({ where: { paymentId: payment.id } })).resolves.toBe(0);
  });

  it('runs the Free flow: clean SVG needs a credit, buy 1, confirm, export clean', async () => {
    const user = await register('free');
    const projectId = await newProject(user);
    const exportSvg = (useCredit?: boolean) =>
      as(user).post(`/api/projects/${projectId}/exports`).send({ fileType: 'SVG', useCredit });

    expect((await exportSvg().expect(402)).body).toMatchObject({ code: 'EXPORT_CREDIT_REQUIRED', balance: 0 });
    const payment = await pay(user, { purpose: 'EXPORT_1' });
    await confirm(user, payment.id).expect(200);
    const started = (await exportSvg(true).expect(202)).body;
    expect(started).toMatchObject({ watermarked: false, charged: true, exportCredits: { balance: 0 } });
  });

  it('answers 404 to simulate-confirm when PAYMENT_SIMULATION is off', async () => {
    const payment = await pay(buyer, { purpose: 'EXPORT_1' });
    const previous = process.env.PAYMENT_SIMULATION;
    process.env.PAYMENT_SIMULATION = 'false';
    let live = undefined as INestApplication | undefined;
    try {
      // A fresh module registry re-reads the environment: ConfigModule.forRoot runs when app.module is imported.
      await jest.isolateModulesAsync(async () => {
        const { AppModule: IsolatedAppModule } = await import('../../src/app.module');
        const { middleware: isolatedMiddleware } = await import('../../src/app.middleware');
        const { Test: IsolatedTest } = await import('@nestjs/testing');
        const moduleRef = await IsolatedTest.createTestingModule({ imports: [IsolatedAppModule] }).compile();
        live = moduleRef.createNestApplication();
        isolatedMiddleware(live);
        await live.init();
      });
      if (!live) throw new Error('isolated app did not start');

      await request(live.getHttpServer())
        .post(`/api/payments/${payment.id}/simulate-confirm`)
        .set('Cookie', buyer.cookie)
        .expect(404);
      const billing = await request(live.getHttpServer()).get('/api/billing/me').set('Cookie', buyer.cookie).expect(200);
      expect(billing.body.paymentSimulation).toBe(false);
    } finally {
      process.env.PAYMENT_SIMULATION = previous;
      await live?.close();
    }
    expect((await as(buyer).get(`/api/payments/${payment.id}`).expect(200)).body.status).toBe('PENDING');
  });
});
