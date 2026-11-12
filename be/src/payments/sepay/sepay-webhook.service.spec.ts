import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import type { ConfigService } from '../../common';
import type { PrismaService } from '../../shared/prisma';
import type { PaymentsService } from '../payments.service';
import { SepayPayloadError } from './sepay-webhook';
import { SepayWebhookService } from './sepay-webhook.service';

const KEY = 'test-sepay-key-0123456789';
const FUTURE = new Date(Date.now() + 10 * 60_000);
const PAST = new Date(Date.now() - 60_000);

type PaymentRow = {
  id: string;
  reference: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountVnd: number;
  expiresAt: Date;
};
const payment = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: 'pay-1',
  reference: 'WFAB23CD',
  provider: PaymentProvider.VIETQR,
  status: PaymentStatus.PENDING,
  amountVnd: 19_000,
  expiresAt: FUTURE,
  ...over,
});
const body = (over: Record<string, unknown> = {}) => ({
  id: 1001,
  gateway: 'Vietcombank',
  transactionDate: '2024-07-02 11:08:33',
  accountNumber: '1017588888',
  code: null,
  content: 'WFAB23CD',
  transferType: 'in',
  transferAmount: 19_000,
  accumulated: 1,
  subAccount: null,
  referenceCode: 'FT1',
  description: '',
  ...over,
});

/** A service over a fake transaction: `rows` are the payments the lookup can see, `duplicate` simulates a replay. */
function setup(rows: PaymentRow[], { duplicate = false, key = KEY as string | null } = {}) {
  const created = jest.fn().mockResolvedValue({ count: duplicate ? 0 : 1 });
  const updated = jest.fn().mockResolvedValue({});
  const tx = {
    bankTransaction: { createMany: created, update: updated },
    payment: {
      findMany: jest.fn(async ({ where }: { where: { reference: { in: string[] }; provider: PaymentProvider } }) =>
        rows.filter((r) => where.reference.in.includes(r.reference) && r.provider === where.provider),
      ),
      findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id)),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaService;
  const confirmPaid = jest.fn().mockResolvedValue({});
  const payments = { confirmPaid } as unknown as PaymentsService;
  const config = { get: () => key } as unknown as ConfigService;
  return { service: new SepayWebhookService(prisma, payments, config), created, updated, confirmPaid };
}

describe('SepayWebhookService.authorize', () => {
  it('passes the configured key and answers 401 to anything else', () => {
    const { service } = setup([]);
    expect(() => service.authorize(`Apikey ${KEY}`)).not.toThrow();
    expect(() => service.authorize('Apikey nope')).toThrow(UnauthorizedException);
    expect(() => service.authorize(undefined)).toThrow(UnauthorizedException);
  });

  it('rejects every webhook while no key is configured', () => {
    const { service } = setup([], { key: null });
    expect(() => service.authorize(`Apikey ${KEY}`)).toThrow(UnauthorizedException);
    expect(() => service.authorize('Apikey ')).toThrow(UnauthorizedException);
  });
});

