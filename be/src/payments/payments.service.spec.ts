import { NotFoundException } from '@nestjs/common';
import type { CreditsService, PlanService } from '../billing';
import type { ConfigService } from '../common';
import type { OrdersService } from '../orders';
import type { PrismaService } from '../shared/prisma';
import { newPaymentReference, PaymentsService } from './payments.service';
import { SAMPLE_ACCOUNT } from './vietqr';

const serviceWith = (settings: Record<string, unknown>, prisma = {} as PrismaService) =>
  new PaymentsService(
    prisma,
    {} as CreditsService,
    {} as PlanService,
    {} as OrdersService,
    { get: (key: string) => settings[key] } as unknown as ConfigService,
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

  it('uses the configured account, else the sample one', async () => {
    const payment = {
      id: 'p1',
      userId: 'u1',
      purpose: 'EXPORT_1',
      status: 'PENDING',
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
    );

    const view = await service.simulateConfirm('p2', 'u1');

    expect(view).toMatchObject({ status: 'PAID', xu: 1_050, credits: null });
    expect(credits.grant).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ kind: 'XU', quantity: 1_050, source: 'PURCHASE', valueVnd: 100_000, paymentId: 'p2' }),
      tx,
    );
  });
});
