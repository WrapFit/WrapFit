import { PAYMENT_TERMS_VERSION } from '@wrapfit/shared';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

const KEY = process.env.SEPAY_WEBHOOK_API_KEY!;

/**
 * SePay bank webhook (docs/21 §3.3) against a real PostgreSQL: a transfer with the right reference and amount confirms
 * the payment and grants what it bought, once; every other transfer is stored UNMATCHED with a reason. Needs
 * `docker compose up -d postgres redis`.
 */
describe('SePay webhook (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let nextId = 0;
  const usedIds: string[] = [];
  type Account = { id: string; cookie: string };
  let buyer: Account;

  const api = () => request(app.getHttpServer());
  const as = (user: Account) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
  });
  const pay = async (user: Account, body: Record<string, unknown>) =>
    (await as(user).post('/api/payments').send({ termsVersion: PAYMENT_TERMS_VERSION, ...body }).expect(201)).body;

  /** A SePay payload for a transfer of `amount` with `content`; each call gets a fresh transaction id. */
  const transfer = (content: string, amount: number, over: Record<string, unknown> = {}) => {
    const id = run + ++nextId;
    usedIds.push(String(id));
    return {
      id,
      gateway: 'Vietcombank',
      transactionDate: '2026-11-10 21:30:00',
      accountNumber: '0123456789',
      code: null,
      content,
      transferType: 'in',
      transferAmount: amount,
      accumulated: 1_000_000,
      subAccount: null,
      referenceCode: `FT${id}`,
      description: `BANK ${content}`,
      ...over,
    };
  };
  const send = (body: unknown, authorization: string | null = `Apikey ${KEY}`) => {
    const req = api().post('/api/webhooks/sepay');
    return (authorization === null ? req : req.set('Authorization', authorization)).send(body as object);
  };
  const bankTx = (externalId: number | string) => prisma.bankTransaction.findUnique({ where: { externalId: String(externalId) } });
  const status = async (paymentId: string) => (await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    buyer = await signUp(app, `sepay-buyer-${run}@e2e.test`);
  });

  beforeEach(() => {
    const store = app.get(ThrottlerStorage) as unknown as { storage: Map<string, unknown>; hitExpirations: Map<string, unknown> };
    store.storage.clear();
    store.hitExpirations.clear();
  });

  afterAll(async () => {
    await prisma.bankTransaction.deleteMany({ where: { externalId: { in: usedIds } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await app.close();
  });

  it('confirms a payment from a transfer with its reference, grants the xu, and stores a MATCHED row', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    const body = transfer(`MBVCB.123.${payment.reference}.CT tu NGUYEN VAN A`, payment.amountVnd);

    const res = await send(body).expect(200);
    expect(res.body).toEqual({ success: true });

    const polled = (await as(buyer).get(`/api/payments/${payment.id}`).expect(200)).body;
    expect(polled).toMatchObject({ status: 'PAID', provider: 'VIETQR', confirmedVia: 'SEPAY_WEBHOOK', vietqr: null });
    const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(row.providerTxnId).toBe(String(body.id));

    const lots = await prisma.creditLot.findMany({ where: { userId: buyer.id, paymentId: payment.id } });
    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ kind: 'XU', source: 'PURCHASE', quantity: 500, remaining: 500 });

    expect(await bankTx(body.id)).toMatchObject({
      status: 'MATCHED',
      unmatchedReason: null,
      paymentId: payment.id,
      extractedReference: payment.reference,
      amountVnd: payment.amountVnd,
      gateway: 'Vietcombank',
      accountNo: '0123456789',
      bankReference: `FT${body.id}`,
    });
    expect((await bankTx(body.id))!.transactionAt.toISOString()).toBe('2026-11-10T14:30:00.000Z');
  });

  it('grants export credits and Pro through the webhook too, matching a lower-case reference', async () => {
    const pack = await pay(buyer, { purpose: 'EXPORT_5' });
    await send(transfer(pack.reference.toLowerCase(), pack.amountVnd)).expect(200);
    expect(await status(pack.id)).toBe('PAID');
    expect(await prisma.creditLot.count({ where: { userId: buyer.id, paymentId: pack.id, quantity: 5 } })).toBe(1);

    const pro = await pay(buyer, { purpose: 'PRO_MONTH' });
    await send(transfer(`WF ${pro.reference.slice(2, 5)} ${pro.reference.slice(5)}`, pro.amountVnd)).expect(200);
    expect(await status(pro.id)).toBe('PAID');
    expect(await prisma.subscription.count({ where: { userId: buyer.id, paymentId: pro.id } })).toBe(1);
  });

  it('answers a replay with 200 and grants nothing more', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    const body = transfer(payment.reference, payment.amountVnd);

    await send(body).expect(200);
    await send(body).expect(200, { success: true });
    await send(body).expect(200, { success: true });

    expect(await prisma.creditLot.count({ where: { paymentId: payment.id } })).toBe(1);
    expect(await prisma.bankTransaction.count({ where: { externalId: String(body.id) } })).toBe(1);
    expect((await bankTx(body.id))!.status).toBe('MATCHED');
  });

  it('survives the same webhook delivered twice at once', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    const body = transfer(payment.reference, payment.amountVnd);

    const [a, b] = await Promise.all([send(body), send(body)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await prisma.creditLot.count({ where: { paymentId: payment.id } })).toBe(1);
    expect(await prisma.bankTransaction.count({ where: { externalId: String(body.id) } })).toBe(1);
  });

  it('answers 401 to a wrong, missing or malformed key and stores nothing', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    const body = transfer(payment.reference, payment.amountVnd);

    await send(body, 'Apikey wrong-key-0123456789abcdef').expect(401);
    await send(body, null).expect(401);
    await send(body, KEY).expect(401);
    await send(body, `Basic ${KEY}`).expect(401);
    // A bad key gets 401 even for a body that would otherwise be refused.
    await send({ nonsense: true }, 'Apikey wrong-key-0123456789abcdef').expect(401);

    expect(await bankTx(body.id)).toBeNull();
    expect(await status(payment.id)).toBe('PENDING');
  });

  it('accepts the Bearer scheme with the same key', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    await send(transfer(payment.reference, payment.amountVnd), `Bearer ${KEY}`).expect(200);
    expect(await status(payment.id)).toBe('PAID');
  });

  it('grants once when the webhook and the simulate button arrive together', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    const body = transfer(payment.reference, payment.amountVnd);

    const [webhook, simulated] = await Promise.all([
      send(body),
      as(buyer).post(`/api/payments/${payment.id}/simulate-confirm`),
    ]);
    expect(webhook.status).toBe(200);
    expect(simulated.status).toBe(200);

    expect(await status(payment.id)).toBe('PAID');
    expect(await prisma.creditLot.count({ where: { paymentId: payment.id } })).toBe(1);
    // Whoever got the lock first confirmed it; the loser is either MATCHED-by-nobody (webhook lost: money arrived for an
    // already paid payment, stored ALREADY_PAID for refund) or a no-op.
    const confirmedVia = (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).confirmedVia;
    const stored = (await bankTx(body.id))!;
    if (confirmedVia === 'SEPAY_WEBHOOK') {
      expect(stored.status).toBe('MATCHED');
    } else {
      expect(confirmedVia).toBe('SIMULATION');
      expect(stored).toMatchObject({ status: 'UNMATCHED', unmatchedReason: 'ALREADY_PAID', paymentId: payment.id });
    }
  });

  describe('transfers that do not match', () => {
    const unmatched = async (body: { id: number }, reason: string, paymentId: string | null) =>
      expect(await bankTx(body.id)).toMatchObject({ status: 'UNMATCHED', unmatchedReason: reason, paymentId });

    it('AMOUNT_MISMATCH: an underpayment is stored for the admin and the payment stays PENDING', async () => {
      const payment = await pay(buyer, { purpose: 'XU_500' });
      const body = transfer(payment.reference, payment.amountVnd - 1000);

      await send(body).expect(200, { success: true });
      await unmatched(body, 'AMOUNT_MISMATCH', payment.id);
      expect(await status(payment.id)).toBe('PENDING');
      expect(await prisma.creditLot.count({ where: { paymentId: payment.id } })).toBe(0);

      const over = transfer(payment.reference, payment.amountVnd + 1000);
      await send(over).expect(200);
      await unmatched(over, 'AMOUNT_MISMATCH', payment.id);
      expect(await status(payment.id)).toBe('PENDING');

      // The right amount still works afterwards.
      await send(transfer(payment.reference, payment.amountVnd)).expect(200);
      expect(await status(payment.id)).toBe('PAID');
    });

    it('EXPIRED: a transfer after the 15 minutes', async () => {
      const payment = await pay(buyer, { purpose: 'XU_500' });
      await prisma.payment.update({ where: { id: payment.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      const body = transfer(payment.reference, payment.amountVnd);

      await send(body).expect(200);
      await unmatched(body, 'EXPIRED', payment.id);
      expect(await status(payment.id)).toBe('PENDING');
      expect(await prisma.creditLot.count({ where: { paymentId: payment.id } })).toBe(0);
    });

    it('ALREADY_PAID: a second transfer for a payment that is paid', async () => {
      const payment = await pay(buyer, { purpose: 'XU_500' });
      await send(transfer(payment.reference, payment.amountVnd)).expect(200);

      const again = transfer(payment.reference, payment.amountVnd);
      await send(again).expect(200);
      await unmatched(again, 'ALREADY_PAID', payment.id);
      expect(await prisma.creditLot.count({ where: { paymentId: payment.id } })).toBe(1);
    });

    it('NO_REFERENCE and NOT_FOUND', async () => {
      const noCode = transfer('NGUYEN VAN A chuyen tien an trua', 50_000);
      await send(noCode).expect(200);
      await unmatched(noCode, 'NO_REFERENCE', null);
      expect((await bankTx(noCode.id))!.extractedReference).toBeNull();

      const stranger = transfer('thanh toan WFZZ99ZZ', 50_000);
      await send(stranger).expect(200);
      await unmatched(stranger, 'NOT_FOUND', null);
      expect((await bankTx(stranger.id))!.extractedReference).toBe('WFZZ99ZZ');
    });

    it('NOT_FOUND: a VNPay payment is never confirmed by a bank transfer', async () => {
      const demo = await signUp(app, `sepay-demo-${run}@e2e.test`);
      await prisma.user.update({ where: { id: demo.id }, data: { isDemo: true } });
      const payment = await pay(demo, { purpose: 'XU_500' });
      expect(payment.provider).toBe('VNPAY');

      const body = transfer(payment.reference, payment.amountVnd);
      await send(body).expect(200);
      await unmatched(body, 'NOT_FOUND', null);
      expect(await status(payment.id)).toBe('PENDING');
    });
  });

  it('skips money going out without storing it', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    const body = transfer(payment.reference, payment.amountVnd, { transferType: 'out' });

    await send(body).expect(200, { success: true });
    expect(await bankTx(body.id)).toBeNull();
    expect(await status(payment.id)).toBe('PENDING');
  });

  it('answers 400 to a body it cannot read, and 413 to an oversized one', async () => {
    await send({ id: 'abc', transferType: 'in', transferAmount: 1 }).expect(400);
    await send({ id: run + 999_999, transferAmount: 1 }).expect(400);
    await send({ ...transfer('x', 1), content: 'x'.repeat(70 * 1024) }).expect(413);
  });

  it('is reachable like SePay calls it: no cookie, no Origin, and SePay-side extra fields', async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    const body = { ...transfer(payment.reference, payment.amountVnd), newSePayField: { anything: 1 } };
    await api()
      .post('/api/webhooks/sepay')
      .set('Authorization', `Apikey ${KEY}`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(body))
      .expect(200, { success: true });
    expect(await status(payment.id)).toBe('PAID');
    expect((await bankTx(body.id))!.raw).toMatchObject({ newSePayField: { anything: 1 } });
  });

  it('rejects every webhook when no key is configured', async () => {
    const previous = process.env.SEPAY_WEBHOOK_API_KEY;
    process.env.SEPAY_WEBHOOK_API_KEY = '';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const keyless = moduleRef.createNestApplication();
    middleware(keyless);
    try {
      await keyless.init();
      const payment = await pay(buyer, { purpose: 'XU_500' });
      const body = transfer(payment.reference, payment.amountVnd);
      await request(keyless.getHttpServer()).post('/api/webhooks/sepay').set('Authorization', `Apikey ${KEY}`).send(body).expect(401);
      await request(keyless.getHttpServer()).post('/api/webhooks/sepay').set('Authorization', 'Apikey ').send(body).expect(401);
      expect(await bankTx(body.id)).toBeNull();
    } finally {
      process.env.SEPAY_WEBHOOK_API_KEY = previous;
      await keyless.close();
    }
  });
});