describe('SepayWebhookService.handle', () => {
  it('confirms a PENDING VietQR payment paid in full and marks the transfer MATCHED', async () => {
    const { service, confirmPaid, updated } = setup([payment()]);
    await expect(service.handle(body())).resolves.toEqual({ result: 'MATCHED', paymentId: 'pay-1' });
    expect(confirmPaid).toHaveBeenCalledWith(expect.anything(), 'pay-1', { via: 'SEPAY_WEBHOOK', providerTxnId: '1001' });
    expect(updated).toHaveBeenCalledWith({
      where: { externalId: '1001' },
      data: { status: 'MATCHED', paymentId: 'pay-1', extractedReference: 'WFAB23CD' },
    });
  });

  it('matches a reference the bank mangled, or only given in `code`', async () => {
    const mangled = setup([payment()]);
    await expect(mangled.service.handle(body({ content: 'MBVCB.99.wf ab23 cd.CT tu A' }))).resolves.toMatchObject({
      result: 'MATCHED',
    });
    const coded = setup([payment()]);
    await expect(coded.service.handle(body({ content: 'chuyen tien', code: 'WFAB23CD' }))).resolves.toMatchObject({
      result: 'MATCHED',
    });
  });

  it('stores the transfer once: a replay does nothing more', async () => {
    const { service, confirmPaid, updated } = setup([payment()], { duplicate: true });
    await expect(service.handle(body())).resolves.toEqual({ result: 'DUPLICATE' });
    expect(confirmPaid).not.toHaveBeenCalled();
    expect(updated).not.toHaveBeenCalled();
  });

  describe('UNMATCHED reasons', () => {
    const cases: [string, PaymentRow[], Record<string, unknown>, string, string | null][] = [
      ['NO_REFERENCE: no WF code in the content', [payment()], { content: 'tien an trua' }, 'NO_REFERENCE', null],
      ['NOT_FOUND: a WF code nobody owns', [payment()], { content: 'WFZZ99ZZ' }, 'NOT_FOUND', null],
      [
        'NOT_FOUND: the code belongs to a VNPay payment',
        [payment({ provider: PaymentProvider.VNPAY })],
        {},
        'NOT_FOUND',
        null,
      ],
      ['AMOUNT_MISMATCH: paid too little', [payment()], { transferAmount: 18_999 }, 'AMOUNT_MISMATCH', 'pay-1'],
      ['AMOUNT_MISMATCH: paid too much', [payment()], { transferAmount: 19_001 }, 'AMOUNT_MISMATCH', 'pay-1'],
      ['EXPIRED: past its expiry', [payment({ expiresAt: PAST })], {}, 'EXPIRED', 'pay-1'],
      ['EXPIRED: already marked EXPIRED', [payment({ status: PaymentStatus.EXPIRED })], {}, 'EXPIRED', 'pay-1'],
      ['ALREADY_PAID: paid by another way', [payment({ status: PaymentStatus.PAID })], {}, 'ALREADY_PAID', 'pay-1'],
    ];

    it.each(cases)('%s', async (_name, rows, over, reason, paymentId) => {
      const { service, confirmPaid, updated } = setup(rows);
      await expect(service.handle(body(over))).resolves.toEqual({ result: 'UNMATCHED', reason, paymentId });
      expect(confirmPaid).not.toHaveBeenCalled();
      expect(updated).toHaveBeenCalledWith({
        where: { externalId: '1001' },
        data: expect.objectContaining({ unmatchedReason: reason, paymentId }),
      });
      expect(updated.mock.calls.every(([arg]) => arg.data.status === undefined)).toBe(true);
    });

    it('EXPIRED when the payment lapses between the check and confirmPaid', async () => {
      const { service, confirmPaid } = setup([payment()]);
      confirmPaid.mockRejectedValueOnce(new ConflictException());
      await expect(service.handle(body())).resolves.toEqual({ result: 'UNMATCHED', reason: 'EXPIRED', paymentId: 'pay-1' });
    });

    it('lets an unexpected error out so the transaction rolls back and SePay retries', async () => {
      const { service, confirmPaid } = setup([payment()]);
      confirmPaid.mockRejectedValueOnce(new Error('db down'));
      await expect(service.handle(body())).rejects.toThrow('db down');
    });
  });

  it('skips money going out without storing anything', async () => {
    const { service, created } = setup([payment()]);
    await expect(service.handle(body({ transferType: 'out' }))).resolves.toEqual({ result: 'IGNORED' });
    expect(created).not.toHaveBeenCalled();
  });

  it('skips a zero amount and rejects a body it cannot read', async () => {
    const { service, created } = setup([payment()]);
    await expect(service.handle(body({ transferAmount: 0 }))).resolves.toEqual({ result: 'IGNORED' });
    expect(created).not.toHaveBeenCalled();
    await expect(service.handle({ transferType: 'in' })).rejects.toBeInstanceOf(SepayPayloadError);
  });
});
