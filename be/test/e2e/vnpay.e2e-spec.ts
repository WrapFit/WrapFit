import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { signParams, vnpayDate } from '../../src/payments/vnpay/vnpay';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

const SECRET = process.env.VNPAY_HASH_SECRET!;
const TMN_CODE = process.env.VNPAY_TMN_CODE!;

/**
 * VNPay sandbox (docs/21 §3.4) against a real PostgreSQL: a demo account gets a signed pay URL, the IPN and the return
 * page confirm the payment once between them, and every other IPN gets the response code VNPay documents. IPNs are
 * signed here with the test secret of e2e-env.ts. Needs `docker compose up -d postgres redis`.
 */
describe('VNPay (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let txn = 0;
  type Account = { id: string; cookie: string };
  let demo: Account;
  let real: Account;
  let stranger: Account;

  const api = () => request(app.getHttpServer());
  const as = (user: Account) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
  });
  const pay = async (user: Account, body: Record<string, unknown>) =>
    (await as(user).post('/api/payments').send(body).expect(201)).body;

  /** The query VNPay appends to the return URL / IPN for `payment`, signed with the test secret. */
  const vnpayQuery = (payment: { reference: string; amountVnd: number }, over: Record<string, string> = {}): Record<string, string> => {
    const params: Record<string, string> = {
      vnp_Amount: String(payment.amountVnd * 100),
      vnp_BankCode: 'NCB',
      vnp_BankTranNo: 'VNP14000001',
      vnp_CardType: 'ATM',
      vnp_OrderInfo: `Thanh toan ${payment.reference}`,
      vnp_PayDate: '20261110170500',
      vnp_ResponseCode: '00',
      vnp_TmnCode: TMN_CODE,
      vnp_TransactionNo: String(run + ++txn),
      vnp_TransactionStatus: '00',
      vnp_TxnRef: payment.reference,
      ...over,
    };
    return { ...params, vnp_SecureHashType: 'HmacSHA512', vnp_SecureHash: signParams(params, SECRET) };
  };
  const ipn = (query: Record<string, string>) => api().get('/api/payments/vnpay/ipn').query(query);
  const comeBack = (user: Account, query: Record<string, string>) =>
    as(user).get('/api/payments/vnpay/return').query(query);
  const row = (id: string) => prisma.payment.findUniqueOrThrow({ where: { id } });
  const lots = (paymentId: string) => prisma.creditLot.findMany({ where: { paymentId } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);

    demo = await signUp(app, `vnpay-demo-${run}@e2e.test`);
    await prisma.user.update({ where: { id: demo.id }, data: { isDemo: true } });
    real = await signUp(app, `vnpay-real-${run}@e2e.test`);
    stranger = await signUp(app, `vnpay-stranger-${run}@e2e.test`);
  });

  beforeEach(() => {
    const store = app.get(ThrottlerStorage) as unknown as { storage: Map<string, unknown>; hitExpirations: Map<string, unknown> };
    store.storage.clear();
    store.hitExpirations.clear();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await app.close();
  });

  it('gives a demo account a signed pay URL and no QR, a real account a QR and no pay URL', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    expect(payment).toMatchObject({ provider: 'VNPAY', status: 'PENDING', vietqr: null, amountVnd: 50_000 });

    const url = new URL(payment.vnpay.payUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    const query = Object.fromEntries(url.searchParams.entries());
    expect(query).toMatchObject({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: TMN_CODE,
      vnp_Amount: '5000000',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: payment.reference,
      vnp_ReturnUrl: 'http://frontend.e2e/payments/vnpay-return',
      vnp_ExpireDate: vnpayDate(new Date(payment.expiresAt)),
      vnp_CreateDate: vnpayDate(new Date(payment.createdAt)),
    });
    expect(query.vnp_IpAddr).toMatch(/^[0-9a-f.:]{7,45}$/i);
    const { vnp_SecureHash: hash, ...signed } = query;
    expect(hash).toBe(signParams(signed, SECRET));

    // The pay URL carries the customer's address, so only the answer of POST has it.
    const polled = (await as(demo).get(`/api/payments/${payment.id}`).expect(200)).body;
    expect(polled).toMatchObject({ provider: 'VNPAY', status: 'PENDING', vnpay: null, vietqr: null });

    const vietqr = await pay(real, { purpose: 'XU_500' });
    expect(vietqr).toMatchObject({ provider: 'VIETQR', vnpay: null });
    expect(vietqr.vietqr.payload).toContain(vietqr.reference);
  });

  it('confirms a payment from a signed IPN, grants once, and answers 02 to a replay', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    const query = vnpayQuery(payment);

    const first = await ipn(query).expect(200);
    expect(first.body).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    const paid = await row(payment.id);
    expect(paid).toMatchObject({ status: 'PAID', confirmedVia: 'VNPAY_IPN', providerTxnId: query.vnp_TransactionNo });
    expect(await lots(payment.id)).toHaveLength(1);
    expect((await lots(payment.id))[0]).toMatchObject({ kind: 'XU', source: 'PURCHASE', quantity: 500, remaining: 500 });
    expect((await as(demo).get(`/api/payments/${payment.id}`).expect(200)).body).toMatchObject({
      status: 'PAID',
      confirmedVia: 'VNPAY_IPN',
      vnpay: null,
    });

    const replay = await ipn(query).expect(200);
    expect(replay.body).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
    expect(await lots(payment.id)).toHaveLength(1);
  });

  it('answers 97 to a bad signature and changes nothing', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    const query = vnpayQuery(payment);

    const tampered = await ipn({ ...query, vnp_Amount: '100' }).expect(200);
    expect(tampered.body).toEqual({ RspCode: '97', Message: 'Invalid signature' });
    expect((await ipn({ ...query, vnp_SecureHash: 'f'.repeat(128) }).expect(200)).body.RspCode).toBe('97');
    const { vnp_SecureHash: _hash, ...unsigned } = query;
    expect((await ipn(unsigned).expect(200)).body.RspCode).toBe('97');
    expect((await ipn({}).expect(200)).body.RspCode).toBe('97');
    expect((await api().get(`/api/payments/vnpay/ipn?${new URLSearchParams(query)}&vnp_Amount=1`).expect(200)).body.RspCode).toBe('97');

    expect(await row(payment.id)).toMatchObject({ status: 'PENDING', confirmedVia: null });
    expect(await lots(payment.id)).toHaveLength(0);
  });

  it('answers 01 for an unknown reference and for a VietQR payment, even when the IPN is signed', async () => {
    expect((await ipn(vnpayQuery({ reference: 'WFNOTHERE', amountVnd: 50_000 })).expect(200)).body).toEqual({
      RspCode: '01',
      Message: 'Order not found',
    });

    const vietqr = await pay(real, { purpose: 'XU_500' });
    expect((await ipn(vnpayQuery(vietqr)).expect(200)).body.RspCode).toBe('01');
    expect(await row(vietqr.id)).toMatchObject({ status: 'PENDING', provider: 'VIETQR', confirmedVia: null });
    expect(await lots(vietqr.id)).toHaveLength(0);
  });

  it('answers 04 when the amount differs from the payment', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    const res = await ipn(vnpayQuery(payment, { vnp_Amount: String((payment.amountVnd - 1000) * 100) })).expect(200);
    expect(res.body).toEqual({ RspCode: '04', Message: 'Invalid amount' });
    expect((await ipn(vnpayQuery(payment, { vnp_Amount: String(payment.amountVnd) })).expect(200)).body.RspCode).toBe('04');
    expect(await row(payment.id)).toMatchObject({ status: 'PENDING' });
  });

  it('acknowledges a failed payment with 00 without granting; the customer may still pay', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    const cancelled = vnpayQuery(payment, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
    expect((await ipn(cancelled).expect(200)).body).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect(await row(payment.id)).toMatchObject({ status: 'PENDING', confirmedVia: null, providerTxnId: null });
    expect(await lots(payment.id)).toHaveLength(0);

    // Half a success (ResponseCode 00 but TransactionStatus not 00) grants nothing either.
    await ipn(vnpayQuery(payment, { vnp_TransactionStatus: '01' })).expect(200);
    expect(await lots(payment.id)).toHaveLength(0);

    expect((await ipn(vnpayQuery(payment)).expect(200)).body.RspCode).toBe('00');
    expect(await row(payment.id)).toMatchObject({ status: 'PAID' });
  });

  it('answers 99 and grants nothing for a success that arrives after the payment expired', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    await prisma.payment.update({ where: { id: payment.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await ipn(vnpayQuery(payment)).expect(200)).body).toEqual({ RspCode: '99', Message: 'Unknown error' });
    expect(await row(payment.id)).toMatchObject({ status: 'PENDING', confirmedVia: null });
    expect(await lots(payment.id)).toHaveLength(0);
  });

  it('confirms from the return page for its owner, and the IPN that follows gets 02', async () => {
    const payment = await pay(demo, { purpose: 'EXPORT_5' });
    const query = vnpayQuery(payment);

    const back = (await comeBack(demo, query).expect(200)).body;
    expect(back.result).toBe('success');
    expect(back.payment).toMatchObject({ id: payment.id, status: 'PAID', provider: 'VNPAY', confirmedVia: 'VNPAY_RETURN' });
    expect(await row(payment.id)).toMatchObject({ providerTxnId: query.vnp_TransactionNo });

    expect((await ipn(query).expect(200)).body.RspCode).toBe('02');
    const again = (await comeBack(demo, query).expect(200)).body;
    expect(again).toMatchObject({ result: 'success', payment: { status: 'PAID', confirmedVia: 'VNPAY_RETURN' } });
    expect(await lots(payment.id)).toHaveLength(1);
  });

  it('shows success on the return page when the IPN came first, and does not change how it was confirmed', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    const query = vnpayQuery(payment);
    await ipn(query).expect(200);

    const back = (await comeBack(demo, query).expect(200)).body;
    expect(back).toMatchObject({ result: 'success', payment: { status: 'PAID', confirmedVia: 'VNPAY_IPN' } });
    expect(await lots(payment.id)).toHaveLength(1);
  });

  it('answers failed to a cancelled payment and invalid to a bad signature or amount, granting nothing', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });

    const cancelled = vnpayQuery(payment, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
    expect((await comeBack(demo, cancelled).expect(200)).body).toMatchObject({
      result: 'failed',
      payment: { id: payment.id, status: 'PENDING' },
    });

    const forged = { ...vnpayQuery(payment), vnp_Amount: '100' };
    expect((await comeBack(demo, forged).expect(200)).body).toEqual({ result: 'invalid', payment: null });

    const wrongAmount = vnpayQuery(payment, { vnp_Amount: '100' });
    expect((await comeBack(demo, wrongAmount).expect(200)).body).toMatchObject({ result: 'invalid', payment: { id: payment.id } });
    expect((await comeBack(demo, {}).expect(200)).body).toEqual({ result: 'invalid', payment: null });

    expect(await row(payment.id)).toMatchObject({ status: 'PENDING', confirmedVia: null });
    expect(await lots(payment.id)).toHaveLength(0);
  });

  it('returns only the owner\'s payment, and needs a login', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    const query = vnpayQuery(payment);

    await comeBack(stranger, query).expect(404);
    await api().get('/api/payments/vnpay/return').query(query).expect(401);
    expect(await row(payment.id)).toMatchObject({ status: 'PENDING' });

    // A VietQR payment is not a VNPay one, whoever asks.
    const vietqr = await pay(real, { purpose: 'XU_500' });
    await comeBack(real, vnpayQuery(vietqr)).expect(404);
    expect(await row(vietqr.id)).toMatchObject({ status: 'PENDING' });
  });

  it('keeps the simulate button working for a VNPay payment', async () => {
    const payment = await pay(demo, { purpose: 'XU_500' });
    const paid = (await as(demo).post(`/api/payments/${payment.id}/simulate-confirm`).expect(200)).body;
    expect(paid).toMatchObject({ status: 'PAID', provider: 'VNPAY', confirmedVia: 'SIMULATION' });
    expect((await ipn(vnpayQuery(payment)).expect(200)).body.RspCode).toBe('02');
    expect(await lots(payment.id)).toHaveLength(1);
  });

  describe('without VNPAY_TMN_CODE / VNPAY_HASH_SECRET', () => {
    /** Boots a second app with other settings: a fresh module registry re-reads the environment. */
    const withEnv = async (env: Record<string, string>, body: (live: INestApplication) => Promise<void>) => {
      const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
      Object.assign(process.env, env);
      let live = undefined as INestApplication | undefined;
      try {
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
        await body(live);
      } finally {
        for (const [key, value] of Object.entries(previous)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
        await live?.close();
      }
    };

    it('answers a demo account 503 VNPAY_NOT_CONFIGURED when simulation is off, and creates no payment', async () => {
      const before = await prisma.payment.count({ where: { userId: demo.id } });
      await withEnv({ VNPAY_TMN_CODE: '', VNPAY_HASH_SECRET: '', PAYMENT_SIMULATION: 'false' }, async (live) => {
        const res = await request(live.getHttpServer()).post('/api/payments').set('Cookie', demo.cookie).send({ purpose: 'XU_500' }).expect(503);
        expect(res.body).toMatchObject({ code: 'VNPAY_NOT_CONFIGURED' });
        expect(res.body.message).toMatch(/VNPay/);

        // A real account does not depend on VNPay.
        const vietqr = await request(live.getHttpServer()).post('/api/payments').set('Cookie', real.cookie).send({ purpose: 'XU_500' }).expect(201);
        expect(vietqr.body.provider).toBe('VIETQR');

        // The IPN of an unconfigured gateway is never trusted.
        const ipnRes = await request(live.getHttpServer()).get('/api/payments/vnpay/ipn').query({ vnp_TxnRef: 'WFABCDEF' }).expect(200);
        expect(ipnRes.body.RspCode).toBe('97');
      });
      expect(await prisma.payment.count({ where: { userId: demo.id } })).toBe(before);
    });

    it('lets a demo account create a payment while simulation is on: no pay URL, the button pays', async () => {
      await withEnv({ VNPAY_TMN_CODE: '', VNPAY_HASH_SECRET: '', PAYMENT_SIMULATION: 'true' }, async (live) => {
        const created = await request(live.getHttpServer()).post('/api/payments').set('Cookie', demo.cookie).send({ purpose: 'XU_500' }).expect(201);
        expect(created.body).toMatchObject({ provider: 'VNPAY', status: 'PENDING', vnpay: null, vietqr: null });
        const paid = await request(live.getHttpServer())
          .post(`/api/payments/${created.body.id}/simulate-confirm`)
          .set('Cookie', demo.cookie)
          .expect(200);
        expect(paid.body).toMatchObject({ status: 'PAID', confirmedVia: 'SIMULATION' });
      });
    });
  });
});
