import { PAYMENT_TERMS_VERSION } from '@wrapfit/shared';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { crc16, newPaymentReference } from '../../src/payments';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';
import { cancelOrder, placeSampleOrder } from './helpers/orders';
import { deleteUsers } from './helpers/cleanup';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * VietQR payments (docs/17 S5) against a real PostgreSQL: create, poll, expire, and the simulated confirmation that
 * grants xu, 30 days of Pro or pays a sample order, once. Export packs are no longer sold (docs/25 item 7). e2e-env.ts turns PAYMENT_SIMULATION on; the last
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
    // Every payment needs the current terms accepted (CreatePaymentDto.termsVersion).
    (await as(user).post('/api/payments').send({ termsVersion: PAYMENT_TERMS_VERSION, ...body }).expect(201)).body;
  const confirm = (user: Account, id: string) => as(user).post(`/api/payments/${id}/simulate-confirm`);
  const setDemo = (user: Account, isDemo: boolean) => prisma.user.update({ where: { id: user.id }, data: { isDemo } });
  /**
   * A VietQR payment its account may simulate: only a demo account may (docs/25 item 6), and a demo account pays
   * through VNPay, so the payment is made as a real account and the account is flagged demo afterwards.
   */
  const payToSimulate = async (user: Account, body: Record<string, unknown>) => {
    await setDemo(user, false);
    const payment = await pay(user, body);
    await setDemo(user, true);
    return payment;
  };
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
    await deleteUsers(prisma, { email: { endsWith: `-${run}@e2e.test` } });
    await app.close();
  });

  it('creates a 15-minute VietQR payment with a valid EMVCo payload', async () => {
    const before = Date.now();
    const payment = await pay(buyer, { purpose: 'XU_500' });

    expect(payment).toMatchObject({ purpose: 'XU_500', status: 'PENDING', amountVnd: 50_000, xu: 500, credits: null, orderId: null });
    expect(payment.reference).toMatch(/^WF[A-HJ-NP-Z2-9]{6}$/);
    const ttl = new Date(payment.expiresAt).getTime() - before;
    expect(ttl).toBeGreaterThan(14.9 * 60_000);
    expect(ttl).toBeLessThanOrEqual(15 * 60_000 + 5_000);

    const { payload, qrSvg, sample, bankName, accountNo } = payment.vietqr;
    expect(sample).toBe(true);
    expect(bankName).toBe('Vietcombank');
    expect(accountNo).toBe('0000000000');
    expect(payload).toContain('0010A000000727');
    expect(payload).toContain('5405500005802VN');
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
      .send({ purpose: 'XU_500', orderId: '01970000-0000-7000-8000-000000000000' })
      .expect(400);
    await as(buyer)
      .post('/api/payments')
      .send({ termsVersion: PAYMENT_TERMS_VERSION, purpose: 'SAMPLE_ORDER', orderId: '01970000-0000-7000-8000-000000000000' })
      .expect(404);
  });

  it('refuses a new payment for every export pack: 400 EXPORT_PACK_DISCONTINUED, nothing created (docs/25 item 7)', async () => {
    const user = await register('nopack');
    for (const purpose of ['EXPORT_1', 'EXPORT_5', 'EXPORT_15']) {
      const res = await as(user).post('/api/payments').send({ termsVersion: PAYMENT_TERMS_VERSION, purpose }).expect(400);
      expect(res.body).toMatchObject({ code: 'EXPORT_PACK_DISCONTINUED' });
    }
    await expect(prisma.payment.count({ where: { userId: user.id } })).resolves.toBe(0);
  });

  it('an export pack payment made before the packs stopped, confirmed late, gives xu at the price paid, once', async () => {
    const user = await register('pack');
    // Written like PaymentsService wrote it before (no way to create one through the API any more).
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        purpose: 'EXPORT_5',
        amountVnd: 79_000,
        reference: newPaymentReference(),
        expiresAt: new Date(Date.now() + 10 * 60_000),
        metadata: { credits: 5 },
      },
    });
    await setDemo(user, true);

    const [first, second] = await Promise.all([confirm(user, payment.id), confirm(user, payment.id)]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toMatchObject({ status: 'PAID', purpose: 'EXPORT_5', credits: 5, confirmedVia: 'SIMULATION' });

    // No export credit lot: one xu lot worth what was paid, 79.000đ = 790 xu.
    const lots = await prisma.creditLot.findMany({ where: { paymentId: payment.id } });
    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ kind: 'XU', source: 'PURCHASE', quantity: 790, remaining: 790, valueVnd: 79_000 });
    expect(lots[0].expiresAt!.getTime() - Date.now()).toBeGreaterThan(360 * DAY_MS);
    await expect(prisma.creditLot.count({ where: { userId: user.id, kind: 'EXPORT' } })).resolves.toBe(0);

    const billing = (await as(user).get('/api/billing/me').expect(200)).body;
    expect(billing).not.toHaveProperty('exportCredits');
    expect(billing.xu.balance).toBeGreaterThanOrEqual(790);
    await confirm(stranger, payment.id).expect(404);
  });

  it('still shows an old export pack payment in the history, as it was bought', async () => {
    const user = await register('history');
    const paidAt = new Date(Date.now() - 30 * DAY_MS);
    const old = await prisma.payment.create({
      data: {
        userId: user.id,
        purpose: 'EXPORT_15',
        amountVnd: 199_000,
        reference: newPaymentReference(),
        status: 'PAID',
        paidAt,
        confirmedVia: 'SEPAY_WEBHOOK',
        expiresAt: new Date(paidAt.getTime() + 15 * 60_000),
        metadata: { credits: 15 },
        createdAt: new Date(paidAt.getTime() - 60_000),
      },
    });
    const { entries } = (await as(user).get('/api/payments').expect(200)).body;
    expect(entries).toEqual([
      expect.objectContaining({
        id: old.id,
        purpose: 'EXPORT_15',
        status: 'PAID',
        amountVnd: 199_000,
        credits: 15,
        xu: null,
        orderId: null,
        reference: old.reference,
        paidAt: paidAt.toISOString(),
      }),
    ]);
    expect((await as(user).get(`/api/payments/${old.id}`).expect(200)).body).toMatchObject({ purpose: 'EXPORT_15', credits: 15, vietqr: null });
  });

  it('gives a demo account a VNPAY payment, a real account a VIETQR one, and records the simulation', async () => {
    const demo = await register('demo');
    await prisma.user.update({ where: { id: demo.id }, data: { isDemo: true } });

    const payment = await pay(demo, { purpose: 'XU_500' });
    expect(payment).toMatchObject({ provider: 'VNPAY', confirmedVia: null, status: 'PENDING' });
    expect((await pay(buyer, { purpose: 'XU_500' })).provider).toBe('VIETQR');

    const paid = (await confirm(demo, payment.id).expect(200)).body;
    expect(paid).toMatchObject({ status: 'PAID', provider: 'VNPAY', confirmedVia: 'SIMULATION' });
    const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(row).toMatchObject({ provider: 'VNPAY', confirmedVia: 'SIMULATION', providerTxnId: null });
  });

  it('starts 30 days of Pro, and a second Pro payment extends the same period', async () => {
    const user = await register('pro');
    const first = await payToSimulate(user, { purpose: 'PRO_MONTH' });
    expect(first.amountVnd).toBe(99_000);
    await confirm(user, first.id).expect(200);

    const [sub] = await prisma.subscription.findMany({ where: { userId: user.id } });
    expect(sub).toMatchObject({ plan: 'STARTER', status: 'ACTIVE', paymentId: first.id });
    expect(sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()).toBe(30 * DAY_MS);
    expect((await as(user).get('/api/billing/me').expect(200)).body.tier).toBe('STARTER');

    const second = await payToSimulate(user, { purpose: 'PRO_MONTH' });
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

    await as(stranger).post('/api/payments').send({ termsVersion: PAYMENT_TERMS_VERSION, purpose: 'SAMPLE_ORDER', orderId: order.id }).expect(404);
    const payment = await pay(buyer, { purpose: 'SAMPLE_ORDER', orderId: order.id });
    expect(payment).toMatchObject({ amountVnd: 49_000, orderId: order.id, credits: null });
    expect((await payToSimulate(buyer, { purpose: 'SAMPLE_ORDER', orderId: order.id })).id).toBe(payment.id);

    await confirm(buyer, payment.id).expect(200);
    await confirm(buyer, payment.id).expect(200);
    const paid = (await as(buyer).get(`/api/orders/${order.id}`).expect(200)).body;
    expect(paid).toMatchObject({ orderStatus: 'PAID', paymentId: payment.id });
    expect(paid.paidAt).not.toBeNull();
    const history = await prisma.orderStatusHistory.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } });
    expect(history.map((h) => h.toStatus)).toEqual(['PENDING_PAYMENT', 'PAID']);

    await as(buyer).post('/api/payments').send({ termsVersion: PAYMENT_TERMS_VERSION, purpose: 'SAMPLE_ORDER', orderId: order.id }).expect(409);
  });

  it('refuses to simulate-confirm the payment of a cancelled order: 409 ORDER_NOT_PAYABLE, nothing written', async () => {
    const order = await placeSampleOrder(app, buyer.cookie);
    const payment = await payToSimulate(buyer, { purpose: 'SAMPLE_ORDER', orderId: order.id });
    await cancelOrder(prisma, order.id);

    const res = await confirm(buyer, payment.id).expect(409);
    expect(res.body).toMatchObject({ code: 'ORDER_NOT_PAYABLE' });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({
      status: 'PENDING',
      paidAt: null,
      confirmedVia: null,
    });
    expect(await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: 'CANCELLED', paymentId: null });
  });

  it('expires a payment after 15 minutes: no QR, no confirmation', async () => {
    const payment = await payToSimulate(buyer, { purpose: 'XU_500' });
    await prisma.payment.update({ where: { id: payment.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await confirm(buyer, payment.id).expect(409);
    expect(res.body).toMatchObject({ code: 'PAYMENT_EXPIRED' });
    const polled = (await as(buyer).get(`/api/payments/${payment.id}`).expect(200)).body;
    expect(polled).toMatchObject({ status: 'EXPIRED', vietqr: null });
    await confirm(buyer, payment.id).expect(409);
    await expect(prisma.creditLot.count({ where: { paymentId: payment.id } })).resolves.toBe(0);
  });

  it('xu do not unlock the print file either: it is sold through the print cart', async () => {
    const user = await register('free');
    const projectId = await newProject(user);
    const exportSvg = () => as(user).post(`/api/projects/${projectId}/exports`).send({ fileType: 'SVG' });

    expect((await exportSvg().expect(402)).body).toMatchObject({ code: 'ORDER_PAYMENT_REQUIRED' });
    const payment = await payToSimulate(user, { purpose: 'XU_500' });
    await confirm(user, payment.id).expect(200);
    expect((await exportSvg().expect(402)).body).toMatchObject({ code: 'ORDER_PAYMENT_REQUIRED' });
  });

  it('lets only a demo account simulate a VietQR payment, by the button or by a mock bank transfer (docs/25 item 6)', async () => {
    const real = await register('real');
    const payment = await pay(real, { purpose: 'XU_500' });
    expect(payment.provider).toBe('VIETQR');

    expect((await confirm(real, payment.id).expect(403)).body).toMatchObject({ code: 'SIMULATION_DEMO_ONLY' });
    const mock = await as(real).post(`/api/payments/${payment.id}/simulate-transfer`).send({ scenario: 'exact' }).expect(403);
    expect(mock.body).toMatchObject({ code: 'SIMULATION_DEMO_ONLY' });
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: 'PENDING', paidAt: null });
    await expect(prisma.creditLot.count({ where: { paymentId: payment.id } })).resolves.toBe(0);
    await expect(prisma.bankTransaction.count({ where: { extractedReference: payment.reference } })).resolves.toBe(0);
    // The checkout does not offer the button to a real account.
    expect((await as(real).get('/api/billing/me').expect(200)).body.paymentSimulation).toBe(false);

    // The same payment once the account is a demo one: allowed.
    await setDemo(real, true);
    expect((await confirm(real, payment.id).expect(200)).body).toMatchObject({ status: 'PAID', confirmedVia: 'SIMULATION' });
    expect((await as(real).get('/api/billing/me').expect(200)).body.paymentSimulation).toBe(true);
  });

  it('pages the history by (createdAt, id): two payments of the same millisecond both appear across a page boundary', async () => {
    const payer = await register('pager');
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await pay(payer, { purpose: 'XU_500' })).id);
    // The two oldest share one millisecond, so the boundary of the second page falls between them.
    await prisma.payment.updateMany({ where: { id: { in: ids.slice(0, 2) } }, data: { createdAt: new Date(Date.now() - 60_000) } });

    const seen: string[] = [];
    let before: string | null = null;
    do {
      const query: string = before ? `&before=${encodeURIComponent(before)}` : '';
      const page = (await as(payer).get(`/api/payments?limit=1${query}`).expect(200)).body;
      seen.push(...page.entries.map((entry: { id: string }) => entry.id));
      before = page.nextBefore;
    } while (before);
    expect(seen).toEqual([ids[2], ...ids.slice(0, 2).sort().reverse()]);

    // A bare date, the cursor of the former API that a client may still hold, is still read; anything else is 400.
    const old = (await as(payer).get(`/api/payments?before=${encodeURIComponent(new Date().toISOString())}`).expect(200)).body;
    expect(old.entries).toHaveLength(3);
    await as(payer).get('/api/payments?before=nope').expect(400);
  });

  it('answers 404 to simulate-confirm when PAYMENT_SIMULATION is off', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
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
