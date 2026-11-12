import { PAYMENT_TERMS_VERSION } from '@wrapfit/shared';
import { INestApplication } from '@nestjs/common';
import { BankTxStatus, BankTxUnmatchedReason } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { middleware } from '../../src/app.middleware';
import { PrismaService } from '../../src/shared/prisma';
import { signUp } from './helpers/accounts';

/**
 * Admin reconciliation of bank transfers (docs/21 §3.5) against a real PostgreSQL: the list and its filter, assigning
 * a late transfer to an expired payment, the refusals (underpaid, already paid, handled twice), ignoring with a note,
 * and the demo flag that decides a payment's provider. Needs `docker compose up -d postgres redis`.
 */
describe('Admin bank transactions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const run = Date.now();
  let nextId = 0;
  const usedIds: string[] = [];
  type Account = { id: string; cookie: string };
  let admin: Account;
  let buyer: Account;

  const api = () => request(app.getHttpServer());
  const as = (user: Account) => ({
    get: (url: string) => api().get(url).set('Cookie', user.cookie),
    post: (url: string) => api().post(url).set('Cookie', user.cookie),
    patch: (url: string) => api().patch(url).set('Cookie', user.cookie),
  });
  const pay = async (user: Account, body: Record<string, unknown>) =>
    (await as(user).post('/api/payments').send({ termsVersion: PAYMENT_TERMS_VERSION, ...body }).expect(201)).body;
  const resolve = (user: Account, id: string, body: Record<string, unknown>) =>
    as(user).post(`/api/admin/bank-transactions/${id}/resolve`).send(body);

  /** A transfer the webhook could not match (what the SePay webhook stores), straight into the table. */
  const unmatched = async (
    amountVnd: number,
    over: { content?: string; reason?: BankTxUnmatchedReason; status?: BankTxStatus; extractedReference?: string | null } = {},
  ) => {
    const externalId = `adm-${run}-${++nextId}`;
    usedIds.push(externalId);
    return prisma.bankTransaction.create({
      data: {
        externalId,
        gateway: 'Vietcombank',
        accountNo: '0123456789',
        amountVnd,
        content: over.content ?? 'CK khong ro noi dung',
        bankReference: `FT${externalId}`,
        extractedReference: over.extractedReference ?? null,
        transactionAt: new Date(),
        status: over.status ?? BankTxStatus.UNMATCHED,
        unmatchedReason: over.reason ?? BankTxUnmatchedReason.EXPIRED,
        raw: { id: externalId },
      },
    });
  };
  /** A XU_500 payment of `buyer` whose 15 minutes are over. */
  const expiredPayment = async () => {
    const payment = await pay(buyer, { purpose: 'XU_500' });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { expiresAt: new Date(Date.now() - 60_000), status: 'EXPIRED' },
    });
    return payment as { id: string; reference: string; amountVnd: number };
  };
  const lots = (paymentId: string) => prisma.creditLot.findMany({ where: { paymentId } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    middleware(app);
    await app.init();
    prisma = app.get(PrismaService);
    admin = await signUp(app, `bank-admin-${run}@e2e.test`);
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    buyer = await signUp(app, `bank-buyer-${run}@e2e.test`);
  });

  afterAll(async () => {
    await prisma.bankTransaction.deleteMany({ where: { externalId: { in: usedIds } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@e2e.test` } } });
    await app.close();
  });

  describe('access', () => {
    it('answers 401 without a session and 403 to a non-admin, on every route', async () => {
      const tx = await unmatched(10_000);
      await api().get('/api/admin/bank-transactions').expect(401);
      await as(buyer).get('/api/admin/bank-transactions').expect(403);
      await as(buyer).get('/api/admin/bank-transactions/payment-preview/WFAB23CD').expect(403);
      await resolve(buyer, tx.id, { action: 'ignore', note: 'x' }).expect(403);
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id: tx.id } })).status).toBe('UNMATCHED');
    });
  });

  describe('list', () => {
    it('filters by status, newest first, with the linked payment summary', async () => {
      const payment = await pay(buyer, { purpose: 'XU_500' });
      const linked = await prisma.bankTransaction.update({
        where: { id: (await unmatched(10_000, { reason: 'AMOUNT_MISMATCH', extractedReference: payment.reference })).id },
        data: { paymentId: payment.id },
      });
      const ignored = await unmatched(20_000, { status: 'IGNORED' });
      const resolved = await unmatched(30_000, { status: 'RESOLVED' });

      const ids = async (query: string) =>
        ((await as(admin).get(`/api/admin/bank-transactions?${query}&limit=100`).expect(200)).body.entries as { id: string }[])
          .map((e) => e.id)
          .filter((id) => [linked.id, ignored.id, resolved.id].includes(id));

      expect(await ids('status=UNMATCHED')).toEqual([linked.id]);
      expect(await ids('status=IGNORED')).toEqual([ignored.id]);
      expect(await ids('status=RESOLVED')).toEqual([resolved.id]);
      expect(await ids('')).toEqual([resolved.id, ignored.id, linked.id]);

      const entry = (await as(admin).get('/api/admin/bank-transactions?status=UNMATCHED&limit=100').expect(200)).body.entries.find(
        (e: { id: string }) => e.id === linked.id,
      );
      expect(entry).toMatchObject({
        amountVnd: 10_000,
        unmatchedReason: 'AMOUNT_MISMATCH',
        extractedReference: payment.reference,
        payment: {
          id: payment.id,
          reference: payment.reference,
          amountVnd: payment.amountVnd,
          status: 'PENDING',
          purpose: 'XU_500',
          userEmail: `bank-buyer-${run}@e2e.test`,
        },
      });
      expect(entry).not.toHaveProperty('raw');
      await as(admin).get('/api/admin/bank-transactions?status=NOPE').expect(400);
    });

    it('pages with the cursor `nextBefore`', async () => {
      const a = await unmatched(1_000, { status: 'IGNORED' });
      const b = await unmatched(2_000, { status: 'IGNORED' });
      const first = (await as(admin).get('/api/admin/bank-transactions?status=IGNORED&limit=1').expect(200)).body;
      expect(first.entries).toHaveLength(1);
      expect(first.nextBefore).toEqual(expect.any(String));
      const seen = new Set<string>([first.entries[0].id]);
      let cursor: string | null = first.nextBefore;
      while (cursor) {
        const page = (await as(admin).get(`/api/admin/bank-transactions?status=IGNORED&limit=1&before=${cursor}`).expect(200)).body;
        for (const e of page.entries) seen.add(e.id);
        cursor = page.nextBefore;
      }
      expect(seen.has(a.id) && seen.has(b.id)).toBe(true);
    });
  });

  describe('payment preview', () => {
    it('shows the VietQR payment of a reference, 404 for an unknown one', async () => {
      const payment = await pay(buyer, { purpose: 'XU_500' });
      const res = await as(admin).get(`/api/admin/bank-transactions/payment-preview/${payment.reference.toLowerCase()}`).expect(200);
      expect(res.body).toMatchObject({ id: payment.id, reference: payment.reference, status: 'PENDING' });
      await as(admin).get('/api/admin/bank-transactions/payment-preview/WFZZZZZZ').expect(404);
    });
  });

  describe('assign', () => {
    it('confirms an expired payment, grants what it bought and marks the transfer RESOLVED', async () => {
      const payment = await expiredPayment();
      const tx = await unmatched(payment.amountVnd, { reason: 'EXPIRED' });

      const res = await resolve(admin, tx.id, { action: 'assign', paymentReference: payment.reference.toLowerCase(), note: 'khách chuyển trễ' }).expect(200);
      expect(res.body).toMatchObject({
        id: tx.id,
        status: 'RESOLVED',
        resolvedBy: admin.id,
        resolvedNote: 'khách chuyển trễ',
        extractedReference: payment.reference,
        payment: { id: payment.id, status: 'PAID' },
      });

      const paid = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(paid).toMatchObject({ status: 'PAID', confirmedVia: 'ADMIN', providerTxnId: tx.externalId });
      const granted = await lots(payment.id);
      expect(granted).toHaveLength(1);
      expect(granted[0]).toMatchObject({ kind: 'XU', source: 'PURCHASE', quantity: 500 });
    });

    it('accepts an overpayment', async () => {
      const payment = await expiredPayment();
      const tx = await unmatched(payment.amountVnd + 5_000, { reason: 'AMOUNT_MISMATCH' });
      await resolve(admin, tx.id, { action: 'assign', paymentReference: payment.reference }).expect(200);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PAID');
    });

    it('refuses an underpaid transfer and leaves everything as it was', async () => {
      const payment = await expiredPayment();
      const tx = await unmatched(payment.amountVnd - 1, { reason: 'AMOUNT_MISMATCH' });

      const res = await resolve(admin, tx.id, { action: 'assign', paymentReference: payment.reference }).expect(400);
      expect(res.body.code).toBe('AMOUNT_TOO_LOW');
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id: tx.id } })).status).toBe('UNMATCHED');
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('EXPIRED');
      expect(await lots(payment.id)).toHaveLength(0);
    });

    it('answers 409 the second time and grants once, also when two admins assign at once', async () => {
      const payment = await expiredPayment();
      const tx = await unmatched(payment.amountVnd);
      await resolve(admin, tx.id, { action: 'assign', paymentReference: payment.reference }).expect(200);
      await resolve(admin, tx.id, { action: 'assign', paymentReference: payment.reference }).expect(409);
      expect(await lots(payment.id)).toHaveLength(1);

      // The same payment paid by a second transfer: 409, no extra grant, the second transfer stays UNMATCHED.
      const second = await unmatched(payment.amountVnd);
      const dup = await resolve(admin, second.id, { action: 'assign', paymentReference: payment.reference }).expect(409);
      expect(dup.body.code).toBe('PAYMENT_ALREADY_PAID');
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id: second.id } })).status).toBe('UNMATCHED');
      expect(await lots(payment.id)).toHaveLength(1);

      const racePayment = await expiredPayment();
      const raceTx = await unmatched(racePayment.amountVnd);
      const results = await Promise.all([
        resolve(admin, raceTx.id, { action: 'assign', paymentReference: racePayment.reference }),
        resolve(admin, raceTx.id, { action: 'assign', paymentReference: racePayment.reference }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await lots(racePayment.id)).toHaveLength(1);
    });

    it('answers 404 for an unknown transfer or reference, 400 for a malformed reference, and never pays a VNPay payment', async () => {
      const tx = await unmatched(500_000);
      await resolve(admin, tx.id, { action: 'assign', paymentReference: 'WFZZZZZZ' }).expect(404);
      await resolve(admin, tx.id, { action: 'assign', paymentReference: 'abc' }).expect(400);
      await resolve(admin, tx.id, { action: 'assign' }).expect(400);
      await resolve(admin, '0192f3a0-0000-7000-8000-000000000000', { action: 'assign', paymentReference: 'WFAB23CD' }).expect(404);

      const demo = await signUp(app, `bank-demo-${run}@e2e.test`);
      await prisma.user.update({ where: { id: demo.id }, data: { isDemo: true } });
      const vnpay = await pay(demo, { purpose: 'XU_500' });
      expect(vnpay.provider).toBe('VNPAY');
      await resolve(admin, tx.id, { action: 'assign', paymentReference: vnpay.reference }).expect(404);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: vnpay.id } })).status).toBe('PENDING');
    });

    it('is refused for a transfer that was ignored', async () => {
      const payment = await expiredPayment();
      const tx = await unmatched(payment.amountVnd);
      await resolve(admin, tx.id, { action: 'ignore', note: 'hoàn tiền tay' }).expect(200);
      await resolve(admin, tx.id, { action: 'assign', paymentReference: payment.reference }).expect(409);
      expect(await lots(payment.id)).toHaveLength(0);
    });
  });

  describe('ignore', () => {
    it('needs a note, then marks the transfer IGNORED with who and why', async () => {
      const tx = await unmatched(70_000);
      await resolve(admin, tx.id, { action: 'ignore' }).expect(400);
      await resolve(admin, tx.id, { action: 'ignore', note: '   ' }).expect(400);
      await resolve(admin, tx.id, { action: 'nothing' }).expect(400);
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id: tx.id } })).status).toBe('UNMATCHED');

      const res = await resolve(admin, tx.id, { action: 'ignore', note: ' đã hoàn tiền tay ' }).expect(200);
      expect(res.body).toMatchObject({ status: 'IGNORED', resolvedBy: admin.id, resolvedNote: 'đã hoàn tiền tay' });
      await resolve(admin, tx.id, { action: 'ignore', note: 'lần hai' }).expect(409);
    });
  });

  describe('demo flag', () => {
    it('is admin-only and changes the provider of the next payment', async () => {
      const user = await signUp(app, `bank-flag-${run}@e2e.test`);
      expect((await pay(user, { purpose: 'XU_500' })).provider).toBe('VIETQR');

      await as(user).patch(`/api/users/${user.id}`).send({ isDemo: true }).expect(403);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).isDemo).toBe(false);

      const on = await as(admin).patch(`/api/users/${user.id}`).send({ isDemo: true }).expect(200);
      expect(on.body.isDemo).toBe(true);
      expect((await pay(user, { purpose: 'XU_500' })).provider).toBe('VNPAY');

      const off = await as(admin).patch(`/api/users/${user.id}`).send({ isDemo: false }).expect(200);
      expect(off.body.isDemo).toBe(false);
      expect((await pay(user, { purpose: 'XU_500' })).provider).toBe('VIETQR');

      await as(admin).patch(`/api/users/${user.id}`).send({ isDemo: 'yes' }).expect(400);
      const list = (await as(admin).get('/api/users?limit=100').expect(200)).body;
      expect(list.items[0]).toHaveProperty('isDemo');
    });
  });
});
