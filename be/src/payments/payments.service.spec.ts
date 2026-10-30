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
});
