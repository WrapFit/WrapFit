import { HttpException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreditsService, PlanService } from '../billing';
import type { ConfigService } from '../common';
import type { OrdersService } from '../orders';
import type { PrismaService } from '../shared/prisma';
import { newPaymentReference, PaymentsService } from './payments.service';
import { SAMPLE_ACCOUNT } from './vietqr';
import type { VnpayGateway } from './vnpay/vnpay.gateway';

const noVnpay = { configured: false } as unknown as VnpayGateway;

const serviceWith = (settings: Record<string, unknown>, prisma = {} as PrismaService) =>
  new PaymentsService(
    prisma,
    {} as CreditsService,
    {} as PlanService,
    {} as OrdersService,
    { get: (key: string) => settings[key] } as unknown as ConfigService,
    noVnpay,
  );

describe('newPaymentReference', () => {
  it('is WF + 6 characters without O, 0, I or 1', () => {
    for (let i = 0; i < 500; i++) {
      expect(newPaymentReference()).toMatch(/^WF[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});

describe('PaymentsService', () => {
  it('answers 404 to simulate-confirm when simulation is off, before touching the database', async () => {
    const transaction = jest.fn();
    const service = serviceWith(
      { 'payments.simulation': false, 'payments.vietqr': null },
      { $transaction: transaction } as unknown as PrismaService,
    );

    await expect(service.simulateConfirm('id', 'user')).rejects.toBeInstanceOf(NotFoundException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('answers 503 VNPAY_NOT_CONFIGURED to a demo account when VNPay is missing and simulation is off, creating nothing', async () => {
    const create = jest.fn();
    const prisma = {
      user: { findUniqueOrThrow: async () => ({ isDemo: true }) },
      payment: { create },
    } as unknown as PrismaService;
    const service = serviceWith({ 'payments.simulation': false, 'payments.vietqr': null }, prisma);

    const error = await service.create('u1', { purpose: 'XU_500' } as never, '203.0.113.5').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(503);
    expect((error as HttpException).getResponse()).toMatchObject({ code: 'VNPAY_NOT_CONFIGURED' });
    expect(create).not.toHaveBeenCalled();
  });

  it('uses the configured account, else the sample one', async () => {
    const payment = {
      id: 'p1',
      userId: 'u1',
      purpose: 'EXPORT_1',
      status: 'PENDING',
      provider: 'VIETQR',
      confirmedVia: null,
      amountVnd: 19_000,
      reference: 'WFABCDEF',
      expiresAt: new Date(Date.now() + 60_000),
      paidAt: null,
      metadata: { credits: 1 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = { payment: { findFirst: async () => payment } } as unknown as PrismaService;
    const account = { bankBin: '970422', accountNo: '123456789', accountName: 'CONG TY WRAPFIT' };

    const real = await serviceWith({ 'payments.simulation': true, 'payments.vietqr': account }, prisma).get('p1', 'u1');
    expect(real.vietqr).toMatchObject({ ...account, bankName: 'MB Bank', sample: false });

    const sample = await serviceWith({ 'payments.simulation': true, 'payments.vietqr': null }, prisma).get('p1', 'u1');
    expect(sample.vietqr).toMatchObject({ ...SAMPLE_ACCOUNT, sample: true });
  });

  it('grants a xu lot worth what was paid when a xu pack is paid', async () => {
    const pending = {
      id: 'p2',
      userId: 'u1',
      purpose: 'XU_1050',
      status: 'PENDING',
      provider: 'VIETQR',
      confirmedVia: null,
      amountVnd: 100_000,
      reference: 'WFXUPACK',
      expiresAt: new Date(Date.now() + 60_000),
      paidAt: null,
      metadata: { xu: 1_050 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'p2' }]),
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(pending),
        update: jest.fn(({ data }) => Promise.resolve({ ...pending, ...data })),
      },
    };
    const prisma = { $transaction: (run: (db: typeof tx) => unknown) => run(tx) } as unknown as PrismaService;
    const credits = { grant: jest.fn().mockResolvedValue({}) };
    const plans = { sync: jest.fn().mockResolvedValue('FREE') };
    const service = new PaymentsService(
      prisma,
      credits as unknown as CreditsService,
      plans as unknown as PlanService,
      {} as OrdersService,
      { get: (key: string) => ({ 'payments.simulation': true, 'payments.vietqr': null })[key] } as unknown as ConfigService,
      noVnpay,
    );

    const view = await service.simulateConfirm('p2', 'u1');

    expect(view).toMatchObject({ status: 'PAID', xu: 1_050, credits: null, confirmedVia: 'SIMULATION' });
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID', confirmedVia: 'SIMULATION' }) }),
    );
    expect(credits.grant).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ kind: 'XU', quantity: 1_050, source: 'PURCHASE', valueVnd: 100_000, paymentId: 'p2' }),
      tx,
    );
  });

  const pendingXu = {
    id: 'p3',
    userId: 'u1',
    purpose: 'XU_500',
    status: 'PENDING',
    provider: 'VNPAY',
    confirmedVia: null,
    providerTxnId: null,
    amountVnd: 50_000,
    reference: 'WFXUPACK',
    expiresAt: new Date(Date.now() + 60_000),
    paidAt: null,
    metadata: { xu: 500 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const confirmFixture = (payment: Record<string, unknown>, locked = [{ id: 'p3' }]) => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue(locked),
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(payment),
        update: jest.fn(({ data }) => Promise.resolve({ ...payment, ...data })),
      },
    };
    const credits = { grant: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(
      {} as PrismaService,
      credits as unknown as CreditsService,
      { sync: jest.fn().mockResolvedValue('FREE') } as unknown as PlanService,
      {} as OrdersService,
      { get: () => null } as unknown as ConfigService,
      noVnpay,
    );
    return { tx: tx as unknown as Prisma.TransactionClient, rawTx: tx, credits, service };
  };

  it('confirmPaid records the path and the provider transaction id, then grants', async () => {
    const { tx, rawTx, credits, service } = confirmFixture(pendingXu);

    const paid = await service.confirmPaid(tx, 'p3', { via: 'VNPAY_IPN', providerTxnId: '14123456' });

    expect(paid).toMatchObject({ status: 'PAID', confirmedVia: 'VNPAY_IPN', providerTxnId: '14123456' });
    expect(rawTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(credits.grant).toHaveBeenCalledTimes(1);
  });

  it('confirmPaid returns a PAID payment untouched and grants nothing', async () => {
    const { tx, rawTx, credits, service } = confirmFixture({ ...pendingXu, status: 'PAID', confirmedVia: 'SEPAY_WEBHOOK' });

    const paid = await service.confirmPaid(tx, 'p3', { via: 'SIMULATION' });

    expect(paid.confirmedVia).toBe('SEPAY_WEBHOOK');
    expect(rawTx.payment.update).not.toHaveBeenCalled();
    expect(credits.grant).not.toHaveBeenCalled();
  });

  it('confirmPaid refuses an expired payment unless allowExpired, and an unknown id is 404', async () => {
    const lapsed = { ...pendingXu, expiresAt: new Date(Date.now() - 1_000) };
    const refused = confirmFixture(lapsed);
    await expect(refused.service.confirmPaid(refused.tx, 'p3', { via: 'SEPAY_WEBHOOK' })).rejects.toMatchObject({
      response: { code: 'PAYMENT_EXPIRED' },
    });
    expect(refused.credits.grant).not.toHaveBeenCalled();

    const admin = confirmFixture({ ...lapsed, status: 'EXPIRED' });
    await expect(admin.service.confirmPaid(admin.tx, 'p3', { via: 'ADMIN', allowExpired: true })).resolves.toMatchObject({
      status: 'PAID',
      confirmedVia: 'ADMIN',
    });
    expect(admin.credits.grant).toHaveBeenCalledTimes(1);

    const cancelled = confirmFixture({ ...pendingXu, status: 'CANCELLED' });
    await expect(
      cancelled.service.confirmPaid(cancelled.tx, 'p3', { via: 'ADMIN', allowExpired: true }),
    ).rejects.toMatchObject({ response: { code: 'PAYMENT_EXPIRED' } });

    const missing = confirmFixture(pendingXu, []);
    await expect(missing.service.confirmPaid(missing.tx, 'p3', { via: 'ADMIN' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    [true, 'VNPAY'],
    [false, 'VIETQR'],
  ])('create() sets the provider from users.isDemo (isDemo=%s -> %s)', async (isDemo, provider) => {
    const created = jest.fn(({ data }) => Promise.resolve({ ...pendingXu, ...data }));
    const prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ isDemo }) },
      payment: { create: created },
    } as unknown as PrismaService;

    const view = await serviceWith({ 'payments.simulation': true, 'payments.vietqr': null }, prisma).create('u1', {
      purpose: 'XU_500',
    } as never);

    expect(created).toHaveBeenCalledWith({ data: expect.objectContaining({ provider }) });
    expect(view.provider).toBe(provider);
  });
});
